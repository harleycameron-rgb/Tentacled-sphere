# Six-leg trajectory research contract

Opt-in software model only. The existing eight-vector API and HTML apps do not import it.
Six named inputs undergo a coordinate-wise median and a hard disagreement threshold.
The separation digest binds all inputs, centre, origin and tolerance. The trajectory
handoff recomputes separation before accepting two or more increasing nonnegative ticks.

The past/future strings are descriptive labels, not clock enforcement: there is no
wall-clock input or verified upstream origin adapter. Samples are supplied by callers;
no causal dynamics, trusted firing, external provenance or production integration is claimed.
Counterflow can increase velocity; it is an experimental operator, not a stability guarantee.
All gates remain CLOSED, sphereWrites false and receiptTrust UNVERIFIED.

Run `python -m unittest discover -s tests -p test_trajectory_contract.py -v`.
