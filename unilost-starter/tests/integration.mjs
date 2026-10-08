// Run only against the disposable local server described in docs/testing.md.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { MongoClient, ObjectId } from "mongodb";
const config = JSON.parse(
  await readFile(process.env.UNILOST_TEST_CONFIG, "utf8"),
);
assert.ok(
  config.dbName.startsWith("unilost_test_"),
  "Use a disposable test database",
);
assert.ok(
  ["127.0.0.1", "localhost"].includes(new URL(config.base).hostname),
  "Use a local test server",
);
const client = new MongoClient(config.uri);
await client.connect();
const db = client.db(config.dbName);
const items = [],
  claims = [];
let passed = 0;
async function check(name, run) {
  await run();
  passed++;
  console.log(`PASS ${name}`);
}
async function api(path, method = "GET", body) {
  const response = await fetch(`${config.base}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  return { status: response.status, ...data };
}
const valid = {
  itemName: "Integration laptop",
  description: "Silver laptop with a green case",
  type: "LOST",
  categoryId: config.categoryId,
  locationId: config.locationId,
  date: "2026-09-21",
};
async function createItem(input = {}) {
  const response = await api("/items", "POST", { ...valid, ...input });
  assert.equal(response.status, 201);
  items.push(response.data._id);
  return response.data;
}
async function createClaim(item, input = {}) {
  const response = await api("/claims", "POST", {
    itemId: item._id,
    claimantName: "Test claimant",
    contactInformation: "test@example.invalid",
    description: "Green case with a small star sticker",
    ...input,
  });
  assert.equal(response.status, 201);
  claims.push(response.data._id);
  return response.data;
}
try {
  assert.ok(
    await db
      .collection("categories")
      .findOne({ _id: new ObjectId(config.categoryId) }),
  );
  assert.ok(
    await db
      .collection("locations")
      .findOne({ _id: new ObjectId(config.locationId) }),
  );
  let item, found, claim;
  await check(
    "Create LOST item; trim input and protect system/unknown fields",
    async () => {
      item = await createItem({
        itemName: "  Integration laptop  ",
        _id: new ObjectId().toHexString(),
        status: "RETURNED",
        createdAt: "1900-01-01",
        userId: "forged-user",
        arbitrary: true,
      });
      assert.equal(item.itemName, valid.itemName);
      assert.equal(item.status, "LOST");
      assert.ok(Date.now() - Date.parse(item.createdAt) < 10000);
      const stored = await db
        .collection("items")
        .findOne({ _id: new ObjectId(item._id) });
      assert.ok(stored.categoryId instanceof ObjectId);
      assert.ok(stored.locationId instanceof ObjectId);
      assert.deepEqual(
        Object.keys(stored).sort(),
        [
          "_id",
          "itemName",
          "description",
          "type",
          "categoryId",
          "locationId",
          "date",
          "status",
          "createdAt",
        ].sort(),
      );
    },
  );
  await check(
    "Create FOUND item with ISO timestamp and maximum text lengths",
    async () => {
      found = await createItem({
        type: "FOUND",
        itemName: "x".repeat(120),
        description: "y".repeat(2000),
        date: "2024-02-29T12:30:00+07:00",
      });
      assert.equal(found.status, "FOUND");
    },
  );
  await check("List items with Category/Location relationships", async () => {
    const response = await api("/items");
    assert.equal(response.status, 200);
    const match = response.data.find((row) => row._id === item._id);
    assert.equal(match.category._id, config.categoryId);
    assert.equal(match.location._id, config.locationId);
    assert.equal(match.location.building, "Main building");
    assert.ok(response.pagination.total >= 2);
  });
  await check("Get one item with relations", async () => {
    const response = await api(`/items/${item._id}`);
    assert.equal(response.status, 200);
    assert.equal(response.data.itemName, valid.itemName);
    assert.ok(response.data.category.name);
  });
  for (const key of Object.keys(valid))
    await check(`Missing item ${key} returns 400`, async () => {
      const value = { ...valid };
      delete value[key];
      assert.equal((await api("/items", "POST", value)).status, 400);
    });
  const invalid = {
    itemName: ["", " ", 8, "x".repeat(121)],
    description: ["", null, "x".repeat(2001)],
    type: ["lost", "RETURNED", {}],
    categoryId: ["bad", { $ne: null }, new ObjectId().toHexString()],
    locationId: ["bad", [], new ObjectId().toHexString()],
    date: ["2026-02-30", "yesterday", "09/21/2026", "2026-09-21T25:00:00Z"],
  };
  for (const [field, values] of Object.entries(invalid))
    for (const [i, value] of values.entries())
      await check(`Invalid item ${field} #${i + 1}`, async () =>
        assert.equal(
          (await api("/items", "POST", { ...valid, [field]: value })).status,
          400,
        ),
      );
  for (const body of [null, [], 42, "text"])
    await check(`Non-object payload ${JSON.stringify(body)}`, async () =>
      assert.equal((await api("/items", "POST", body)).status, 400),
    );
  await check("Malformed JSON returns 400 for both create APIs", async () => {
    for (const path of ["/items", "/claims"])
      assert.equal(
        (
          await fetch(`${config.base}/api${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{invalid",
          })
        ).status,
        400,
      );
  });
  for (const route of ["/items", "/claims"]) {
    for (const method of ["GET", "PUT", "DELETE"]) {
      await check(`${method} ${route} invalid ID returns 400`, async () =>
        assert.equal(
          (
            await api(
              `${route}/bad`,
              method,
              method === "PUT" ? valid : undefined,
            )
          ).status,
          400,
        ),
      );
    }
    await check(`${route} missing ID returns 404`, async () =>
      assert.equal((await api(`${route}/${new ObjectId()}`)).status, 404),
    );
  }
  await check(
    "Update Item and protect _id/createdAt/unknown fields",
    async () => {
      const response = await api(`/items/${item._id}`, "PUT", {
        ...valid,
        itemName: "Edited integration laptop",
        createdAt: "1900-01-01",
        _id: new ObjectId().toHexString(),
        userId: "forged",
      });
      assert.equal(response.status, 200);
      assert.equal(response.data._id, item._id);
      assert.equal(response.data.createdAt, item.createdAt);
      assert.equal(response.data.itemName, "Edited integration laptop");
      item = response.data;
    },
  );
  await check(
    "Item invalid update and impossible workflow rejected",
    async () => {
      for (const changes of [
        { categoryId: "bad" },
        { status: "UNKNOWN" },
        { status: "CLAIMED" },
        { status: "RETURNED" },
        { status: "FOUND" },
      ])
        assert.equal(
          (await api(`/items/${item._id}`, "PUT", { ...item, ...changes }))
            .status,
          400,
        );
    },
  );
  await check("Category deletion guard respects Item reference", async () =>
    assert.equal(
      (await api(`/categories/${config.categoryId}`, "DELETE")).status,
      400,
    ),
  );
  await check(
    "Text search matches name and description case-insensitively",
    async () => {
      for (const q of ["EDITED INTEGRATION", "green case"])
        assert.ok(
          (await api(`/items?q=${encodeURIComponent(q)}`)).data.some(
            (row) => row._id === item._id,
          ),
        );
    },
  );
  await check(
    "Search treats regex syntax literally and yields empty results",
    async () => assert.equal((await api("/items?q=.*")).data.length, 0),
  );
  await check(
    "Category, location, status and combined filters work",
    async () => {
      for (const query of [
        `categoryId=${config.categoryId}`,
        `locationId=${config.locationId}`,
        "status=LOST",
        "type=LOST",
        `q=integration&categoryId=${config.categoryId}&locationId=${config.locationId}&status=LOST&type=LOST`,
      ]) {
        const response = await api(`/items?${query}`);
        assert.equal(response.status, 200);
        assert.ok(response.data.some((row) => row._id === item._id));
      }
    },
  );
  await check(
    "Incompatible filter combinations produce empty results",
    async () =>
      assert.equal((await api("/items?status=FOUND&type=LOST")).data.length, 0),
  );
  await check("Pagination has stable order and bounded pages", async () => {
    const first = await api("/items?limit=1&page=1"),
      second = await api("/items?limit=1&page=2");
    assert.equal(first.data.length, 1);
    assert.equal(second.data.length, 1);
    assert.notEqual(first.data[0]._id, second.data[0]._id);
  });
  for (const query of [
    "categoryId=bad",
    "locationId=bad",
    "status=oops",
    "type=oops",
    "page=-1",
    "limit=101",
    "limit=0",
    `q=${"a".repeat(121)}`,
  ])
    await check(`Reject invalid filter ${query.slice(0, 35)}`, async () =>
      assert.equal((await api(`/items?${query}`)).status, 400),
    );
  await check(
    "Create claim defaults to PENDING and ignores protected fields",
    async () => {
      claim = await createClaim(item, {
        status: "APPROVED",
        createdAt: "1900-01-01",
        userId: "fake-user",
        _id: new ObjectId().toHexString(),
      });
      assert.equal(claim.status, "PENDING");
      assert.ok(Date.now() - Date.parse(claim.createdAt) < 10000);
      const stored = await db
        .collection("claims")
        .findOne({ _id: new ObjectId(claim._id) });
      assert.deepEqual(
        Object.keys(stored).sort(),
        [
          "_id",
          "itemId",
          "claimantName",
          "contactInformation",
          "description",
          "status",
          "createdAt",
        ].sort(),
      );
    },
  );
  const claimInput = {
    itemId: item._id,
    claimantName: "Tester",
    contactInformation: "test@example.invalid",
    description: "Ownership evidence",
  };
  for (const field of Object.keys(claimInput))
    await check(`Missing claim ${field}`, async () => {
      const value = { ...claimInput };
      delete value[field];
      assert.equal((await api("/claims", "POST", value)).status, 400);
    });
  for (const [field, value] of [
    ["itemId", "bad"],
    ["itemId", new ObjectId().toHexString()],
    ["claimantName", " "],
    ["claimantName", "a".repeat(121)],
    ["contactInformation", {}],
    ["contactInformation", "a".repeat(201)],
    ["description", ""],
    ["description", "a".repeat(2001)],
  ])
    await check(
      `Invalid claim ${field} ${String(value).slice(0, 12)}`,
      async () =>
        assert.equal(
          (await api("/claims", "POST", { ...claimInput, [field]: value }))
            .status,
          400,
        ),
    );
  await check(
    "List claims includes related Item; filter by Item and status",
    async () => {
      const response = await api(`/claims?itemId=${item._id}&status=PENDING`);
      assert.equal(response.status, 200);
      assert.equal(response.data.length, 1);
      assert.equal(response.data[0].item.itemName, item.itemName);
    },
  );
  await check("Get one claim", async () =>
    assert.equal((await api(`/claims/${claim._id}`)).data._id, claim._id),
  );
  await check(
    "Update claim details and preserve creation timestamp",
    async () => {
      const response = await api(`/claims/${claim._id}`, "PUT", {
        ...claim,
        claimantName: "Edited claimant",
        createdAt: "1900-01-01",
      });
      assert.equal(response.status, 200);
      assert.equal(response.data.createdAt, claim.createdAt);
      claim = response.data;
    },
  );
  await check("Claim itemId and status restrictions", async () => {
    assert.equal(
      (
        await api(`/claims/${claim._id}`, "PUT", {
          ...claim,
          itemId: found._id,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await api(`/claims/${claim._id}`, "PUT", {
          ...claim,
          status: "UNKNOWN",
        })
      ).status,
      400,
    );
  });
  await check("Item deletion blocked while any claim exists", async () =>
    assert.equal((await api(`/items/${item._id}`, "DELETE")).status, 400),
  );
  await check(
    "Approve claim; Item status changes only on explicit handover workflow",
    async () => {
      const response = await api(`/claims/${claim._id}`, "PUT", {
        ...claim,
        status: "APPROVED",
      });
      assert.equal(response.status, 200);
      claim = response.data;
      assert.equal((await api(`/items/${item._id}`)).data.status, "LOST");
    },
  );
  const secondClaim = await createClaim(item, {
    claimantName: "Second claimant",
  });
  await check("Second approved claim blocked by unique index", async () =>
    assert.equal(
      (
        await api(`/claims/${secondClaim._id}`, "PUT", {
          ...secondClaim,
          status: "APPROVED",
        })
      ).status,
      400,
    ),
  );
  await check("Reject claim", async () =>
    assert.equal(
      (
        await api(`/claims/${secondClaim._id}`, "PUT", {
          ...secondClaim,
          status: "REJECTED",
        })
      ).data.status,
      "REJECTED",
    ),
  );
  await check("Final claim decision cannot be rewritten", async () =>
    assert.equal(
      (
        await api(`/claims/${claim._id}`, "PUT", {
          ...claim,
          status: "REJECTED",
        })
      ).status,
      400,
    ),
  );
  await check("Mark Item CLAIMED with approved claim", async () => {
    const response = await api(`/items/${item._id}`, "PUT", {
      ...item,
      status: "CLAIMED",
    });
    assert.equal(response.status, 200);
    item = response.data;
  });
  await check(
    "No new claims for claimed item; approved evidence cannot be deleted",
    async () => {
      assert.equal((await api("/claims", "POST", claimInput)).status, 400);
      assert.equal((await api(`/claims/${claim._id}`, "DELETE")).status, 400);
    },
  );
  await check(
    "Confirm RETURNED after handover and prevent reopening",
    async () => {
      const response = await api(`/items/${item._id}`, "PUT", {
        ...item,
        status: "RETURNED",
      });
      assert.equal(response.status, 200);
      item = response.data;
      assert.equal(
        (await api(`/items/${item._id}`, "PUT", { ...item, status: "LOST" }))
          .status,
        400,
      );
    },
  );
  await check(
    "Delete rejected claim and return 404 on subsequent read/delete",
    async () => {
      assert.equal(
        (await api(`/claims/${secondClaim._id}`, "DELETE")).status,
        200,
      );
      assert.equal((await api(`/claims/${secondClaim._id}`)).status, 404);
      assert.equal(
        (await api(`/claims/${secondClaim._id}`, "DELETE")).status,
        404,
      );
    },
  );
  await check("Delete standalone item and return 404 thereafter", async () => {
    assert.equal((await api(`/items/${found._id}`, "DELETE")).status, 200);
    assert.equal((await api(`/items/${found._id}`)).status, 404);
    assert.equal((await api(`/items/${found._id}`, "DELETE")).status, 404);
  });
  await check("Dashboard counts equal actual database statuses", async () => {
    const response = await api("/dashboard");
    assert.equal(response.status, 200);
    const data = response.data;
    assert.equal(
      data.totalItems,
      await db.collection("items").countDocuments(),
    );
    for (const [field, status] of [
      ["lostItems", "LOST"],
      ["foundItems", "FOUND"],
      ["claimedItems", "CLAIMED"],
      ["returnedItems", "RETURNED"],
    ])
      assert.equal(
        data[field],
        await db.collection("items").countDocuments({ status }),
      );
    for (const [field, status] of [
      ["pendingClaims", "PENDING"],
      ["approvedClaims", "APPROVED"],
      ["rejectedClaims", "REJECTED"],
    ])
      assert.equal(
        data[field],
        await db.collection("claims").countDocuments({ status }),
      );
    assert.ok(data.recentItems.length <= 5);
  });
  await check(
    "Concurrent approvals leave exactly one approved claim",
    async () => {
      const fresh = await createItem({ itemName: "Concurrent approval test" }),
        a = await createClaim(fresh),
        b = await createClaim(fresh);
      const responses = await Promise.all(
        [a, b].map((c) =>
          api(`/claims/${c._id}`, "PUT", { ...c, status: "APPROVED" }),
        ),
      );
      assert.deepEqual(responses.map((r) => r.status).sort(), [200, 400]);
      assert.equal(
        await db
          .collection("claims")
          .countDocuments({
            itemId: new ObjectId(fresh._id),
            status: "APPROVED",
          }),
        1,
      );
    },
  );
  await check(
    "Public access matches no-auth project design; no fabricated 401/403 behavior",
    async () => {
      assert.equal((await api("/items")).status, 200);
      assert.equal((await api("/claims")).status, 200);
    },
  );
  await check("Real Category and Location APIs supply Item relationships", async () => {
    const categories = await api("/categories");
    const locations = await api("/locations");
    assert.equal(categories.status, 200);
    assert.equal(locations.status, 200);
    assert.ok(categories.data.some((value) => value._id === config.categoryId));
    assert.ok(locations.data.some((value) => value._id === config.locationId));
  });
  await check("Category/Location CRUD integrates with Item reference protection", async () => {
    const category = await api("/categories", "POST", { name: "Integration supplies", description: "Temporary test category" });
    const location = await api("/locations", "POST", { name: "Integration desk", building: "Test building" });
    assert.equal(category.status, 201);
    assert.equal(location.status, 201);
    const c = category.data._id, l = location.data._id;
    let linked;
    try {
      assert.equal((await api(`/categories/${c}`)).status, 200);
      assert.equal((await api(`/locations/${l}`)).status, 200);
      assert.equal((await api(`/locations/${l}`, "PUT", { name: "Updated integration desk", building: "Test building" })).status, 200);
      assert.equal((await api(`/categories/${c}`, "PUT", { name: "Updated integration supplies" })).status, 200);
      linked = await createItem({ categoryId: c, locationId: l });
      const detail = (await api(`/items/${linked._id}`)).data;
      assert.equal(detail.category.name, "Updated integration supplies");
      assert.equal(detail.location.name, "Updated integration desk");
      assert.equal((await api(`/categories/${c}`, "DELETE")).status, 400);
      assert.equal((await api(`/locations/${l}`, "DELETE")).status, 400);
    } finally {
      if (linked) assert.equal((await api(`/items/${linked._id}`, "DELETE")).status, 200);
      assert.equal((await api(`/categories/${c}`, "DELETE")).status, 200);
      assert.equal((await api(`/locations/${l}`, "DELETE")).status, 200);
    }
  });
  for (const [path, command, method, body, message] of [
    ["/items", "aggregate", "GET", undefined, "Unable to load items"],
    ["/claims", "aggregate", "GET", undefined, "Unable to load claims"],
    ["/dashboard", "aggregate", "GET", undefined, "Unable to load dashboard"],
    ["/items", "insert", "POST", valid, "Unable to create item"],
  ])
    await check(`Safe database failure: ${method} ${path}`, async () => {
      await client
        .db("admin")
        .command({
          configureFailPoint: "failCommand",
          mode: { times: 1 },
          data: { failCommands: [command], errorCode: 2 },
        });
      const response = await api(path, method, body);
      assert.equal(response.status, 500);
      assert.equal(response.error, message);
    });
  await check("Recover after database failure", async () =>
    assert.equal((await api("/dashboard")).status, 200),
  );
  console.log(`\n${passed} API/database checks passed.`);
} finally {
  await db
    .collection("claims")
    .deleteMany({ _id: { $in: claims.map((id) => new ObjectId(id)) } });
  await db
    .collection("items")
    .deleteMany({ _id: { $in: items.map((id) => new ObjectId(id)) } });
  await client.close();
}
