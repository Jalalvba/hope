import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI in .env.local");

export const dbName = process.env.MONGODB_DB;
if (!dbName) throw new Error("Missing MONGODB_DB in .env.local");

declare global {
  var _mongo: Promise<MongoClient> | undefined;
}

const client = new MongoClient(uri);
const clientPromise =
  global._mongo ?? (global._mongo = client.connect());

export default clientPromise;
