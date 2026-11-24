// The facts file is accepted in its one shape only. The valid file is the
// pinned one (src/data/facts.json, which `pnpm test` fetches first); each case
// below breaks one thing in a copy of it.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { clicksPerSecondOf, type Figure, pageLines, parseFacts } from '../src/data/validate.ts';

const pinned = JSON.parse(await readFile(new URL('../src/data/facts.json', import.meta.url), 'utf8'));

/** A copy of the pinned facts after `change`. */
function changed(change: (facts: any) => void): unknown {
  const copy = structuredClone(pinned);
  change(copy);
  return copy;
}

test('accepts the pinned file', () => {
  assert.equal(parseFacts(pinned).version, 1);
});

const broken: [string, (facts: any) => void, RegExp][] = [
  ['an unknown top-level key', (f) => (f.extra = 1), /exactly version, links/],
  ['another version', (f) => (f.version = 2), /version must be 1/],
  ['an unknown status', (f) => (f.platforms[1].status = 'beta'), /status must be available or soon/],
  ['a soon platform with lines', (f) => (f.platforms[1].lines = [{ remark: 'x' }]), /soon has no install lines/],
  ['an available platform without its heading', (f) => delete f.platforms[0].readme, /names its README heading/],
  ['guideOnly false', (f) => (f.platforms[0].lines[0].guideOnly = false), /guideOnly may only be true/],
  ['a line with both kinds', (f) => (f.platforms[0].lines[0].remark = 'x'), /either \{command, guideOnly\?\} or \{remark\}/],
  ['a command over two lines', (f) => (f.platforms[0].lines[0].command = 'a\nb'), /command must be one line/],
  ['a path out of the repository', (f) => (f.links.guide = '../x.md'), /links\.guide: must be a path/],
  ['an unknown figure key', (f) => (f.figures[0].measured = 'x'), /a figure has exactly/],
  ['a number for a value', (f) => (f.figures[0].value = 10), /value, label and detail must be text/],
  ['an unknown basis', (f) => (f.figures[0].basis = 'guess'), /basis must be measured or rule/],
  ['a hotkey key twice', (f) => (f.hotkeys.bindings[1].key = f.hotkeys.bindings[0].key), /each key appears once/],
  ['no hotkeys', (f) => (f.hotkeys.bindings = []), /bindings must be a non-empty list/],
  ['a platform id twice', (f) => (f.platforms[1].id = f.platforms[0].id), /platforms: each id appears once/],
  ['a heading twice', (f) => Object.assign(f.platforms[1], { ...f.platforms[0], id: 'other' }), /each README heading belongs to one platform/],
];

for (const [name, change, problem] of broken) {
  test(`refuses ${name}`, () => {
    assert.throws(() => parseFacts(changed(change)), problem);
  });
}

test('lists every problem at once', () => {
  const facts = changed((f) => {
    f.version = 2;
    f.figures[0].basis = 'guess';
  });
  assert.throws(() => parseFacts(facts), /version must be 1\n.*basis must be measured or rule/s);
});

test('leaves out the commands the README leaves to the guide', () => {
  const lines = pageLines([{ command: 'a' }, { command: 'b', guideOnly: true }, { remark: 'c' }]);
  assert.deepEqual(lines, [{ command: 'a' }, { remark: 'c' }]);
});

const figure = (value: string, unit = 'ms'): Figure => ({
  id: 'fastest-interval',
  value,
  unit,
  label: 'l',
  basis: 'measured',
  detail: 'd',
  source: { path: 'p', quote: 'q' },
});

test('works out clicks per second from the fastest interval', () => {
  assert.deepEqual(clicksPerSecondOf([figure('10')]), { value: '100', basis: '10 ms' });
  for (const figures of [[], [figure('0')], [figure('3')], [figure('2.5')], [figure('10', 's')], [figure('ten')]]) {
    assert.throws(() => clicksPerSecondOf(figures), /fastest-interval figure/);
  }
});
