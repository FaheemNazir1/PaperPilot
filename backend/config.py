"""
Loads server-side settings from a git-ignored `backend/.env` (then a repo-root `.env`).

- Real environment variables always win, so a value set in the shell or on Render is never overridden.
- Empty values are ignored, so a placeholder line like `GEMINI_API_KEY=` is harmless.
- Values are never printed or logged; only the *names* that were loaded are returned.
- `.env.local` is deliberately not read: that file belongs to the Vite frontend.
"""
import os
from pathlib import Path
from typing import List, Optional, Sequence

_BACKEND_DIR = Path(__file__).resolve().parent
DEFAULT_ENV_FILES = (_BACKEND_DIR / ".env", _BACKEND_DIR.parent / ".env")


def _parse_line(line: str) -> Optional[tuple]:
    text = line.strip()
    if not text or text.startswith("#"):
        return None
    if text.startswith("export "):
        text = text[len("export "):].lstrip()
    if "=" not in text:
        return None
    name, _, value = text.partition("=")
    name, value = name.strip(), value.strip()
    if not name.replace("_", "").isalnum():
        return None
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        value = value[1:-1]
    elif " #" in value:  # trailing inline comment on an unquoted value
        value = value.split(" #", 1)[0].rstrip()
    return name, value


def load_env_files(paths: Optional[Sequence[Path]] = None) -> List[str]:
    """Sets any non-empty variables from the env files that are not already set. Returns the names set."""
    loaded: List[str] = []
    for path in paths if paths is not None else DEFAULT_ENV_FILES:
        try:
            lines = Path(path).read_text(encoding="utf-8-sig").splitlines()
        except OSError:
            continue
        for line in lines:
            parsed = _parse_line(line)
            if not parsed:
                continue
            name, value = parsed
            if value and not os.environ.get(name):
                os.environ[name] = value
                loaded.append(name)
    return loaded
