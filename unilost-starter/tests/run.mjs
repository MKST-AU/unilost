// Runs the production app and both suites against an isolated disposable database.
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createServer } from "node:net";
const artifacts = resolve(".test-artifacts");
await mkdir(artifacts, { recursive: true });
const config = resolve(artifacts, "unilost-test.json");
await rm(config, { force: true });
// Refuse an occupied test port so tests cannot target an unrelated application.
await new Promise((ok, fail) => {
  const probe = createServer();
  probe.once("error", fail);
  probe.listen(3217, "127.0.0.1", () => probe.close(ok));
});
const env = {
  ...process.env,
  UNILOST_TEST_CONFIG: config,
  UNILOST_TEST_MODE: "production",
  UNILOST_SCREENSHOTS: process.env.UNILOST_SCREENSHOTS || resolve(artifacts, "screenshots"),
};
const server = spawn(process.execPath, ["tests/start-local.mjs"], { env, stdio: ["ignore", "pipe", "pipe"] });
let serverLog = "";
for (const stream of [server.stdout, server.stderr]) stream.on("data", chunk => {
  serverLog += chunk;
  process.stdout.write(chunk);
});
const results = [];
async function suite(file) {
  return await new Promise((ok, fail) => {
    const child = spawn(process.execPath, [file], { env, stdio: ["ignore", "pipe", "pipe"] });
    let log = "";
    for (const stream of [child.stdout, child.stderr]) stream.on("data", chunk => {
      log += chunk;
      process.stdout.write(chunk);
    });
    child.once("error", fail);
    child.once("exit", async code => {
      await writeFile(resolve(artifacts, `${file.split("/").at(-1)}.log`), log);
      results.push({ suite: file, exitCode: code, checksPassed: (log.match(/^PASS /gm) || []).length });
      if (code === 0) ok(); else fail(new Error(`${file} failed (exit ${code})`));
    });
  });
}
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw new Error("Disposable server exited before ready");
    try {
      const response = await fetch("http://127.0.0.1:3217/api/locations");
      if (response.ok) { ready = true; break; }
    } catch { /* Server is starting. */ }
    await delay(500);
  }
  if (!ready) throw new Error("Disposable server did not become ready within 60 seconds");
  await suite("tests/integration.mjs");
  await suite("tests/browser.mjs");
  console.log("All integration and browser suites passed against the production build.");
} finally {
  server.kill("SIGTERM");
  await Promise.race([new Promise(ok => server.once("exit", ok)), delay(10000)]);
  if (server.exitCode === null) server.kill("SIGKILL");
  await writeFile(resolve(artifacts, "server.log"), serverLog);
  await writeFile(resolve(artifacts, "results.json"), JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
  await rm(config, { force: true });
}
