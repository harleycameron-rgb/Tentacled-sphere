(function (root) {
  "use strict";

  const APP_IDS = [
    "tap",
    "surface",
    "spiritlevel",
    "gain",
    "habitat",
    "time",
    "space",
    "lineage",
  ];
  const CUBE_SIGNS = [
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
  ];
  const PORTS = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0],
    [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ];
  const EPSILON = 1e-12;

  function normalize(vector) {
    if (!Array.isArray(vector) || vector.length !== 3 ||
        !vector.every(Number.isFinite)) {
      throw new TypeError("A vector must contain three finite numbers");
    }
    const scale = Math.max(...vector.map(Math.abs));
    if (!(scale > 0)) throw new RangeError("A vector must be nonzero");
    const scaled = vector.map((value) => value / scale);
    const length = Math.hypot(...scaled);
    if (!Number.isFinite(length) || !(length > EPSILON)) {
      throw new RangeError("A vector must be nonzero");
    }
    return scaled.map((value) => value / length);
  }

  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  function angleDegrees(a, b) {
    const left = normalize(a);
    const right = normalize(b);
    return Math.atan2(Math.hypot(...cross(left, right)), dot(left, right)) *
      180 / Math.PI;
  }

  function rotateZ(vector, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [c * vector[0] - s * vector[1], s * vector[0] + c * vector[1], vector[2]];
  }

  function rotateX(vector, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [vector[0], c * vector[1] - s * vector[2], s * vector[1] + c * vector[2]];
  }

  function incidenceMatrix(signs = CUBE_SIGNS, ports = PORTS) {
    return signs.map((sign) => ports.map((port) => {
      const axis = port.findIndex((value) => value !== 0);
      return sign[axis] === port[axis] ? 1 : 0;
    }));
  }

  function cubeEdges(signs = CUBE_SIGNS) {
    const pairs = [];
    for (let left = 0; left < signs.length; left += 1) {
      for (let right = left + 1; right < signs.length; right += 1) {
        const differing = signs[left].filter((value, axis) => value !== signs[right][axis]).length;
        if (differing === 1) pairs.push([left, right]);
      }
    }
    return pairs;
  }

  function portEdges() {
    const pairs = [];
    for (let left = 0; left < PORTS.length; left += 1) {
      for (let right = left + 1; right < PORTS.length; right += 1) {
        const leftAxis = PORTS[left].findIndex((value) => value !== 0);
        const rightAxis = PORTS[right].findIndex((value) => value !== 0);
        if (leftAxis !== rightAxis) pairs.push([left, right]);
      }
    }
    return pairs;
  }

  function pairedEdges(signs = CUBE_SIGNS) {
    return cubeEdges(signs).map(([left, right]) => {
      const fixedAxes = [0, 1, 2].filter((axis) => signs[left][axis] === signs[right][axis]);
      return [left, right, ...fixedAxes.map((axis) => axis * 2 + (signs[left][axis] < 0 ? 1 : 0))];
    });
  }

  function cubeModel() {
    return {
      arms: CUBE_SIGNS.map((sign) => normalize(sign)),
      ports: PORTS.map((port) => [...port]),
      armOrder: APP_IDS,
      portOrder: ["+X", "-X", "+Y", "-Y", "+Z", "-Z"],
    };
  }

  function apiModel(vectors) {
    if (!Array.isArray(vectors) || vectors.length !== 8) {
      throw new TypeError("The API must provide exactly eight vectors");
    }
    return {
      arms: vectors.map(normalize),
      ports: [],
      armOrder: APP_IDS,
      portOrder: [],
    };
  }

  function transformVector(vector, settings = {}) {
    const yaw = Number(settings.yaw ?? 0);
    const tilt = Number(settings.tilt ?? 0);
    if (!Number.isFinite(yaw) || !Number.isFinite(tilt)) {
      throw new TypeError("Yaw and tilt must be finite");
    }
    return normalize(rotateX(rotateZ(normalize(vector), yaw), tilt));
  }

  function pulseModel(model, settings = {}) {
    const mode = settings.mode ?? "rigid";
    const count = Number(settings.count ?? 0);
    const amplitude = Number(settings.amplitude ?? 0.1137);
    if (!["rigid", "harmonic"].includes(mode) ||
        !Number.isInteger(count) || count < 0 || !Number.isFinite(amplitude)) {
      throw new TypeError("Invalid Sentinel pulse parameters");
    }
    const arms = model.arms.map((vector, index) => {
      const multiplier = mode === "rigid"
        ? count
        : count * (1 + 0.5 * Math.sin(index * 2 * Math.PI / 8));
      return rotateZ(normalize(vector), multiplier * amplitude);
    });
    const ports = model.ports.map((vector) =>
      mode === "rigid" ? rotateZ(normalize(vector), count * amplitude) : [...vector]);
    return { ...model, arms, ports };
  }

  function pairDistances(arms, scale = 1) {
    if (!Number.isFinite(scale) || scale <= 0) {
      throw new TypeError("Distance scale must be positive and finite");
    }
    const distances = [];
    for (let left = 0; left < arms.length; left += 1) {
      for (let right = left + 1; right < arms.length; right += 1) {
        const a = normalize(arms[left]);
        const b = normalize(arms[right]);
        distances.push({
          pair: [left, right],
          distance: Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * scale,
        });
      }
    }
    return distances;
  }

  function analyzeDual(arms, ports) {
    if (arms.length !== 8 || ports.length !== 6) {
      throw new TypeError("Exact duality checks require eight arms and six ports");
    }
    const midpointSeparations = [];
    const orthogonalityDepartures = [];
    for (const [u, v, portA, portB] of pairedEdges()) {
      const armMidpoint = normalize(normalize(arms[u]).map((value, axis) =>
        value + normalize(arms[v])[axis]));
      const portMidpoint = normalize(normalize(ports[portA]).map((value, axis) =>
        value + normalize(ports[portB])[axis]));
      midpointSeparations.push(angleDegrees(armMidpoint, portMidpoint));
      const armNormal = normalize(cross(normalize(arms[u]), normalize(arms[v])));
      const portNormal = normalize(cross(normalize(ports[portA]), normalize(ports[portB])));
      orthogonalityDepartures.push(
        Math.asin(Math.min(1, Math.abs(dot(armNormal, portNormal)))) * 180 / Math.PI,
      );
    }
    return {
      maximumMidpointSeparationDegrees: Math.max(...midpointSeparations),
      maximumOrthogonalityDepartureDegrees: Math.max(...orthogonalityDepartures),
      midpointSeparationsDegrees: midpointSeparations,
      orthogonalityDeparturesDegrees: orthogonalityDepartures,
    };
  }

  function comparePairDistances(before, after, tolerance = 1e-10, scale = 1) {
    if (!Number.isFinite(tolerance) || tolerance < 0) {
      throw new TypeError("Distance tolerance must be a nonnegative finite number");
    }
    const left = pairDistances(before, scale);
    const right = pairDistances(after, scale);
    const comparisons = left.map((entry, index) => ({
      pair: entry.pair,
      before: entry.distance,
      after: right[index].distance,
      delta: right[index].distance - entry.distance,
    }));
    return {
      comparisons,
      changedPairs: comparisons.filter((item) => Math.abs(item.delta) > tolerance).length,
      maximumAbsoluteChange: Math.max(...comparisons.map((item) => Math.abs(item.delta))),
    };
  }

  function verifyCubeModel() {
    const matrix = incidenceMatrix();
    const edges = cubeEdges();
    const octaEdges = portEdges();
    const rows = matrix.map((row) => row.reduce((sum, value) => sum + value, 0));
    const columns = PORTS.map((_, port) =>
      matrix.reduce((sum, row) => sum + row[port], 0));
    const gramValid = matrix.every((row, left) =>
      matrix.every((other, right) => {
        const hammingDistance = CUBE_SIGNS[left].filter((value, axis) =>
          value !== CUBE_SIGNS[right][axis]).length;
        return row.reduce((sum, value, port) => sum + value * other[port], 0) === 3 - hammingDistance;
      }));
    const supportValid = CUBE_SIGNS.every((sign, arm) =>
      PORTS.every((port, index) => {
        const support = dot(sign, port);
        const expected = matrix[arm][index] ? 1 : -1;
        const normalizedSupport = dot(normalize(sign), port);
        const expectedNormalized = expected / Math.sqrt(3);
        return support === expected &&
          Math.abs(normalizedSupport - expectedNormalized) < 1e-12;
      }));
    const model = cubeModel();
    const duality = analyzeDual(model.arms, model.ports);
    return {
      matrix,
      rowSums: rows,
      columnSums: columns,
      incidenceCount: rows.reduce((sum, value) => sum + value, 0),
      cubeEdges: edges,
      portEdges: octaEdges,
      pairedEdges: pairedEdges(),
      gramValid,
      supportValid,
      duality,
    };
  }

  const api = {
    APP_IDS,
    CUBE_SIGNS,
    PORTS,
    EPSILON,
    normalize,
    dot,
    cross,
    angleDegrees,
    rotateZ,
    rotateX,
    incidenceMatrix,
    cubeEdges,
    portEdges,
    pairedEdges,
    cubeModel,
    apiModel,
    transformVector,
    pulseModel,
    pairDistances,
    analyzeDual,
    comparePairDistances,
    verifyCubeModel,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TentacledGeometry = api;
})(typeof window !== "undefined" ? window : globalThis);
