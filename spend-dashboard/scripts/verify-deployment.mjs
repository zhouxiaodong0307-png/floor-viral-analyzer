/** Read-only release guard: prevents publishing embedded personal transactions. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(resolve(root, 'public/index.html'), 'utf8');
const config = readFileSync(resolve(root, '../netlify.toml'), 'utf8');
const sync = readFileSync(resolve(root, 'netlify/functions/sync.mjs'), 'utf8');
const health = readFileSync(resolve(root, 'netlify/functions/health.mjs'), 'utf8');

assert.match(html, /\bconst\s+PRELOAD\s*=\s*\[\s*\]\s*;/, 'PRELOAD must be exactly an empty array');
assert.doesNotMatch(html, /\bPRELOAD_GZ\b|\bloadEmbeddedPreload\b/, 'Embedded bill previews are forbidden in production');
assert.doesNotMatch(html, /\bPRELOAD\s*=\s*\[\s*\{/i, 'Never embed transactions in production HTML');
assert.match(html, /const\s+DB_NAME\s*=\s*['"]spend_dashboard_v1['"]/, 'IndexedDB name must remain unchanged');
assert.match(html, /SNAP_DB_NAME\s*=\s*['"]spend_dashboard_snapshots_v1['"]/, 'Snapshot DB must remain unchanged');
assert.match(html, /SNAP_KEEP\s*=\s*3\b/, 'Keep three snapshots');
assert.match(html, /APP_VERSION\s*=\s*['"]1\.5\.6['"]/, 'Expected audited version 1.5.6');
assert.match(html, /spend-dashboard-v1\.5\.6-netlify/, 'Cloud payload version changed unexpectedly');
assert.match(html, /spend_sync_pass_v1/, 'Cloud identity key missing');
assert.match(html, /spend_cloud_origin_v1/, 'Cloud origin setting missing');

let scripts = 0;
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
  new Script(match[1], { filename: 'inline-'+(++scripts)+'.js' });
}
assert.ok(scripts >= 1, 'Missing application JavaScript');
for (const name of ['sync.mjs','health.mjs']) {
  const result = spawnSync(process.execPath, ['--check', resolve(root, 'netlify/functions', name)], {encoding:'utf8'});
  assert.equal(result.status, 0, name+' syntax failed: '+result.stderr);
}
assert.match(sync, /STORE_NAME\s*=\s*['"]spend-dashboard-sync['"]/, 'Cloud Blobs store must not change');
assert.match(sync, /REGION\s*=\s*['"]ap-southeast-1['"]/, 'Cloud Blobs region must not change');
assert.match(sync, /onlyIfNew:\s*true/, 'Missing first-write conflict guard');
assert.match(sync, /onlyIfMatch:\s*current\.etag/, 'Missing conditional update guard');
assert.match(health, /['"]spend-dashboard-sync['"]/, 'Health store changed');
assert.match(health, /['"]ap-southeast-1['"]/, 'Health store region changed');
for (const expected of [
  /base\s*=\s*['"]spend-dashboard['"]/, /publish\s*=\s*['"]public['"]/,
  /functions\s*=\s*['"]netlify\/functions['"]/, /command\s*=\s*['"]npm run build['"]/
]) assert.match(config, expected, 'Netlify build configuration mismatch');
console.log('Production release guard passed: V1.5.6, '+scripts+' scripts, 2 functions, no embedded bills.');
