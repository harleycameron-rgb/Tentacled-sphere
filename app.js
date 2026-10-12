(() => {
  const root = document.querySelector("[data-app]");
  const output = document.querySelector("#output");
  const status = document.querySelector("#status");
  const video = document.querySelector("#camera");
  const cameraButton = document.querySelector("#start-camera");
  let cameraStream = null;
  const app = {
    name: root.dataset.app,
    geometry: root.dataset.geometry,
    orientation: { alpha: null, beta: null, gamma: null },
    motion: {
      acceleration: null,
      accelerationIncludingGravity: null,
      gravity: null,
      rotationRate: null,
      interval: null,
    },
  };

  const vector = (value) => value
    ? { x: value.x ?? null, y: value.y ?? null, z: value.z ?? null }
    : null;

  const requestSensorPermission = async (sensor) => {
    if (typeof sensor?.requestPermission === "function") {
      return sensor.requestPermission();
    }
    return "granted";
  };

  document.querySelector("#start-sensors").addEventListener("click", async () => {
    try {
      const permissions = await Promise.all([
        requestSensorPermission(window.DeviceOrientationEvent),
        requestSensorPermission(window.DeviceMotionEvent),
      ]);
      if (permissions.includes("denied")) {
        status.textContent = "Permission to read device sensors was denied.";
        return;
      }
      if (!("DeviceOrientationEvent" in window) && !("DeviceMotionEvent" in window)) {
        status.textContent = "Device orientation and motion sensors are not available.";
        return;
      }
      status.textContent = "Sensor readings are updating every 100 ms.";
    } catch (error) {
      status.textContent = `Could not enable sensors: ${error.message}`;
    }
  });

  window.addEventListener("deviceorientation", (event) => {
    app.orientation = {
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma,
    };
  });

  window.addEventListener("devicemotion", (event) => {
    const acceleration = vector(event.acceleration);
    const includingGravity = vector(event.accelerationIncludingGravity);
    const hasAcceleration = acceleration
      && Object.values(acceleration).every((value) => value !== null);
    const hasIncludingGravity = includingGravity
      && Object.values(includingGravity).every((value) => value !== null);
    const gravity = hasAcceleration && hasIncludingGravity
      ? {
        x: includingGravity.x - acceleration.x,
        y: includingGravity.y - acceleration.y,
        z: includingGravity.z - acceleration.z,
      }
      : null;
    app.motion = {
      acceleration,
      accelerationIncludingGravity: includingGravity,
      gravity,
      rotationRate: event.rotationRate
        ? {
          alpha: event.rotationRate.alpha,
          beta: event.rotationRate.beta,
          gamma: event.rotationRate.gamma,
        }
        : null,
      interval: event.interval,
    };
  });

  cameraButton.addEventListener("click", async () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
      video.srcObject = null;
      video.hidden = true;
      cameraButton.textContent = "Start camera";
      status.textContent = "Camera stopped.";
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      status.textContent = "Camera access is not available in this browser or context.";
      return;
    }
    cameraButton.disabled = true;
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      video.srcObject = cameraStream;
      video.hidden = false;
      await video.play();
      status.textContent = "Camera is active. Select Stop camera to end the stream.";
      cameraButton.textContent = "Stop camera";
    } catch (error) {
      cameraStream?.getTracks().forEach((track) => track.stop());
      cameraStream = null;
      status.textContent = `Could not start camera: ${error.message}`;
    } finally {
      cameraButton.disabled = false;
    }
  });

  window.setInterval(() => {
    output.textContent = JSON.stringify({
      app: app.name,
      geometry: app.geometry,
      timestamp: new Date().toISOString(),
      orientation: app.orientation,
      motion: app.motion,
      camera: {
        active: Boolean(video.srcObject),
        videoTracks: video.srcObject?.getVideoTracks().length ?? 0,
      },
    }, null, 2);
  }, 100);
})();
