# Myat's contribution checklist

Prepared 5 October 2026. This checklist maps the assigned ten work areas to the integrated local submission. It records implementation and automated verification, not personal working hours.

| Part | Requirement | Completion evidence |
| --- | --- | --- |
| 1 | Item list/create API | `src/app/api/items/route.ts`; real MongoDB create/list and validation checks pass |
| 2 | Item read/update/delete API | `src/app/api/items/[id]/route.ts`; read/update/delete, status and reference guards pass |
| 3 | Item listing and report form | `src/app/items/page.tsx`, `src/components/items/item-manager.tsx`, `item-form.tsx`; real browser report flow passes |
| 4 | Item details/edit/delete UI | `src/app/items/[id]/page.tsx`, `src/components/items/item-detail.tsx`; persistence, cancellation and confirmation tests pass |
| 5 | Category/Location integration and Item tests | Real APIs from current main; dropdowns, joins, combined filters and referenced-record protection pass |
| 6 | Claim list/create API | `src/app/api/claims/route.ts`; creation, listing, validation and Item references pass |
| 7 | Claim read/update/delete API | `src/app/api/claims/[id]/route.ts`; CRUD, final decisions and concurrent approval protection pass |
| 8 | Claim form/list/approve/reject UI | `src/app/claims/page.tsx`, `src/components/claims/`; form/edit/reject/delete/approve browser flows pass |
| 9 | Dashboard and Item search/filter | `src/app/page.tsx`, `src/app/api/dashboard/route.ts`; real counts and name/type/status/Category/Location filters pass |
| 10 | Integration tests, README, screenshots/demo preparation | 96 API/database checks, 24 browser checks, reproducible `npm run verify`, README, ten genuine screenshots and demo script |

## Completed locally

- Integrated the teammate's Location code from current main without changing the Category/Location implementation.
- Preserved the original local contribution folder; assembled the submission separately.
- Added a Location navigation link and direct setup link in the Item form.
- Replaced the starter page metadata with UniLost metadata.
- Applied the framework patch update and added locked, reproducible test dependencies/scripts.
- Tested the production build, inspected desktop/mobile evidence, and documented the actual limitations.

## Shared-repository and team submission gates

The verified source package is prepared for a feature branch and pull request. Publication status must be checked in GitHub; this local checklist does not claim a push or merge.

`PROJECT.md` requires the other teammate to manually test/review the pull request before merging. That human review has not been performed by this automated run. The team's VM deployment and public URL belong to Myo's assignment and are not certified by these local tests. A speaking/demo guide is supplied; no personally presented video has been fabricated.

## Quick reviewer check

1. Run `npm ci` and `npm run verify` inside `unilost-starter` with Google Chrome installed.
2. Run `npm run demo` and open `http://127.0.0.1:3217`.
3. Follow [the demo script](demo-script.md) to manually create an Item, Claim it, approve the evidence, and record the return.
4. Inspect the Item/Claim contribution, shared type additions, package changes and documentation before approving the PR.
