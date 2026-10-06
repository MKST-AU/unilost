# Myat's Item and Claim demo

## Before presenting

Run `npm ci` then `npm run demo` from `unilost-starter`. Open `http://127.0.0.1:3217`. The disposable database already has an Electronics Category and Library Location; data disappears when the demo process stops. For a persistent team database, use `.env.local` and `npm run dev` instead.

Use clearly labelled demo records and `demo@example.invalid` as contact information. The app intentionally has no sign-in or roles, following the approved scope.

## 3–4 minute speaking guide

**0:00–0:25 — Dashboard**

“UniLost helps students report lost and found property on campus. My part covers the Item and Claim features, search and filters, and this dashboard. These numbers are calculated from MongoDB, so they change when reports and claims change.”

**0:25–1:10 — Report and find an Item**

Open Items. Create `Demo wireless mouse`, description `Black wireless mouse with a blue sticker`, type `FOUND`, Category `Electronics`, Location `Library — Main building`, and a real date.

“The form gets Categories and Locations from my teammate's APIs. It validates the required fields and saves the report through the Item API. I can search by name or description and combine the status, type, Category and Location filters.”

Search `mouse`, select the Library filter, apply, then clear filters. Open the Item.

**1:10–1:40 — Details and editing**

Click Edit item, change the description to `Black wireless mouse with a blue star sticker`, and save.

“The details page shows the linked Category and Location. Editing updates the database. Deleting asks for confirmation, and an Item with Claims cannot be deleted.”

**1:40–2:40 — Claim and review**

Click Submit or view claims. Enter claimant `Demo claimant`, contact `demo@example.invalid`, and evidence `The blue star sticker is underneath the battery cover`. Submit, optionally edit the evidence, then approve and confirm.

“A Claim starts as pending. We can edit the evidence, reject it, or approve it. The API allows only one approved Claim per Item. Approval is a final decision. This version follows our no-auth project scope, so review controls are available to everyone using the app.”

To demonstrate rejection, create a second pending Claim before handover and reject it. Filter by REJECTED to show the decision; delete the rejected test Claim if desired.

**2:40–3:20 — Record handover**

Return to the Item, edit its status to `CLAIMED`, save, then edit to `RETURNED` and save.

“Approving evidence and handing back the Item are separate steps. An approved Claim is required before we mark the Item claimed. Returned means the physical handover is complete. The API prevents skipping that sequence.”

**3:20–3:45 — Dashboard and testing**

Open Dashboard and show Returned items and Approved claims.

“The dashboard now reflects the return. I have included repeatable API and browser tests covering validation, relationships, CRUD, status changes and error messages. In the verified run, all 96 API/database checks and 24 browser checks passed. AI assistance was used for implementation and verification, and I can explain the flow and code.”

## Likely questions

**Where is the data stored?** MongoDB collections: Items reference Categories and Locations with ObjectIds; Claims reference Items. Responses serialize IDs as strings.

**How do you stop invalid input?** Client feedback helps users; the server independently validates field types, required values, lengths, dates, IDs and referenced records. Unknown/system fields are not copied into writes.

**What if two Claims are approved together?** A partial unique MongoDB index allows at most one `APPROVED` Claim for each Item. The integration suite tests competing approvals.

**Does approving a Claim automatically mark the Item returned?** No. Approval confirms evidence; the Item is explicitly marked CLAIMED, then RETURNED after physical handover.

**Why cannot an Item with Claims be deleted?** Claims need a valid Item reference. The deletion rule also preserves evidence for completed returns.

**Are all operations transactional?** No. The unique index protects duplicate approvals, but separate cross-collection checks/writes can race. Fully transactional guarantees would require a shared database/architecture change.

**Who can approve Claims?** Everyone using this scoped demo; authentication and roles are excluded from the project. It does not claim owner/admin permissions.

**What did your teammate contribute?** MongoDB setup, Category and Location features, and the assigned VM deployment. My part integrates with those APIs.

**Is this deployed publicly?** These screenshots and tests prove the local production build. Report a public URL only after the team's VM deployment has been independently checked.
