// Gets the program's facts (tobylo/auto-clicker, docs/facts.json) at the
// commit facts.pin.json names, and refuses any file whose SHA-256 differs from
// the pin. The page is built from the copy this writes to src/data/facts.json.
//
//   node scripts/facts.mjs fetch           before every build (package.json)
//   node scripts/facts.mjs pin <commit>    moves the pin to a commit of main

import { createHash } from 'node:crypto';
import { open, readFile, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY = 'tobylo/auto-clicker';
const FILE = 'docs/facts.json';
const TIMEOUT_MS = 30_000;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PIN = join(root, 'facts.pin.json');
export const TARGET = join(root, 'src/data/facts.json');

const COMMIT = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** The pin, from the text of facts.pin.json: exactly a full commit and a SHA-256. */
export function parsePin(text) {
  let pin;
  try {
    pin = JSON.parse(text);
  } catch {
    throw new Error('facts.pin.json is not JSON');
  }
  if (!isPin(pin)) {
    throw new Error('facts.pin.json must hold exactly "commit" (40 hex digits) and "sha256" (64 hex digits)');
  }
  return pin;
}

function isPin(value) {
  if (typeof value !== 'object' || value === null) return false;
  if (Object.keys(value).sort().join() !== 'commit,sha256') return false;
  return COMMIT.test(value.commit) && SHA256.test(value.sha256);
}

function rawUrl(commit) {
  return `https://raw.githubusercontent.com/${REPOSITORY}/${commit}/${FILE}`;
}

/** The file at `commit`, from GitHub, within the timeout. */
export async function download(commit) {
  const response = await fetch(rawUrl(commit), { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`${FILE} at ${commit}: GitHub answered ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function readIfThere(path) {
  try {
    return await readFile(path);
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

/** Writes `bytes` to `path` whole or not at all: a temp file, synced, renamed over it. */
async function writeWhole(path, bytes) {
  const temp = `${path}.${process.pid}.tmp`;
  const file = await open(temp, 'w');
  try {
    await file.writeFile(bytes);
    await file.sync();
  } finally {
    await file.close();
  }
  try {
    await rename(temp, path);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

/**
 * Makes `target` hold the pinned file: keeps a copy whose hash matches the
 * pin, and otherwise removes it and downloads the file again, writing it only
 * when its hash matches. Returns whether it downloaded.
 */
export async function ensureFacts({ pin, target = TARGET, get = download }) {
  const present = await readIfThere(target);
  if (present !== undefined && sha256(present) === pin.sha256) return false;
  await rm(target, { force: true });
  const bytes = await get(pin.commit);
  const actual = sha256(bytes);
  if (actual !== pin.sha256) {
    throw new Error(
      `${FILE} at ${pin.commit} has SHA-256 ${actual}, but facts.pin.json expects ${pin.sha256}; refusing it`,
    );
  }
  await writeWhole(target, bytes);
  return true;
}

/** Whether `commit` is on the program's main: main is the same or ahead of it. */
async function onMain(commit) {
  const url = `https://api.github.com/repos/${REPOSITORY}/compare/${commit}...main`;
  const response = await fetch(url, {
    headers: { accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`comparing ${commit} with main: GitHub answered ${response.status}`);
  const { status } = await response.json();
  return status === 'identical' || status === 'ahead';
}

async function pinTo(commit) {
  if (!COMMIT.test(commit ?? '')) throw new Error('give the full commit: 40 hex digits');
  if (!(await onMain(commit))) throw new Error(`${commit} is not on ${REPOSITORY}'s main`);
  const pin = { commit, sha256: sha256(await download(commit)) };
  await writeWhole(PIN, `${JSON.stringify(pin, null, 2)}\n`);
  await ensureFacts({ pin });
  console.log(`facts.pin.json now pins ${commit} (${pin.sha256})`);
}

async function main([command, argument]) {
  if (command === 'fetch') {
    const pin = parsePin(await readFile(PIN, 'utf8'));
    const fetched = await ensureFacts({ pin });
    console.log(`${FILE} at ${pin.commit.slice(0, 12)}: ${fetched ? 'downloaded' : 'up to date'}`);
  } else if (command === 'pin') {
    await pinTo(argument);
  } else {
    throw new Error('usage: node scripts/facts.mjs fetch | pin <commit>');
  }
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
