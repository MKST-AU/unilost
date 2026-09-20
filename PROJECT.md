# UniLost Development Notes

This file is the team's shared source of truth. Read it before starting a feature. Discuss and document any architecture or data-model change here before coding it.

## Project purpose

UniLost is a campus lost-and-found management system. Users can report lost or found items, browse and search reports, submit ownership claims, and record returned items.

## Approved scope

- Next.js App Router frontend and REST API route handlers
- MongoDB with the official MongoDB Node.js driver
- CRUD for Item, Category, Location, and Claim
- Dashboard, item search/filtering, claim/item status workflow, responsive UI, and deployment to a virtual machine

Not in scope: Firebase, authentication, AI matching, chat, notifications, QR codes, maps, or serverless deployment.

## Team ownership

| Member | Primary ownership |
| --- | --- |
| Myo Kyi Sim Thar | MongoDB setup, Category CRUD, Location CRUD, VM deployment |
| Myat Zay Hein | Item CRUD, Claim CRUD, dashboard, search/filter, README |
| Both | Architecture, shared UI conventions, integration tests, bug fixes, screenshots, demo video |

Each person owns their feature end-to-end: database access, REST endpoints, UI, manual testing, and focused commits.

## Technology and conventions

- Framework: Next.js, TypeScript, and App Router
- Styling: CSS modules or the existing global stylesheet. Do not add a UI library unless the team agrees first.
- Database: MongoDB database named `unilost`
- Database driver: `mongodb` package
- API success response: `{ data: ... }`; API error response: `{ error: "Human-readable message" }`
- Dates: ISO 8601 strings; `createdAt` is set by the server
- IDs: MongoDB `ObjectId` values are sent to clients as strings

## Repository structure

```text
src/
  app/
    api/
      items/             # Item REST endpoints
      categories/        # Category REST endpoints
      locations/         # Location REST endpoints
      claims/            # Claim REST endpoints
    items/               # Item pages
    categories/          # Category pages
    locations/           # Location pages
    claims/              # Claim pages
    layout.tsx
    page.tsx             # Dashboard
  components/
    ui/                  # Reusable buttons, inputs, dialogs
    items/
    categories/
    locations/
    claims/
  lib/
    mongodb.ts           # Shared database connection only
    validation.ts        # Shared validation helpers/constants
  types/
    models.ts            # Shared TypeScript interfaces and status values
```

Do not move another member's files or change shared conventions without discussing it first.

## Data model

### Item — `items`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `_id` | ObjectId | server | MongoDB identifier |
| `itemName` | string | yes | 1–120 characters |
| `description` | string | yes | 1–2000 characters |
| `type` | `LOST` or `FOUND` | yes | report type |
| `categoryId` | ObjectId | yes | references Category |
| `locationId` | ObjectId | yes | references Location |
| `date` | ISO date string | yes | date lost/found |
| `status` | `LOST`, `FOUND`, `CLAIMED`, `RETURNED` | yes | initially matches type |
| `createdAt` | ISO date string | server | creation time |

### Category — `categories`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `_id` | ObjectId | server | MongoDB identifier |
| `name` | string | yes | unique, 1–80 characters |
| `description` | string | no | up to 500 characters |

### Location — `locations`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `_id` | ObjectId | server | MongoDB identifier |
| `name` | string | yes | 1–120 characters |
| `building` | string | yes | 1–120 characters |
| `description` | string | no | up to 500 characters |

### Claim — `claims`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `_id` | ObjectId | server | MongoDB identifier |
| `itemId` | ObjectId | yes | references Item |
| `claimantName` | string | yes | 1–120 characters |
| `contactInformation` | string | yes | 1–200 characters |
| `description` | string | yes | ownership evidence, up to 2000 characters |
| `status` | `PENDING`, `APPROVED`, `REJECTED` | server | defaults to PENDING |
| `createdAt` | ISO date string | server | creation time |

## REST API contract

```text
GET, POST        /api/items
GET, PUT, DELETE /api/items/[id]

GET, POST        /api/categories
GET, PUT, DELETE /api/categories/[id]

GET, POST        /api/locations
GET, PUT, DELETE /api/locations/[id]

GET, POST        /api/claims
GET, PUT, DELETE /api/claims/[id]
```

Use `201` for create, `200` for successful reads/updates/deletes, `400` for invalid payloads or IDs, `404` for records that do not exist, and `500` only for unexpected server errors. Never expose MongoDB connection strings or internal error details.

## Workflow rules

1. Create a Category and Location before creating an Item.
2. An Item must refer to existing Category and Location records.
3. A Claim must refer to an existing Item and defaults to `PENDING`.
4. Approving a Claim can move its Item to `CLAIMED`; only after handover can it become `RETURNED`.
5. The API must prevent deletion of Categories/Locations used by Items and Items that still have Claims. The UI must ask for confirmation before delete operations.

## Git workflow

1. `main` is the working integration branch. Do not commit directly to it.
2. Start from an up-to-date `main`; create branches such as `myo/category-crud` and `myat/item-crud`.
3. Make one logical change per descriptive commit, push it, and create a pull request.
4. The other teammate reviews and tests the pull request before merging it.
5. Never commit `.env.local`, `node_modules`, `.next`, or deployment secrets.

## Definition of done

- API CRUD operations work and return the agreed response format.
- Required fields and ObjectId values are validated.
- UI supports the needed operation and displays useful loading/error states.
- The other teammate manually tests the feature.
- The change is in a focused commit and pull request.

