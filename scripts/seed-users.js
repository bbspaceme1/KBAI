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
      continue;
    }

    const user = data?.user;
    if (!user) {
      console.error(`No user returned for ${account.email}`);
      continue;
    }

    const extraRoles = account.roles.filter((role) => role !== "user");
    if (extraRoles.length > 0) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert(extraRoles.map((role) => ({ user_id: user.id, role })));

      if (roleError) {
        console.error(
          `Failed to assign extra role(s) to ${account.email}:`,
          roleError.message ?? roleError,
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
        console.error(
          `Failed to upsert profile for ${account.email}:`,
          profileError.message ?? profileError,
        );
      }
    } catch (err) {
      console.error(`Profiles upsert failed for ${account.email}:`, err);
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
            console.error(
              `Failed to create 2FA record for ${account.email}:`,
              twofaError.message ?? twofaError,
            );
          }
        }
      } catch (err) {
        console.error(`2FA setup failed for ${account.email}:`, err);
      }
    }

    console.log(
      `Created ${account.roleName} user ${account.email} with password ${account.password}`,
    );
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
