import pg from 'pg';
import fs from 'fs';

const envText = fs.readFileSync('.env.local', 'utf8');
const dbMatch = envText.match(/DATABASE_URL=(.*)/);
const dbUrl = dbMatch ? dbMatch[1].trim() : 'postgres://postgres:postgres@127.0.0.1:5432/openmaic';

const pool = new pg.Pool({ connectionString: dbUrl });

const concepts = [
  {
    id: 'sci-chem-reactions',
    subject: 'Science',
    chapter: 'Chapter 1: Chemical Reactions & Equations',
    nameOr: 'ରାସାୟନିକ ପ୍ରତିକ୍ରିୟା ଓ ସମୀକରଣ (Chemical Reactions & Equations)',
    nameEn: 'Chemical Reactions, Reactants and Products',
    prerequisites: [],
  },
  {
    id: 'sci-chem-types',
    subject: 'Science',
    chapter: 'Chapter 1: Chemical Reactions & Equations',
    nameOr: 'ରାସାୟନିକ ପ୍ରତିକ୍ରିୟାର ପ୍ରକାରଭେଦ (Types of Chemical Reactions)',
    nameEn: 'Combination, Decomposition, Displacement & Redox Reactions',
    prerequisites: ['sci-chem-reactions'],
  },
  {
    id: 'sci-matter-states',
    subject: 'Science',
    chapter: 'Chapter 1: Matter in Our Surroundings',
    nameOr: 'ପଦାର୍ଥର ଅବସ୍ଥା ଓ ବାଷ୍ପୀଭବନ (States of Matter & Evaporation)',
    nameEn: 'Solid, Liquid, Gas and Evaporation',
    prerequisites: [],
  },
  {
    id: 'sci-atoms-molecules',
    subject: 'Science',
    chapter: 'Chapter 3: Atoms and Molecules',
    nameOr: 'ପରମାଣୁ ଓ ଅଣୁ (Atoms and Molecules)',
    nameEn: 'Atomic Theory, Molecules and Chemical Formulae',
    prerequisites: ['sci-matter-states'],
  },
  {
    id: 'sci-c9-newton-laws',
    subject: 'Science',
    chapter: 'Chapter 9: Force and Laws of Motion',
    nameOr: 'ବଳ ଓ ନିଉଟନଙ୍କ ଗତି ନିୟମ (Force & Newton’s Laws of Motion)',
    nameEn: 'Inertia, Momentum and Newton’s Three Laws of Motion',
    prerequisites: ['sci-c8-speed-velocity', 'sci-c8-acceleration'],
  },
];

async function run() {
  for (const c of concepts) {
    await pool.query(
      `INSERT INTO concepts (id, subject, chapter, name_or, name_en, prerequisites, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET
         subject = EXCLUDED.subject,
         chapter = EXCLUDED.chapter,
         name_or = EXCLUDED.name_or,
         name_en = EXCLUDED.name_en,
         prerequisites = EXCLUDED.prerequisites`,
      [c.id, c.subject, c.chapter, c.nameOr, c.nameEn, JSON.stringify(c.prerequisites)],
    );
    console.log('Seeded concept:', c.id, c.nameEn);
  }
  await pool.end();
  console.log('Done!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
