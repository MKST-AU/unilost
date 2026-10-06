# Myat: run, test and demo

## Scope and integration

Item CRUD, Claim CRUD, Item search/filtering, and the dashboard follow the fields in `PROJECT.md`. Category and Location implementations come from the shared `main` at `d63c5699bb9ef924d2762442a55bcdce4fc9afa7`. Both APIs are available and are used by the actual Item form and filters. No authentication, image, owner or user fields have been added.

The Item form requests `{ data: [{ _id, name, building, description? }] }` from `/api/locations`. It supports loading, errors, retries and empty choices, and links to Location management when no locations exist.

## Run the application

From `unilost-starter`:

```bash
npm ci
cp .env.example .env.local
# Set MONGODB_URI and MONGODB_DB to the team's development database.
npm run dev
```

Keep `.env.local` out of Git. MongoDB 5.0+ is needed for the existing lookup pipeline form; the MongoDB driver also has its own supported-server requirements. Use a supported MongoDB version for this project's driver. Existing Category and Location documents must be present to report an Item. There are no hard-coded report or claim records in the application.

## Reproducible verification

Requirements: Node.js 22.13+ (tested with 24.16), npm, installed Google Chrome, network access on the first MongoDB binary download, and an available local port 3217.

```sh
npm ci
npm run verify
```

The command runs `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test`. `npm test` starts a production server with an isolated MongoDB and runs the API and browser suites sequentially, then shuts the server/database down. It refuses to use an occupied port. No `.env.local` values or shared database are used.

The launcher creates one Category and Location fixture. The API suite additionally creates, edits and deletes real Category and Location records through the teammate's APIs, verifies Item relationships, and checks referential deletion guards. All successful browser workflows use real application APIs and MongoDB, including Location options, reporting, editing, combined filters and the handover workflow.

Only deliberate dashboard/list failure, loading and empty-choice scenarios use browser response interception. These scenarios demonstrate UI feedback, not a database outage. The API suite separately injects real failures into the disposable MongoDB to verify safe errors and recovery.

Results: **96 API/database checks and 24 Chrome browser checks passed** on 5 October 2026. Lint, TypeScript and production build also passed. See [checked-in evidence](verification/README.md). Tests cover validation, required/length/date/ID checks, protected fields, missing records, searches, pagination, relationships, Claim decisions, concurrent approvals, deletion guards, dashboard counts, desktop/mobile layout and retry states.

Generated logs, private temporary database configuration and screenshots live under ignored `.test-artifacts/`. `docs/screenshots/` contains selected genuine screenshots from the successful run; the test database is labelled local test data. The test-only dependencies are recorded in the lockfile so `npm ci` installs them reproducibly.

For individual suites while diagnosing a failure:

```sh
npm run build
node tests/start-local.mjs
# Second terminal, same application directory:
UNILOST_TEST_CONFIG="$PWD/.test-artifacts/unilost-test.json" node tests/integration.mjs
UNILOST_TEST_CONFIG="$PWD/.test-artifacts/unilost-test.json" node tests/browser.mjs
```

Start with a fresh disposable database and run the suites sequentially. Stop the launcher with Ctrl+C afterward. To inspect UI locally, use `npm run demo`; its database is temporary.

## API examples and update semantics

- `GET /api/items?q=notebook&type=FOUND&status=FOUND&categoryId=<id>&locationId=<id>&page=1&limit=20`
- `GET /api/claims?itemId=<id>&status=PENDING&page=1&limit=20`
- List responses: `{ data: [...], pagination: { total, page, limit, pages } }`.
- Default page size: 20; maximum: 100. Text search is literal, case-insensitive, and limited to 120 characters.
- `POST /api/items`: `itemName`, `description`, `type`, `categoryId`, `locationId`, `date`.
- `PUT /api/items/:id`: the same required fields, with optional `status`.
- `POST /api/claims`: `itemId`, `claimantName`, `contactInformation`, `description`.
- `PUT /api/claims/:id`: the same required fields, with optional `status`. A claim cannot be moved to a different Item.
- `_id` and `createdAt` are server-controlled. Extra client fields are ignored. Creation status is derived by the server.
- Success: 200/201. Invalid requests: 400. Missing records: 404. A record changed during a guarded update: 409. Unexpected failures: generic 500 JSON, without internal connection details.

