# GitHub Actions Policy — grid-shift-playtest

This repository is public, so standard GitHub-hosted runner use is not charged against the private-repository included Actions minutes.

Policy:
- keep path-scoped push builds because they provide useful packaging/syntax validation;
- keep manual workflow dispatch for explicit package generation;
- cancel superseded in-progress builds on the same ref;
- do not move private-project CI here merely to evade billing;
- keep artifacts short-lived unless a Human review requires longer retention.
