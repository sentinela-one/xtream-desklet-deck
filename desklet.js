const Desklet = imports.ui.desklet;
const Settings = imports.ui.settings;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const Util = imports.misc.util;

const NUM_SLOTS = 10;
const COLUMNS = 5;
const ICON_SIZE = 40;
const BUTTON_SIZE = 64;

class XtreamDeckDesklet extends Desklet.Desklet {
    constructor(metadata, desklet_id) {
        super(metadata, desklet_id);
        this.setHeader(metadata.name);

        this.settings = new Settings.DeskletSettings(this, metadata.uuid, desklet_id);
        for (let i = 0; i < NUM_SLOTS; i++) {
            this.settings.bindProperty(Settings.BindingDirection.IN, "slot" + i + "-label", "slot" + i + "_label", this._rebuild.bind(this));
            this.settings.bindProperty(Settings.BindingDirection.IN, "slot" + i + "-command", "slot" + i + "_command", this._rebuild.bind(this));
            this.settings.bindProperty(Settings.BindingDirection.IN, "slot" + i + "-icon", "slot" + i + "_icon", this._rebuild.bind(this));
        }

        this._rebuild();
    }

    _runCommand(command) {
        try {
            Util.spawnCommandLine(command);
        } catch (e) {
            global.logError("desklet-xtream: failed to run command '" + command + "': " + e);
        }
    }

    _makeButton(label, command, icon) {
        let button = new St.Button({
            style_class: "xtream-deck-button",
            style: "width: " + BUTTON_SIZE + "px; height: " + BUTTON_SIZE + "px; margin: 4px; " +
                   "background-color: rgba(30,30,30,0.75); border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);"
        });

        let box = new St.BoxLayout({ vertical: true, x_align: St.Align.MIDDLE });

        if (icon) {
            try {
                let gicon = Gio.icon_new_for_string(icon);
                let iconActor = new St.Icon({ gicon: gicon, icon_size: ICON_SIZE });
                box.add(iconActor, { x_fill: false, x_align: St.Align.MIDDLE });
            } catch (e) {
                global.logError("desklet-xtream: invalid icon '" + icon + "': " + e);
            }
        }

        if (label) {
            let labelActor = new St.Label({ text: label, style: "font-size: 9px; color: white; text-align: center;" });
            box.add(labelActor, { x_fill: false, x_align: St.Align.MIDDLE });
        }

        button.set_child(box);

        if (command) {
            button.connect("clicked", () => this._runCommand(command));
        } else {
            button.set_reactive(false);
            button.set_opacity(60);
        }

        return button;
    }

    _rebuild() {
        let grid = new St.Table({ homogeneous: false });

        for (let i = 0; i < NUM_SLOTS; i++) {
            let row = Math.floor(i / COLUMNS);
            let col = i % COLUMNS;
            let label = this["slot" + i + "_label"] || "";
            let command = this["slot" + i + "_command"] || "";
            let icon = this["slot" + i + "_icon"] || "";

            let button = this._makeButton(label, command, icon);
            grid.add(button, { row: row, col: col, x_expand: false, y_expand: false });
        }

        this.setContent(grid);
    }
}

function main(metadata, desklet_id) {
    return new XtreamDeckDesklet(metadata, desklet_id);
}
