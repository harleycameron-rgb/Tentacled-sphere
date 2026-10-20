"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");
const manifest = require("../vendor/previews/site/manifest/core.js");
const display = require("../vendor/previews/site/display/core.js");
const science = require("../vendor/previews/site/science/core.js");
const communicate = require("../vendor/previews/site/communicate/core.js");

function conserved(engine) {
  const state = engine.getState();
  assert.equal(state.wallet + state.held + state.pool + state.pool_reserved, 120);
  engine.assertAccounting(state);
  return state;
}

function browser(mode) {
  const elements = new Map();
  const context = new Proxy({}, { get: (target, key) => target[key] || (() => {}) });
  function element() {
    return {
      value: "", dataset: {}, children: [], options: [], disabled: false,
      textContent: "", style: {},
      append(...children) { this.children.push(...children); },
      replaceChildren(...children) { this.children = children; this.options = children; },
      listeners: {},
      addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); },
      dispatchEvent(event) {
        this["on" + event.type]?.(event);
        for (const listener of this.listeners[event.type] || []) listener(event);
      },
      setAttribute() {},
      getContext: () => context,
      getBoundingClientRect: () => ({ width: 640, height: 400 }),
    };
  }
  const document = {
    documentElement: { dataset: { mode } },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element());
      return elements.get(id);
    },
    querySelectorAll: () => [],
    createElement: element,
  };
  const sandbox = {
    document, crypto: webcrypto, structuredClone, TextEncoder, Uint8Array,
    devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }),
    getComputedStyle: () => ({ getPropertyValue: () => "#000" }),
    ResizeObserver: class { observe() {} },
    Option: function(text, value) { return { textContent: text, value }; },
    Event,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  return {
    sandbox,
    get: (id) => document.getElementById(id),
    load(name) {
      const filename = path.join(__dirname, "../vendor/previews/site", name, "core.js");
      vm.runInContext(fs.readFileSync(filename, "utf8"), sandbox, { filename });
    },
  };
}

test("pinned cores import without a DOM and coexist as browser globals without mounting", () => {
  const page = browser("shell");
  for (const name of ["manifest", "display", "science", "communicate"]) page.load(name);
  assert.equal(page.sandbox.ManifestCore.SCHEMA, manifest.SCHEMA);
  assert.equal(page.sandbox.DisplayCore.SCHEMA, display.SCHEMA);
  assert.equal(page.sandbox.InvariantEvidence, page.sandbox.ManifestCore);
  assert.equal(page.sandbox.InvariantCredit, page.sandbox.CommunicateCore);
  assert.equal(typeof page.sandbox.ScienceCore.inspectExperiment, "function");
  assert.equal(page.sandbox.CommunicateCore.session, null);
  assert.equal(page.get("theme").onclick, undefined);
});

test("Display alone also supplies the reusable shell Evidence namespace", () => {
  const page = browser("shell");
  page.load("display");
  assert.equal(page.sandbox.InvariantEvidence, page.sandbox.DisplayCore);
  assert.equal(page.sandbox.InvariantEvidence.getState().current, null);
});

for (const producer of [manifest, display]) {
  for (const verifier of [manifest, display]) {
    test(`actual ${producer === manifest ? "Manifest" : "Display"} content verifies in ${
      verifier === manifest ? "Manifest" : "Display"} without elevating synthetic evidence`, async () => {
      for (const [kind, status, verdict] of [
        ["none", "declared-only", null],
        ["translation", "sample-supported", true],
        ["rotation", "sample-supported", true],
        ["shear", "sample-counterexample", false],
      ]) {
        const original = await producer.envelope(producer.defaultBody(kind));
        const checked = await verifier.verify(original);
        assert.deepEqual(checked, original);
        assert.notEqual(checked, original);
        assert.equal(checked.manifest.evidence.status, status);
        assert.equal(checked.manifest.evidence.verdict, verdict);
        assert.equal(checked.manifest.provenance.verified, false);
        assert.equal(checked.manifest.limits.independent_verification, false);
        assert.equal(checked.manifest.limits.sphere_canonical, false);
        assert.equal(checked.manifest.limits.live_agi, false);
        assert.equal(checked.manifest.contract.boundary, "derived-only");
      }
    });
  }
}

