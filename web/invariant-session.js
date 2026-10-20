(function (root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.InvariantSession = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  function freeze(value) {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }

  const ROUTES = freeze([
    "tap", "surface", "evidence-gate", "modular-topology", "credit-game", "study-environment",
  ]);
  const edges = freeze({
    surface: {
      tap: "derived-feedback",
      "study-environment": "inspection",
      "evidence-gate": "local-evidence",
    },
  });
  const registry = freeze({
    routes: ROUTES,
    navigation: { capability: "local-navigation", routes: ROUTES },
    capabilities: edges,
    fourthAxis: [
      { slot: "version-slot-7", status: "unknown", available: false },
      { slot: "version-slot-8", status: "unknown", available: false },
    ],
    geometry: { armCount: 8, distinctFromRouteCount: true },
    engineInput: "unavailable",
    liveGate: "CLOSED",
    trust: "UNVERIFIED",
  });

  function policy(allowed, status, reason, capability = null) {
    return freeze({ allowed, status, reason, capability, liveGate: "CLOSED", trust: "UNVERIFIED" });
  }

  function checkTransition(source, target, capability = "local-derived") {
    if (!ROUTES.includes(source) || !ROUTES.includes(target)) {
      return policy(false, "unsupported-route", "Only the six authoritative routes are available.");
    }
    if (capability === "local-navigation" || capability === "navigation") {
      return checkRoute(target);
    }
    if (["engine.input", "authorization", "authorize", "launch"].includes(capability)) {
      return policy(false, "blocked", "Missing qualified contributions and fourth-axis qualifications; engine.input is unavailable.");
    }
    const binding = Object.hasOwn(edges, source) && Object.hasOwn(edges[source], target)
      ? edges[source][target] : null;
    if (!binding) {
      return policy(false, "missing-binding", "No compatible measured output or declared local-derived binding exists.");
    }
    if (capability !== "local-derived" && capability !== binding) {
      return policy(false, "unsupported-capability", "This edge does not provide that capability.");
    }
    return policy(true, "local-only", "Unverified local-derived data only; no backend simulation or sensor authority.", binding);
  }

  function checkRoute(route) {
    return ROUTES.includes(route)
      ? policy(true, "local-navigation", "Local route navigation only; no output binding or engine authority.", "local-navigation")
      : policy(false, "unsupported-route", "Only the six authoritative routes are available.");
  }

  function fail(code, message) {
    const error = new TypeError(message);
    error.code = code;
    throw error;
  }

  function object(value, required, optional = []) {
    if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
      fail("invalid-schema", "Expected a plain schema object.");
    }
    const keys = Reflect.ownKeys(value);
    if (required.some((key) => !Object.hasOwn(value, key)) ||
        keys.some((key) => typeof key !== "string" || !required.concat(optional).includes(key)) ||
        keys.some((key) => !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), "value"))) {
      fail("invalid-schema", "Missing, excess, or accessor schema fields.");
    }
  }

  function cryptoProvider() {
    if (root.crypto && root.crypto.subtle) return root.crypto;
    if (typeof require === "function") return require("node:crypto").webcrypto;
    fail("crypto-unavailable", "Secure randomness and SHA-256 are required.");
  }

  function randomId() {
    const bytes = cryptoProvider().getRandomValues(new Uint8Array(24));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function canonical(value) {
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    if (value && typeof value === "object") {
      return "{" + Object.keys(value).sort().map((key) =>
        JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
    }
    return JSON.stringify(value);
  }

  async function commitment(value) {
    const digest = await cryptoProvider().subtle.digest("SHA-256", new TextEncoder().encode(canonical(value)));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  const states = new WeakMap();
  async function verifyRecord(session, recordId) {
    const state = states.get(session);
    const record = state.records.find((item) => item.id === recordId);
    if (!record || record.sessionId !== state.sessionId) return false;
    const { id, commitment: expected, ...content } = record;
    const actual = await commitment(content);
    return states.get(session) === state && state.records.includes(record) &&
      id === state.sessionId + ":" + record.revision && actual === expected;
  }

  async function append(session, fields, state) {
    const revision = state.revision;
    const content = {
      ...fields, sessionId: state.sessionId, revision: revision + 1,
      previousHeadCommitment: state.headCommitment,
      algorithm: "SHA-256", canonicalization: "sorted-object-keys-json-v1",
      liveGate: "CLOSED", trust: "UNVERIFIED",
    };
    const hash = await commitment(content);
    if (states.get(session) !== state || state.revision !== revision) {
      fail("stale-revision", "Session changed while committing this record.");
    }
    const record = freeze({ ...content, id: state.sessionId + ":" + content.revision, commitment: hash });
    state.revision = content.revision;
    state.headCommitment = hash;
    state.records.push(record);
    if (state.records.length > state.maxRecords) state.records.shift();
    return record;
  }

  class Session {
    constructor(options = {}) {
      object(options, [], ["maxRecords"]);
      const maxRecords = options.maxRecords === undefined ? 64 : options.maxRecords;
      if (!Number.isSafeInteger(maxRecords) || maxRecords < 1 || maxRecords > 64) {
        fail("invalid-limit", "Record limit must be an integer between 1 and 64.");
      }
      states.set(this, { sessionId: randomId(), revision: 0, headCommitment: null, records: [], maxRecords });
    }

    get sessionId() { return states.get(this).sessionId; }
    get revision() { return states.get(this).revision; }
    get headCommitment() { return states.get(this).headCommitment; }
    get records() { return this.inspect().records; }

    reset() {
      const state = states.get(this);
      states.set(this, { sessionId: randomId(), revision: 0, headCommitment: null, records: [], maxRecords: state.maxRecords });
      return this.inspect();
    }

    inspect(recordId) {
      const state = states.get(this);
      if (recordId !== undefined) return state.records.find((record) => record.id === recordId) || null;
      return freeze({
        sessionId: state.sessionId, revision: state.revision,
        headCommitment: state.headCommitment, maxRecords: state.maxRecords,
        records: state.records.slice(), registry, liveGate: "CLOSED", trust: "UNVERIFIED",
        qualifications: "missing", contributions: "missing",
      });
    }

    checkTransition(source, target, capability) {
      return checkTransition(source, target, capability);
    }

    checkRoute(route) { return checkRoute(route); }

    verifyRecord(recordId) { return verifyRecord(this, recordId); }

    async inspectVerified(recordId) {
      const state = states.get(this);
      const verified = await verifyRecord(this, recordId);
      const record = verified && states.get(this) === state ? this.inspect(recordId) : null;
      return freeze({
        record,
        integrity: record !== null, liveGate: "CLOSED", trust: "UNVERIFIED",
      });
    }

    async admitInstrument(input) {
      object(input, ["instrument", "schema", "adapter", "frame", "units", "scope", "source", "output"],
        ["sessionId", "revision", "predecessorCommitment"]);
      const state = states.get(this);
      if (Object.hasOwn(input, "sessionId") && input.sessionId !== state.sessionId) {
        fail("out-of-session", "Output belongs to another session.");
      }
      if (Object.hasOwn(input, "revision") && input.revision !== state.revision) {
        fail("stale-revision", "Output revision is stale.");
      }
      if (Object.hasOwn(input, "predecessorCommitment") && input.predecessorCommitment !== state.headCommitment) {
        fail("stale-predecessor", "Output predecessor is not the current head.");
      }
      if (!ROUTES.includes(input.instrument)) fail("unsupported-route", "Unsupported authoritative route.");
      if (input.instrument !== "surface") fail("missing-binding", "No compatible output adapter exists for this route.");
      if (input.schema !== "instrument-output/v1" || input.adapter !== "surface-derived/v1" ||
          input.frame !== "surface-local" || input.units !== "normalized" ||
          input.scope !== "local-derived-unverified") {
        fail("invalid-schema", "Unsupported schema, adapter, frame, units, or scope.");
      }
      if (!["touch", "movement", "keyboard", "fixture"].includes(input.source)) {
        fail("invalid-source", "Only declared Surface interaction or fixture sources are supported.");
      }
      object(input.output, ["activity", "severity", "occupancy", "unresolved"]);
      if (!Object.values(input.output).every((value) => Number.isFinite(value) && value >= 0 && value <= 1) ||
          !Number.isInteger(input.output.occupancy * 16) ||
          !Number.isInteger(input.output.unresolved * 16)) {
        fail("invalid-payload", "Output must match the bounded sixteen-step Surface-derived contract.");
      }
      return append(this, {
        type: "instrument-output", route: input.instrument, instrument: input.instrument, schema: input.schema,
        adapter: input.adapter, frame: input.frame, units: input.units, scope: input.scope,
        source: input.source, output: { ...input.output },
      }, state);
    }

    admitOutput(input) { return this.admitInstrument(input); }

    async bridge(target, recordId, predecessorCommitment) {
      const state = states.get(this);
      if (!ROUTES.includes(target)) fail("unsupported-route", "Unsupported authoritative route.");
      if (predecessorCommitment !== state.headCommitment) {
        fail("stale-predecessor", "Bridge predecessor must equal the current session head.");
      }
      const source = state.records.find((record) => record.id === recordId);
      if (!source) fail("missing-contribution", "No retained contribution from this session.");
      if (source.type !== "instrument-output") fail("missing-binding", "Bridges cannot manufacture instrument output.");
      const latest = state.records.filter((record) => record.type === "instrument-output" && record.route === source.route).at(-1);
      if (latest !== source) fail("stale-revision", "A newer source output supersedes this contribution.");
      const decision = checkTransition(source.route, target);
      if (!decision.allowed) fail(decision.status, decision.reason);
      const revision = state.revision;
      const head = state.records.at(-1);
      const [sourceValid, headValid] = await Promise.all([
        verifyRecord(this, source.id),
        source === head ? true : verifyRecord(this, head.id),
      ]);
      if (states.get(this) !== state || state.revision !== revision) {
        fail("stale-revision", "Session changed while verifying bridge dependencies.");
      }
      if (!sourceValid || !headValid) fail("invalid-commitment", "A dependency commitment failed SHA-256 verification.");
      return append(this, {
        type: "derived-bridge", schema: "local-dependency/v1", route: target,
        sourceRoute: source.route, adapter: source.adapter, frame: source.frame,
        units: source.units, scope: source.scope, capability: decision.capability,
        dependency: { recordId: source.id, commitment: source.commitment, revision: source.revision },
        source: source.source, output: { ...source.output },
      }, state);
    }
  }

  return freeze({ Session, registry, ROUTES, checkTransition, checkRoute });
});
