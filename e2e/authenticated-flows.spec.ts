import { test, expect } from "@playwright/test";
import { Page } from "@playwright/test";

/**
 * E2E Test Fixtures with Authentication
 * Provides pre-authenticated page contexts for different user roles
 */

// Define test user credentials (from environment or seeded test data)
const TEST_USERS = {
  member: {
    email: process.env.TEST_USER_MEMBER_EMAIL || "member@test.kbai.id",
    password: process.env.TEST_USER_MEMBER_PASSWORD || "TestPass123!@#",
    role: "member",
  },
  advisor: {
    email: process.env.TEST_USER_ADVISOR_EMAIL || "advisor@test.kbai.id",
    password: process.env.TEST_USER_ADVISOR_PASSWORD || "TestPass123!@#",
    role: "advisor",
  },
  admin: {
    email: process.env.TEST_USER_ADMIN_EMAIL || "admin@test.kbai.id",
    password: process.env.TEST_USER_ADMIN_PASSWORD || "TestPass123!@#",
    role: "admin",
  },
};

/**
 * Login a user and save auth state
 */
async function login(page: Page, email: string, password: string) {
  await page.goto("/login");

  // Fill login form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Click submit and wait for navigation
  await Promise.all([page.waitForNavigation(), page.click('button[type="submit"]')]);

  // Verify we're logged in (check for authenticated element)
  await expect(page).toHaveURL(/\/(portfolio|dashboard|analisis)/);
}

/**
 * Test suite: Portfolio Management (Member role)
 */
test.describe("Portfolio Management - Member", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await login(page, TEST_USERS.member.email, TEST_USERS.member.password);
  });

  test("should display empty portfolio for new user", async () => {
    await page.goto("/portfolio");
    await expect(page.locator('[data-testid="portfolio-empty-state"]')).toBeVisible();
    await expect(page.locator('button:has-text("Add Transaction")')).toBeVisible();
  });

  test("should add buy transaction", async () => {
    await page.goto("/portfolio");
    await page.click('[data-testid="add-transaction"]');

    // Fill form
    await page.fill('[name="ticker"]', "BBRI");
    await page.fill('[name="lot"]', "100");
    await page.fill('[name="price"]', "3500");
    await page.selectOption('[name="type"]', "BUY");
    await page.fill('[name="date"]', new Date().toISOString().split("T")[0]);

    // Submit
    await page.click('button:has-text("Add Transaction")');

    // Verify transaction appears in table
    await expect(page.locator("text=BBRI")).toBeVisible();
    await expect(page.locator("text=100")).toBeVisible();
  });

  test("should calculate holdings correctly", async () => {
    await page.goto("/portfolio");

    // Add BBRI: 100 @ 3500
    await page.click('[data-testid="add-transaction"]');
    await page.fill('[name="ticker"]', "BBRI");
    await page.fill('[name="lot"]', "100");
    await page.fill('[name="price"]', "3500");
    await page.selectOption('[name="type"]', "BUY");
    await page.click('button:has-text("Add")');

    // Add more BBRI: 50 @ 3600
    await page.click('[data-testid="add-transaction"]');
    await page.fill('[name="ticker"]', "BBRI");
    await page.fill('[name="lot"]', "50");
    await page.fill('[name="price"]', "3600");
    await page.selectOption('[name="type"]', "BUY");
    await page.click('button:has-text("Add")');

    // Verify holdings shows 150 total
    await expect(page.locator("text=150")).toBeVisible();

    // Average cost should be (100*3500 + 50*3600) / 150 = 3533.33
    await expect(page.locator('[data-testid="avg-cost"]')).toContainText("3533");
  });

  test("should sell shares and update holdings", async () => {
    // Assumes portfolio has BBRI holdings from previous test
    await page.goto("/portfolio");

    // Sell 50 BBRI
    await page.click('[data-testid="add-transaction"]');
    await page.fill('[name="ticker"]', "BBRI");
    await page.fill('[name="lot"]', "50");
    await page.fill('[name="price"]', "4000");
    await page.selectOption('[name="type"]', "SELL");
    await page.click('button:has-text("Add")');

    // Verify holdings update
    await expect(page.locator("text=100")).toBeVisible(); // 150 - 50 = 100
  });

  test("should add to watchlist", async () => {
    await page.goto("/watchlist");
    await page.click('[data-testid="add-watchlist"]');

    await page.fill('[name="ticker"]', "TLKM");
    await page.fill('[name="alertPrice"]', "3500");
    await page.selectOption('[name="alertType"]', "BELOW");

    await page.click('button:has-text("Add")');
    await expect(page.locator("text=TLKM")).toBeVisible();
  });
});

/**
 * Test suite: Admin Dashboard
 */
test.describe("Admin Dashboard - Admin Role", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  });

  test("should access admin dashboard", async () => {
    await page.goto("/admin");
    await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible();
  });

  test("should view user management section", async () => {
    await page.goto("/admin/users");
    await expect(page.locator('[data-testid="users-list"]')).toBeVisible();
  });

  test("should promote member to advisor", async () => {
    await page.goto("/admin/users");

    // Find a member user (can filter or search)
    await page.click('[data-testid="promote-user-btn"]');

    await page.selectOption('[name="role"]', "advisor");
    await page.fill('[name="reason"]', "Performance exceeds expectations");

    await page.click('button:has-text("Promote")');

    // Verify confirmation message
    await expect(page.locator("text=User promoted to advisor")).toBeVisible();
  });

  test("should view audit logs", async () => {
    await page.goto("/admin/audit-logs");
    await expect(page.locator('[data-testid="audit-table"]')).toBeVisible();

    // Should see recent changes
    const rows = await page.locator("tr").count();
    expect(rows).toBeGreaterThan(0);
  });
});

