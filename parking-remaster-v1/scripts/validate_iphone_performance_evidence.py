#!/usr/bin/env python3
"""Validate future physical-iPhone performance evidence against the locked contract.

This validator does not collect telemetry and does not authorize a blocked gameplay gate.
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "qa" / "IPHONE_PERFORMANCE_EVIDENCE_CONTRACT_V1.json"


def validate(data, contract):
    errors = []
    required_top = {"device_model", "ios_version", "safari_version_or_user_agent", "candidate_commit", "measurement_started_at", "metrics", "visibility_cycle_observed"}
    missing = sorted(required_top - set(data))
    if missing:
        errors.append("missing evidence fields: " + ", ".join(missing))
    metrics = data.get("metrics", {})
    for key in contract["required_metrics"]:
        if key not in metrics:
            errors.append(f"missing metric: {key}")
    if errors:
        return errors
    if not isinstance(data["device_model"], str) or not data["device_model"].strip(): errors.append("device_model must be non-empty")
    if not isinstance(data["ios_version"], str) or not data["ios_version"].strip(): errors.append("ios_version must be non-empty")
    if not isinstance(data["safari_version_or_user_agent"], str) or not data["safari_version_or_user_agent"].strip(): errors.append("Safari identity must be non-empty")
    commit = data["candidate_commit"]
    if not isinstance(commit, str) or len(commit) != 40 or any(c not in "0123456789abcdef" for c in commit.lower()): errors.append("candidate_commit must be a 40-hex commit SHA")
    if data["visibility_cycle_observed"] is not True: errors.append("visibility cycle must be observed")
    numeric = ["first_control_available_ms", "frame_interval_p50_ms", "frame_interval_p95_ms", "frame_interval_p99_ms", "worst_frame_interval_ms"]
    for key in numeric:
        v = metrics[key]
        if not isinstance(v, (int, float)) or isinstance(v, bool) or v < 0: errors.append(f"{key} must be non-negative numeric")
    count = metrics["frame_sample_count"]
    if not isinstance(count, int) or isinstance(count, bool) or count < contract["measurement"]["minimum_frame_samples"]: errors.append("frame_sample_count below contract minimum")
    if metrics["visibility_pause_resume_pass"] is not True: errors.append("visibility_pause_resume_pass must be true")
    if not errors:
        if not (metrics["frame_interval_p50_ms"] <= metrics["frame_interval_p95_ms"] <= metrics["frame_interval_p99_ms"] <= metrics["worst_frame_interval_ms"]): errors.append("frame interval percentiles/worst are not monotonic")
        thresholds = contract["thresholds"]
        for key, threshold_key in (("first_control_available_ms", "first_control_available_ms_max"), ("frame_interval_p95_ms", "frame_interval_p95_ms_max"), ("frame_interval_p99_ms", "frame_interval_p99_ms_max"), ("worst_frame_interval_ms", "worst_frame_interval_ms_max")):
            if metrics[key] > thresholds[threshold_key]: errors.append(f"{key} exceeds contract threshold")
    return errors


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("evidence")
    args = ap.parse_args()
    contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
    data = json.loads(Path(args.evidence).read_text(encoding="utf-8"))
    errors = validate(data, contract)
    if errors:
        for e in errors: print("FAIL:", e)
        raise SystemExit(1)
    print("PASS: physical-iPhone performance evidence satisfies the finite machine contract; no human-quality gate is implied")

if __name__ == "__main__": main()
