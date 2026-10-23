"""
Diagnostic for the Research Mentor's Gemini connection.

Run in the same terminal where GEMINI_API_KEY is set:

    python -m backend.check_gemini                 # test the configured model; if it fails, probe others
    python -m backend.check_gemini --model NAME    # test exactly one model
    python -m backend.check_gemini --all           # probe every candidate, not just until one works
    python -m backend.check_gemini --max-probes 6  # limit how many models are tried (default 10)

A model appearing in the model list does NOT prove it can generate: this script sends a tiny real
request (with the same system-instruction request shape the app uses) to each model it recommends.
The API key is never printed.
"""
import argparse
import os
import re
import sys
from typing import Any, Dict, List, Optional

from backend.chat import gemini_errors, llm
from backend.config import load_env_files

# Model families that cannot answer our plain text-in, text-out requests.
_EXCLUDED = (
    "image", "live", "tts", "embedding", "audio", "robotics", "computer-use", "veo", "imagen", "aqa", "learnlm",
    "gemma", "transcribe", "omni", "banana", "nano", "customtools",
)
_ALWAYS_STOP_ON = {gemini_errors.INVALID_KEY, gemini_errors.PERMISSION, gemini_errors.ACCOUNT, gemini_errors.NETWORK, gemini_errors.TIMEOUT}
# Quota is often per model (a model can have a zero free-tier limit), so one quota failure does not end the search.
_MAX_CONSECUTIVE_QUOTA_FAILURES = 3


def _version(name: str) -> float:
    m = re.search(r"gemini-(\d+(?:\.\d+)?)", name)
    return float(m.group(1)) if m else 0.0


def candidate_rank(name: str) -> tuple:
    """Sort key: stable before preview, known flash/pro families before codenames, newest version, then flash < lite < pro."""
    low = name.lower()
    family = 0 if "flash" in low and "lite" not in low else 1 if "flash" in low else 2 if "pro" in low else 3
    preview = 1 if ("preview" in low or "exp" in low or re.search(r"-\d{2}-\d{2}", low)) else 0
    unknown_family = 1 if family == 3 else 0
    return (preview, unknown_family, -_version(low), family, low)


def list_candidates(client: Any) -> List[str]:
    names = []
    for m in client.models.list():
        actions = getattr(m, "supported_actions", None) or []
        name = (m.name or "").replace("models/", "")
        if "generateContent" in actions and name.startswith("gemini") and not any(x in name for x in _EXCLUDED):
            names.append(name)
    return sorted(set(names), key=candidate_rank)


def probe_model(client: Any, model: str) -> Dict[str, Any]:
    """One tiny real generation. Returns {"ok", "detail", "kind", "failure"}; never raises."""
    from google.genai import types

    try:
        response = client.models.generate_content(
            model=model,
            contents="Reply with the single word: ok",
            config=types.GenerateContentConfig(
                system_instruction="You are a connectivity test. Answer with one short word.",
                temperature=0.2,
                max_output_tokens=256,
            ),
        )
    except Exception as exc:  # noqa: BLE001 - classified, never hidden
        failure = gemini_errors.classify(exc, model)
        return {"ok": False, "kind": failure.kind, "failure": failure, "detail": failure.message}

    try:
        text = llm.extract_text(response, model)
        return {"ok": True, "kind": "ok", "failure": None, "detail": f"answered {text[:30]!r}"}
    except llm.LlmUnavailable as exc:
        # The API call itself worked but no visible text came back (for example the token budget was
        # spent on hidden reasoning). That is a usable model with a caveat, not an access problem.
        return {"ok": True, "kind": exc.kind, "failure": None, "detail": f"API call succeeded but: {exc}"}


def _describe(result: Dict[str, Any]) -> str:
    failure: Optional[gemini_errors.Failure] = result["failure"]
    if failure is None:
        return result["detail"]
    extra = f" [HTTP {failure.code} {failure.status or ''} {','.join(failure.reasons or [])}]".replace("  ", " ")
    return f"{failure.kind}: {failure.message}{extra}"


