# Coordinate contract and verification

## Scope

Pure reference helpers for spherical coordinates. The existing geometry API,
yaw/tilt rotations, app identities, launch gates and cryptographic behavior are
unchanged. The build copies coordinates.js, but no HTML script tag or active
browser adapter is added. This patch does not complete the six-interface build.

## Orthogonal chart

Assume an Earth-centred Cartesian frame, k=[0,0,1], geocentric latitude phi,
longitude lambda, and radian angles. This is a spherical model, not an
ellipsoidal geodetic conversion or phone-sensor calibration.

n=[cos(phi)cos(lambda),cos(phi)sin(lambda),sin(phi)]
e=[-sin(lambda),cos(lambda),0]
t_N=(k-sin(phi)n)/cos(phi), for |phi|<pi/2.

The helper uses the stable equivalent
 t_N=[-sin(phi)cos(lambda),-sin(phi)sin(lambda),cos(phi)].
B=[n e t_N] is orthonormal and right-handed. Its column order is Up, East,
tangent North (UEN), not conventional East, North, Up (ENU).

## Nonorthogonal physical-axis mapping

A=[n e k]=B S, with

    S=[[1,0,sin(phi)],[0,1,0],[0,0,cos(phi)]].

The radial and Earth-axis columns have inner product sin(phi); det(A)=cos(phi).
At nonzero latitude in the available chart this is shear/scale, not a rigid
rotation. The equator is the orthogonal special case. Do not normalize mapped
points and then claim original distances or a physical cube were preserved.

## Polar availability

The latitude chart degenerates at |phi|=pi/2; a physical cube does not collapse.
The implementation additionally excludes |cos(phi)|<=1e-12 as an explicit
numerical policy, not an exact mathematical singularity away from the poles.
Unavailable tangent directions/basis are null; radial and global axis directions
remain available. No arbitrary polar East gauge is silently supplied.

## Geographic North-Pole sightline

k=sin(phi)n+cos(phi)t_N is the Earth-axis direction, not a geographic sightline.
For R>0 and h>=0 in matching units:

    q_N=normalize(R*k-(R+h)*n), when the displacement is nonzero.

Away from the exact north pole, the helper rescales R*(k-n)-h*n to avoid overflow
of R+h. At latitude exactly pi/2, displacement is -h*k: h>0 returns [0,0,-1]
without dividing h by R; h=0 returns undefined. This prevents positive height
being mistaken for target coincidence when h/R underflows. The exact-pole branch
is not applied to merely near-pole positions. A near-pole numerical chart may
be unavailable while its geographic sightline remains defined.

This model uses radial height and geocentric latitude. Numeric inputs carry no
unit metadata: callers must ensure R and h share units. It does not claim robust
accuracy for every extreme finite input. The geographic-pole sightline is not
the celestial-pole direction. Existing Tap celestial Sight Pole controls remain
unchanged.

## Undefined directions and protocol separation

Exact zero displacement or velocity supplies no unit direction.
directionOrNull returns null for zero, does not invent an axis, and does not
fire Sentinel. Event references may remain recorded without directional arrows.
Sensor deadbands require a separately declared policy.

These helpers implement no entropy source, key derivation, threshold sharing,
ratchet, replay store, timestamp or transcript-closure launch decision.

## Executed verification

The exact proposed module and all 19 coordinate tests were executed in an
isolated temporary tree with Node v20.20.1: 19 passed, 0 failed; node --check
also passed. Python compilation of the modified build script passed.

    node --check web/coordinates.js
    node --test tests/web_coordinates.test.js

This is not a complete repository checkout run. Repository-wide Python/Node
suites, the full static build, CI, browser/device behavior and deployment were
not verified by these local checks. The existing tests/web_*.test.js CI glob
includes the new test file. No claim of universal numerical or physical
validation follows from these sample and regression checks.
