# Coordinate contract and browser adapter

## Scope and browser wiring

The coordinate helpers are connected to web/coordinate-adapter.js. The adapter
adds an explicit declared-coordinate form to supported standalone generated pages
and the integrated homepage. It does not create duplicate panels inside app
iframes. Geocentric latitude and longitude are entered in degrees and converted
to radians; radius and radial height must share caller-declared units.

No location is inferred. The adapter requests no geolocation, sensors, camera,
network, storage or feed submission. It does not fire Sentinel or change shared
snapshots, API vectors, yaw/tilt rotations, app identities or launch gates. This
is an active read-only coordinate calculation, not six-interface integration.
Blank locations reject; the model radius defaults to 1 and height to 0. Form
results are ephemeral. Clear, page hiding and page exit remove location inputs
and results, restoring radius/height defaults.

Production publication decorates HTML built outside the repository root with
coordinates.js followed by coordinate-adapter.js before app.js, all deferred.
The supported development server applies the same idempotent decoration to HTML
responses. Canonical root generated pages remain unchanged for existing --check
consistency checks. A generic static server serving those undecorated root pages
does not load the adapter; use scripts/dev_server.py or the published build.

## Orthogonal chart and physical mapping

Use an Earth-centred Cartesian frame, k=[0,0,1], spherical geocentric latitude
phi and longitude lambda in radians. This is not an ellipsoidal geodetic
conversion or phone-sensor calibration.

n=[cos(phi)cos(lambda),cos(phi)sin(lambda),sin(phi)]
e=[-sin(lambda),cos(lambda),0]
t_N=(k-sin(phi)n)/cos(phi), for |phi|<pi/2.

The implementation uses the stable equivalent
 t_N=[-sin(phi)cos(lambda),-sin(phi)sin(lambda),cos(phi)].
B=[n e t_N] is orthonormal and right-handed. Its columns are Up, East, tangent
North (UEN), not conventional East, North, Up (ENU).

A=[n e k]=B S, with

    S=[[1,0,sin(phi)],[0,1,0],[0,0,cos(phi)]].

The radial and Earth-axis columns have inner product sin(phi); det(A)=cos(phi).
Nonzero latitude in the available chart gives shear/scale, not a rigid rotation.
The equator is the orthogonal special case. Normalizing mapped points does not
establish preservation of their original distances.

## Availability and geographic sightline

The chart degenerates at |phi|=pi/2; no physical cube collapse is implied.
|cos(phi)|<=1e-12 is the additional declared numerical exclusion band. Missing
tangent basis/directions are null, not substituted axes.

k=sin(phi)n+cos(phi)t_N is the axis direction. The geographic North-Pole
sightline is q_N=normalize(R*k-(R+h)*n) for nonzero displacement, R>0, h>=0.
Rescaling avoids overflow of R+h. At phi exactly pi/2, displacement is -h*k:
h>0 returns [0,0,-1] before h/R can underflow; h=0 is undefined. The exact-pole
branch is not used for merely near-pole positions. Chart and sightline
availability are displayed separately. Geographic and celestial-pole directions
are distinct; existing celestial Sight Pole controls are unchanged.

Numeric inputs carry no unit metadata; the caller must keep R and h consistent.
No universal accuracy claim for extreme finite inputs is made. Exact zero
vectors have no unit direction. Sensor deadbands require separate policies.

## Protocol boundary and verification

This adapter supplies no entropy source, key derivation, ratchet, threshold
sharing, replay storage, timestamp, world-contact claim or launch decision.

The coordinate module previously passed its 19 local coordinate tests. The new
adapter has 12 executed Node tests with DOM mocks, including browser script
execution via node:vm; these are not real-browser or hardware tests. Three
Python decoration tests were executed, along with isolated nine-page publication
and canonical-generation checks using fixture HTML/assets. JavaScript syntax and
Python compilation checks passed. Repository-wide suites, deployed routes and
live browser/device operation have not been verified by this work.
