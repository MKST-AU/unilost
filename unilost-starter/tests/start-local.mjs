// Disposable MongoDB + Next server for integration tests. Never uses .env.local.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";
const { MongoMemoryServer } = await import(
  process.env.UNILOST_MONGODB_MEMORY_MODULE || "mongodb-memory-server"
);
const project = fileURLToPath(new URL("../", import.meta.url));
const configPath = resolve(
  process.env.UNILOST_TEST_CONFIG || `${project}/.test-artifacts/unilost-test.json`,
);
const mongo = await MongoMemoryServer.create({
  instance: { args: ["--setParameter", "enableTestCommands=1"] },
});
const client = new MongoClient(mongo.getUri());
await client.connect();
const dbName = "unilost_test_integration",
  db = client.db(dbName);
const categoryId = (
  await db.collection("categories").insertOne({
    name: "Electronics",
    description: "Disposable local test fixture",
  })
).insertedId.toHexString();
const locationId = (
  await db.collection("locations").insertOne({
    name: "Library",
    building: "Main building",
    description: "Disposable local test fixture",
  })
).insertedId.toHexString();
await mkdir(dirname(configPath), { recursive: true });
await writeFile(
  configPath,
  JSON.stringify({
    uri: mongo.getUri(),
    dbName,
    categoryId,
    locationId,
    base: "http://127.0.0.1:3217",
  }),
);
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    process.env.UNILOST_TEST_MODE === "development" ? "dev" : "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3217",
  ],
  {
    cwd: project,
    env: {
      ...process.env,
      MONGODB_URI: mongo.getUri(),
      MONGODB_DB: dbName,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: "inherit",
  },
);
console.log(`Disposable test configuration: ${configPath}`);
console.log(
  "Disposable Category and Location fixtures are served by the real application APIs.",
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  child.kill("SIGTERM");
  await client.close();
  await mongo.stop();
  process.exit();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", stop);
