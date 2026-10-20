(function (root) {
  "use strict";
  const AXIS = [0, 0, 1];
  const POLAR_COS_LIMIT = 1e-12;

  function finite(value, name) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`${name} must be a finite number`);
    }
    return value;
  }
  function vector3(value) {
    if (!Array.isArray(value) || value.length !== 3 ||
        !value.every((v) => typeof v === "number" && Number.isFinite(v))) {
      throw new TypeError("A vector must contain three finite numbers");
    }
    return value;
  }
  function directionOrNull(vector) {
    vector3(vector);
    const scale = Math.max(...vector.map(Math.abs));
    if (scale === 0) return null;
    const scaled = vector.map((v) => v / scale);
    const length = Math.hypot(...scaled);
    return scaled.map((v) => v / length);
  }
  function sphericalPosition(latitude, longitude) {
    finite(latitude, "latitude");
    finite(longitude, "longitude");
    if (Math.abs(latitude) > Math.PI / 2) {
      throw new RangeError("latitude must be in [-pi/2, pi/2] radians");
    }
    if (Math.abs(longitude) > Math.PI) {
      throw new RangeError("longitude must be in [-pi, pi] radians");
    }
    const s = Math.sin(latitude), c = Math.cos(latitude);
    const radial = Math.abs(latitude) === Math.PI / 2
      ? [0, 0, Math.sign(latitude)]
      : [c * Math.cos(longitude), c * Math.sin(longitude), s];
    return { latitude, longitude, radial, s, c };
  }
  // Column order is Up, East, tangent North (UEN), not conventional ENU.
  function sphericalLocalFrame(latitude, longitude) {
    const p = sphericalPosition(latitude, longitude);
    const common = {
      latitude, longitude, radial: p.radial, axis: [...AXIS],
      angleUnit: "radian", latitudeKind: "geocentric-spherical",
      columnOrder: ["up", "east", "tangent-north"],
    };
    if (Math.abs(p.c) <= POLAR_COS_LIMIT) {
      return { ...common, status: "unavailable", reason: "polar-chart-singularity",
        east: null, tangentNorth: null, basis: null };
    }
    const east = [-Math.sin(longitude), Math.cos(longitude), 0];
    const tangentNorth = [-p.s * Math.cos(longitude), -p.s * Math.sin(longitude), p.c];
    return { ...common, status: "available", east, tangentNorth,
      basis: [0, 1, 2].map((i) => [p.radial[i], east[i], tangentNorth[i]]) };
  }
  function sphericalAxisMap(latitude, longitude) {
    const frame = sphericalLocalFrame(latitude, longitude);
    if (frame.status !== "available") {
      return { status: "unavailable", reason: frame.reason, frame,
        matrix: null, shearScale: null, metricPreserving: null };
    }
    const s = Math.sin(latitude), c = Math.cos(latitude);
    return { status: "available", frame,
      inputOrder: ["radial", "east", "earth-axis"],
      outputFrame: "earth-centred-Cartesian",
      matrix: [0, 1, 2].map((i) => [frame.radial[i], frame.east[i], AXIS[i]]),
      shearScale: [[1, 0, s], [0, 1, 0], [0, 0, c]],
      determinant: c, metricPreserving: latitude === 0,
      classification: latitude === 0 ? "orthogonal-equatorial-special-case" : "shear-scale-not-rigid" };
  }
  function northPoleSightline(latitude, longitude, radius, height = 0) {
    finite(radius, "radius");
    finite(height, "height");
    if (radius <= 0 || height < 0) {
      throw new RangeError("radius must be positive and height nonnegative, in matching units");
    }
    const { radial } = sphericalPosition(latitude, longitude);
    let direction;
    if (latitude === Math.PI / 2) {
      // Exact pole: displacement is -h*k. Do not underflow height/radius.
      direction = height === 0 ? null : [0, 0, -1];
    } else {
      const scale = Math.max(radius, height);
      // Rescaled R*(k-n)-h*n avoids overflow of R+h.
      const displacement = AXIS.map((k, i) =>
        (radius / scale) * (k - radial[i]) - (height / scale) * radial[i]);
      direction = directionOrNull(displacement);
    }
    return { status: direction === null ? "undefined" : "available",
      reason: direction === null ? "observer-at-target" : null,
      direction, target: "geographic-north-pole", frame: "earth-centred-Cartesian",
      model: "spherical-earth-radial-height", latitudeKind: "geocentric-spherical" };
  }
  const api = { POLAR_COS_LIMIT, directionOrNull, sphericalLocalFrame,
    sphericalAxisMap, northPoleSightline };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TentacledCoordinates = api;
})(typeof window !== "undefined" ? window : globalThis);
