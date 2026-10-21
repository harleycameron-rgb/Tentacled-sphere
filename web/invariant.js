(function () {
  "use strict";
  const S = window.InvariantSession;
  const session = new S.Session();
  const labels = {
    tap: "Tap", surface: "Surface", "evidence-gate": "Evidence Gate",
    "modular-topology": "Modular Topology", "credit-game": "Credit Game",
    "study-environment": "Study Environment", sphere: "Sphere / shared state",
  };
  const sources = {
    tap: "/vendor/tap/index.html",
    surface: "/vendor/previews/site/surface/index.html",
    "evidence-gate": "/vendor/previews/site/manifest/index.html",
    "credit-game": "/vendor/previews/site/communicate/index.html",
    "study-environment": "/vendor/previews/site/science/index.html",
  };
  const $ = (id) => document.getElementById(id);
  let route = "sphere", frame = null, generation = 0, suspended = false;
  let bridge = null, committing = false;
  const node = (tag, text, parent) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (parent) parent.append(element);
    return element;
  };
  const status = (text) => { $("status").textContent = text; };
  const show = (value) => { $("record-output").textContent = JSON.stringify(value, null, 2); };
  function button(text, parent, action) {
    const element = node("button", text, parent);
    element.type = "button";
    element.addEventListener("click", () => Promise.resolve().then(action).catch(reject));
    return element;
  }
  function reject(error) { status(`Local operation rejected: ${error.message}`); }
  function selected() { return session.inspect($("record-select").value); }
  function invalidateBridge() {
    bridge = null;
    $("derived-context")?.remove();
    if (frame) frame.contentWindow.postMessage({
      type: "invariant:derived-input",
      status: "Prior dependency superseded by a newer Surface result. No current feedback binding.",
    }, location.origin);
  }
  function refresh() {
    $("session-summary").textContent =
      `Session ${session.sessionId} · revision ${session.revision} · ${session.records.length}/64 retained records · memory only`;
    const prior = $("record-select").value;
    $("record-select").replaceChildren();
    for (const record of session.records) {
      const option = node("option", `${record.revision} · ${record.type} · ${record.route}`, $("record-select"));
      option.value = record.id;
    }
    if (session.inspect(prior)) $("record-select").value = prior;
    else if (session.records.length) $("record-select").value = session.records.at(-1).id;
    $("bridges").replaceChildren();
    for (const target of ["tap", "study-environment", "evidence-gate"]) {
      button(`Bridge selected Surface result to ${labels[target]}`, $("bridges"), async () => {
        const record = selected();
        if (!record) throw Error("No retained source contribution.");
        const activeGeneration = generation;
        bridge = await session.bridge(target, record.id, session.headCommitment);
        refresh();
        if (activeGeneration !== generation) return;
        show(bridge);
        navigate(target);
        status(`Permitted local ${bridge.capability}; original scope retained. No sensor activation or launch authority.`);
      });
    }
  }
  function stopFrame() {
    generation += 1;
    if (frame) {
      frame.src = "about:blank";
      frame.remove();
      frame = null;
    }
  }
  function mountSource(source, host) {
    stopFrame();
    const activeGeneration = generation;
    frame = document.createElement("iframe");
    frame.title = `${labels[route]} · pinned public source`;
    // No popups, top navigation or service workers are needed by the local instruments.
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
    frame.setAttribute("allow", "camera 'none'; microphone 'none'; geolocation 'none'");
    frame.src = source;
    frame.addEventListener("load", () => {
      if (activeGeneration !== generation || !frame) return;
      frame.contentWindow.postMessage({
        type: "invariant:derived-input",
        status: bridge && bridge.route === route
          ? `${bridge.adapter} · session revision ${bridge.revision} · dependency ${bridge.dependency.commitment.slice(0, 16)} · ${bridge.scope}`
          : "No current feedback binding; prior dependencies, if any, are superseded.",
      }, location.origin);
    });
    host.append(frame);
  }
  function topology(host) {
    node("p", "Explicit adapter registry and dependency policy—not semantic registration by geometry or repository order.", host);
    node("pre", JSON.stringify(S.registry, null, 2), host);
    const from = node("select", undefined, host), to = node("select", undefined, host);
    from.setAttribute("aria-label", "Transition source");
    to.setAttribute("aria-label", "Transition destination");
    for (const id of S.ROUTES) {
      for (const select of [from, to]) {
        const option = node("option", labels[id], select);
        option.value = id;
      }
    }
    from.value = "surface";
    to.value = "tap";
    const result = node("pre", "Choose a local transition to inspect its compatibility.", host);
    for (const capability of ["local-derived", "engine.input", "launch"]) {
      button(`Check ${capability}`, host, () => {
        result.textContent = JSON.stringify(session.checkTransition(from.value, to.value, capability), null, 2);
      });
    }
    node("p", "A permitted edge still needs a retained, current, session-bound contribution. Tap → Surface measured binding is unavailable; Surface → Tap supplies derived feedback only. Credit never establishes evidence validity.", host);
  }
  function evidence(host) {
    const panel = node("section", undefined, host);
    node("h2", "Reusable Manifest content-integrity checks", panel);
    node("p", "Preview evidence is not a transition authorization schema. Synthetic sample support does not qualify instrument measurements, source origin or launch.", panel);
    const output = node("pre", "No preview record checked. Origin remains unverified.", panel);
    async function verify(value) {
      const checked = await window.ManifestCore.verify(value);
      output.textContent = JSON.stringify({
        decision: checked.manifest.evidence.status,
        scope: checked.manifest.evidence.scope,
        origin: "UNVERIFIED", authorization: false, liveGate: "CLOSED",
        sessionId: session.sessionId,
        binding: "preview-content-only-not-instrument-evidence",
        record: checked,
      }, null, 2);
    }
    for (const kind of ["none", "rotation", "shear"]) {
      button(`Check synthetic ${kind}`, panel, async () => {
        const E = window.ManifestCore;
        await verify(await E.envelope(E.defaultBody(kind)));
      });
    }
    const input = node("input", undefined, panel);
    input.type = "file";
    input.accept = "application/json";
    input.setAttribute("aria-label", "Inspect local Manifest preview JSON");
    input.addEventListener("change", async () => {
      try {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 65536) throw Error("Preview record exceeds 64 KB.");
        await verify(JSON.parse(await file.text()));
      } catch (error) {
        output.textContent = `Rejected; no authority granted: ${error.message}`;
      } finally { input.value = ""; }
    });
    const tabs = node("div", undefined, host);
    tabs.className = "tabs";
    const sourceHost = node("div", undefined, host);
    button("Manifest declaration workspace", tabs, () =>
      mountSource("/vendor/previews/site/manifest/index.html", sourceHost));
    button("Display content-bound inspection", tabs, () =>
      mountSource("/vendor/previews/site/display/index.html", sourceHost));
    mountSource(sources[route], sourceHost);
  }
  function render() {
    stopFrame();
    const host = $("workspace");
    host.replaceChildren();
    node("h1", labels[route] || "Local route denied", host);
    for (const link of document.querySelectorAll("[data-route]")) {
      if (link.dataset.route === route) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    if (!Object.hasOwn(labels, route)) {
      node("p", "No capability is registered for this route. No dispatch attempted.", host);
      return;
    }
    if (suspended && sources[route]) {
      node("p", "View deactivated. Audio, sensors and source frame stopped. Returning never resumes sensors automatically.", host);
      button("Reopen instrument (permissions remain explicit)", host, () => {
        suspended = false;
        render();
      });
      return;
    }
    if (bridge && bridge.route === route) {
      const context = node("section", undefined, host);
      context.id = "derived-context";
      node("p", "Received versioned local-derived dependency, not a new observation or qualified authorization:", context);
      node("pre", JSON.stringify(bridge, null, 2), context);
    }
    if (route === "sphere") {
      node("p", "Six functional boundaries share this bounded local session. Instruments retain their actual public implementations. Select Surface, interact with its pad, then explicitly bridge its derived classification to Tap, Study or Evidence.", host);
      node("p", "Tap's moiré, floating controls, permissions, compass/motion and sound operate locally; no safe measured Tap output binding is supplied. Surface classifications are not calibrated physical coordinates. All private paired-renewal and fourth-axis qualifications remain unresolved.", host);
      button("Inspect shared state and launch blockers", host, () => show(session.inspect()));
      node("p", "Geographic north-pole calculations below remain read-only, distinct from the celestial pole and from measured instrument state. No undefined direction fires Sentinel.", host);
    } else if (route === "modular-topology") topology(host);
    else if (route === "evidence-gate") evidence(host);
    else {
      if (route === "tap") node("p", "Surface → Tap feedback is inspectable derived context only; Tap → Surface measurement binding unavailable.", host);
      if (route === "surface") node("p", "Only bounded summaries of the inspected model's sixteen-step derived rhythm cross this adapter; raw contact paths, tilt and media do not. Fixture and keyboard sources remain explicitly labelled, not real observations.", host);
      if (route === "credit-game") node("p", "communicate-rules-preview-2 · noncash simulation, isolated from geometry, evidence and session budgets. wallet + held + pool + pool_reserved = 120. Reloading this view resets its sandbox; credit is never contributor worth.", host);
      if (route === "study-environment") node("p", "Knowledge access has no credit prerequisite. Inspect supported session records below with their original scope; unsupported schemas and absent independent observations stay unresolved. No private paired-renewal controls are claimed.", host);
      mountSource(sources[route], host);
    }
  }
  function pathRoute() {
    const path = location.pathname.replace(/\/index\.html$/, "").replace(/\/$/, "");
    return path === "/invariant" ? "sphere" : path.slice("/invariant/".length);
  }
  function navigate(next, push = true) {
    if (next !== "sphere" && !S.ROUTES.includes(next)) {
      status("Local route denied; no dispatch attempted.");
      return;
    }
    if (push) history.pushState(null, "", next === "sphere" ? "/invariant" : `/invariant/${next}`);
    route = next;
    render();
  }
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-route]");
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(link.dataset.route);
  });
  window.addEventListener("popstate", () => {
    route = pathRoute();
    render();
  });
  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin || !frame || event.source !== frame.contentWindow) return;
    if (event.data?.type === "invariant:return/v1" && Object.keys(event.data).length === 1) {
      navigate("sphere");
      return;
    }
    if (route !== "surface" || event.data?.type !== "invariant:instrument-output") return;
    if (committing) return;
    const activeGeneration = generation;
    const output = event.data.record;
    committing = true;
    Promise.resolve().then(async () => {
      if (activeGeneration !== generation) return;
      const record = await session.admitInstrument(output);
      invalidateBridge();
      refresh();
      $("record-select").value = record.id;
      show(record);
      if (activeGeneration !== generation) return;
      status("Surface-model derived rhythm summary admitted locally; original interaction/fixture source retained. No calibrated physical measurement or independent evidence claimed.");
    }).catch(reject).finally(() => { committing = false; });
  });
  $("inspect-record").addEventListener("click", async () => {
    try {
      const result = await session.inspectVerified($("record-select").value);
      show({
        ...result,
        scope: "session-record-content-integrity-only",
        authorization: false, independentObservations: "unresolved",
        reason: result.integrity ? "Content commitment matches; source origin and physical interpretation remain unverified."
          : "Unsupported or missing session result; no independent observations.",
      });
    } catch (error) { reject(error); }
  });
  $("reset-session").addEventListener("click", () => {
    session.reset();
    bridge = null;
    refresh();
    show({ status: "unresolved", reason: "Session reset; old contributions invalid." });
    render();
    status("New local session. Prior dependencies are invalid; sensors have not resumed.");
  });
  function deactivate() {
    suspended = true;
    stopFrame();
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) deactivate();
    else if (suspended) render();
  });
  window.addEventListener("pagehide", deactivate);
  window.addEventListener("pageshow", (event) => { if (event.persisted) render(); });
  route = pathRoute();
  refresh();
  render();
})();
