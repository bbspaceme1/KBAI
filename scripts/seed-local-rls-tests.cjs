const { createClient } = require("@supabase/supabase-js");
const { appendFileSync } = require("node:fs");
const { randomUUID } = require("node:crypto");

const url = process.env.API_URL;
const anonKey = process.env.ANON_KEY;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey || !process.env.GITHUB_ENV) {
  throw new Error("Local Supabase API URL, keys, and GITHUB_ENV are required.");
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function requireData(label, result) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function createTestUser(email) {
  const password = `${randomUUID()}Aa1!`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  const user = await requireData(`create ${email}`, created);
  const signedIn = await anon.auth.signInWithPassword({ email, password });
  const session = await requireData(`sign in ${email}`, signedIn);
  if (!session.session?.access_token) throw new Error(`No access token for ${email}`);
  return { id: user.user.id, token: session.session.access_token };
}

async function main() {
  const [userA, userB, advisor] = await Promise.all([
    createTestUser("rls-user-a@kbai.test"),
    createTestUser("rls-user-b@kbai.test"),
    createTestUser("rls-advisor@kbai.test"),
  ]);

  await requireData(
    "assign advisor role",
    await admin.from("user_sub_roles").insert({ user_id: advisor.id, role: "advisor" }),
  );
  await requireData(
    "assign advisor client",
    await admin.from("advisor_clients").insert({ advisor_id: advisor.id, client_id: userA.id }),
  );

  await requireData(
    "seed holdings",
    await admin.from("holdings").insert([
      { user_id: userA.id, ticker: "RLSA", total_lot: 1, avg_price: 1000 },
      { user_id: userB.id, ticker: "RLSB", total_lot: 1, avg_price: 2000 },
    ]),
  );
  await requireData(
    "seed transactions",
    await admin.from("transactions").insert([
      { user_id: userA.id, ticker: "RLSA", side: "BUY", lot: 1, price: 1000 },
      { user_id: userB.id, ticker: "RLSB", side: "BUY", lot: 1, price: 2000 },
    ]),
  );
  const today = new Date().toISOString().slice(0, 10);
  await requireData(
    "seed portfolio snapshots",
    await admin.from("portfolio_snapshots").insert([
      { user_id: userA.id, date: today, total_value: 1000, total_cost: 1000, total_pl: 0 },
      { user_id: userB.id, date: today, total_value: 2000, total_cost: 2000, total_pl: 0 },
    ]),
  );

  const lines = {
    RLS_TEST_ENVIRONMENT: "isolated",
    RLS_TEST_SUPABASE_URL: url,
    RLS_TEST_SUPABASE_ANON_KEY: anonKey,
    RLS_TEST_USER_A_TOKEN: userA.token,
    RLS_TEST_USER_A_ID: userA.id,
    RLS_TEST_USER_B_ID: userB.id,
    RLS_TEST_ADVISOR_TOKEN: advisor.token,
    RLS_TEST_ADVISOR_ID: advisor.id,
    RLS_TEST_ASSIGNED_CLIENT_ID: userA.id,
    RLS_TEST_UNASSIGNED_CLIENT_ID: userB.id,
  };

  for (const [key, value] of Object.entries(lines)) {
    console.log(`::add-mask::${value}`);
    appendFileSync(process.env.GITHUB_ENV, `${key}=${value}\n`);
  }
  console.log("Created isolated RLS fixtures for two users and one assigned advisor.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
