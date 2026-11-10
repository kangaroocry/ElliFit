#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if [ ! -x .venv/bin/python ]; then python3 -m venv .venv; fi
if [ ! -f .venv/ellifit_ready ]; then
  .venv/bin/python -m pip install -r requirements.txt
  touch .venv/ellifit_ready
fi
exec .venv/bin/python launch.py "$@"
