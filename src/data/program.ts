// Everything the page says about the program: install commands, hotkeys,
// measured figures and platform status. They come from the program's
// repository (docs/facts.json at the commit facts.pin.json names, fetched by
// scripts/facts.mjs before every build) and nowhere else. The build fails on a
// file of the wrong shape.

import raw from './facts.json';
import { clicksPerSecondOf, type Figure, type Hotkey, type PageLine, pageLines, parseFacts } from './validate';

export type { Figure, Hotkey };

const facts = parseFacts(raw);

const repo = 'https://github.com/tobylo/auto-clicker';

/** A path in the program's repository, as a link to it on main. */
const blob = (path: string) => `${repo}/blob/main/${path}`;

function link(name: string): string {
  const path = facts.links[name];
  if (path === undefined) throw new Error(`The program's facts file has no link named ${name}`);
  return blob(path);
}

export const links = {
  repo,
  guide: link('guide'),
};

export interface Platform {
  id: string;
  label: string;
  /** The operating system, as the page's headline names it. */
  system: string;
  status: 'available' | 'soon';
  /** Who it is for, in a few words. */
  scope: string;
  /** The lines the page shows; commands the README leaves to the guide are left out. */
  lines: PageLine[];
  /** A note under the commands, with a link to read more. */
  note?: { text: string; link: string; linkText: string };
}

export const platforms: Platform[] = facts.platforms.map((platform) => ({
  id: platform.id,
  label: platform.label,
  system: platform.system,
  status: platform.status,
  scope: platform.scope,
  lines: pageLines(platform.lines),
  ...(platform.note && { note: { ...platform.note, link: blob(platform.note.link) } }),
}));

/** The systems the page names, each marked "soon" until it can be installed. */
export const systems = platforms.map((p) => (p.status === 'soon' ? `${p.system} soon` : p.system));

/** The modifiers every default binding is held with. */
export const hotkeyModifiers = facts.hotkeys.modifiers;

/** The default bindings, each with hotkeyModifiers. */
export const hotkeys: Hotkey[] = facts.hotkeys.bindings;

export const figures: Figure[] = facts.figures;

/** The clicks per second the fastest stable interval allows. */
export const clicksPerSecond = clicksPerSecondOf(figures);
