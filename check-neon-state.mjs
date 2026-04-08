import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const queries = [
  ['Lenders', 'SELECT id, name, "isCaptive", "isActive" FROM "Lender" LIMIT 10'],
  ['Active ProgramBatch', 'SELECT id, status, description, "publishedAt" FROM "ProgramBatch" WHERE status = \'ACTIVE\' LIMIT 5'],
  ['BankPrograms (count)', 'SELECT count(*) as cnt FROM "BankProgram"'],
  ['BankPrograms (sample)', 'SELECT "programType", make, model, term, mileage, rv, mf, apr FROM "BankProgram" LIMIT 5'],
  ['VehicleTrims without MSRP', 'SELECT t.name, t."msrpCents" FROM "VehicleTrim" t WHERE t."msrpCents" = 0 AND t."isActive" = true LIMIT 10'],
  ['VehicleTrims (sample)', 'SELECT t.name, t."msrpCents", t."baseMF", t."rv36" FROM "VehicleTrim" t WHERE t."isActive" = true LIMIT 10'],
  ['Users (roles)', 'SELECT email, role, "firebaseUid" IS NOT NULL as has_firebase FROM "User" LIMIT 10'],
];

for (const [label, sql] of queries) {
  try {
    const res = await client.query(sql);
    console.log(`\n=== ${label} ===`);
    console.table(res.rows);
  } catch (e) {
    console.log(`\n=== ${label} === ERROR: ${e.message}`);
  }
}

await client.end();