/**
 * Test suite: AI Features (Member with AI access)
 */
test.describe("AI Insights - Member", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await login(page, TEST_USERS.member.email, TEST_USERS.member.password);
  });

  test("should request stock analysis", async () => {
    await page.goto("/analisis");

    // Select ticker
    await page.fill('[name="ticker"]', "BBRI");
    await page.selectOption('[name="analysisType"]', "VALUATION");

    // Submit analysis request
    await page.click('button:has-text("Analyze")');

    // Wait for AI response with timeout
    await expect(page.locator('[data-testid="analysis-result"]')).toBeVisible({
      timeout: 30000,
    });

    // Verify disclaimer is shown
    await expect(page.locator("text=This analysis is for educational purposes")).toBeVisible();
  });

  test("should view market brief", async () => {
    await page.goto("/dashboard");

    // Click "Generate Brief" button
    await page.click('[data-testid="generate-brief"]');

    // Wait for brief to load
    await expect(page.locator('[data-testid="market-brief"]')).toBeVisible({
      timeout: 30000,
    });

    // Verify content sections are present
    await expect(page.locator("text=Top Gainers")).toBeVisible();
    await expect(page.locator("text=Top Losers")).toBeVisible();
  });

  test("should check AI quota remaining", async () => {
    await page.goto("/account/settings");

    // Navigate to AI usage section
    await page.click('[data-testid="ai-quota-section"]');

    // Should show quota usage
    await expect(page.locator('[data-testid="quota-used"]')).toBeVisible();
    await expect(page.locator('[data-testid="quota-remaining"]')).toBeVisible();
    await expect(page.locator('[data-testid="quota-bar"]')).toBeVisible();
  });
});

/**
 * Test suite: RBAC and Authorization
 */
test.describe("Authorization - RBAC", () => {
  test("member should not access admin panel", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await login(page, TEST_USERS.member.email, TEST_USERS.member.password);

    // Try to access admin
    await page.goto("/admin", { waitUntil: "networkidle" });

    // Should be redirected or see 403
    expect(page.url()).not.toContain("/admin");
    await expect(page.locator("text=Unauthorized")).toBeVisible();
  });

  test("advisor can view but not modify settings", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await login(page, TEST_USERS.advisor.email, TEST_USERS.advisor.password);

    await page.goto("/admin");

    // Should see read-only dashboard
    await expect(page.locator('[data-testid="advisor-dashboard"]')).toBeVisible();

    // Modify buttons should be disabled or absent
    await expect(page.locator('[data-testid="delete-user-btn"]')).not.toBeVisible();
  });

  test("admin can access all sections", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);

    // Check admin has access to all main sections
    const adminSections = ["/admin", "/admin/users", "/admin/audit-logs", "/admin/settings"];

    for (const section of adminSections) {
      await page.goto(section);
      expect(page.url()).toContain(section);
    }
  });
});

/**
 * Test suite: Error Handling & Edge Cases
 */
test.describe("Error Handling", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await login(page, TEST_USERS.member.email, TEST_USERS.member.password);
  });

  test("should handle invalid ticker input", async () => {
    await page.goto("/portfolio");
    await page.click('[data-testid="add-transaction"]');

    // Try invalid ticker
    await page.fill('[name="ticker"]', "INVALID123");
    await page.fill('[name="lot"]', "100");
    await page.fill('[name="price"]', "1000");

    await page.click('button:has-text("Add")');

    // Should show validation error
    await expect(page.locator("text=Invalid ticker format")).toBeVisible();
  });

  test("should handle network errors gracefully", async () => {
    // Simulate network error
    await page.context().setOffline(true);

    await page.goto("/portfolio");

    // Should show offline message or cached data
    await expect(
      page.locator("text=You appear to be offline") | page.locator('[data-testid="portfolio"]'),
    ).toBeVisible();

    // Re-enable network
    await page.context().setOffline(false);
  });

  test("should handle API errors gracefully", async () => {
    // Intercept API call and return error
    await page.route("**/api/**", (route) => {
      route.abort("failed");
    });

    await page.reload();

    // Should show error message
    await expect(
      page.locator("text=Something went wrong") | page.locator("text=Try again"),
    ).toBeVisible();
  });
});

/**
 * Test suite: Performance & Load Time
 */
test.describe("Performance", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await login(page, TEST_USERS.member.email, TEST_USERS.member.password);
  });

  test("portfolio page should load in under 3 seconds", async () => {
    const start = Date.now();
    await page.goto("/portfolio", { waitUntil: "networkidle" });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(3000);
  });

  test("large portfolio list should paginate correctly", async () => {
    await page.goto("/portfolio?limit=100");

    // Check pagination controls
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible();

    // Navigate to page 2
    await page.click('[data-testid="next-page"]');

    expect(page.url()).toContain("page=2");
  });
});
