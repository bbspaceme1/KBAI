import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set these environment variables before running the seed script.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const accounts = [
  {
    roleName: "admin",
    email: "admin@bbspace.test",
    password: "Admin123!",
    username: "admin",
    display_name: "Admin User",
    roles: ["admin"],
  },
  {
    roleName: "advisor",
    email: "advisor@bbspace.test",
    password: "Advisor123!",
    username: "advisor",
    display_name: "Advisor User",
    roles: ["advisor"],
  },
  {
    roleName: "user",
    email: "user@bbspace.test",
    password: "User123!",
    username: "user",
    display_name: "Standard User",
    roles: [],
  },
];

async function run() {
  console.log("Seeding Supabase accounts...");
  let hasFailures = false;

  for (const account of accounts) {
    console.log(`\nCreating ${account.roleName} account: ${account.email}`);

    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        username: account.username,
        display_name: account.display_name,
      },
    });

    if (error) {
      console.error(`Failed to create ${account.roleName}:`, error.message ?? error);
      hasFailures = true;
      continue;
    }

    const user = data?.user;
    if (!user) {
      console.error(`No user returned for ${account.email}`);
      hasFailures = true;
      continue;
    }

    const extraRoles = account.roles.filter((role) => role !== "user");
    if (extraRoles.length > 0) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert(extraRoles.map((role) => ({ user_id: user.id, role })));

      if (roleError) {
        hasFailures = true;
        throw new Error(
          `Failed to assign extra role(s) to ${account.email}: ${roleError.message ?? roleError}`,
        );
      }
    }

    // Ensure a `profiles` row exists so `username` lookups work for login/profile
    try {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        username: account.username,
        display_name: account.display_name,
      });
      if (profileError) {
        hasFailures = true;
        throw new Error(
          `Failed to upsert profile for ${account.email}: ${profileError.message ?? profileError}`,
        );
      }
    } catch (err) {
      hasFailures = true;
      throw new Error(`Profiles upsert failed for ${account.email}: ${err}`);
    }

    // Auto-enable 2FA for privileged seeded accounts so admin/advisor can login
    if (account.roleName === "admin" || account.roleName === "advisor") {
      try {
        const { data: existing } = await supabase
          .from("user_2fa")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!existing) {
          const { error: twofaError } = await supabase
            .from("user_2fa")
            .insert([{ user_id: user.id, enabled: true }]);
          if (twofaError) {
            hasFailures = true;
            throw new Error(
              `Failed to create 2FA record for ${account.email}: ${twofaError.message ?? twofaError}`,
            );
          }
        }
      } catch (err) {
        hasFailures = true;
        throw new Error(`2FA setup failed for ${account.email}: ${err}`);
      }
    }

    console.log(
      `Created ${account.roleName} user ${account.email} with password ${account.password}`,
    );
  }

  const expectedRoles = accounts.flatMap((account) =>
    account.roles.map((role) => ({ email: account.email, role })),
  );
  const verificationFailures = [];

  for (const expected of expectedRoles) {
    const { data: user, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      verificationFailures.push(
        `Unable to verify ${expected.email}:${expected.role}: ${userError.message ?? userError}`,
      );
      continue;
    }

    const matchedUser = user.users.find((candidate) => candidate.email === expected.email);
    if (!matchedUser) {
      verificationFailures.push(`Missing seeded user ${expected.email}`);
      continue;
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("user_id", matchedUser.id)
      .eq("role", expected.role)
      .maybeSingle();
    if (roleError || !roleRow) {
      verificationFailures.push(
        `Missing expected role ${expected.email}:${expected.role}${roleError ? ` (${roleError.message ?? roleError})` : ""}`,
      );
    }
  }

  if (verificationFailures.length > 0) {
    console.error("\nSEED VERIFICATION FAILED:");
    verificationFailures.forEach((failure) => console.error(`- ${failure}`));
    hasFailures = true;
  }

  if (hasFailures) {
    throw new Error("Seed completed with failures; review the errors above.");
  }

  console.log("\nSeed complete.");
  console.log("Use these credentials to log in:");
  accounts.forEach((account) => {
    console.log(`- ${account.roleName}: ${account.email} / ${account.password}`);
  });
}

run().catch((error) => {
  console.error("Seed script failed:", error);
  process.exit(1);
});
