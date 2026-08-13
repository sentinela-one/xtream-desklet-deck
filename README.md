# Xtream Deck

A lightweight, native Stream Deck-style button grid for the **Cinnamon desktop** (Linux Mint and
other Cinnamon-based distros). No heavy background app, no separate process — it's a regular
Cinnamon desklet, so it's basically free in terms of CPU/RAM.

Each instance shows a 5x2 grid of buttons, with up to 3 pages (30 buttons total per instance).
Every button has its own label, command, icon, and background color — all configured directly
inside the panel, no external settings screen needed. Comes with the full [Font Awesome
Free](https://fontawesome.com) icon set (7.3.1, ~2,900 icons) bundled in, so you don't need
anything installed on your system to have icons available.

You can add **multiple instances** on your desktop — each one keeps its own independent
configuration.

## Why this exists

Full Stream Deck-style apps (StreamController, etc.) are great but heavy: separate GTK process,
plugin system, always running. If all you need is "click a button on the desktop, run a command",
a native Cinnamon desklet does the same job for a fraction of the resource cost.

## Requirements

- A Cinnamon desktop (Linux Mint Cinnamon edition, or any distro running Cinnamon 4.x+).
- `git` installed.

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/oliveirawro/desklet-xtream.git
   cd desklet-xtream
   ```

2. Link it into Cinnamon's desklets folder (Cinnamon only loads desklets from this exact path):
   ```bash
   mkdir -p ~/.local/share/cinnamon/desklets
   ln -s "$(pwd)" ~/.local/share/cinnamon/desklets/desklet-xtream@oliveirawro
   ```

3. Add it to your desktop:
   - Right-click on an empty area of the desktop.
   - Click **Add Desklets**.
   - Find **Xtream Deck** in the list and click **Add** (or double-click it).
   - Repeat this step again if you want a second independent deck.

## Configuring your buttons

Everything is configured from inside the panel itself — there's no separate settings window.

1. Click the small **gear icon** in the top-right corner of the deck to enter edit mode (the gear
   highlights while active).
2. Click any button to open its editor:
   - **Label** — text shown under the icon (optional).
   - **Command** — any shell command or script path, run when you click the button.
   - **Icon** — click **Pick icon…** and search the bundled Font Awesome set (type e.g.
     `microphone`, `camera`, `play`); you can also leave the field pointing to a custom image
     path or a themed system icon name if you edit it directly in the state file (see below).
   - **Color** — pick a background color from the palette, or clear it.
   - **Clear button** wipes the slot back to empty.
3. Click the **gear icon** again to leave edit mode — buttons now run their command on click
   instead of opening the editor.
4. Use the numbered dots at the bottom to switch pages. While in edit mode, a **+** button appears
   next to them to add a new page (up to 3 pages per deck).

### Example button

| Field   | Value |
|---------|-------|
| Label   | `Mute` |
| Command | `amixer set Master toggle` |
| Icon    | search `microphone-slash` in the icon picker |

Any shell command works: launching an app, running a script you wrote, toggling something via
`amixer`/`nmcli`/`obs-cmd`/whatever CLI tool you have — if it runs from a terminal, it runs from a
button here.

## Uninstalling

- Right-click the desklet → **Remove**, to remove it from the desktop.
- Delete the symlink to fully remove it from Cinnamon:
  ```bash
  rm ~/.local/share/cinnamon/desklets/desklet-xtream@oliveirawro
  ```

## How it works / project layout

- `metadata.json` — desklet identity (uuid, name, `max-instances: -1` so you can add as many as
  you want).
- `desklet.js` — renders the header/grid/pagination, the in-panel edit mode and dialogs, and runs
  the configured command on click (`Util.spawnCommandLine`), using Cinnamon's own `St`/`Clutter`
  toolkit — no extra runtime.
- `icons/fontawesome/` — the bundled Font Awesome Free 7.3.1 icon set (`solid`, `regular`,
  `brands`) plus `manifest.json` used to power the in-panel icon search, and the upstream
  `LICENSE.txt`. See [Attribution](#attribution) below.

Each instance's button configuration (labels, commands, icons, colors, pages) is stored as plain
JSON at `~/.config/desklet-xtream/instances/<instance-id>.json` — not inside this repository, so
your personal commands and paths never need to touch this repo or any fork of it.

## Attribution

Icons: [Font Awesome Free](https://fontawesome.com) by Fonticons, Inc., licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (icons) and
[SIL OFL 1.1](https://scripts.sil.org/OFL) (fonts, unused here — this project only uses the SVG
icon files). Full license text bundled at `icons/fontawesome/LICENSE.txt`.

## License

MIT — see [LICENSE](LICENSE). (Note: the bundled Font Awesome assets under `icons/fontawesome/`
keep their own upstream license, see above.)

## Author

Wellington Oliveira — oliveira@woliveira.net
