(function () {
  "use strict";

  const G = window.TentacledGeometry;
  const P = window.TentacledProtocol;
  const AudioClient = window.TentacledAudio;
  const APP_NAMES = ["Tap", "Surface", "SpiritLevel", "Gain", "Habitat", "Time", "Space", "Lineage"];
  const CENTER = [1024, 1024, 0];
  const ACK_TIMEOUT_MS = 12000;
  const bodyApp = document.body.dataset.app;
  const isHome = bodyApp === "home";

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function apiVectorsFrom(data) {
    if (!data || !Array.isArray(data.tentacles) || data.tentacles.length !== 8) {
      throw new Error("The geometry API did not return exactly eight arms.");
    }
    return data.tentacles.map((item, index) => {
      if (item.index !== index || !Array.isArray(item.vector) ||
          item.vector.length !== 3 || !item.vector.every(Number.isFinite) ||
          Math.abs(Math.hypot(...item.vector) - 1) > 1e-10) {
        throw new Error(`The geometry API returned an invalid arm at index ${index}.`);
      }
      return [...item.vector];
    });
  }

  async function loadApi() {
    const response = await fetch("/api/tentacled-sphere?seed=1.0&delta=0.1137", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Geometry API returned HTTP ${response.status}.`);
    const data = await response.json();
    return { data, vectors: apiVectorsFrom(data) };
  }

  function localTimeVector() {
    const now = new Date();
    const seconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const phase = seconds * 2 * Math.PI / 86400;
    return [Math.cos(phase), Math.sin(phase), 0];
  }

  function initAppPage(apiVectors) {
    const appId = bodyApp;
    const appIndex = G.APP_IDS.indexOf(appId);
    const apiReady = Boolean(apiVectors);
    const audio = new AudioClient();
    let active = false;
    let sensorListeners = null;
    let clockTimer = null;
    let cameraStream = null;
    let cameraRequest = 0;
    let feedSequence = 0;
    let lastSnapshot = null;
    let snapshotQueue = Promise.resolve();
    let currentVector = apiReady ? apiVectors[appIndex] : null;

    const feedStatus = document.getElementById("feed-status");
    const appStatus = document.getElementById("app-status");
    const positionOutput = document.getElementById("applied-position");
    const camera = document.getElementById("camera-preview");
    const soundStatus = document.getElementById("sound-status");
    const standalone = window.parent === window;

    if (!apiReady) {
      appStatus.textContent = "API geometry is unavailable. This app is incomplete until the API responds; no browser-generated replacement was used.";
      appStatus.classList.add("error");
      document.querySelectorAll(".sound-buttons button, #start-sensors, #start-clock")
        .forEach((button) => { button.disabled = true; });
    } else {
      appStatus.textContent = `Loaded API arm ${appIndex} (${appId}). Device geometry is optional and app-local.`;
      if (appId === "time") document.getElementById("start-clock").hidden = false;
      positionOutput.textContent = JSON.stringify({ vector: currentVector, source: "API baseline" });
    }

    function updatePosition(position, source) {
      positionOutput.textContent = JSON.stringify({ vector: position, source }, null, 2);
      currentVector = G.normalize(position);
      audio.updateVector(currentVector);
      setText("sound-source", source === "synthetic-clock"
        ? "Live sound is following a synthetic local-clock vector, not a device measurement."
        : "Live sound uses the accepted API or shared geometry arm when device geometry is absent.");
    }

    function sendFeed(vector, source) {
      if (!G || !P) return;
      const feed = {
        appId,
        sequence: ++feedSequence,
        timestamp: Date.now(),
        vector: G.normalize(vector),
        source,
      };
      updatePosition(feed.vector, source);
      feedStatus.textContent = source === "synthetic-clock"
        ? "Using a clearly labeled synthetic local-clock vector."
        : "Using this app's most recent valid device-orientation vector.";
      if (!standalone) window.parent.postMessage({ type: "sphere:feed", feed }, location.origin);
    }

    function stopCamera() {
      cameraRequest += 1;
      if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
      camera.srcObject = null;
      camera.hidden = true;
      const button = document.getElementById("camera-toggle");
      if (button) button.textContent = "Start camera preview";
    }

    function pause() {
      active = false;
      if (sensorListeners) {
        window.removeEventListener("deviceorientation", sensorListeners.orientation);
        sensorListeners = null;
      }
      if (clockTimer !== null) {
        clearInterval(clockTimer);
        clockTimer = null;
      }
      stopCamera();
      audio.stopAll().catch(() => {});
      if (apiReady) updatePosition(apiVectors[appIndex], "API baseline restored");
      feedStatus.textContent = "Paused. Sensors, timers, audio, and camera are stopped; the API baseline is restored.";
      if (!standalone) window.parent.postMessage({
        type: "sphere:feed-clear",
        appId,
        timestamp: Date.now(),
        sequence: ++feedSequence,
      }, location.origin);
      setText("sound-status", "Sound is off.");
    }

    async function enableSensors() {
      if (!apiReady) return;
      try {
        const permissions = [];
        if (typeof window.DeviceOrientationEvent?.requestPermission === "function") {
          permissions.push(await window.DeviceOrientationEvent.requestPermission());
        }
        if (permissions.includes("denied")) {
          feedStatus.textContent = "Device sensor permission was denied.";
          return;
        }
        if (!("DeviceOrientationEvent" in window)) {
          feedStatus.textContent = "Device orientation is unavailable; the API baseline remains active.";
          return;
        }
        pause();
        active = true;
        const orientation = (event) => {
          if (!active || !Number.isFinite(event.alpha) ||
              !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) {
            return;
          }
          const alpha = event.alpha * Math.PI / 180;
          const beta = event.beta * Math.PI / 180;
          const vector = [
            Math.cos(beta) * Math.cos(alpha),
            Math.cos(beta) * Math.sin(alpha),
            Math.sin(beta),
          ];
          if (Math.hypot(...vector) <= G.EPSILON) return;
          sendFeed(vector, "device-orientation");
        };
        sensorListeners = { orientation };
        window.addEventListener("deviceorientation", orientation);
        feedStatus.textContent = "Waiting for finite device-orientation readings; missing sensor values are not replaced.";
      } catch (error) {
        feedStatus.textContent = `Could not enable device sensors: ${error.message}`;
      }
    }

    document.getElementById("start-sensors").addEventListener("click", enableSensors);
    document.getElementById("pause-app").addEventListener("click", pause);
    document.getElementById("start-clock").addEventListener("click", () => {
      if (appId !== "time" || !apiReady) return;
      pause();
      active = true;
      const tick = () => sendFeed(localTimeVector(), "synthetic-clock");
      tick();
      clockTimer = setInterval(tick, 1000);
    });

    document.getElementById("camera-toggle").addEventListener("click", async (event) => {
      if (cameraStream) {
        stopCamera();
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        feedStatus.textContent = "Camera preview is unavailable in this browser context.";
        return;
      }
      const requestId = ++cameraRequest;
      event.currentTarget.disabled = true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (requestId !== cameraRequest || document.hidden) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStream = stream;
        camera.srcObject = stream;
        camera.hidden = false;
        await camera.play();
        event.currentTarget.textContent = "Stop camera preview";
      } catch (error) {
        if (requestId === cameraRequest) {
          feedStatus.textContent = `Camera preview could not start: ${error.message}`;
        }
      } finally {
        event.currentTarget.disabled = false;
      }
    });
    document.getElementById("cancel-camera").addEventListener("click", stopCamera);

    document.getElementById("waveform").addEventListener("change", (event) =>
      audio.setWaveform(event.target.value));
    document.getElementById("volume").addEventListener("input", (event) => {
      audio.setVolume(event.target.value);
      setText("volume-value", `${Math.round(Number(event.target.value) * 100)}%`);
    });
    document.getElementById("tone").addEventListener("input", (event) => {
      audio.setTone(event.target.value);
      setText("tone-value", `${event.target.value} Hz`);
    });
    document.querySelectorAll("[data-sound]").forEach((button) => {
      button.addEventListener("click", async () => {
        const type = button.dataset.sound;
        if (type === "stop") {
          await audio.stopAll();
          soundStatus.textContent = "All sound generators and audio resources are stopped.";
          return;
        }
        if (!apiReady || !currentVector) {
          soundStatus.textContent = "Sound is unavailable because no accepted geometry vector is available.";
          return;
        }
        try {
          if (type === "live") {
            await audio.startLive(currentVector);
            soundStatus.textContent = "Live local sound follows this arm's available geometry.";
          } else {
            await audio.play(type);
            soundStatus.textContent = `${type} generated locally from the active app page.`;
          }
        } catch (error) {
          soundStatus.textContent = `Sound could not start: ${error.message}`;
        }
      });
    });

    async function acceptSnapshot(message) {
      const validation = await P.validateAppSnapshot(
        message.envelope, appId, message.ignitionId, lastSnapshot,
      );
      if (!validation.valid) return;
      const { snapshot, hash } = message.envelope;
      const ownArm = validation.arm;
      lastSnapshot = { revisionSequence: snapshot.revisionSequence, hash };
      updatePosition(ownArm.vector, snapshot.derivedFeeds?.[appId]?.source || "shared geometry");
      const acknowledgement = await P.makeAcknowledgement(appId, snapshot, hash, message.ignitionId);
      setText("ack-status", `Acknowledged revision ${snapshot.revisionSequence}; receipt ${acknowledgement.receiptHash.slice(0, 16)}…`);
      window.parent.postMessage({
        type: "sphere:ack",
        acknowledgement,
      }, location.origin);
    }

    window.addEventListener("message", (event) => {
      if (standalone || event.origin !== location.origin || event.source !== window.parent ||
          !event.data || typeof event.data !== "object") return;
      if (event.data.type === "sphere:snapshot") {
        snapshotQueue = snapshotQueue.then(() => acceptSnapshot(event.data)).catch(() => {});
      } else if (event.data.type === "sphere:deactivate") {
        pause();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pause();
    });
    window.addEventListener("pagehide", pause);
    setText("ack-status", standalone
      ? "Standalone view; it acknowledges snapshots only when embedded by the integrated view."
      : "Waiting for a verified shared snapshot.");
  }

  function initHome(apiData, apiVectors) {
    const homeStatus = document.getElementById("home-status");
    const apiBaselineVectors = apiVectors;
    const sessionId = (typeof crypto.randomUUID === "function")
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const feeds = {};
    const frames = new Map();
    let revisionSequence = 0;
    let previousHash = null;
    let currentEnvelope = null;
    let currentBasket = null;
    let currentIgnitionId = null;
    let sentinelReceipt = null;
    let undoConfiguration = null;
    let operationQueue = Promise.resolve();
    let feedTimer = null;

    const initialConfiguration = {
      model: "api",
      yaw: 0,
      tilt: 0,
      radius: 1,
      pulseMode: "rigid",
      amplitude: 0.1137,
      count: 0,
    };
    let configuration = { ...initialConfiguration };

    function createFrames() {
      const tabs = document.getElementById("app-tabs");
      const container = document.getElementById("app-frames");
      G.APP_IDS.forEach((appId, index) => {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.textContent = APP_NAMES[index];
        tab.setAttribute("aria-selected", String(index === 0));
        tab.addEventListener("click", () => selectApp(appId));
        tabs.appendChild(tab);
        const frame = document.createElement("iframe");
        frame.className = "app-frame";
        frame.title = `${APP_NAMES[index]} app`;
        frame.src = `/apps/${appId}.html`;
        frame.hidden = index !== 0;
        frame.addEventListener("load", () => {
          frames.set(appId, frame);
          updateAckDisplay();
          if (currentEnvelope) sendSnapshotTo(appId);
        });
        container.appendChild(frame);
        frames.set(appId, frame);
      });
    }

    function selectApp(selected) {
      for (const [appId, frame] of frames) {
        const active = appId === selected;
        frame.hidden = !active;
        if (!active) frame.contentWindow?.postMessage({ type: "sphere:deactivate" }, location.origin);
      }
      [...document.querySelectorAll("#app-tabs button")].forEach((button, index) =>
        button.setAttribute("aria-selected", String(G.APP_IDS[index] === selected)));
    }

    function stateGeometry(config) {
      const source = config.model === "cube"
        ? G.cubeModel()
        : G.apiModel(apiBaselineVectors);
      const baseArms = source.arms.map((vector, index) =>
        feeds[G.APP_IDS[index]] ? G.normalize(feeds[G.APP_IDS[index]].vector) : vector);
      const transformedArms = baseArms.map((vector) =>
        G.transformVector(vector, { yaw: config.yaw, tilt: config.tilt }));
      const transformedPorts = source.ports.map((vector) =>
        G.transformVector(vector, { yaw: config.yaw, tilt: config.tilt }));
      return G.pulseModel({
        ...source,
        arms: transformedArms,
        ports: transformedPorts,
      }, {
        mode: config.pulseMode,
        count: config.count,
        amplitude: config.amplitude,
      });
    }

    function makeSnapshot(config, ignitionId, revision, previous) {
      const geometry = stateGeometry(config);
      const finalArms = geometry.arms.map((vector, index) => ({
        appId: G.APP_IDS[index],
        vector,
        position: CENTER.map((value, axis) => value + vector[axis] * config.radius),
      }));
      const finalPorts = geometry.ports.map((vector, index) => ({
        port: ["+X", "-X", "+Y", "-Y", "+Z", "-Z"][index],
        vector,
        position: CENTER.map((value, axis) => value + vector[axis] * config.radius),
      }));
      return {
        schemaVersion: 1,
        sessionId,
        revisionSequence: revision,
        previousSnapshotHash: previous,
        geometryModel: config.model,
        armOrdering: G.APP_IDS,
        apiParameters: config.model === "api"
          ? { seed: apiData.seed, delta: apiData.delta }
          : null,
        apiBaselineVectors: config.model === "api" ? apiBaselineVectors : null,
        cubeModelParameters: config.model === "cube"
          ? { signs: G.CUBE_SIGNS, ports: G.PORTS, portOrdering: ["+X", "-X", "+Y", "-Y", "+Z", "-Z"] }
          : null,
        center: CENTER,
        tiltRadians: config.tilt,
        radius: config.radius,
        yawRadians: config.yaw,
        derivedFeeds: Object.fromEntries(G.APP_IDS.map((id) => [id, feeds[id] || null])),
        sentinel: {
          mode: config.pulseMode,
          amplitude: config.amplitude,
          count: config.count,
          timestamp: new Date().toISOString(),
          identifier: ignitionId,
        },
        finalArms,
        finalPorts,
      };
    }

    function currentViewVectors(snapshot) {
      return snapshot.finalArms.map((arm) => arm.vector);
    }

    function formatDegrees(radians) {
      return `${Math.round(Number(radians) * 180 / Math.PI)}°`;
    }

    function renderScene() {
      if (!currentEnvelope) return;
      const { snapshot } = currentEnvelope;
      const svg = document.getElementById("sphere");
      const model = snapshot.geometryModel === "cube" ? G.cubeModel() : null;
      const arms = currentViewVectors(snapshot);
      const ports = snapshot.finalPorts.map((entry) => entry.vector);
      const viewYaw = Number(document.getElementById("view-yaw").value) * Math.PI / 180;
      const viewTilt = Number(document.getElementById("view-tilt").value) * Math.PI / 180;
      const scale = Math.min(150, 60 + snapshot.radius * 70);
      const view = (vector) => G.rotateX(G.rotateZ(vector, viewYaw), viewTilt);
      const project = (vector) => {
        const v = view(vector);
        return {
          x: 210 + (v[0] * 0.88 - v[1] * 0.46) * scale,
          y: 180 - (v[0] * 0.25 + v[1] * 0.45 + v[2] * 0.86) * scale,
          depth: v[0] * 0.25 + v[1] * 0.45 + v[2] * 0.86,
        };
      };
      const slerp = (a, b, t) => {
        const cosine = Math.max(-1, Math.min(1, G.dot(a, b)));
        const angle = Math.acos(cosine);
        if (Math.abs(angle) < 1e-9) return a;
        const denominator = Math.sin(angle);
        return a.map((value, axis) =>
          (Math.sin((1 - t) * angle) * value + Math.sin(t * angle) * b[axis]) / denominator);
      };
      const arcPath = (a, b) => {
        const points = Array.from({ length: 21 }, (_, index) => project(slerp(a, b, index / 20)));
        return points.map((point, index) =>
          `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
      };
      const parts = [
        '<line class="axis" x1="30" y1="180" x2="390" y2="180"/>',
        '<line class="axis" x1="210" y1="20" x2="210" y2="340"/>',
      ];
      if (model) {
        for (const [left, right] of G.cubeEdges()) {
          parts.push(`<path class="edge-arm" d="${arcPath(arms[left], arms[right])}"/>`);
        }
        for (const [left, right] of G.portEdges()) {
          parts.push(`<path class="edge-port" d="${arcPath(ports[left], ports[right])}"/>`);
        }
      }
      arms.forEach((vector, index) => {
        const point = project(vector);
        parts.push(`<line class="arm" x1="210" y1="180" x2="${point.x}" y2="${point.y}"/>`);
        parts.push(`<circle class="arm-dot" cx="${point.x}" cy="${point.y}" r="4"/>`);
        parts.push(`<text x="${point.x + 5}" y="${point.y - 5}">${APP_NAMES[index]}</text>`);
      });
      ports.forEach((vector, index) => {
        const point = project(vector);
        parts.push(`<circle class="port-dot" cx="${point.x}" cy="${point.y}" r="3.5"/>`);
        parts.push(`<text x="${point.x + 4}" y="${point.y + 11}">${["+X", "-X", "+Y", "-Y", "+Z", "-Z"][index]}</text>`);
      });
      parts.push('<circle cx="210" cy="180" r="3" fill="#fff"/>');
      svg.innerHTML = parts.join("");

      const radialError = Math.max(...arms.map((vector) => Math.abs(Math.hypot(...vector) - 1)));
      const centerPreserved = snapshot.finalArms.every((arm) =>
        arm.position.every((value, axis) =>
          Math.abs((value - snapshot.center[axis]) - arm.vector[axis] * snapshot.radius) < 1e-10));
      const pairwise = G.comparePairDistances(
        stateGeometry({ ...configuration, count: 0 }).arms,
        snapshot.finalArms.map((arm) => arm.vector),
        1e-10,
        snapshot.radius,
      );
      const radialLengthError = Math.max(...snapshot.finalArms.map((arm) =>
        Math.abs(Math.hypot(...arm.position.map((value, axis) =>
          value - snapshot.center[axis])) - snapshot.radius)));
      let dualText = "API geometry has no declared cube–octahedron duality check.";
      if (snapshot.geometryModel === "cube") {
        const dual = G.analyzeDual(arms, ports);
        dualText = `Midpoint separation ≤ ${dual.maximumMidpointSeparationDegrees.toFixed(4)}°; orthogonality departure ≤ ${dual.maximumOrthogonalityDepartureDegrees.toFixed(4)}°.`;
      }
      setText("geometry-report",
        `Radial preservation: ${radialLengthError < 1e-10 && radialError < 1e-10 ? "yes" : "no"} (max error ${Math.max(radialLengthError, radialError).toExponential(2)}); shared centre: ${centerPreserved ? "yes" : "no"}; changed arm-pair distances: ${pairwise.changedPairs}/28; ${dualText}`);

      const selected = Number(document.getElementById("selected-arm").value);
      if (snapshot.geometryModel === "cube") {
        const incidence = G.incidenceMatrix()[selected]
          .map((value, index) => value ? ["+X", "-X", "+Y", "-Y", "+Z", "-Z"][index] : null)
          .filter(Boolean);
        setText("incidence-report", `${APP_NAMES[selected]} incidences: ${incidence.join(", ")} (three geometric references; not runtime services).`);
      } else {
        setText("incidence-report", "The API model is not the cube incidence model; no port mapping is implied.");
      }
    }

    function sendSnapshotTo(appId) {
      const frame = frames.get(appId);
      if (frame?.contentWindow && currentEnvelope) {
        frame.contentWindow.postMessage({
          type: "sphere:snapshot",
          envelope: currentEnvelope,
          ignitionId: currentIgnitionId,
        }, location.origin);
      }
    }

    function updateAckDisplay() {
      const list = document.getElementById("ack-list");
      list.replaceChildren(...G.APP_IDS.map((id) => {
        const item = document.createElement("li");
        const acknowledged = Boolean(currentBasket?.receipts.has(id));
        item.dataset.ack = String(acknowledged);
        item.textContent = `${APP_NAMES[G.APP_IDS.indexOf(id)]}: ${acknowledged ? "acknowledged" : "waiting"}`;
        return item;
      }));
      const count = currentBasket?.receipts.size || 0;
      const complete = Boolean(currentBasket?.complete);
      setText("ack-summary", `${count}/8 matching app acknowledgements for revision ${currentEnvelope?.snapshot.revisionSequence ?? "—"}. ${complete ? "Basket complete." : "Complete-run receipt unavailable."}`);
      document.getElementById("download-receipt").disabled = !complete;
    }

    async function receiveAck(event) {
      if (event.origin !== location.origin || !event.data ||
          event.data.type !== "sphere:ack" || !currentBasket) return;
      const appId = event.data.acknowledgement?.appId;
      const frame = frames.get(appId);
      if (!frame || event.source !== frame.contentWindow) return;
      const result = await currentBasket.accept(event.data.acknowledgement);
      updateAckDisplay();
      if (result.accepted && currentBasket.complete) {
        setText("home-status", `Complete: all eight apps acknowledged revision ${currentEnvelope.snapshot.revisionSequence}. Browser hashes provide content consistency only.`);
        homeStatus.classList.remove("error");
      }
    }

    function updateControls(config) {
      document.getElementById("geometry-model").value = config.model;
      document.getElementById("pulse-mode").value = config.pulseMode;
      document.getElementById("yaw").value = String(Math.round(config.yaw * 180 / Math.PI));
      document.getElementById("tilt").value = String(Math.round(config.tilt * 180 / Math.PI));
      document.getElementById("radius").value = String(config.radius);
      document.getElementById("amplitude").value = String(config.amplitude);
      setText("yaw-value", formatDegrees(config.yaw));
      setText("tilt-value", formatDegrees(config.tilt));
      setText("radius-value", config.radius.toFixed(2));
      setText("amplitude-value", `${config.amplitude.toFixed(4)} rad`);
    }

    function readControls() {
      return {
        ...configuration,
        model: document.getElementById("geometry-model").value,
        pulseMode: document.getElementById("pulse-mode").value,
        yaw: Number(document.getElementById("yaw").value) * Math.PI / 180,
        tilt: Number(document.getElementById("tilt").value) * Math.PI / 180,
        radius: Number(document.getElementById("radius").value),
        amplitude: Number(document.getElementById("amplitude").value),
      };
    }

    function runSerial(operation) {
      operationQueue = operationQueue.then(operation).catch((error) => {
        homeStatus.textContent = `Operation incomplete: ${error.message}`;
        homeStatus.classList.add("error");
      });
      return operationQueue;
    }

    async function ignite(config, details = {}) {
      if (!apiBaselineVectors || !apiData) {
        throw new Error("The Python geometry API is unavailable; ignition cannot be complete.");
      }
      configuration = { ...config };
      updateControls(configuration);
      const ignitionId = (typeof crypto.randomUUID === "function")
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const nextRevision = revisionSequence + 1;
      const snapshot = makeSnapshot(configuration, ignitionId, nextRevision, previousHash);
      const envelope = await P.hashSnapshot(snapshot);
      currentIgnitionId = ignitionId;
      revisionSequence = nextRevision;
      currentEnvelope = envelope;
      currentBasket = new P.AcknowledgementBasket({
        snapshotHash: envelope.hash,
        revisionSequence: snapshot.revisionSequence,
        ignitionId,
        positions: Object.fromEntries(snapshot.finalArms.map((arm) => [arm.appId, arm.position])),
      });
      previousHash = envelope.hash;
      sentinelReceipt = details.receipt || null;
      updateAckDisplay();
      renderScene();
      setText("home-status", `Revision ${snapshot.revisionSequence} is awaiting matching acknowledgements from eight app pages…`);
      homeStatus.classList.remove("error");
      G.APP_IDS.forEach(sendSnapshotTo);
      const expectedRevision = snapshot.revisionSequence;
      setTimeout(() => {
        if (currentEnvelope?.snapshot.revisionSequence === expectedRevision &&
            !currentBasket?.complete) {
          setText("home-status", `Incomplete: ${currentBasket?.receipts.size || 0}/8 apps acknowledged. No complete receipt is available.`);
          homeStatus.classList.add("error");
        }
      }, ACK_TIMEOUT_MS);
    }

    async function makeSentinelReceipt(beforeEnvelope, beforeBasket, afterEnvelope, ignitionId) {
      const before = beforeEnvelope.snapshot;
      const after = afterEnvelope.snapshot;
      const distancesBefore = G.pairDistances(before.finalArms.map((arm) => arm.vector), before.radius);
      const distancesAfter = G.pairDistances(after.finalArms.map((arm) => arm.vector), after.radius);
      const pairwiseChanges = distancesBefore.map((entry, index) => ({
        pair: entry.pair,
        before: entry.distance,
        after: distancesAfter[index].distance,
        delta: distancesAfter[index].distance - entry.distance,
      }));
      const dualBefore = before.geometryModel === "cube"
        ? G.analyzeDual(before.finalArms.map((arm) => arm.vector), before.finalPorts.map((port) => port.vector))
        : null;
      const dualAfter = after.geometryModel === "cube"
        ? G.analyzeDual(after.finalArms.map((arm) => arm.vector), after.finalPorts.map((port) => port.vector))
        : null;
      return {
        schemaVersion: 1,
        receiptType: "sentinel-change",
        beforeSnapshot: before,
        beforeSnapshotHash: beforeEnvelope.hash,
        afterSnapshot: after,
        afterSnapshotHash: afterEnvelope.hash,
        pulse: after.sentinel,
        beforeAcknowledgements: beforeBasket.values(),
        afterAcknowledgements: [],
        pairwiseArmDistances: pairwiseChanges,
        changedPairTolerance: 1e-10,
        changedPairs: pairwiseChanges.filter((pair) => Math.abs(pair.delta) > 1e-10).length,
        maximumAbsoluteDistanceChange: Math.max(...pairwiseChanges.map((pair) => Math.abs(pair.delta))),
        centerPreserved: JSON.stringify(before.center) === JSON.stringify(after.center),
        radialPreserved: before.finalArms.every((arm, index) =>
          Math.abs(
            Math.hypot(...arm.position.map((value, axis) => value - before.center[axis])) -
            Math.hypot(...after.finalArms[index].position.map((value, axis) => value - after.center[axis])),
          ) < 1e-10),
        exactDuality: {
          applies: before.geometryModel === "cube",
          before: dualBefore,
          after: dualAfter,
          preserved: dualBefore && dualAfter
            ? dualAfter.maximumMidpointSeparationDegrees < 1e-6 &&
              dualAfter.maximumOrthogonalityDepartureDegrees < 1e-6
            : null,
        },
        ignitionId,
        createdAt: new Date().toISOString(),
        hashAlgorithm: "SHA-512",
        canonicalization: "sorted-object-keys-json-v1",
      };
    }

    document.getElementById("apply-centre").addEventListener("click", () =>
      runSerial(() => ignite(readControls())));
    document.getElementById("fire-sentinel").addEventListener("click", () => runSerial(async () => {
      if (!currentEnvelope || !currentBasket?.complete) {
        throw new Error("Fire Sentinel requires a complete eight-app acknowledgement basket first.");
      }
      undoConfiguration = { ...configuration };
      const before = currentEnvelope;
      const beforeBasket = currentBasket;
      const next = {
        ...configuration,
        count: configuration.count + 1,
      };
      const ignitionId = (typeof crypto.randomUUID === "function")
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      configuration = next;
      updateControls(next);
      const nextRevision = revisionSequence + 1;
      const snapshot = makeSnapshot(next, ignitionId, nextRevision, previousHash);
      const envelope = await P.hashSnapshot(snapshot);
      revisionSequence = nextRevision;
      previousHash = envelope.hash;
      currentEnvelope = envelope;
      currentIgnitionId = ignitionId;
      currentBasket = new P.AcknowledgementBasket({
        snapshotHash: envelope.hash,
        revisionSequence: nextRevision,
        ignitionId,
        positions: Object.fromEntries(snapshot.finalArms.map((arm) => [arm.appId, arm.position])),
      });
      sentinelReceipt = await makeSentinelReceipt(before, beforeBasket, envelope, ignitionId);
      updateAckDisplay();
      renderScene();
      setText("home-status", `Sentinel ${next.pulseMode} pulse applied as revision ${nextRevision}; verifying all eight acknowledgements.`);
      G.APP_IDS.forEach(sendSnapshotTo);
    }));
    document.getElementById("undo-sentinel").addEventListener("click", () => runSerial(async () => {
      if (!undoConfiguration) throw new Error("There is no Sentinel change to undo.");
      const restored = { ...undoConfiguration };
      undoConfiguration = null;
      await ignite(restored, { undo: true });
    }));
    document.getElementById("download-receipt").addEventListener("click", async () => {
      if (!currentBasket?.complete || !currentEnvelope) return;
      if (sentinelReceipt) sentinelReceipt.afterAcknowledgements = currentBasket.values();
      const receipt = sentinelReceipt || {
        schemaVersion: 1,
        receiptType: "complete-run",
        snapshot: currentEnvelope.snapshot,
        snapshotHash: currentEnvelope.hash,
        acknowledgements: currentBasket.values(),
        createdAt: new Date().toISOString(),
        hashAlgorithm: "SHA-512",
        canonicalization: "sorted-object-keys-json-v1",
        authenticityNote: "Browser-generated hashes provide content consistency, not identity authentication or trusted qualification.",
      };
      delete receipt.receiptHash;
      receipt.receiptHash = await P.sha512(receipt);
      const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `tentacled-sphere-${receipt.receiptType}-${currentEnvelope.snapshot.revisionSequence}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    });

    for (const id of ["yaw", "tilt", "radius", "amplitude", "geometry-model", "pulse-mode"]) {
      document.getElementById(id).addEventListener("input", () => {
        updateControls(readControls());
      });
      document.getElementById(id).addEventListener("change", () => {
        const changed = JSON.stringify(readControls()) !== JSON.stringify(configuration);
        if (!changed) return;
        currentBasket = null;
        sentinelReceipt = null;
        undoConfiguration = null;
        updateAckDisplay();
        homeStatus.textContent = "Settings changed; the displayed snapshot and any previous receipt are stale. Apply centre / ignite to create a new revision.";
        homeStatus.classList.remove("error");
      });
    }
    for (const id of ["view-yaw", "view-tilt", "selected-arm"]) {
      document.getElementById(id).addEventListener("input", renderScene);
      document.getElementById(id).addEventListener("change", renderScene);
    }
    for (const id of ["view-yaw", "view-tilt"]) {
      document.getElementById(id).addEventListener("input", () =>
        setText(`${id}-value`, `${document.getElementById(id).value}°`));
    }

    window.addEventListener("message", async (event) => {
      if (event.origin !== location.origin || !event.data) return;
      const sourceApp = [...frames.entries()].find(([, frame]) =>
        frame.contentWindow === event.source)?.[0];
      if (!sourceApp) return;
      if (event.data.type === "sphere:ack") {
        await receiveAck(event);
      } else if (event.data.type === "sphere:feed" &&
          event.data.feed?.appId === sourceApp) {
        const feed = event.data.feed;
        const previous = feeds[sourceApp];
        if (!P.validFeed(feed, previous)) return;
        if (feed.source === "synthetic-clock" && sourceApp !== "time") return;
        feeds[sourceApp] = {
          sequence: feed.sequence,
          timestamp: feed.timestamp,
          vector: G.normalize(feed.vector),
          source: feed.source,
        };
        if (feedTimer !== null) clearTimeout(feedTimer);
        feedTimer = setTimeout(() => runSerial(() => ignite(readControls())), 200);
      } else if (event.data.type === "sphere:feed-clear" &&
          event.data.appId === sourceApp) {
        if (!feeds[sourceApp] || event.data.sequence <= feeds[sourceApp].sequence) return;
        delete feeds[sourceApp];
        if (feedTimer !== null) clearTimeout(feedTimer);
        feedTimer = setTimeout(() => runSerial(() => ignite(readControls())), 0);
      }
    });
    window.addEventListener("pagehide", () => {
      if (feedTimer !== null) clearTimeout(feedTimer);
      for (const frame of frames.values()) frame.contentWindow?.postMessage(
        { type: "sphere:deactivate" }, location.origin);
    });

    createFrames();
    updateControls(configuration);
    selectApp("tap");
    setText("home-status", `API baseline loaded with ${apiBaselineVectors.length} finite unit vectors. Select controls and ignite.`);
    homeStatus.classList.remove("error");
  }

  const homePanel = document.getElementById("home-panel");
  if (isHome) {
    homePanel.hidden = false;
    document.querySelectorAll("main > section:not(#home-panel)").forEach((section) => {
      section.hidden = true;
    });
    loadApi().then(({ data, vectors }) => {
      initHome(data, vectors);
    }).catch((error) => {
      const status = document.getElementById("home-status");
      status.textContent = `API error: ${error.message} The interface is incomplete; browser-generated geometry is not substituted and ignition is disabled.`;
      status.classList.add("error");
    });
  } else {
    loadApi().then(({ vectors }) => {
      initAppPage(vectors);
    }).catch((error) => {
      initAppPage(null);
      const status = document.getElementById("app-status");
      status.textContent = `API error: ${error.message} This page is incomplete and will not invent replacement geometry.`;
      status.classList.add("error");
    });
  }
})();
