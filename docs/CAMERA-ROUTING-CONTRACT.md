# SCANDOC camera routing contract — research mode

- The existing eight Sphere HTML instruments request the outward-facing environment camera only, with exact facingMode environment.
- No selfie fallback is allowed. Missing outward-facing hardware results in an explicit failure.
- Foretentacle is a separate downstream Structural Melting consumer and alone uses the user-facing selfie camera. This branch does not modify its separate repository.
- Camera is optional, user-initiated local visual context. It does not establish geometry truth, provenance, or native burn authority.
- Existing Sphere camera is preview-only. Immersive world-geometry overlays are not yet implemented.
- No microphone, recording, upload or persistent video storage in the browser code. Tracks stop on pause, hiding, deactivation and cancellation.
- Live gate CLOSED. No native burn or production deployment.