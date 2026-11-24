// The one shape the program's facts file (tobylo/auto-clicker, docs/facts.json)
// may have, checked as strictly as the program's own test
// (crates/core/tests/facts/shape.rs there): unknown keys, wrong types and unknown values
// are refused, and every problem is listed at once.

/** One line of an install block: a command to type, or a remark between them. */
export type InstallLine = { command: string; guideOnly?: true } | { remark: string };

export interface Note {
  text: string;
  /** A path in the program's repository. */
  link: string;
  linkText: string;
}

export interface FactsPlatform {
  id: string;
  label: string;
  system: string;
  status: 'available' | 'soon';
  scope: string;
  /** The README heading an available platform's commands are under. */
  readme?: string;
  lines: InstallLine[];
  note?: Note;
}

export interface Hotkey {
  key: string;
  name: string;
  does: string;
}

export interface Figure {
  id: string;
  value: string;
  unit: string;
  label: string;
  basis: 'measured' | 'rule';
  /** Where and when it was measured, or the rule it follows. */
  detail: string;
  source: { path: string; quote: string };
}

export interface Facts {
  version: 1;
  /** Paths in the program's repository, by name. */
  links: Record<string, string>;
  platforms: FactsPlatform[];
  hotkeys: { modifiers: string; bindings: Hotkey[] };
  figures: Figure[];
}

type Json = Record<string, unknown>;

class Problems {
  list: string[] = [];