test("connectivity support is distinct from metric preservation in the actual four-point sample", async () => {
  const body = manifest.defaultBody("shear");
  body.contract.relation = "connectivity";
  body.evidence = manifest.sample("shear", 0.5, "connectivity");
  const checked = await display.verify(await manifest.envelope(body));
  assert.equal(checked.manifest.evidence.status, "sample-supported");
  assert.ok(checked.manifest.evidence.metric_residual > 0.3);
  assert.equal(checked.manifest.evidence.observed_components, 1);
});

for (const verifier of [manifest, display]) {
  test(`${verifier === manifest ? "Manifest" : "Display"} rejects tampering and recomputed false claims`, async () => {
    const original = await manifest.envelope(manifest.defaultBody("rotation"));
    const changed = structuredClone(original);
    changed.manifest.title = "Changed after binding";
    await assert.rejects(verifier.verify(changed), /digest mismatch/);
    const receipt = structuredClone(original);
    receipt.receipt.previous_receipt_hash = "a".repeat(64);
    await assert.rejects(verifier.verify(receipt), /Receipt content digest mismatch/);
    for (const mutate of [
      (body) => { body.provenance.verified = true; },
      (body) => { body.limits.sphere_canonical = true; },
      (body) => { body.evidence.status = "independently-verified"; },
      (body) => { body.evidence.metric_residual = 1; },
      (body) => { body.evidence.amount = Infinity; },
      (body) => { body.contract.boundary = "raw-media"; },
      (body) => { body.topology.nodes.push("authority"); },
      (body) => { body.transition_authority = true; },
    ]) {
      const body = manifest.defaultBody("rotation");
      mutate(body);
      await assert.rejects(verifier.verify(await manifest.envelope(body)));
    }
    const forgedPass = manifest.defaultBody("shear");
    forgedPass.evidence.status = "sample-supported";
    forgedPass.evidence.verdict = true;
    await assert.rejects(verifier.verify(await manifest.envelope(forgedPass)), /recomputation/);
    const checked = await verifier.verify(original);
    checked.manifest.title = "A caller's inspection copy";
    assert.notEqual(original.manifest.title, checked.manifest.title);
  });
}

test("valid single-record integrity does not pretend to authenticate a prior receipt chain", async () => {
  const record = await manifest.envelope(manifest.defaultBody(), "b".repeat(64), 19);
  assert.equal((await display.verify(record)).receipt.sequence, 19);
  assert.equal(record.manifest.provenance.verified, false);
});

test("async evidence verification returns the checked snapshot even if a caller edits its input", async () => {
  for (const verifier of [manifest, display]) {
    const record = await manifest.envelope(manifest.defaultBody("rotation"));
    const pending = verifier.verify(record);
    record.manifest.provenance.verified = true;
    record.manifest.evidence.status = "unearned-authority";
    const checked = await pending;
    assert.equal(checked.manifest.provenance.verified, false);
    assert.equal(checked.manifest.evidence.status, "sample-supported");
    assert.equal(await verifier.hash(checked.manifest), checked.manifest_digest);
  }
});

