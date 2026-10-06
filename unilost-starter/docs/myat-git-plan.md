# Publication plan

The submission checkout is based on shared main at `d63c5699bb9ef924d2762442a55bcdce4fc9afa7`, including Location CRUD. The original `unilost` working directory remains preserved.

Proposed branch: `myat/items-claims-submission`.

Proposed pull request: **Complete Item and Claim management with dashboard and integration evidence**.

Publish actual feature commits with current timestamps. Do not present the screenshot's planned days/hours as completed personal time. Suggested groups:

1. Item CRUD, forms, search, shared model and UI helpers.
2. Claim CRUD and review interface.
3. Live dashboard and application metadata.
4. Real Location integration tests, framework patch, reproducible scripts, documentation and screenshots.

Before publishing, inspect the entire diff and exclude local environment files, build output, dependencies and `.test-artifacts/`. The source ZIP contains only Git-visible source, documentation and verified screenshots.

After publication, the other teammate must review and manually test the PR as required by `PROJECT.md`, then merge through GitHub. The publication action must not merge `main` automatically. The final VM deployment/public URL remains part of the team's deployment work.