  check(ok: boolean, problem: string): boolean {
    if (!ok) this.list.push(problem);
    return ok;
  }
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !/[\u0000-\u001f\u007f]/.test(value);
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PATH = /^[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)*$/;

const isSlug = (value: unknown) => isText(value) && SLUG.test(value);
const isPath = (value: unknown) =>
  isText(value) && PATH.test(value) && value.split('/').every((part) => part !== '.' && part !== '..');

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Whether `value` is an object with every key in `required` and no key outside `required` and `optional`. */
function shaped(value: unknown, required: string[], optional: string[] = []): value is Json {
  if (!isObject(value)) return false;
  const allowed = [...required, ...optional];
  const keys = Object.keys(value);
  return required.every((key) => keys.includes(key)) && keys.every((key) => allowed.includes(key));
}

function nonEmptyList(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

function distinct(items: unknown[], key: string): boolean {
  const values = items.filter(isObject).map((item) => item[key]);
  return new Set(values).size === values.length;
}

function checkLine(p: Problems, line: unknown, where: string) {
  if (shaped(line, ['command'], ['guideOnly'])) {
    p.check(isText(line.command), `${where}: command must be one line of text`);
    p.check(!('guideOnly' in line) || line.guideOnly === true, `${where}: guideOnly may only be true`);
  } else if (shaped(line, ['remark'])) {
    p.check(isText(line.remark), `${where}: remark must be one line of text`);
  } else {
    p.check(false, `${where}: a line is either {command, guideOnly?} or {remark}`);
  }
}

function checkNote(p: Problems, note: unknown, where: string) {
  if (!p.check(shaped(note, ['text', 'link', 'linkText']), `${where}: note must have exactly text, link and linkText`)) return;
  const { text, link, linkText } = note as Json;
  p.check(isText(text) && isText(linkText), `${where}: note text and linkText must be text`);
  p.check(isPath(link), `${where}: note link must be a path in this repository`);
}

function checkStatus(p: Problems, platform: Json, where: string) {
  const lines = Array.isArray(platform.lines) ? platform.lines : [];
  if (platform.status === 'available') {
    p.check(isText(platform.readme), `${where}: an available platform names its README heading (readme)`);
    p.check(lines.some((line) => shaped(line, ['command'], ['guideOnly'])), `${where}: an available platform has commands`);
  } else if (platform.status === 'soon') {
    p.check(!('readme' in platform), `${where}: a platform that is soon has no README heading`);
    p.check(lines.length === 0, `${where}: a platform that is soon has no install lines`);
  } else {
    p.check(false, `${where}: status must be available or soon`);
  }
}

function checkPlatform(p: Problems, platform: unknown, where: string) {
  const fields = ['id', 'label', 'system', 'status', 'scope', 'lines'];
  if (!p.check(shaped(platform, fields, ['readme', 'note']), `${where}: a platform has ${fields.join(', ')}, and may have readme and note`)) return;
  const item = platform as Json;
  p.check(isSlug(item.id), `${where}: id must be lowercase words joined by -`);
  p.check(isText(item.label) && isText(item.system) && isText(item.scope), `${where}: label, system and scope must be text`);
  if (p.check(Array.isArray(item.lines), `${where}: lines must be a list`)) {
    (item.lines as unknown[]).forEach((line, i) => checkLine(p, line, `${where} line ${i + 1}`));
  }
  if ('note' in item) checkNote(p, item.note, where);
  checkStatus(p, item, where);
}

function checkHotkeys(p: Problems, hotkeys: unknown) {
  if (!p.check(shaped(hotkeys, ['modifiers', 'bindings']), 'hotkeys: has exactly modifiers and bindings')) return;
  const { modifiers, bindings } = hotkeys as Json;
  p.check(isText(modifiers), 'hotkeys: modifiers must be text');
  if (!p.check(nonEmptyList(bindings), 'hotkeys: bindings must be a non-empty list')) return;
  (bindings as unknown[]).forEach((binding, i) => {
    const where = `hotkey ${i + 1}`;
    if (!p.check(shaped(binding, ['key', 'name', 'does']), `${where}: a hotkey has exactly key, name and does`)) return;
    const { key, name, does } = binding as Json;
    p.check(isText(key) && isText(name) && isText(does), `${where}: key, name and does must be text`);
  });
  p.check(distinct(bindings as unknown[], 'key'), 'hotkeys: each key appears once');
}

function checkFigure(p: Problems, figure: unknown, where: string) {
  const fields = ['id', 'value', 'unit', 'label', 'basis', 'detail', 'source'];
  if (!p.check(shaped(figure, fields), `${where}: a figure has exactly ${fields.join(', ')}`)) return;
  const item = figure as Json;
  p.check(isSlug(item.id), `${where}: id must be lowercase words joined by -`);
  p.check(isText(item.value) && isText(item.label) && isText(item.detail), `${where}: value, label and detail must be text`);
  p.check(item.unit === '' || isText(item.unit), `${where}: unit must be text, or empty`);
  p.check(item.basis === 'measured' || item.basis === 'rule', `${where}: basis must be measured or rule`);
  if (!p.check(shaped(item.source, ['path', 'quote']), `${where}: source has exactly path and quote`)) return;
  const source = item.source as Json;
  p.check(isPath(source.path), `${where}: source path must be a path in this repository`);
  p.check(isText(source.quote), `${where}: source quote must be one line of text`);
}

function checkList(p: Problems, value: unknown, name: string, checkItem: (p: Problems, item: unknown, where: string) => void) {
  if (!p.check(nonEmptyList(value), `${name} must be a non-empty list`)) return;
  (value as unknown[]).forEach((item, i) => checkItem(p, item, `${name} ${i + 1}`));
  p.check(distinct(value as unknown[], 'id'), `${name}: each id appears once`);
}

function distinctHeadings(platforms: unknown): boolean {
  if (!Array.isArray(platforms)) return true;
  return distinct(platforms.filter(isObject).filter((platform) => 'readme' in platform), 'readme');
}

function checkLinks(p: Problems, links: unknown) {
  if (!p.check(isObject(links) && Object.keys(links).length > 0, 'links must be a non-empty object')) return;
  for (const [name, path] of Object.entries(links as Json)) {
    p.check(isSlug(name), `links: ${JSON.stringify(name)} is not a name of lowercase words joined by -`);
    p.check(isPath(path), `links.${name}: must be a path in this repository`);
  }
}

/** The facts in `raw`, or an error that lists every way it has the wrong shape. */
export function parseFacts(raw: unknown): Facts {
  const p = new Problems();
  const fields = ['version', 'links', 'platforms', 'hotkeys', 'figures'];
  if (p.check(shaped(raw, fields), `the file is an object with exactly ${fields.join(', ')}`)) {
    const facts = raw as Json;
    p.check(facts.version === 1, 'version must be 1');
    checkLinks(p, facts.links);
    checkList(p, facts.platforms, 'platforms', checkPlatform);
    p.check(distinctHeadings(facts.platforms), 'platforms: each README heading belongs to one platform');
    checkHotkeys(p, facts.hotkeys);
    checkList(p, facts.figures, 'figures', checkFigure);
  }
  if (p.list.length > 0) {
    throw new Error(`The program's facts file has the wrong shape:\n${p.list.join('\n')}`);
  }
  return raw as Facts;
}

/** One line of an install block, as the page shows it: a command, or a remark between them. */
export type PageLine = { command: string } | { remark: string };

/** The lines the page shows, leaving out commands the README leaves to the guide. */
export function pageLines(lines: InstallLine[]): PageLine[] {
  return lines.flatMap((line) => {
    if ('remark' in line) return [{ remark: line.remark }];
    return line.guideOnly ? [] : [{ command: line.command }];
  });
}

/**
 * The clicks per second the fastest stable interval allows (1000 ms over it),
 * with the interval as its basis. Fails unless the figure is a whole number
 * of ms that divides 1000.
 */
export function clicksPerSecondOf(figures: Figure[]): { value: string; basis: string } {
  const fastest = figures.find((figure) => figure.id === 'fastest-interval');
  const ms = fastest && wholeMsDividing1000(fastest);
  if (fastest === undefined || ms === undefined) {
    throw new Error("The program's facts file needs a fastest-interval figure: a whole number of ms that divides 1000");
  }
  return { value: String(1000 / ms), basis: `${fastest.value} ${fastest.unit}` };
}

/** The figure's value in ms, if it is a whole number of ms that divides 1000. */
function wholeMsDividing1000(figure: Figure): number | undefined {
  if (figure.unit !== 'ms') return undefined;
  const ms = Number(figure.value);
  if (!Number.isInteger(ms) || ms <= 0) return undefined;
  return 1000 % ms === 0 ? ms : undefined;
}