test("actual Manifest binding retains immutable history when the draft changes", async () => {
  const page = browser("manifest");
  for (const [id, value] of Object.entries({
    title: "Session declaration", revision: "draft-1", origin: "Synthetic fixture",
    "source-revision": "local-example", relation: "pairwise-distance", case: "rotation", amount: "50",
  })) page.get(id).value = value;
  page.load("manifest");
  await page.get("bind").onclick();
  const first = page.sandbox.ManifestCore.getState();
  assert.equal(first.history.length, 1);
  assert.equal(first.current.manifest.evidence.status, "sample-supported");
  page.get("title").value = "Unbound revision";
  page.get("title").dispatchEvent(new Event("input"));
  const edited = page.sandbox.ManifestCore.getState();
  assert.equal(edited.current, null);
  assert.equal(edited.history[0].manifest.title, "Session declaration");
  assert.equal(page.get("export").disabled, true);
  page.get("case").value = "shear";
  await page.get("bind").onclick();
  const second = page.sandbox.ManifestCore.getState();
  assert.equal(second.history.length, 2);
  assert.equal(second.current.manifest.evidence.status, "sample-counterexample");
  assert.equal(second.current.receipt.previous_receipt_hash, first.head);
  assert.equal(second.current.receipt.sequence, 2);
  page.get("evidence-record-select").value = "0";
  page.get("evidence-record-select").onchange();
  assert.equal(page.sandbox.ManifestCore.getState().current.manifest.title, "Session declaration");
  page.get("reset").onclick();
  assert.equal(page.sandbox.ManifestCore.getState().history.length, 0);
});

