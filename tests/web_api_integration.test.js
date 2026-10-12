"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const geometry = require("../web/geometry.js");

const repository = path.resolve(__dirname, "..");

test("Python HTTP API vectors enter the browser coupling model unchanged", async (t) => {
  const server = spawn("python3", ["-u", "api/index.py"], {
    cwd: repository,
    env: { ...process.env, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => server.kill());
  let output = "";
  let stderr = "";
  server.stdout.setEncoding("utf8");
  server.stderr.setEncoding("utf8");
  server.stdout.on("data", (chunk) => { output += chunk; });
  server.stderr.on("data", (chunk) => { stderr += chunk; });

  const port = await new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error(`API did not start: ${stderr}`)), 5000);
    const readPort = () => {
      const match = output.match(/127\.0\.0\.1:(\d+)\/api\/tentacled-sphere/);
      if (match) {
        clearTimeout(deadline);
        resolve(Number(match[1]));
      } else if (server.exitCode !== null) {
        clearTimeout(deadline);
        reject(new Error(`API exited before startup: ${stderr}`));
      }
    };
    server.stdout.on("data", readPort);
    server.on("exit", () => readPort());
  });

  const response = await fetch(`http://127.0.0.1:${port}/api/tentacled-sphere?seed=1.0&delta=0.1137`);
  assert.equal(response.status, 200);
  const result = await response.json();
  const coupled = geometry.apiModel(result.tentacles.map((item) => item.vector));
  assert.deepEqual(coupled.armOrder, geometry.APP_IDS);
  assert.equal(result.seed, 1);
  assert.equal(result.delta, 0.1137);
  result.tentacles.forEach((item, index) => {
    assert.equal(item.index, index);
    item.vector.forEach((value, axis) =>
      assert.ok(Math.abs(coupled.arms[index][axis] - value) < 1e-12));
    assert.ok(Math.abs(Math.hypot(...coupled.arms[index]) - 1) < 1e-12);
  });
});
