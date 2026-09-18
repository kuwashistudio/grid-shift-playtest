#!/usr/bin/env python3
"""Compatibility entry point. Canonical parity checks moved to validate_level_data_runtime.py and validate_solver_runtime_parity.py."""
from validate_level_data_runtime import main

if __name__ == "__main__":
    raise SystemExit(main())