test("actual Display validates complete imported history before replacing its view", async () => {
  const page = browser("display");
  page.load("display");
  for (let i = 0; !page.sandbox.DisplayCore.getState().current && i < 100; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  assert.ok(page.sandbox.DisplayCore.getState().current);
  const first = await manifest.envelope(manifest.defaultBody("rotation"));
  const second = await manifest.envelope(manifest.defaultBody("shear"), first.receipt.receipt_hash, 2);
  const history = {
    schema: "scandoc-zero-manifest-history-preview/v1",
    records: [first, second], head: second.receipt.receipt_hash,
  };
  const load = async (value) => {
    const json = JSON.stringify(value);
    page.get("import").files = [{ size: Buffer.byteLength(json), text: async () => json }];
    await page.get("import").onchange();
  };
  await load(history);
  assert.equal(page.get("record-select").options.length, 2);
  page.get("record-select").value = "1";
  page.get("record-select").onchange();
  const valid = page.sandbox.DisplayCore.getState().current;
  assert.equal(valid.manifest.evidence.status, "sample-counterexample");
  history.head = "f".repeat(64);
  await load(history);
  assert.match(page.get("action-title").textContent, /Import rejected/);
  assert.equal(page.sandbox.DisplayCore.getState().current.manifest_digest, valid.manifest_digest);
  page.get("clear").onclick();
  assert.equal(page.sandbox.DisplayCore.getState().current, null);
});

test("Study inspection reuses the public science metric and rejects unsupported inputs", () => {
  for (const kind of ["translation", "rotation", "shear"]) {
    for (const amount of [0, 0.2, 0.5, 1]) {
      const result = science.inspectExperiment(kind, amount);
      assert.equal(result.max_distance_error, science.residual(science.transformPoints(kind, amount)));
      assert.equal(result.preserved, kind !== "shear" || amount === 0);
      assert.equal(result.sphere_canonical, false);
      assert.equal(result.claim, "metric preservation in this sample only");
    }
  }
  for (const [kind, amount] of [["unknown", 0.5], ["rotation", NaN], ["shear", -1], ["shear", 2]]) {
    assert.throws(() => science.inspectExperiment(kind, amount), /supported synthetic/);
  }
  assert.equal(science.createEngine, undefined);
});

test("actual science() notebook accepts questions, notes and counterexamples without Credit", () => {
  const page = browser("science");
  page.get("transformation").value = "shear";
  page.get("amount").value = "50";
  page.load("science");
  page.get("note").value = "What changes when distances do not survive?";
  page.get("note").oninput();
  assert.equal(page.get("add-observation").disabled, false);
  page.get("add-observation").onclick();
  assert.equal(page.get("journal-count").textContent, "1 observations");
  assert.equal(page.get("journal-list").children[0].children[0].textContent, "Question 1");
  assert.equal(page.get("journal-list").children[0].children[1].textContent, "Research question · not a result");
  page.get("compare").onclick();
  assert.equal(page.get("test-status").dataset.state, "fail");
  page.get("add-observation").onclick();
  assert.equal(page.get("journal-count").textContent, "2 observations");
  assert.equal(page.get("journal-list").children[0].children[1].textContent, "shear · sample changed");
  page.get("clear").onclick();
  assert.equal(page.get("journal-count").textContent, "0 observations");
  assert.equal(page.sandbox.CommunicateCore, undefined);
});

test("Credit protects max(stake, reward) and conserves actual staged success settlement", async () => {
  const engine = communicate.createEngine();
  await engine.reserve("rigid", 5, 12);
  let state = conserved(engine);
  assert.deepEqual([state.wallet, state.held, state.pool, state.pool_reserved], [15, 5, 88, 12]);
  assert.equal(state.admission.stage, "RESERVED");
  await engine.run();
  state = conserved(engine);
  assert.equal(state.admission.stage, "CHECKED_PASS");
  assert.equal(state.wallet, 15);
  await engine.settle();
  state = conserved(engine);
  assert.deepEqual([state.wallet, state.held, state.pool, state.pool_reserved], [32, 0, 88, 0]);
  assert.equal(state.last_status, "SETTLED_PASS");
  assert.equal(state.receipts.at(-1).data.bonus, 12);
  assert.equal(state.receipts.at(-1).data.compensation, 0);
  for (const [index, receipt] of state.receipts.entries()) {
    assert.equal(receipt.policy_version, "communicate-rules-preview-2");
    assert.equal(receipt.sequence, index + 1);
    assert.equal(receipt.previous_hash, index ? state.receipts[index - 1].hash : "0".repeat(64));
    const { hash, ...body } = receipt;
    assert.equal(await manifest.hash(body), hash);
  }
});

test("Credit rejects duplicate terminal settlement and locks policy without replacing state", async () => {
  const engine = communicate.createEngine();
  await engine.reserve();
  await engine.run();
  await engine.settle();
  const before = engine.getState();
  await assert.rejects(engine.settle(), /No active admission/);
  await assert.rejects(engine.burn(), /No active admission/);
  await assert.rejects(engine.reserve(), /already settled or revoked/);
  await assert.rejects(engine.reserve("shear", 9, 4), /locked/);
  assert.deepEqual(engine.getState(), before);
  conserved(engine);
});

test("Credit rejects shear and raw-input modules without a reward or fault compensation", async () => {
  for (const moduleId of ["shear", "leak"]) {
    const engine = communicate.createEngine();
    await engine.reserve(moduleId);
    await engine.run(moduleId === "leak" ? "host-fault" : "normal");
    let state = conserved(engine);
    assert.equal(state.admission.stage, "CHECKED_REJECT");
    assert.equal(state.admission.fault, null);
    assert.equal(state.admission.checks[0][1], moduleId === "leak" ? "FAIL" : "PASS");
    if (moduleId === "leak") assert.equal(state.admission.metric_errors, undefined);
    await assert.rejects(engine.reviewFault(), /unreviewed host fault/);
    await assert.rejects(engine.burn("system-fault"), /admission-bound host fault/);
    await engine.settle();
    state = conserved(engine);
    assert.deepEqual([state.wallet, state.held, state.pool, state.pool_reserved], [20, 0, 100, 0]);
    assert.equal(state.last_status, "SETTLED_REJECT");
  }
});

test("Credit voluntary revocation returns the stake and preserves the normalized module hash", async () => {
  const engine = communicate.createEngine();
  await engine.reserve();
  const hash = engine.getState().admission.hash;
  await engine.burn();
  const state = conserved(engine);
  assert.deepEqual([state.wallet, state.held, state.pool, state.pool_reserved], [20, 0, 100, 0]);
  assert.equal(state.last_status, "REVOKED");
  assert.equal(state.receipts.at(-1).data.module_hash, hash);
  assert.equal(state.receipts.at(-1).data.hash_preserved, true);
  assert.equal(state.receipts.at(-1).data.compensation, 0);
  await assert.rejects(engine.reserve(), /already settled or revoked/);
});

test("Credit requires admission-bound simulated fault review before the double return", async () => {
  const engine = communicate.createEngine();
  await engine.reserve();
  await assert.rejects(engine.burn("system-fault"), /admission-bound host fault/);
  await engine.run("host-fault");
  let state = conserved(engine);
  assert.equal(state.admission.fault.admission_id, state.admission.id);
  assert.equal(state.admission.fault.module_hash, state.admission.hash);
  assert.equal(state.admission.fault.simulated, true);
  await assert.rejects(engine.burn("system-fault"), /recorded fixture review/);
  await assert.rejects(engine.settle(), /normal checks/);
  await engine.reviewFault();
  await assert.rejects(engine.reviewFault(), /unreviewed host fault/);
  await engine.burn("system-fault");
  state = conserved(engine);
  assert.deepEqual([state.wallet, state.held, state.pool, state.pool_reserved], [30, 0, 90, 0]);
  assert.equal(state.receipts.at(-1).data.compensation, 10);
  assert.equal(state.receipts.at(-1).data.bonus, 0);
  assert.equal(state.receipts.at(-1).data.total_return, 20);
  assert.equal(state.receipts.at(-1).data.independent_adjudication, false);
  await assert.rejects(engine.burn("system-fault"), /No active admission/);
  await engine.reserve("shear");
  await assert.rejects(engine.burn("system-fault"), /admission-bound host fault/);
});

test("Credit stages validation and hashing before replacement and refuses concurrent transitions", async () => {
  const engine = communicate.createEngine();
  const before = engine.getState();
  for (const args of [["rigid", 0, 4], ["rigid", 10, 21], ["unknown"], ["__proto__"]]) {
    await assert.rejects(engine.reserve(...args));
    assert.deepEqual(engine.getState(), before);
  }
  const invalid = { ...before, wallet: 21 };
  assert.throws(() => engine.assertAccounting(invalid), /does not conserve/);
  assert.throws(() => engine.assertAccounting({ ...before, wallet: -1 }), /invalid balance/);
  const pending = engine.reserve();
  await assert.rejects(engine.reserve("shear"), /already in progress/);
  assert.throws(() => engine.reset(), /already in progress/);
  await pending;
  const reserved = conserved(engine);
  await assert.rejects(engine.settle(), /normal checks/);
  await assert.rejects(engine.run("invented-scenario"), /defined evaluation scenario/);
  assert.deepEqual(engine.getState(), reserved);
  const inspection = engine.getState();
  inspection.wallet = 9000;
  inspection.admission.fault = { reviewed: true };
  assert.deepEqual(engine.getState(), reserved);
});

test("failed receipt hashing leaves the actual staged Credit engine untouched", async () => {
  const page = browser("shell");
  page.load("communicate");
  const engine = page.sandbox.CommunicateCore.createEngine();
  const before = engine.getState();
  page.sandbox.crypto = { subtle: { digest: async () => { throw Error("hash unavailable"); } } };
  await assert.rejects(engine.reserve(), /hash unavailable/);
  assert.deepEqual(engine.getState(), before);
  page.sandbox.crypto = webcrypto;
  await engine.reserve();
  const reserved = engine.getState();
  page.sandbox.crypto = { subtle: { digest: async () => { throw Error("hash unavailable"); } } };
  await assert.rejects(engine.run(), /hash unavailable/);
  assert.deepEqual(engine.getState(), reserved);
});

test("actual Credit page handlers and reusable session share the same staged state", async () => {
  const page = browser("communicate");
  page.get("module").value = "rigid";
  page.get("stake").value = "10";
  page.get("reward").value = "4";
  page.get("evaluation-scenario").value = "normal";
  page.load("communicate");
  await page.get("reserve").onclick();
  assert.equal(page.sandbox.CommunicateCore.session.getState().held, 10);
  assert.equal(page.get("held").textContent, 10);
  await page.get("run").onclick();
  assert.equal(page.get("admission-state").textContent, "CHECKED_PASS");
  await page.get("settle").onclick();
  assert.equal(page.get("wallet").textContent, 24);
  assert.equal(page.sandbox.CommunicateCore.session.getState().wallet, 24);
  page.get("reset").onclick();
  assert.equal(page.get("wallet").textContent, 20);
});
