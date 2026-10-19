/**
 * Regenerate tests/fixtures/api-key-routes.json: every core route an organization API key can
 * reach, read from the core service's route definitions and API key scope table.
 *
 * Usage: node scripts/sync-routes.mjs [--check] [path/to/brudcast-user-backend]
 * The backend defaults to ../brudcast-user-backend or BRUDCAST_BACKEND_PATH. With --check the
 * file is compared instead of written, and the script exits 1 when it is out of date.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const check = args.includes('--check');
const backend = resolve(
  args.find((arg) => !arg.startsWith('--')) ??
    process.env.BRUDCAST_BACKEND_PATH ??
    '../brudcast-user-backend',
);
const fixture = resolve('tests/fixtures/api-key-routes.json');

const read = (path) => readFileSync(`${backend}/${path}`, 'utf8');
const routes = read('start/route_definitions/definitions/user.ts');
const scopes = read('app/auth/api_key_route_scopes.ts');
const scopeValues = Object.fromEntries(
  [...read('app/types/api_key.ts').matchAll(/(\w+)\s*=\s*'([a-z_:.]+)'/g)].map((m) => [m[1], m[2]]),
);

const closed = [
  ...scopes.match(/PATHS_CLOSED_TO_API_KEYS = \[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g),
].map((m) => m[1]);
const rules = [
  ...scopes.matchAll(/path: '([^']+)',\s*read: ApiKeyScope\.(\w+),\s*write: ApiKeyScope\.(\w+)/g),
].map((m) => ({ path: m[1], read: scopeValues[m[2]], write: scopeValues[m[3]] }));

const normalize = (path) => path.replace(/:[^/]+/g, ':');
const within = (path, prefix) => {
  const a = path.split('/');
  const b = prefix.split('/');
  return a.length >= b.length && b.every((segment, i) => segment === ':' || segment === a[i]);
};

const groupStart = routes.indexOf("router.get('/sending-domains', ");
const groupEnd = routes.indexOf("guards: ['apiKey', 'jwt']");
if (groupStart === -1 || groupEnd === -1) {
  console.error(
    'Could not find the organization-scoped route group; the route file changed shape.',
  );
  process.exit(2);
}

const reachable = [];
for (const match of routes
  .slice(groupStart, groupEnd)
  .matchAll(
    /router\.(get|post|patch|put|delete)\('([^']+)',\s*\[\s*controllers\.user\.(\w+),\s*'(\w+)'/g,
  )) {
  const [, method, path, controller, action] = match;
  const normalized = normalize(path);
  if (closed.some((entry) => within(normalized, normalize(entry)))) continue;

  const rule = rules.find((entry) => within(normalized, normalize(entry.path)));
  if (!rule) continue;

  reachable.push({
    method: method.toUpperCase(),
    path,
    scope: method === 'get' ? rule.read : rule.write,
    handler: `${controller}.${action}`,
  });
}

const output = `${JSON.stringify(reachable, null, 2)}\n`;

if (check) {
  const current = readFileSync(fixture, 'utf8');
  if (current !== output) {
    console.error('tests/fixtures/api-key-routes.json is out of date; run npm run sync:routes.');
    process.exit(1);
  }
  console.log(`${reachable.length} API key routes, up to date.`);
} else {
  writeFileSync(fixture, output);
  console.log(`Wrote ${reachable.length} API key routes.`);
}
