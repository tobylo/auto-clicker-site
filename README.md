# auto-clicker-site

The project page for [auto-clicker](https://github.com/tobylo/auto-clicker), an auto clicker with macro record and playback. It is a static site built with [Astro](https://astro.build) and Svelte, published on GitHub Pages at <https://tobylo.github.io/auto-clicker-site/>.

## Building it

With [pnpm](https://pnpm.io) (the version in `package.json`'s `packageManager`) and Node.js 26:

```sh
pnpm install --frozen-lockfile
pnpm dev      # serves the page at http://localhost:4321/auto-clicker-site/
pnpm test     # checks the facts' fetch and shape
pnpm build    # writes the static site to dist/
```

The install commands, hotkeys, figures and platform status come from the program's [`docs/facts.json`](https://github.com/tobylo/auto-clicker/blob/main/docs/facts.json), at the commit `facts.pin.json` names; `dev`, `test` and `build` download it first, and refuse a file whose SHA-256 differs from the pin. `pnpm facts:pin <commit>` moves the pin to a later commit of the program's `main`.

Every push to `main` builds the site and publishes it.

## License

Licensed under either of the [Apache License, Version 2.0](LICENSE-APACHE) or the [MIT license](LICENSE-MIT), at your option. Unless you state otherwise, any contribution you submit for inclusion is licensed the same way, with no additional terms.
