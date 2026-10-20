(function (root) {
  "use strict";
  function createAdapter(C) {
    function evaluate(input) {
      function read(key) {
        const value = input[key];
        if (typeof value !== "string" || value.trim() === "") {
          throw new TypeError(`${key} is required`);
        }
        const number = Number(value);
        if (!Number.isFinite(number)) throw new TypeError(`${key} must be finite`);
        return number;
      }
      const latitude = read("latitude") * Math.PI / 180;
      const longitude = read("longitude") * Math.PI / 180;
      const radius = read("radius"), height = read("height");
      return {
        source: "user-declared-spherical-model-not-device-measurement",
        frame: C.sphericalLocalFrame(latitude, longitude),
        physicalAxisMap: C.sphericalAxisMap(latitude, longitude),
        geographicNorthPole: C.northPoleSightline(latitude, longitude, radius, height),
      };
    }
    function mount(doc, win) {
      if (!doc.body || doc.getElementById("coordinate-adapter")) return null;
      if (win.parent && win.parent !== win) return null;
      const panel = doc.createElement("section");
      panel.id = "coordinate-adapter";
      panel.className = "card";
      panel.setAttribute("aria-label", "Declared spherical-coordinate adapter");
      const title = doc.createElement("h2");
      title.textContent = "Declared spherical coordinates";
      const description = doc.createElement("p");
      description.textContent = "Local calculation only: no geolocation, sensor inference, persistence, feed submission or Sentinel firing. UEN columns are Up, East, tangent North. Radius and height must share units.";
      const form = doc.createElement("form");
      const inputs = {};
      for (const [key, label, value] of [
        ["latitude", "Geocentric latitude (degrees)", ""],
        ["longitude", "Longitude (degrees)", ""],
        ["radius", "Declared spherical radius", "1"],
        ["height", "Radial height (same units)", "0"],
      ]) {
        const wrapper = doc.createElement("label");
        wrapper.textContent = label;
        const input = doc.createElement("input");
        input.name = key;
        input.type = "number";
        input.step = "any";
        input.required = true;
        input.autocomplete = "off";
        input.value = value;
        wrapper.appendChild(input);
        form.appendChild(wrapper);
        inputs[key] = input;
      }
      const submit = doc.createElement("button");
      submit.type = "submit";
      submit.textContent = "Calculate declared coordinates";
      const clear = doc.createElement("button");
      clear.type = "button";
      clear.textContent = "Clear coordinates";
      const status = doc.createElement("p");
      status.setAttribute("role", "status");
      status.textContent = "Enter declared coordinates; no location has been inferred.";
      const output = doc.createElement("pre");
      output.setAttribute("aria-label", "Coordinate calculation result");
      function reset() {
        inputs.latitude.value = "";
        inputs.longitude.value = "";
        inputs.radius.value = "1";
        inputs.height.value = "0";
        output.textContent = "";
        status.textContent = "Coordinates cleared; no location has been inferred.";
      }
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        output.textContent = "";
        try {
          if (!C) throw new Error("Coordinate module unavailable");
          const result = evaluate(Object.fromEntries(
            Object.entries(inputs).map(([key, input]) => [key, input.value])));
          output.textContent = JSON.stringify(result, null, 2);
          status.textContent = result.frame.status === "available"
            ? "Declared model calculated; physical-axis mapping is not generally a rotation."
            : "Tangent chart unavailable near a pole; sightline availability is reported separately.";
        } catch (error) {
          status.textContent = `Calculation rejected: ${error.message}`;
        }
      });
      for (const input of Object.values(inputs)) {
        input.addEventListener("input", () => {
          output.textContent = "";
          status.textContent = "Inputs changed; calculate to produce a new result.";
        });
      }
      clear.addEventListener("click", reset);
      doc.addEventListener("visibilitychange", () => { if (doc.hidden) reset(); });
      win.addEventListener("pagehide", reset);
      form.appendChild(submit);
      form.appendChild(clear);
      for (const node of [title, description, form, status, output]) panel.appendChild(node);
      const host = doc.querySelector("main") || doc.body;
      host.appendChild(panel);
      return { panel, form, inputs, output, status, clear };
    }
    return { evaluate, mount };
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = createAdapter;
  } else {
    const adapter = createAdapter(root.TentacledCoordinates);
    root.TentacledCoordinateAdapter = adapter;
    const start = () => adapter.mount(root.document, root);
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", start, { once: true });
    } else start();
  }
})(typeof window !== "undefined" ? window : globalThis);
