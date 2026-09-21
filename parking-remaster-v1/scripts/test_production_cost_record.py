#!/usr/bin/env python3
"""Fail-closed regression tests for production_cost_record.py."""
from production_cost_record import validate


def expect_fail(data: dict) -> None:
    try:
        validate(data)
    except ValueError:
        return
    raise AssertionError(f"expected failure: {data}")


def main() -> None:
    valid = validate({
        "level_id": "main-001",
        "authoring_minutes": 12.5,
        "qa_minutes": 4,
        "revision_count": 2,
        "notes": "measurement only",
    })
    assert valid["total_minutes"] == 16.5
    expect_fail({"level_id": "main-001", "authoring_minutes": -1, "qa_minutes": 2, "revision_count": 0})
    expect_fail({"level_id": "main-001", "authoring_minutes": 1, "qa_minutes": 2, "revision_count": -1})
    expect_fail({"level_id": "", "authoring_minutes": 1, "qa_minutes": 2, "revision_count": 0})
    expect_fail({"level_id": "main-001", "authoring_minutes": 1, "qa_minutes": 2, "revision_count": 0, "silent_metric": 1})
    print("PASS: production-cost record regression suite")


if __name__ == "__main__":
    main()
