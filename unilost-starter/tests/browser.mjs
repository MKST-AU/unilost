// Playwright is an optional test-only dependency. See docs/myat-testing.md.
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { MongoClient, ObjectId } from "mongodb";
const { chromium } = await import(
  process.env.UNILOST_PLAYWRIGHT_MODULE || "playwright"
);
const config = JSON.parse(
  await readFile(process.env.UNILOST_TEST_CONFIG, "utf8"),
);
assert.ok(config.dbName.startsWith("unilost_test_"));
assert.ok(["127.0.0.1", "localhost"].includes(new URL(config.base).hostname));
const out = process.env.UNILOST_SCREENSHOTS || ".test-artifacts/screenshots";
await mkdir(out, { recursive: true });
const client = new MongoClient(config.uri);
await client.connect();
const db = client.db(config.dbName);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const runtimeErrors = [];
page.on("pageerror", (e) => runtimeErrors.push(e.message));
let passed = 0;
const itemIds = [];
async function check(name, run) {
  await run();
  passed++;
  console.log(`PASS ${name}`);
}
async function api(path, method = "GET", body) {
  const r = await fetch(`${config.base}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: r.status, ...(await r.json()) };
}
async function screenshot(name) {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
async function visible(locator) {
  await locator.waitFor({ state: "visible" });
  assert.ok(await locator.isVisible());
}
async function text(locator, value) {
  await visible(locator);
  assert.ok((await locator.innerText()).includes(value));
}
const valid = {
  itemName: "Local test — blue backpack",
  description: "Blue canvas backpack with a small star keyring.",
  type: "LOST",
  categoryId: config.categoryId,
  locationId: config.locationId,
  date: "2026-09-21",
};
try {
  await check("Dashboard empty state uses real empty database", async () => {
    await page.goto(config.base);
    await visible(page.getByRole("heading", { name: "No reports yet" }));
    await screenshot("01-dashboard-empty");
  });
  await check("Report form uses real Category and Location APIs", async () => {
    await page.goto(`${config.base}/items`);
    await page.getByLabel("Location", { exact: true }).selectOption(config.locationId);
    await page.getByLabel("Category", { exact: true }).selectOption(config.categoryId);
    assert.equal(await page.getByRole("button", { name: "Report item", exact: true }).isEnabled(), true);
    assert.equal(await page.getByRole("alert").filter({ hasText: "Locations unavailable" }).count(), 0);
    await screenshot("02-report-form-real-locations");
  });
  await check(
    "Unmocked Item report list reads actual DB and relationships",
    async () => {
      const response = await api("/items", "POST", valid);
      assert.equal(response.status, 201);
      itemIds.push(response.data._id);
      await page.getByRole("button", { name: "Refresh items" }).click();
      await visible(
        page.getByRole("link", { name: valid.itemName, exact: true }),
      );
      await screenshot("03-items-test-data");
    },
  );
  await check(
    "Item search, empty state, combined filters and clear",
    async () => {
      await page.getByLabel("Search items").fill("no-such-backpack");
      await page.getByRole("button", { name: "Apply filters" }).click();
      await visible(page.getByRole("heading", { name: "No items found" }));
      await page.getByLabel("Search items").fill("blue");
      await page
        .getByLabel("Filter by category")
        .selectOption(config.categoryId);
      await page.getByLabel("Filter by location").selectOption(config.locationId);
      await page
        .getByLabel("Item status", { exact: true })
        .selectOption("LOST");
      await page.getByRole("button", { name: "Apply filters" }).click();
      await visible(
        page.getByRole("link", { name: valid.itemName, exact: true }),
      );
      await page.getByRole("button", { name: "Clear filters" }).click();
      assert.equal(await page.getByLabel("Search items").inputValue(), "");
      assert.equal(
        await page.getByLabel("Item status", { exact: true }).inputValue(),
        "",
      );
    },
  );
  await check(
    "Item details and edit form load real relationships",
    async () => {
      await page
        .getByRole("link", { name: valid.itemName, exact: true })
        .click();
      await visible(
        page.getByRole("heading", { name: valid.itemName, exact: true }),
      );
      await visible(page.getByText("Library — Main building", { exact: true }));
      await screenshot("04-item-details-test-data");
      await page
        .getByRole("button", { name: "Edit item", exact: true })
        .click();
      await page.getByLabel("Location", { exact: true }).selectOption(config.locationId);
      assert.equal(await page.getByRole("button", { name: "Save changes" }).isEnabled(), true);
      await page.getByRole("button", { name: "Cancel editing" }).click();
    },
  );
  await check("Submit claim through actual UI and API", async () => {
    await page.getByRole("link", { name: "Submit or view claims" }).click();
    await page.getByLabel("Claimant name").fill("Local test claimant");
    await page.getByLabel("Contact information").fill("demo@example.invalid");
    await page
      .getByLabel("Ownership evidence")
      .fill("The inside pocket has a green initials tag.");
    await page
      .getByRole("button", { name: "Submit claim", exact: true })
      .click();
    await visible(
      page.getByRole("heading", { name: "Local test claimant", exact: true }),
    );
    await screenshot("05-pending-claim-test-data");
  });
  await check("Edit claim updates the displayed claim", async () => {
    await page.getByRole("button", { name: "Edit claim", exact: true }).click();
    await page.getByLabel("Claimant name").fill("Updated local claimant");
    await page.getByRole("button", { name: "Save claim" }).click();
    await visible(
      page.getByRole("heading", {
        name: "Updated local claimant",
        exact: true,
      }),
    );
    await text(
      page.getByRole("status").filter({ hasText: "Claim updated." }),
      "Claim updated.",
    );
  });
  await check("Reject, filter and delete claim with confirmation", async () => {
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Reject", exact: true }).click();
    await visible(
      page.getByRole("listitem").getByText("REJECTED", { exact: true }),
    );
    await page
      .getByLabel("Claim status", { exact: true })
      .selectOption("PENDING");
    await visible(page.getByRole("heading", { name: "No claims found" }));
    await page
      .getByLabel("Claim status", { exact: true })
      .selectOption("REJECTED");
    await visible(
      page.getByRole("heading", { name: "Updated local claimant" }),
    );
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Delete claim", exact: true })
      .click();
    await visible(page.getByRole("heading", { name: "No claims found" }));
  });
  await check("Approve claim and show workflow guidance", async () => {
    await page.getByLabel("Claim status", { exact: true }).selectOption("");
    await page.getByLabel("Claimant name").fill("Approved local claimant");
    await page.getByLabel("Contact information").fill("demo@example.invalid");
    await page
      .getByLabel("Ownership evidence")
      .fill("A green initials tag inside the pocket.");
    await page
      .getByRole("button", { name: "Submit claim", exact: true })
      .click();
    await visible(
      page.getByRole("heading", { name: "Approved local claimant" }),
    );
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await visible(
      page.getByRole("status").filter({ hasText: "Claim approved." }),
    );
    await screenshot("06-approved-claim-test-data");
  });
  await check("Item deletion is blocked when claims exist", async () => {
    await page.goto(`${config.base}/items/${itemIds[0]}`);
    await visible(page.getByRole("button", { name: "Delete item" }));
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Delete item" }).click();
    await visible(
      page.getByRole("alert").filter({ hasText: "Delete this item's claims" }),
    );
  });
  await check("Invalid and missing item pages show errors", async () => {
    await page.goto(`${config.base}/items/bad`);
    await visible(
      page.getByRole("alert").filter({ hasText: "Invalid item ID" }),
    );
    await page.goto(`${config.base}/items/${new ObjectId()}`);
    await visible(
      page.getByRole("alert").filter({ hasText: "Item not found" }),
    );
  });
  await check("Dashboard populated values match API and refresh", async () => {
    await page.goto(config.base);
    await visible(page.getByRole("heading", { name: "Latest reports" }));
    const summary = (await api("/dashboard")).data;
    const card = page
      .locator('section[aria-label="Campus summary"] > div')
      .filter({ hasText: "Approved claims" });
    assert.equal(
      await card.locator("strong").innerText(),
      String(summary.approvedClaims),
    );
    await screenshot("07-dashboard-test-data");
  });
  await check("Dashboard failure and retry states", async () => {
    await page.route("**/api/dashboard", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unable to load dashboard" }),
      }),
    );
    await page.getByRole("button", { name: "Refresh summary" }).click();
    await visible(
      page.getByRole("alert").filter({ hasText: "Unable to load dashboard" }),
    );
    await page.unroute("**/api/dashboard");
    await page.getByRole("button", { name: "Try again" }).click();
    await visible(page.getByRole("heading", { name: "Latest reports" }));
  });
  await check("Mobile pages do not overflow horizontally", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ["/", "/items", `/items/${itemIds[0]}`, "/claims"]) {
      await page.goto(`${config.base}${path}`);
      await page.locator("h1").waitFor();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `Horizontal overflow: ${path}`,
      );
    }
    await screenshot("08-mobile-claims-test-data");
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await check(
    "Real API: report form rejects blank required values",
    async () => {
      await page.goto(`${config.base}/items`);
      await page.getByLabel("Item name", { exact: true }).waitFor();
      await page.getByLabel("Item name", { exact: true }).fill("");
      await page
        .getByRole("button", { name: "Report item", exact: true })
        .click();
      assert.equal(
        await page
          .getByLabel("Item name", { exact: true })
          .evaluate((el) => el.validity.valueMissing),
        true,
      );
    },
  );
  let createdId;
  await check(
    "Real API: report item through form",
    async () => {
      await page
        .getByLabel("Item name", { exact: true })
        .fill("Local test — found notebook");
      await page
        .getByLabel("Description", { exact: true })
        .fill("Green notebook with a library bookmark.");
      await page
        .getByLabel("Report type", { exact: true })
        .first()
        .selectOption("FOUND");
      await page
        .getByLabel("Category", { exact: true })
        .selectOption(config.categoryId);
      await page
        .getByLabel("Location", { exact: true })
        .selectOption(config.locationId);
      await page.getByLabel("Date lost or found").fill("2026-09-21");
      await page
        .getByRole("button", { name: "Report item", exact: true })
        .click();
      await visible(
        page.getByRole("link", {
          name: "Local test — found notebook",
          exact: true,
        }),
      );
      const created = (await api("/items?q=found%20notebook")).data[0];
      createdId = created._id;
      itemIds.push(createdId);
      await screenshot("09-report-success-real-api");
    },
  );
  await check(
    "Real API: edit Item UI persists changes",
    async () => {
      await page.goto(`${config.base}/items/${createdId}`);
      await page
        .getByRole("button", { name: "Edit item", exact: true })
        .click();
      await page
        .getByLabel("Item name", { exact: true })
        .fill("Local test — edited notebook");
      await page.getByRole("button", { name: "Save changes" }).click();
      await visible(
        page.getByRole("heading", {
          name: "Local test — edited notebook",
          exact: true,
        }),
      );
      assert.equal(
        (await api(`/items/${createdId}`)).data.itemName,
        "Local test — edited notebook",
      );
    },
  );
  await check(
    "Real API: approved claim enables CLAIMED then RETURNED",
    async () => {
      await page.goto(`${config.base}/items/${itemIds[0]}`);
      await page
        .getByRole("button", { name: "Edit item", exact: true })
        .click();
      await page.getByLabel("Status", { exact: true }).selectOption("CLAIMED");
      await page.getByRole("button", { name: "Save changes" }).click();
      await visible(
        page.getByRole("status").filter({ hasText: "Item updated." }),
      );
      await page
        .getByRole("button", { name: "Edit item", exact: true })
        .click();
      await page.getByLabel("Status", { exact: true }).selectOption("RETURNED");
      await page.getByRole("button", { name: "Save changes" }).click();
      await visible(page.getByText("RETURNED", { exact: true }));
      await screenshot("10-returned-item-real-api");
    },
  );
  await check(
    "Delete cancellation preserves Item; confirmed deletion removes it",
    async () => {
      await page.goto(`${config.base}/items/${createdId}`);
      await page.getByRole("button", { name: "Delete item" }).waitFor();
      page.once("dialog", (d) => d.dismiss());
      await page.getByRole("button", { name: "Delete item" }).click();
      assert.equal((await api(`/items/${createdId}`)).status, 200);
      page.once("dialog", (d) => d.accept());
      await page.getByRole("button", { name: "Delete item" }).click();
      await visible(
        page.getByRole("status").filter({ hasText: "Item deleted." }),
      );
      assert.equal((await api(`/items/${createdId}`)).status, 404);
    },
  );
  await check(
    "Simulated empty locations disables reporting with a clear message",
    async () => {
      await page.unroute("**/api/locations");
      await page.route("**/api/locations", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [] }),
        }),
      );
      await page.goto(`${config.base}/items`);
      await visible(
        page
          .getByRole("alert")
          .filter({ hasText: "No locations are available" }),
      );
      assert.ok(
        await page
          .getByRole("button", { name: "Report item", exact: true })
          .isDisabled(),
      );
    },
  );
  await check(
    "Category error and empty-choice states disable reporting",
    async () => {
      await page.route("**/api/categories", (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Unable to load categories" }),
        }),
      );
      await page.goto(`${config.base}/items`);
      await visible(
        page.getByRole("alert").filter({ hasText: "Categories unavailable" }),
      );
      assert.ok(
        await page
          .getByRole("button", { name: "Report item", exact: true })
          .isDisabled(),
      );
      await page.unroute("**/api/categories");
      await page.route("**/api/categories", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [] }),
        }),
      );
      await page.goto(`${config.base}/items`);
      await visible(
        page.getByRole("alert").filter({ hasText: "Create a category before reporting an item" }),
      );
      await page.unroute("**/api/categories");
    },
  );
  await check("Item list loading, error and retry states", async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    await page.route("**/api/items?**", async (route) => {
      await gate;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unable to load items" }),
      });
    });
    await page.goto(`${config.base}/items`);
    await visible(page.getByRole("status").filter({ hasText: /^Loading…$/ }));
    release();
    await visible(
      page.getByRole("alert").filter({ hasText: "Unable to load items" }),
    );
    await page.unroute("**/api/items?**");
    await page.getByRole("button", { name: "Try again" }).click();
    await visible(
      page.getByRole("link", { name: valid.itemName, exact: true }),
    );
  });
  await check("Claim list error and retry states", async () => {
    await page.route("**/api/claims?**", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unable to load claims" }),
      }),
    );
    await page.goto(`${config.base}/claims`);
    await visible(
      page.getByRole("alert").filter({ hasText: "Unable to load claims" }),
    );
    await page.unroute("**/api/claims?**");
    await page.getByRole("button", { name: "Try again" }).click();
    await visible(
      page.getByRole("heading", {
        name: "Approved local claimant",
        exact: true,
      }),
    );
  });
  await check("No uncaught browser runtime errors", async () =>
    assert.deepEqual(runtimeErrors, []),
  );
  console.log(
    `\n${passed} browser checks passed. Successful Item/Claim/Location workflows used real APIs and MongoDB. Only error/loading/empty states were simulated.`,
  );
} catch (error) {
  await screenshot("failure");
  throw error;
} finally {
  await db
    .collection("claims")
    .deleteMany({ itemId: { $in: itemIds.map((id) => new ObjectId(id)) } });
  await db
    .collection("items")
    .deleteMany({ _id: { $in: itemIds.map((id) => new ObjectId(id)) } });
  await browser.close();
  await client.close();
}