def run(argv: Optional[List[str]] = None, client: Any = None) -> int:
    parser = argparse.ArgumentParser(description="Diagnose the Gemini connection used by the Research Mentor.")
    parser.add_argument("--model", help="test exactly this model identifier")
    parser.add_argument("--all", action="store_true", help="probe every candidate instead of stopping at the first that works")
    parser.add_argument("--max-probes", type=int, default=10, help="maximum number of candidate models to try")
    args = parser.parse_args(argv)

    load_env_files()  # same sources as the server: shell environment first, then backend/.env
    key = llm._api_key()
    if not key:
        print("FAIL  GEMINI_API_KEY (or GOOGLE_API_KEY) is not set in this process's environment.")
        print("      Put it in backend/.env (GEMINI_API_KEY=...), which the backend and this script load automatically,")
        print("      or set it in this terminal:  $env:GEMINI_API_KEY = '<your key>'")
        return 1
    print(f"OK    API key is set ({len(key)} characters; value not shown).")

    try:
        import google.genai as genai
    except ImportError:
        print("FAIL  google-genai is not installed. Run: pip install -r backend/requirements-ml.txt")
        return 1
    print(f"OK    google-genai {genai.__version__}")

    client = client or llm._get_client(key)
    configured = llm.model_name()
    source = "GEMINI_MODEL" if os.getenv("GEMINI_MODEL", "").strip() else "built-in default"
    print(f"INFO  Configured model: {configured} (from {source})")

    # 1) What does the key say it can use? (informational only)
    candidates: List[str] = []
    try:
        candidates = list_candidates(client)
        print(f"OK    Key can list models: {len(candidates)} Gemini text models claim generateContent support.")
        if configured in candidates:
            print(f"INFO  '{configured}' is listed. That alone proves nothing; testing real generation next.")
        else:
            print(f"WARN  '{configured}' is not in the list for this key.")
    except Exception as exc:  # noqa: BLE001
        failure = gemini_errors.classify(exc, configured)
        print(f"FAIL  Could not list models ({failure.kind}): {failure.message}")
        if failure.kind in _ALWAYS_STOP_ON:
            return 1
        print("INFO  Continuing without a list.")

    # 2) Test real generation.
    to_test = [args.model] if args.model else [configured]
    results: Dict[str, Dict[str, Any]] = {}

    def attempt(model: str) -> bool:
        result = probe_model(client, model)
        results[model] = result
        tag = "OK   " if result["ok"] else "FAIL "
        marker = "  <-- configured" if model == configured else ""
        print(f"{tag} {model}: {_describe(result)}{marker}")
        return result["ok"]

    print("INFO  Testing real text generation (one tiny request per model):")
    for model in to_test:
        attempt(model)

    first = results[to_test[0]]
    working = [m for m, r in results.items() if r["ok"]]
    need_search = not args.model and (args.all or not first["ok"])
    stop_everything = (not first["ok"]) and first["kind"] in _ALWAYS_STOP_ON

    if need_search and not stop_everything:
        pool = [m for m in candidates if m not in results][: max(0, args.max_probes)]
        print(f"INFO  Probing up to {len(pool)} other candidate models (newest stable first)...")
        quota_streak = 1 if first["kind"] == gemini_errors.QUOTA else 0
        for model in pool:
            ok = attempt(model)
            if ok:
                working.append(model)
                if not args.all:
                    break
                quota_streak = 0
                continue
            kind = results[model]["kind"]
            quota_streak = quota_streak + 1 if kind == gemini_errors.QUOTA else 0
            if kind in _ALWAYS_STOP_ON:
                print(f"INFO  Stopping: '{kind}' affects the whole key, so further probes would not help.")
                break
            if quota_streak >= _MAX_CONSECUTIVE_QUOTA_FAILURES:
                print(f"INFO  Stopping: {quota_streak} models in a row hit quota limits; the key's quota is probably the problem.")
                break
    elif stop_everything:
        print(f"INFO  Not probing other models: '{first['kind']}' is a problem with the key/account/network, not the model.")

    # 3) Verdict.
    print()
    if configured in working and not args.model:
        print(f"RESULT '{configured}' works for this key. No change needed.")
        return 0
    if working:
        best = working[0]
        print(f"RESULT Models that actually generated for this key: {', '.join(working)}")
        print(f"       Recommended: {best}")
        print("       Use it in the terminal that starts the backend:")
        print(f'         $env:GEMINI_MODEL = "{best}"')
        print("         python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000")
        print("       To keep it for new terminals:")
        print(f"         [Environment]::SetEnvironmentVariable('GEMINI_MODEL', '{best}', 'User')")
        return 0

    last = results[to_test[0]] if results else None
    print("RESULT No model generated successfully for this key.")
    if last and last["failure"]:
        print(f"       Provider problem: {last['failure'].kind}. {last['failure'].message}")
    print("       Fix the key or account issue above (Google AI Studio: https://aistudio.google.com/apikey), then run this again.")
    return 1


if __name__ == "__main__":
    sys.exit(run())
