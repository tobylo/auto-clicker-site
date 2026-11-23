// Everything the page says about the program: install commands, hotkeys,
// measured figures and platform status. Pages read these from here only.
// Commands are copied verbatim from the program's README, and each figure
// names where it was measured. Once the program's repository publishes these
// facts itself (tobylo/auto-clicker#122), the site reads them from there at a
// pinned commit instead.

const repo = 'https://github.com/tobylo/auto-clicker';
const guide = `${repo}/blob/main/docs/guide`;

export const links = {
  repo,
  guide: `${guide}/README.md`,
  install: `${guide}/install.md`,
  permissions: `${guide}/install.md#what-the-permissions-mean`,
  otherDesktops: `${guide}/install.md#on-niri-and-hyprland`,
  issues: `${repo}/issues`,
};

/** One line of an install block: a command to type, or a remark between them. */
export type InstallLine = { command: string } | { remark: string };

export interface Platform {
  id: string;
  label: string;
  status: 'available' | 'soon';
  /** Who it is for, in a few words. */
  scope: string;
  lines: InstallLine[];
  /** A note under the commands, with a link to read more. */
  note?: { text: string; link: string; linkText: string };
}

export const platforms: Platform[] = [
  {
    id: 'arch',
    label: 'Arch / CachyOS',
    status: 'available',
    scope: 'CachyOS or Arch Linux, with Plasma, niri or Hyprland',
    lines: [
      { command: 'sudo pacman -Syu' },
      { command: 'sudo pacman -S --needed base-devel git' },
      { command: 'git clone https://github.com/tobylo/auto-clicker.git ~/auto-clicker' },
      { command: 'cd ~/auto-clicker/packaging/arch && makepkg -sif' },
      { remark: 'restart the computer, then:' },
      { command: 'systemctl --user enable --now auto-clicker' },
      { remark: 'the icon appears in the tray' },
    ],
    note: {
      text: 'Recording macros needs the input group, and so do hotkeys on niri and Hyprland, which also need a bar with a tray.',
      link: `${guide}/install.md`,
      linkText: 'Read the install guide first',
    },
  },
  {
    id: 'windows',
    label: 'Windows',
    status: 'soon',
    scope: 'Windows 11',
    lines: [],
  },
];

export interface Hotkey {
  key: string;
  name: string;
  does: string;
}

/** The default bindings; each is held with Ctrl+Shift. */
export const hotkeys: Hotkey[] = [
  { key: 'F6', name: 'Click', does: 'Start or stop: fast clicks, a held button, or a repeated key.' },
  { key: 'F7', name: 'Record', does: 'Mouse and keys with their timing. Press again to save.' },
  { key: 'F8', name: 'Replay', does: 'Play it back at ¼× to 4×, once, N times or until stopped.' },
];

export interface Figure {
  value: string;
  unit: string;
  label: string;
  /** Where and how it was measured. */
  measured: string;
}

/** The clicks per second the fastest stable interval allows. */
export const clicksPerSecond = { value: '100', basis: '10 ms' };

export const figures: Figure[] = [
  {
    value: '10',
    unit: 'ms',
    label: 'fastest stable interval',
    measured: 'Release build on niri 26.04, 2026-11-09: 1000 of 1000 clicks received; the shortest interval the program allows',
  },
  {
    value: '0',
    unit: 'ticks',
    label: 'CPU while idle, 60 s',
    measured: 'Release build on niri 26.04, 2026-11-10, with the tray icon shown and hotkeys read',
  },
  {
    value: '7.2',
    unit: 'MiB',
    label: 'memory while idle',
    measured: 'Release build on Plasma 6.8.2, 2026-11-11: 7.0 to 7.2 MiB resident',
  },
  {
    value: 'none',
    unit: '',
    label: 'network connections',
    measured: 'The program opens no network socket',
  },
];
