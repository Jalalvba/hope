// Run with: node seed-fields.js
// Seeds hope.fields collection with pre-defined clinical values

const { MongoClient } = require("mongodb");
require("dotenv").config({ path: "/home/jalal/hope/.env.local" });

const URI = process.env.MONGODB_URI;

const FIELDS_DOC = {
  _id: "clinical_fields_v1",
  updatedAt: new Date(),

  coreBeliefs: [
    "If I don't know now, I'm unsafe.",
    "If people don't agree with me, I will be attacked.",
    "Criticism = incompetence = danger.",
    "Uncertainty must be solved immediately.",
    "Consensus = safety.",
    "If not perfect, I'm unsafe.",
    "Unknown cause = danger. Someone must be behind it.",
    "I must know what others think before it happens.",
    "I need to know the verdict before it is delivered.",
    "If the voice stops, I am exposed to something I cannot manage.",
    "A challenge to my professional action = attack on my competence = the boss will see me as incompetent.",
    "I am fundamentally at risk of being seen as incompetent by someone with power over me.",
    "If I show weakness, I will be exploited.",
    "I must be in control or something bad will happen.",
    "My worth depends entirely on my performance.",
    "If I make a mistake, it proves I am incompetent.",
    "Ambiguity = threat.",
    "Others are constantly evaluating me.",
    "I must anticipate every possible problem.",
    "If someone is silent or cold, it means they are angry at me.",
  ],

  symptoms: [
    // Threat/anxiety behaviors
    "Rehearsing defenses before the threat arrives",
    "Scanning for signs of disapproval in others' faces or tone",
    "Checking and rechecking work before submitting",
    "Seeking reassurance from colleagues about quality of work",
    "Replaying past interactions to find evidence of mistakes",
    "Preparing scripts for difficult conversations before they happen",
    "Avoiding situations where performance will be evaluated",
    "Procrastinating on tasks where failure is possible",
    "Over-explaining or over-justifying decisions",
    "Monitoring boss's mood and adjusting behavior accordingly",
    // Social simulation
    "Constructing detailed scenarios of how others will react",
    "Running mental simulations of conversations while alone",
    "Imagining others discussing my performance while absent",
    "Polling others to gauge the safety level of the environment",
    // Waiting/uncertainty
    "Cannot tolerate open loops — immediate need to close",
    "Difficulty sleeping when a work issue is unresolved",
    "Checking email or messages compulsively when expecting a verdict",
    "Racing thoughts about worst-case scenarios",
    // Perfectionism
    "Setting standards that can never be fully met",
    "Feeling unsafe stopping work even when it is complete",
    "Experiencing disproportionate distress at minor errors",
    "Inability to delegate because others won't meet the standard",
    // Hostile attribution
    "Interpreting ambiguous signals as aggressive intent",
    "Rapid assignment of blame when something goes wrong",
    "Feeling personally targeted by general criticism",
    // Rumination
    "Subvocal rehearsal loops that run in background without control",
    "Phonological rumination — hearing internal voice repeat scenarios",
    "Intolerance of silence or mental quiet",
    "Inability to be present due to internal commentary",
  ],

  cognitiveLabels: [
    // Classic CBT distortions
    "Fortune-telling",
    "Mind reading",
    "Catastrophizing",
    "Black-and-white thinking",
    "Overgeneralization",
    "Personalization",
    "Emotional reasoning",
    "Should statements",
    "Labeling",
    "Magnification",
    "Minimization",
    "Confirmation bias",
    "Jumping to conclusions",
    "Mental filter",
    "Disqualifying the positive",
    // Schema-specific
    "Defectiveness confirmation bias",
    "Failure attribution bias",
    "Threat overestimation",
    "Control fallacy",
    "Intolerance of uncertainty",
    "Hostile attribution bias",
    // MCT-specific
    "Positive metacognitive belief (worry is useful)",
    "Negative metacognitive belief (worry is uncontrollable)",
    "Threat monitoring",
    "Cognitive attentional syndrome (CAS)",
    "Meta-worry",
    "Subvocal rehearsal loop",
    "Phonological rumination",
    "Anticipatory anxiety",
    "Approval-seeking",
    "Overgeneralization of threat",
  ],
};

async function seed() {
  const client = new MongoClient(URI);
  try {
    await client.connect();
    const db = client.db("hope");
    await db.collection("fields").replaceOne(
      { _id: "clinical_fields_v1" },
      FIELDS_DOC,
      { upsert: true }
    );
    console.log("✓ Seeded hope.fields with clinical_fields_v1");
    const doc = await db.collection("fields").findOne({ _id: "clinical_fields_v1" });
    console.log(`  coreBeliefs: ${doc.coreBeliefs.length}`);
    console.log(`  symptoms: ${doc.symptoms.length}`);
    console.log(`  cognitiveLabels: ${doc.cognitiveLabels.length}`);
  } finally {
    await client.close();
  }
}

seed().catch(console.error);
