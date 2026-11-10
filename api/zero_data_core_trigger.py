"""Zero-Data core-boundary invariant trigger reservation (non-executable).

An input observation cannot activate this reservation. There is deliberately
no fire/ignite/commit method, no event listener, no HTTP route and no writer.
A future true-invariance verifier needs an independently reviewed contract,
measured evidence and authorization before ANY execution adapter can be added.

This file is a fail-closed proposal, not the protected native Zero core.
"""
from dataclasses import dataclass
from typing import Final

@dataclass(frozen=True)
class InvariantTriggerReservation:
    lineage_origin: str = "Sentinel"
    direction: str = "SOURCE_TO_OBSERVER"
    observer_write_authority: bool = False
    trigger_authority: str = "UNDEFINED_PENDING_VERIFIED_INVARIANCE"
    execution_connected: bool = False
    native_gate: str = "CLOSED"

RESERVATION: Final[InvariantTriggerReservation] = InvariantTriggerReservation()

def qualification_state() -> str:
    """No qualifying runtime proof contract exists; no action can be granted."""
    return "UNRESOLVED_NO_EXECUTION"
