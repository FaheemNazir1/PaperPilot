"""
Classifies Gemini SDK / network failures from their structured fields, not from guesses.

google-genai raises APIError subclasses carrying the provider's HTTP `code`, a `status`
string (for example NOT_FOUND) and the full error payload, whose `details` entries may hold a
machine-readable `reason` (for example API_KEY_INVALID). Network problems surface as httpx
exceptions; anything else is treated as a programming error, never blamed on the provider.
"""
import re
from dataclasses import dataclass
from typing import Any, List, Optional

# kind -> (HTTP status returned to our client, headline)
INVALID_KEY = "invalid_key"
PERMISSION = "permission"
ACCOUNT = "account_or_billing"
MODEL_UNAVAILABLE = "model_unavailable"
ENDPOINT_NOT_FOUND = "endpoint_not_found"
QUOTA = "quota"
OUTAGE = "provider_outage"
TIMEOUT = "timeout"
NETWORK = "network"
BAD_REQUEST = "bad_request"
BLOCKED = "blocked"
EMPTY = "empty_response"
UNEXPECTED = "unexpected"

_HTTP_STATUS = {
    INVALID_KEY: 503, PERMISSION: 503, ACCOUNT: 503, MODEL_UNAVAILABLE: 503, ENDPOINT_NOT_FOUND: 503,
    QUOTA: 429, OUTAGE: 502, TIMEOUT: 504, NETWORK: 502, BAD_REQUEST: 502, BLOCKED: 422, EMPTY: 502,
    UNEXPECTED: 500,
}


@dataclass
class Failure:
    kind: str
    http_status: int
    message: str  # safe, actionable text for the user
    code: Optional[int] = None
    status: Optional[str] = None
    reasons: Optional[List[str]] = None
    provider_message: str = ""  # trimmed provider text, for the server log only


def _fields(exc: BaseException) -> tuple:
    """(code, status, message, reasons) read from a google-genai APIError, or Nones."""
    code = getattr(exc, "code", None)
    code = code if isinstance(code, int) else None
    status = getattr(exc, "status", None)
    status = status if isinstance(status, str) else None
    message = getattr(exc, "message", None)
    message = message if isinstance(message, str) else ""
    reasons: List[str] = []
    payload: Any = getattr(exc, "details", None)
    error = payload.get("error") if isinstance(payload, dict) else None
    if isinstance(error, dict):
        for item in error.get("details") or []:
            if isinstance(item, dict) and isinstance(item.get("reason"), str):
                reasons.append(item["reason"])
    return code, status, message, reasons


def _has(text: str, *needles: str) -> bool:
    low = text.lower()
    return any(n in low for n in needles)


def classify(exc: BaseException, model: str) -> Failure:
    code, status, message, reasons = _fields(exc)
    reason_blob = " ".join(reasons)
    low = message.lower()
    provider = (message or str(exc))[:300]

    def make(kind: str, text: str) -> Failure:
        return Failure(kind, _HTTP_STATUS[kind], text, code, status, reasons, provider)

    # --- structured provider errors -------------------------------------------------------
    if code is not None or status is not None:
        if _has(reason_blob, "api_key_invalid", "api_key_expired", "api_key_not_found") or (
            _has(low, "api key") and _has(low, "not valid", "invalid", "expired", "revoked")
        ) or status == "UNAUTHENTICATED" or code == 401:
            return make(INVALID_KEY, "Gemini rejected the API key (invalid, expired or revoked). Check GEMINI_API_KEY.")

        # Quota first: Google's standard 429 text says "check your plan and billing details", which must
        # not be mistaken for an account/billing fault.
        if code == 429 or status == "RESOURCE_EXHAUSTED":
            no_free_tier = "limit: 0" in low
            hint = " (this model has no free-tier quota for this key; try another model)" if no_free_tier else ""
            return make(
                QUOTA,
                f'Gemini quota or rate limit reached for model "{model}"{hint}. '
                "Wait a minute and retry, or check the key's quota and plan.",
            )

        if _has(reason_blob, "billing", "service_disabled", "consumer_suspended", "consumer_invalid") or _has(
            low, "billing", "has not been used in project", "api has not been", "is disabled", "location is not supported", "suspended"
        ):
            return make(
                ACCOUNT,
                "Gemini says the Google account or project is not set up for this request (billing, a disabled API, "
                "a suspended project or an unsupported region). Check the key's project in Google AI Studio.",
            )

        if code == 404 or status == "NOT_FOUND":
            if _has(low, "model", "models/"):
                extra = " (it is not available to this key)" if _has(low, "no longer available", "new users") else ""
                return make(
                    MODEL_UNAVAILABLE,
                    f'Gemini cannot serve the model "{model}"{extra}. Run `python -m backend.check_gemini` to find a model '
                    "that works for this key, then set GEMINI_MODEL.",
                )
            return make(ENDPOINT_NOT_FOUND, "Gemini returned 404 for the request URL (not a missing model). Check the SDK version and any custom base URL.")

        if code == 403 or status == "PERMISSION_DENIED":
            return make(
                PERMISSION,
                f'Gemini denied access for model "{model}" with this key (permission or API restriction). '
                "Check the key's restrictions in Google AI Studio, or try another model.",
            )

        if code == 400 or status in ("INVALID_ARGUMENT", "FAILED_PRECONDITION"):
            if _has(low, "system instruction", "developer instruction"):
                return make(BAD_REQUEST, f'The model "{model}" does not accept a system instruction. Choose a Gemini model that does.')
            return make(BAD_REQUEST, "Gemini rejected the request as invalid. The server log has the provider's exact message.")

        if code == 504 or status == "DEADLINE_EXCEEDED":
            return make(TIMEOUT, "Gemini took too long to answer. Please try again.")

        if (code is not None and code >= 500) or status in ("UNAVAILABLE", "INTERNAL"):
            return make(OUTAGE, "Gemini is temporarily unavailable or overloaded on Google's side. Please try again shortly.")

        return make(UNEXPECTED, f"Gemini returned an unexpected error (HTTP {code}). The server log has details.")

    # --- network-level failures (httpx / ssl / socket) -----------------------------------
    names = {c.__name__ for c in type(exc).__mro__}
    if names & {"TimeoutException", "ReadTimeout", "ConnectTimeout", "WriteTimeout", "PoolTimeout", "TimeoutError"}:
        return make(TIMEOUT, "The request to Gemini timed out. Please try again.")
    if names & {"ConnectError", "NetworkError", "TransportError", "ProxyError", "ConnectionError", "SSLError", "gaierror"}:
        return make(NETWORK, "This server could not reach Google's Gemini API (network, DNS, proxy or firewall problem).")

    # --- everything else is our own bug, not the provider's -------------------------------
    return make(UNEXPECTED, "Internal error while calling Gemini. This is a server problem, not your key or model; see the server log.")


def is_provider_fault(failure: Failure) -> bool:
    return failure.kind != UNEXPECTED


def redact(text: str, secret: Optional[str]) -> str:
    """Removes the API key (and anything shaped like one) from text destined for logs."""
    if secret:
        text = text.replace(secret, "[redacted]")
    return re.sub(r"AIza[0-9A-Za-z_\-]{20,}", "[redacted]", text)
