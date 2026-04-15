#!/usr/bin/env python3
"""Netlify build hook for dashboard builds.

This project publishes static assets from web/static and serves API logic from
netlify/functions/api.js. The Netlify UI build command still runs this script,
so we validate the expected directories and exit successfully.
"""

from __future__ import annotations

from pathlib import Path


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    static_dir = repo_root / "web" / "static"
    functions_dir = repo_root / "netlify" / "functions"

    missing = [p for p in (static_dir, functions_dir) if not p.exists()]
    if missing:
        names = ", ".join(str(p.relative_to(repo_root)) for p in missing)
        raise SystemExit(f"Netlify build check failed, missing: {names}")

    print("Netlify build check passed.")
    print(f"Publish directory: {static_dir}")
    print(f"Functions directory: {functions_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