## Claim and handover workflow

1. A new claim starts `PENDING`.
2. Review evidence and choose `APPROVED` or `REJECTED`. Decisions are final; claimant contact/evidence can still be corrected with Edit.
3. Only one claim per Item can be approved, enforced by a unique partial index on `claims.itemId` for `status: APPROVED`. The database account needs permission to create this index; existing duplicate approved claims require cleanup before approval can succeed.
4. Approval updates the Claim only. Open the Item and explicitly set `CLAIMED` after an approved claim exists.
5. After actual handover, set the Item to `RETURNED`. An open Item cannot skip directly to `RETURNED`; returned Items cannot be reopened.
6. New claims cannot be submitted for claimed/returned Items. Items with any claims cannot be deleted. An approved Claim supporting a claimed/returned Item cannot be deleted.

These workflow rules use only the existing statuses and relationships. No new stored fields or authentication architecture were introduced. Item/Claim cross-collection checks follow the existing project's check-then-write style, without MongoDB transactions. The unique index handles competing approvals, but concurrent Item deletion and Claim creation (or claim-evidence deletion and handover) are not a fully transactional guarantee. Stronger concurrency guarantees would require a separate team architecture decision and transaction-capable database configuration.

## Authentication/authorization review

The shared project scope explicitly excludes authentication. There is no session helper, user model, ownership field or role check to reuse. All existing and new management endpoints are public within this app, including edit, delete, approval and rejection. The Claim UI says this explicitly. Therefore “editing another user's Item” and role-based 401/403 tests are not applicable; the implementation does not claim to enforce permissions it does not have. Do not describe it as a secured multi-user service. Use non-sensitive test contact details for demonstrations.

Input is validated before MongoDB calls. Queries use validated ObjectIds and escaped literal search; arbitrary request bodies are never passed to `$set`. React renders text without raw HTML. Database errors are sanitized.

## Manual test and short demo

With `npm run demo` running, or with the development database configured:

1. Open `/`: explain the live summary counts and latest reports.
2. Open `/items`: report a FOUND Item with real Category and Location choices.
3. Search its name, combine Category/Location/status filters, then clear filters.
4. Open `/items/<id>`: inspect the related data; edit its description.
5. Follow **Submit or view claims** and submit ownership evidence using demo contact details.
6. Edit the claim, then approve it. For rejection, use a second pending claim.
7. Return to the Item, set `CLAIMED`, then `RETURNED` after explaining handover.
8. Refresh the dashboard to show the updated counts.
9. Demonstrate delete confirmation on a separate Item without claims. Show that an Item with claims cannot be deleted.

Current captures are indexed in [screenshots/README.md](screenshots/README.md). These are local functional evidence and do not prove a VM deployment or a human teammate review.

## Code to understand for presentation

- `src/lib/report-validation.ts`: required fields, limits, ObjectIds and real calendar dates.
- `src/lib/items.ts`: joins existing Category and Location records and serializes ObjectIds.
- `src/app/api/items/route.ts`: safe search/filter combination and database pagination.
- `src/app/api/items/[id]/route.ts`: update/delete rules and explicit handover.
- `src/app/api/claims/[id]/route.ts`: protected fields, final decisions and the unique approval index.
- `src/app/api/dashboard/route.ts`: aggregation of real statuses, not fixed numbers.
- `src/lib/client-api.ts`: fetch/error handling, aborting stale requests, refresh state.
- `src/components/items/item-form.tsx`: real dropdown integration and missing dependency states.
