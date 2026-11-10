# MDL Geometry Preservation Gate — implementation note

Status: review-only Python validator, not installed as a deployment or engine gate.
PR: canonical six interface squash (draft).
Files: `geometry_preservation_gate.py`, `tests/test_geometry_preservation_gate.py`.

The proposed SCANDOC six-leg **protected profile** is distinct from the repository's existing eight-app API and cube–octahedron models. This change does not delete, reindex, rewrite or invalidate those historical/runtime models. Any reconciliation with them requires a separate explicit mapping and tests.

A proposed descriptor update is **rejected** when the fixed origin [1024,1024,0], opposing pairs (Tap/Surface, Gain/Habitat, Engine/Business), six launch commitments, three axes, Sentinel/Cube/Sphere order, post-launch Time Axis and Foretentacle, or closed native/Zero-Data gates is modified or omitted. Deliberate topology revisions are not allowed as overwrites; they require a separately reviewed new baseline and migration.

The gate permits representation changes (`presentation`, `filters`) and properly normalized optional functional involvement ratios. An unspecified ratio matrix stays `null`; the gate never makes up observed measurements. A positive ratio grants no permission.

Example usage (Python, read-only):

```python
from geometry_preservation_gate import check_overwrite, reference_descriptor
before = reference_descriptor()
after = reference_descriptor()
after["presentation"]["theme"] = "dark"
print(check_overwrite(before, after))  # ALLOW_DESCRIPTOR_UPDATE
```

Run tests: `python -m unittest discover -s tests -p 'test_geometry_preservation_gate.py'`.

**Boundaries:** This is a standalone library, not yet called by the website, CI, build steps, GitHub branch rules or production deploy. It compares descriptors, not running state, and has no cryptographic signing or authorized baseline change process. Passing means only that submitted descriptor fields obey the declared candidate contract. No claim of runtime enforcement, actual geometry equivalence, secrecy, live device execution, or core non-exposure follows.
