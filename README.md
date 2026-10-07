# UniLost — Campus Lost & Found

UniLost is a campus lost-and-found system built for our Web Project 2. Students can report lost or found items, search reports, submit ownership claims, and track returned items.

The project uses Next.js App Router, TypeScript, and MongoDB.

## Live website

[Open UniLost](http://4.217.184.157/)

The website runs on an Azure Ubuntu 24.04 virtual machine in Korea Central. Nginx handles web requests, Next.js runs the application, and MongoDB stores the records on the VM. The website is available while the VM is running.

The deployed workflow was checked on 7 October 2026: creating Categories and Locations, reporting an Item, submitting and approving a Claim, updating the Item to CLAIMED and RETURNED, searching reports, and checking dashboard totals. The records stayed saved after reloading the page. All screenshots use labelled demo records and fictional contact details; the handover was simulated.

The site currently uses HTTP and has no sign-in or user roles. Use test data for demonstrations because claim details and management actions are visible to everyone.

## Team members and responsibilities

| Member | Responsibilities |
| --- | --- |
| Myo Kyi Sim Thar | MongoDB setup, Category CRUD, Location CRUD, Azure VM deployment |
| Myat Zay Hein | Item CRUD, Claim CRUD, dashboard, search and filters, project documentation |
| Both | Project design, integration, testing, screenshots, and demo preparation |

See [PROJECT.md](PROJECT.md) for the project scope, database structure, and team workflow.

## Features

- **Categories and Locations:** create, view, edit, and delete records. Records used by an Item cannot be deleted.
- **Items:** report lost or found items, view details, edit reports, and delete Items that have no Claims.
- **Search and filters:** search Item names and descriptions, or filter by report type, status, Category, and Location. Results support pagination.
- **Claims:** submit ownership evidence and contact details, edit Claims, and approve or reject them. Only one Claim per Item can be approved.
- **Returns:** after approving a Claim, open the Item and select Edit item to mark it CLAIMED. Mark it RETURNED after handover.
- **Dashboard:** view current Item and Claim counts and the latest reports.
- **Interface:** responsive pages, form validation, loading and error messages, retry buttons, and delete confirmations.

## Run locally

You need Node.js 22.13 or newer, npm, and a running MongoDB server. Start from the repository root:

```sh
cd unilost-starter
npm ci
```

Copy `.env.example` to `.env.local`. For MongoDB running on your computer, use:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=unilost
```

Keep `.env.local` private and do not commit it to GitHub.

Start the app:

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create a Category and Location before reporting an Item.

For a production build:

```sh
npm run build
npm start
```

The Azure deployment runs the production build as a system service behind Nginx.

## Local demo

To try the app without setting up your own database, run these commands inside `unilost-starter`:

```sh
npm ci
npm run demo
```

Open [http://127.0.0.1:3217](http://127.0.0.1:3217). The demo starts a temporary MongoDB database with an Electronics Category and Library Location. Demo records are removed when it stops. The first run may download MongoDB. This mode does not use your `.env.local` database.

## Testing

Google Chrome is required for the browser tests. Run these commands inside `unilost-starter`:

```sh
npm ci
npm run verify
```

This checks lint, TypeScript, the production build, 96 API/database checks, and 24 browser checks. Tests use a temporary database. Stop the local demo first so port 3217 is free.

Normal workflows use the application APIs and MongoDB. Loading, empty, and error responses are also simulated to check how the interface handles them.

The full local checks passed on 5 October 2026. See the [test results and logs](unilost-starter/docs/verification/README.md). The deployed workflow check on 7 October is a separate check of the public website.

## Screenshots

[View all 14 deployment screenshots with step-by-step captions](unilost-starter/docs/deployment/README.md).

### Dashboard

The dashboard shows one returned Item and one approved Claim after the demo workflow.

![Dashboard on the Azure deployment](unilost-starter/docs/deployment/14-dashboard-completed.jpg)

### Approved Claim

Approval confirms the ownership evidence. The Item status is updated separately through Edit item.

![Approved demo Claim](unilost-starter/docs/deployment/09-approved-claim.jpg)

### Returned Item

The Item is marked RETURNED after the simulated handover.

![Returned demo Item](unilost-starter/docs/deployment/12-item-returned.jpg)

Earlier local screenshots are available in the [local screenshot guide](unilost-starter/docs/screenshots/README.md).

## Project guides

- [Contribution checklist](unilost-starter/docs/submission-checklist.md)
- [Testing guide](unilost-starter/docs/myat-testing.md)
- [Demo script](unilost-starter/docs/demo-script.md)

## Limitations

Authentication and user roles are outside the project scope. Anyone using the app can view claim contact details and use management actions.

The database prevents multiple approved Claims for one Item. Related-record checks across different collections do not use transactions, so simultaneous requests can still cause some edge cases. See the testing guide for details.
