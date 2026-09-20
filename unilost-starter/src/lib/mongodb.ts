import { MongoClient, type Db } from "mongodb";
import "server-only";

type MongoCache = {
  clientPromise?: Promise<MongoClient>;
};

const mongoGlobal = globalThis as typeof globalThis & {
  _unilostMongo?: MongoCache;
};

const cache: MongoCache =
  process.env.NODE_ENV === "development"
    ? (mongoGlobal._unilostMongo ??= {})
    : {};

function getConfig() {
  const uri = process.env.MONGODB_URI?.trim();
  const dbName = process.env.MONGODB_DB?.trim();

  if (!uri) {
    throw new Error("MONGODB_URI is missing");
  }

  if (!dbName) {
    throw new Error("MONGODB_DB is missing");
  }

  return { uri, dbName };
}

export async function getDb(): Promise<Db> {
  const { uri, dbName } = getConfig();

  if (!cache.clientPromise) {
    let client: MongoClient;

    try {
      client = new MongoClient(uri);
    } catch {
      throw new Error("MONGODB_URI is invalid");
    }

    cache.clientPromise = client.connect().catch(async () => {
      try {
        await client.close();
      } catch {
      }
      cache.clientPromise = undefined;
      throw new Error("Unable to connect to MongoDB");
    });
  }

  const client = await cache.clientPromise;
  return client.db(dbName);
}
