// The fetch step keeps only the pinned file: a copy whose SHA-256 matches the
// pin, never anything else.

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { ensureFacts, parsePin, sha256 } from '../scripts/facts.mjs';

const dir = await mkdtemp(join(tmpdir(), 'facts-'));
after(() => rm(dir, { recursive: true, force: true }));

const good = Buffer.from('{"version": 1}\n');
const commit = 'a'.repeat(40);
const pin = { commit, sha256: sha256(good) };

/** A download that records the commits it was asked for and returns `bytes`. */
function serving(bytes) {
  const asked = [];
  const get = async (c) => {
    asked.push(c);
    return bytes;
  };
  return { asked, get };
}

async function exists(path) {
  return readFile(path).then(
    () => true,
    () => false,
  );
}

test('downloads the pinned commit and writes a file whose hash matches', async () => {
  const target = join(dir, 'fresh.json');
  const { asked, get } = serving(good);
  assert.equal(await ensureFacts({ pin, target, get }), true);
  assert.deepEqual(asked, [commit]);
  assert.deepEqual(await readFile(target), good);
});

test('keeps a copy whose hash matches without downloading', async () => {
  const target = join(dir, 'kept.json');
  await writeFile(target, good);
  const { asked, get } = serving(Buffer.from('other'));
  assert.equal(await ensureFacts({ pin, target, get }), false);
  assert.deepEqual(asked, []);
});

test('refuses a download whose hash does not match, and writes nothing', async () => {
  const target = join(dir, 'refused.json');
  const { get } = serving(Buffer.from('{"version": 2}\n'));
  await assert.rejects(ensureFacts({ pin, target, get }), /SHA-256 .* but facts\.pin\.json expects/);
  assert.equal(await exists(target), false);
});

test('removes a stale copy before downloading, so a failed download leaves none', async () => {
  const target = join(dir, 'stale.json');
  await writeFile(target, 'an older pin');
  const get = async () => {
    throw new Error('offline');
  };
  await assert.rejects(ensureFacts({ pin, target, get }), /offline/);
  assert.equal(await exists(target), false);
});

test('reads a pin of exactly a full commit and a SHA-256', () => {
  assert.deepEqual(parsePin(JSON.stringify(pin)), pin);
  for (const text of [
    'not json',
    '[]',
    JSON.stringify({ commit }),
    JSON.stringify({ ...pin, extra: 1 }),
    JSON.stringify({ ...pin, commit: 'abc123' }),
    JSON.stringify({ ...pin, commit: 'main'.padEnd(40, '0') }),
    JSON.stringify({ ...pin, sha256: pin.sha256.toUpperCase() }),
  ]) {
    assert.throws(() => parsePin(text), /facts\.pin\.json/, text);
  }
});
