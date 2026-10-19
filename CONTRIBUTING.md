# Contributing

## Setup

```bash
nvm use
npm ci
```

## Scripts

| Script                  | What it does                                                 |
| ----------------------- | ------------------------------------------------------------ |
| `npm test`              | Run the unit and resource tests                              |
| `npm run test:coverage` | Run them with coverage thresholds                            |
| `npm run test:contract` | Run the live contract suite (see below)                      |
| `npm run lint`          | Lint with ESLint                                             |
| `npm run format`        | Format with Prettier                                         |
| `npm run typecheck`     | Type-check without emitting                                  |
| `npm run build`         | Build ESM, CommonJS and types into `dist/`                   |
| `npm run test:dist`     | Smoke-test the build from `require` and `import`             |
| `npm run check:package` | Validate `package.json` exports and types                    |
| `npm run sync:routes`   | Regenerate the API key route list from the core service      |
| `npm run check:routes`  | Fail when the route list is behind the core service's routes |

## Layout

```text
src/
  client.ts          the Brudcast class, options and resource wiring
  core/              transport, errors, retries, pagination, uploads
  internal/          query encoding and runtime helpers
  resources/         one directory per API namespace, types beside methods
  webhooks/          signature verification, published as @brudcast/node/webhooks
tests/
  unit/              the core, against a fake fetch
  resources/         route coverage: every API key route has a method
  contract/          the live suite against a running core service
  dist/              smoke tests of the built package
scripts/             route list generator
examples/            runnable usage
```

## Adding or changing an endpoint

The SDK covers every route an organization API key can reach, and nothing else.
`tests/fixtures/api-key-routes.json` lists them, generated from the core
service's route definitions and `app/auth/api_key_route_scopes.ts`:

```bash
npm run sync:routes -- ../brudcast-user-backend
```

`tests/resources/route-coverage.test.ts` then fails until the new route has a
method (add it to the test's call list) or an entry in `EXCLUDED` with the
reason it is left out.

Types are written by hand. Each type file names the transformer, model or
validator it mirrors; keep them in step when the core service changes, and run
the contract suite to confirm.

## Contract suite

`npm run test:contract` runs against a real core service and creates, reads and
deletes rows. Point it at a local stack or staging with an API key that has
every scope, in an organization kept for these runs:

```bash
BRUDCAST_CONTRACT_API_KEY=bk_live_... \
BRUDCAST_CONTRACT_BASE_URL=http://localhost:8086 \
npm run test:contract
```

Without the key the suite is skipped.

## Commits and releases

Commits and pull request titles follow [Conventional Commits][conventional].
Releases are cut by [release-please][release-please]: merging to `main` opens or
updates a release pull request, and merging that pull request tags the release,
updates `CHANGELOG.md` and publishes to npm with provenance.

Before 1.0, `feat:` and `feat!:` release a minor and `fix:` a patch.

[conventional]: https://www.conventionalcommits.org
[release-please]: https://github.com/googleapis/release-please
