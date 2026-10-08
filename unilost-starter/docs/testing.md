# Testing UniLost

This guide covers both members' features. Use the [root README](../../README.md) for setup and [PROJECT.md](../../PROJECT.md) for field definitions and workflow rules.

## Saved evidence and current checks

| Date | Environment | What the saved evidence records |
| --- | --- | --- |
| 5 October 2026 | Local production build with disposable MongoDB | 96 API/database checks and 24 Chrome browser checks passed. The verification notes also record lint, TypeScript, build and a production dependency audit. See [results and logs](verification/README.md). |
| 7 October 2026 | Public Azure deployment | The previous deployment gallery records Category/Location creation, Item reporting, Claim submission/approval, CLAIMED → RETURNED, reload persistence, search/status filters and dashboard totals. See [Azure captures](screenshots/README.md#azure-deployment--7-october-2026). This was a focused workflow check, not a full automated run on Azure. |
| 8–9 October 2026 | Local documentation review | Documentation links, screenshot paths, file preservation and diff whitespace were checked. Application tests, the public site and VM services were not retested during this cleanup. |

The saved audit results are dated evidence, not a current security assessment. Screenshots use test records and fictional contact details; physical handover was simulated.

## Automated tests

Run from `unilost-starter`. Use Node.js 24 (the saved run used 24.16), npm, installed Google Chrome and a free port 3217. The first run may need network access to download a MongoDB binary.

```sh
npm ci
npm run verify
```

`verify` runs the following package scripts in order:

```sh
npm run lint
npm run typecheck
npm run build
npm test
```

`npm test` expects an existing production build. It starts a production server on `127.0.0.1:3217` and runs the API and browser suites against disposable MongoDB, then stops the server/database. Stop `npm run demo` first. These tests do not use the application's configured database.

Coverage includes:

- Category and Location API creation, reads, edits, deletion and protection when referenced by an Item.
- Item and Claim CRUD, required fields, IDs, dates, field lengths, protected fields and missing records.
- Item relationships, literal text search, combined filters and pagination.
- Claim decisions, competing approvals, handover rules and deletion guards.
- Dashboard counts compared with MongoDB; safe database errors and recovery.
- Item/Claim browser workflows, real Category/Location options, desktop/mobile layout and UI feedback. The automated browser suite is not a complete Category/Location UI CRUD suite; use the manual steps below for those pages.

Successful browser flows use real APIs and MongoDB. Deliberate loading, empty and error scenarios intercept browser responses; separate API tests inject failures into the disposable database. Generated logs, configuration and screenshots go to ignored `.test-artifacts/`. Historical evidence under `verification/` is kept separately.

For debugging individual suites, start with a fresh fixture server:

```sh
npm run build
node tests/start-local.mjs
```

In a second terminal, also in `unilost-starter`, run the suites sequentially:

```sh
UNILOST_TEST_CONFIG="$PWD/.test-artifacts/unilost-test.json" node tests/integration.mjs
UNILOST_TEST_CONFIG="$PWD/.test-artifacts/unilost-test.json" node tests/browser.mjs
```

Stop the launcher with Ctrl+C afterward. Never point these scripts at the shared or deployed database.

## Manual testing

Use a local development database or `npm run demo`. The disposable demo includes an Electronics Category and Library Location. Use new, clearly labelled test records, such as `DEMO headphones`, and `demo@example.invalid` for contact information. Do not delete another person's records.

| Area | Steps | Expected behavior |
| --- | --- | --- |
| Category CRUD | Create a Category with a name/description, inspect it, edit it, search for it and reload. Try a blank name and an exact duplicate name. Delete an unused test Category, first cancelling and then confirming. | Changes persist after reload; invalid/duplicate input is rejected; cancellation preserves the record. |
| Location CRUD | Create a Location with name/building and optional description. Inspect, edit, search and reload. Try blank required fields. Cancel and then confirm deletion of an unused test Location. | Fields validate; changes persist; deletion requires confirmation. |
| Item CRUD | Create a FOUND Item with the new Category/Location and a valid date. Read its detail page, edit its description, save and reload. Create a separate LOST Item and test delete cancellation/confirmation before adding Claims. | Status initially matches the report type; related names display; edits persist; an Item without Claims can be deleted. |
| Reference protection | While an Item uses the test Category and Location, try deleting each. | Both deletions are blocked. |
| Search and filters | Search part of an Item name and description. Combine type, status, Category and Location filters. Try a nonmatching search, clear filters and, with enough records, change pages. | Matching reports appear, empty results are explained, and clearing filters restores the list. |
| Claim CRUD | From Item details choose Submit or view claims. Submit a claimant, contact and evidence; inspect the saved Claim; edit and reload. Create another pending Claim, then cancel and confirm its deletion. | New Claims start PENDING; edits persist; deletion asks for confirmation. The read-one API can also be checked with `GET /api/claims/<id>`. |
| Approval/rejection | Reject one pending Claim and filter by REJECTED. Approve a different pending Claim for the same Item. Try approving another Claim for that Item. | Decisions are final and at most one Claim can be APPROVED. Evidence/contact fields remain editable. |
| Item status | Before approval, try marking the Item CLAIMED. After approval, save CLAIMED, then RETURNED after a simulated handover. Try skipping directly from FOUND to RETURNED, or reopening a returned Item. | Invalid transitions are rejected. Approval alone changes the Claim; Item status is saved separately. |
| Final-record protection | Try deleting an Item with Claims, submitting a new Claim for a CLAIMED/RETURNED Item, or deleting the approved Claim supporting that Item. | The API blocks each action. |
| Dashboard | Refresh the dashboard after each status change and compare totals with the test records and API response. | Counts follow current statuses; latest reports reflect saved Items. |
| MongoDB persistence | Reload pages or open a second browser tab after creating/editing data. For a persistent local development database, restart only the Next.js process and check again. Inspect the same test IDs in MongoDB if access is available. | Records survive reload/app restart because they are stored in MongoDB. Stopping the disposable demo removes its database by design. |
| UI feedback | Check empty results, invalid input, retry controls and mobile layout. For failure testing, use the isolated tests rather than disrupting the public database. | Messages explain the outcome; required controls and text remain usable. |

Category/Location reads and writes use `/api/categories` and `/api/locations`; Item and Claim routes use `/api/items` and `/api/claims`. Each resource supports GET/POST on the collection and GET/PUT/DELETE on `/<id>`. Success uses `{ data: ... }`, errors use `{ error: ... }`. See the schema in [PROJECT.md](../../PROJECT.md) for payload fields.

## Workflow and API notes

- Items begin LOST or FOUND. An approved Claim is required before CLAIMED; RETURNED follows CLAIMED after handover. Claimed Items cannot return to an open status, and returned Items cannot be reopened.
- Claims begin PENDING. APPROVED/REJECTED decisions cannot be reversed, and a Claim cannot be moved to a different Item.
- Items with Claims cannot be deleted. The approved Claim supporting a CLAIMED/RETURNED Item is retained.
- A partial unique index on approved Claims enforces one approval per Item. The database account must be able to create that index; existing duplicate approvals require investigation before the index can be created.
- Separate cross-collection checks/writes are not transactional. For example, Item deletion and Claim creation can race. The unique approval index does not solve every cross-collection race.
- There is no sign-in or owner/admin authorization. All app users can access management actions and Claim contact details.

Examples:

```text
GET /api/items?q=notebook&type=FOUND&status=FOUND&categoryId=<id>&locationId=<id>&page=1&limit=20
GET /api/claims?itemId=<id>&status=PENDING&page=1&limit=20
GET /api/dashboard
```

Item/Claim lists include pagination (`total`, `page`, `limit`, `pages`). Default page size is 20; the maximum is 100. Item search is literal, case-insensitive and limited to 120 characters. PUT requires the resource's normal input fields, with optional status where supported. System fields such as `_id` and `createdAt` are server-controlled. Responses use 200/201 for success, 400 for invalid requests, 404 for missing records, 409 for guarded-update conflicts where implemented, and a generic 500 for unexpected failures.

## Short demo and review

For a 3–4 minute presentation, show the dashboard, create a Category and Location, report an Item, search/filter it, edit its details, submit and approve a Claim, save CLAIMED then RETURNED, and refresh the dashboard. Use a second pending Claim to show rejection and a separate Item without Claims to show deletion. Explain that approval checks evidence and handover is a separate step.

For questions, explain that MongoDB ObjectIds connect the collections, server validation checks input and relationships, and the partial unique index handles competing approvals. Be clear about the lack of authentication and cross-collection transactions. The Item/Claim implementation and saved verification used AI assistance; do not present automated execution as personal working hours.

Before final submission, follow the teammate review and Git workflow in [PROJECT.md](../../PROJECT.md), check the public URL while the VM is running, and prepare any required demo video. No separate assignment rubric was found in this repository. The former planning documents were consolidated here; their filenames are not required by PROJECT.md. The original files were backed up outside the repository before removal.
