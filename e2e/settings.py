"""Where the e2e tests point: first CLI argument, else $WEB_BASE_URL, else WEB_BASE_URL in ../.env."""
import os
import sys

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _dotenv(key):
    path = os.path.join(_ROOT, ".env")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith(key + "="):
                return line.split("=", 1)[1].strip()
    return None


def web_base_url():
    base = (sys.argv[1] if len(sys.argv) > 1 else None) or os.environ.get("WEB_BASE_URL") or _dotenv("WEB_BASE_URL")
    if not base:
        sys.exit("Set WEB_BASE_URL (environment or .env) or pass the web app URL as the first argument")
    return base.rstrip("/")
