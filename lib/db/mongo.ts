/**
 * MongoDB connection.
 *
 * Next.js reloads server modules on every edit in development, which would
 * otherwise open a brand-new connection pool each time and eventually exhaust
 * the database's connection limit. To avoid that, the connection promise is
 * cached on `globalThis`, which survives module reloads.
 *
 * Import this anywhere you need the database:
 *
 *   const client = await mongoClientPromise;
 *   const db = client.db(dbName);
 *
 * Most code should NOT do that directly — use the query helpers in
 * lib/db/patterns.ts and lib/db/fields.ts instead, so queries stay in one place.
 */

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI in .env.local");

/** Name of the database holding every collection this app touches. */
export const dbName = process.env.MONGODB_DB;
if (!dbName) throw new Error("Missing MONGODB_DB in .env.local");

declare global {
  // eslint-disable-next-line no-var
  var _mongo: Promise<MongoClient> | undefined;
}

const client = new MongoClient(uri);

/** A promise that resolves to the shared, connected MongoDB client. */
export const mongoClientPromise: Promise<MongoClient> =
  global._mongo ?? (global._mongo = client.connect());
