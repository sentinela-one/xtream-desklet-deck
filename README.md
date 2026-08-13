# Xtream Deck

A lightweight, native Stream Deck-style button grid for the **Cinnamon desktop** (Linux Mint and
other Cinnamon-based distros). No heavy background app, no separate process — it's a regular
Cinnamon desklet, so it's basically free in terms of CPU/RAM.

Each instance shows a 5x2 grid of 10 buttons. You configure each button with:
- a **label** (text shown under the icon),
- a **command** (any shell command or script path, run when you click the button),
- an **icon** (pick any system icon, or point to your own image file).

You can add **multiple instances** on your desktop (e.g. one deck per task/workflow) — each one
keeps its own independent set of 10 buttons.

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

4. Configure your buttons:
   - Hover over the desklet, click the small gear/settings icon that appears on top of it.
   - For each of the 10 slots, fill in **Label**, **Command**, and pick an **Icon**.
   - Leave **Command** empty on a slot to keep that button disabled/blank.
   - Changes apply immediately, no restart needed.

### Example button

| Field   | Value |
|---------|-------|
| Label   | `Mute` |
| Command | `amixer set Master toggle` |
| Icon    | pick `audio-volume-muted-symbolic` from the icon chooser |

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
- `settings-schema.json` — defines the 10 configurable slots (label/command/icon per slot); this
  is what makes the gear-icon settings screen appear in Cinnamon.
- `desklet.js` — renders the 5x2 button grid and runs the configured command on click
  (`Util.spawnCommandLine`), using Cinnamon's own `St`/`Clutter` toolkit — no extra runtime.

Per-instance button configuration is stored by Cinnamon itself under
`~/.config/cinnamon/spices-data/desklet-xtream@oliveirawro/`, not inside this repository — so
your personal commands, paths, and icons never need to touch this repo or any fork of it.

## License

MIT — see [LICENSE](LICENSE).

## Author

Wellington Oliveira — oliveira@woliveira.net
