# UniLost application

This is the Next.js application directory. The repository's [main README](../README.md) contains setup, screenshots, team ownership and submission links.

```sh
npm ci
npm run demo       # Disposable database and production app at localhost:3217
```

For a configured MongoDB database, copy `.env.example` to `.env.local`, set the values, then run `npm run dev`.

```sh
npm run verify     # Lint, types, build, API/database tests and Chrome browser tests
```

Stop the demo before verification so port 3217 is available. Tests never use the team database. See [testing details](docs/myat-testing.md).
