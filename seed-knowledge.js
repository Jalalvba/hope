// Run with: node seed-knowledge.js
// Seeds hope.ryl and hope.mct from local JSON files

const { MongoClient } = require("mongodb");
require("dotenv").config({ path: "/home/jalal/hope/.env.local" });

const URI = process.env.MONGODB_URI;

async function seed() {
  const client = new MongoClient(URI);
  try {
    await client.connect();
    const db = client.db("hope");

    // RYL
    const ryl = require("./ryl_database.json");
    await db.collection("ryl").deleteMany({});
    await db.collection("ryl").insertMany(ryl);
    console.log(`✓ Seeded hope.ryl — ${ryl.length} records`);

    // MCT
    const mct = require("./mct_database.json");
    await db.collection("mct").deleteMany({});
    await db.collection("mct").insertMany(mct);
    console.log(`✓ Seeded hope.mct — ${mct.length} records`);

  } finally {
    await client.close();
  }
}

seed().catch(console.error);
