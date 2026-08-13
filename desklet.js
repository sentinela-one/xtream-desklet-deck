const Desklet = imports.ui.desklet;
const ModalDialog = imports.ui.modalDialog;
const Tooltips = imports.ui.tooltips;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;
const ByteArray = imports.byteArray;

const COLUMNS = 5;
const ROWS = 2;
const SLOTS_PER_PAGE = COLUMNS * ROWS;
const MAX_PAGES = 3;
const ICON_SIZE = 28;
const BUTTON_SIZE = 64;

const PALETTE = [
    "#e6194b", "#e91e8c", "#f39c12", "#9b59b6", "#2D6DD9",
    "#19BC97", "#1abc9c", "#34495e", "#7f8c8d", "#2c2c2c"
];

const FOOTER_BUTTON_STYLE_BASE = "border: none; border-radius: 10px; padding: 8px 18px; font-size: 18px; font-weight: normal; color: white; min-width: 120px; background-color: #2D6DD9;";
const FOOTER_BUTTON_STYLE_HOVER = "border: none; border-radius: 10px; padding: 8px 18px; font-size: 18px; font-weight: normal; color: white; min-width: 120px; background-color: #FF4D00;";

// Inline-style the dialog footer buttons (Cinnamon's stylesheet reload for xlets is
// unreliable, so we avoid relying on an external CSS class here) and drive the hover
// color change directly off St.Button's own "hover" state.
function styleFooterButton(button) {
    button.style = FOOTER_BUTTON_STYLE_BASE;
    button.connect("notify::hover", () => {
        button.style = button.hover ? FOOTER_BUTTON_STYLE_HOVER : FOOTER_BUTTON_STYLE_BASE;
    });
}

function emptySlot() {
    return { label: "", command: "", icon: "", color: "", showTitle: true };
}

function emptyPage() {
    let slots = [];
    for (let i = 0; i < SLOTS_PER_PAGE; i++) slots.push(emptySlot());
    return { slots: slots };
}

// Dialog: search & pick an icon from the bundled Font Awesome set.
class IconPickerDialog extends ModalDialog.ModalDialog {
    constructor(deskletPath, onPick) {
        super({ styleClass: "xtream-deck-dialog" });
        this.contentLayout.style = "spacing: 18px; padding: 22px 22px;";
        this._deskletPath = deskletPath;
        this._onPick = onPick;
        this._manifest = this._loadManifest();

        let titleRow = new St.BoxLayout({ vertical: false });
        let title = new St.Label({ text: "Choose an icon", style: "font-weight: bold; color: white; font-size: 24px;" });
        titleRow.add(title, { expand: true, x_fill: true, x_align: St.Align.START, y_align: St.Align.MIDDLE });
        let closeBtn = new St.Button({ style: "width: 42px; height: 42px; border-radius: 21px; background-color: #2D6DD9; margin-right: 0; margin-top: 0;" });
        let closeGicon = makeWhiteIconFile(deskletPath, "solid", "xmark");
        if (closeGicon) closeBtn.set_child(new St.Icon({ gicon: closeGicon, icon_size: 22 }));
        closeBtn.connect("clicked", () => this.close());
        titleRow.add(closeBtn, { y_align: St.Align.START });
        this.contentLayout.add(titleRow);

        this._entry = new St.Entry({ style_class: "xtream-deck-entry", hint_text: "Search icons…" });
        let hint = new St.Label({ text: "Type to search, e.g. \"microphone\", \"camera\", \"play\". Showing first 24 matches.", style_class: "xtream-deck-hint" });
        let searchGroup = new St.BoxLayout({ vertical: true, style: "spacing: 6px;" });
        searchGroup.add(this._entry);
        searchGroup.add(hint);
        this.contentLayout.add(searchGroup);
        this.setInitialKeyFocus(this._entry.clutter_text);

        this._resultsBin = new St.Bin({ style: "width: 460px; min-height: 220px;" });
        this.contentLayout.add(this._resultsBin);

        this._entry.clutter_text.connect("text-changed", () => this._renderResults(this._entry.get_text()));
        this._renderResults("");

        this.setButtons([
            { label: "No icon", action: () => { this._onPick(""); this.close(); } },
            { label: "Close", action: () => this.close() }
        ]);
        this._buttonLayout.style = "spacing: 14px;";
        for (let button of this._buttonLayout.get_children()) {
            styleFooterButton(button);
        }
    }

    _loadManifest() {
        try {
            let path = this._deskletPath + "/icons/fontawesome/manifest.json";
            let [ok, contents] = GLib.file_get_contents(path);
            if (!ok) return [];
            return JSON.parse(ByteArray.toString(contents));
        } catch (e) {
            global.logError("xtream-desklet-deck: failed to load icon manifest: " + e);
            return [];
        }
    }

    _renderResults(query) {
        let q = query.trim().toLowerCase();
        let matches = this._manifest.filter(i => !q || i.name.includes(q));
        matches = matches.slice(0, 24);

        if (matches.length === 0) {
            this._resultsBin.set_child(new St.Label({ text: q ? "No icons match \"" + q + "\"." : "No icons available.", style: "color: #999; padding: 12px;" }));
            return;
        }

        let cols = 6;
        let grid = new St.Table({ homogeneous: false });
        for (let idx = 0; idx < matches.length; idx++) {
            let item = matches[idx];
            let row = Math.floor(idx / cols);
            let col = idx % cols;

            let btn = new St.Button({ style: "width: 56px; height: 56px; margin: 3px; background-color: rgba(255,255,255,0.08); border-radius: 6px;" });
            let gicon = makeWhiteIconFile(this._deskletPath, item.style, item.name);
            if (gicon) {
                btn.set_child(new St.Icon({ gicon: gicon, icon_size: 28 }));
            } else {
                btn.set_child(new St.Label({ text: "?", style: "color: white;" }));
            }
            let tooltip = new Tooltips.Tooltip(btn, item.name);
            tooltip._tooltip.style = "font-size: 20px; font-weight: bold; padding: 8px 14px;";
            btn.connect("clicked", () => {
                this._onPick("fa:" + item.style + ":" + item.name);
                this.close();
            });
            grid.add(btn, { row: row, col: col, x_expand: false, y_expand: false });
        }
        this._resultsBin.set_child(grid);
    }
}

// Small reusable confirmation dialog, styled to match the rest of Xtream Deck.
class ConfirmDialog extends ModalDialog.ModalDialog {
    constructor(deskletPath, titleText, messageText, confirmLabel, onConfirm) {
        super({ styleClass: "xtream-deck-dialog" });
        this.contentLayout.style = "spacing: 16px; padding: 22px 22px;";

        let title = new St.Label({ text: titleText, style: "font-weight: bold; color: white; font-size: 24px;" });
        this.contentLayout.add(title, { x_align: St.Align.START });

        let message = new St.Label({ text: messageText, style: "color: #cccccc; font-size: 16px; width: 380px;" });
        message.clutter_text.line_wrap = true;
        this.contentLayout.add(message);

        this.setButtons([
            { label: "Cancel", action: () => this.close() },
            {
                label: confirmLabel, focused: true, action: () => {
                    this.close();
                    onConfirm();
                }
            }
        ]);

        let children = this._buttonLayout.get_children();
        for (let button of children) {
            if (button.label === "Cancel") {
                button.style = "padding: 10px 16px; font-size: 15px; border-radius: 6px;";
            } else if (button.label === confirmLabel) {
                button.style = "padding: 10px 16px; font-size: 15px; border-radius: 6px; background-color: #e6194b;";
            }
        }
    }
}

// Dialog: edit a single button's label, command, icon and color.
class ButtonEditorDialog extends ModalDialog.ModalDialog {
    constructor(deskletPath, slot, onSave, onClear) {
        super({ styleClass: "xtream-deck-dialog" });
        this.contentLayout.style = "spacing: 22px; padding: 22px 22px;";
        this._deskletPath = deskletPath;
        this._slot = { label: slot.label || "", command: slot.command || "", icon: slot.icon || "", color: slot.color || "", showTitle: slot.showTitle !== false };
        this._onSave = onSave;
        this._onClear = onClear;

        let titleRow = new St.BoxLayout({ vertical: false });
        let title = new St.Label({ text: "Edit button", style: "font-weight: bold; color: white; font-size: 24px;" });
        titleRow.add(title, { expand: true, x_fill: true, x_align: St.Align.START, y_align: St.Align.MIDDLE });
        let closeBtn = new St.Button({ style: "width: 42px; height: 42px; border-radius: 21px; background-color: #2D6DD9; margin-right: 0; margin-top: 0;" });
        let closeGicon = makeWhiteIconFile(this._deskletPath, "solid", "xmark");
        if (closeGicon) closeBtn.set_child(new St.Icon({ gicon: closeGicon, icon_size: 22 }));
        closeBtn.connect("clicked", () => this.close());
        titleRow.add(closeBtn, { y_align: St.Align.START });
        this.contentLayout.add(titleRow);

        this._labelEntry = new St.Entry({ style_class: "xtream-deck-entry", hint_text: "Enter button label", style: "width: 300px;" });
        this._labelEntry.set_text(this._slot.label);
        this.setInitialKeyFocus(this._labelEntry.clutter_text);

        this._showTitleToggle = this._makeToggle(this._slot.showTitle, (value) => { this._slot.showTitle = value; }, 40);

        // Two BoxLayout columns side by side (not St.Table, which has an
        // uncontrollable default gap between columns) - each column has its own
        // header + control stacked vertically, so "Label"/"Show Title" line up
        // on the same row without any extra space between the two columns.
        let labelColumn = new St.BoxLayout({ vertical: true, style: "spacing: 6px;" });
        labelColumn.add(new St.Label({ text: "Label", style_class: "xtream-deck-field-label" }));
        labelColumn.add(this._labelEntry);

        let showTitleColumn = new St.BoxLayout({ vertical: true, style: "spacing: 6px;" });
        showTitleColumn.add(new St.Label({ text: "Show Title", style_class: "xtream-deck-field-label" }), { x_align: St.Align.MIDDLE });
        showTitleColumn.add(this._showTitleToggle, { x_align: St.Align.MIDDLE });

        let fieldRow = new St.BoxLayout({ vertical: false, style: "spacing: 18px;" });
        fieldRow.add(labelColumn);
        fieldRow.add(showTitleColumn, { y_align: St.Align.START });

        let labelGroup = new St.BoxLayout({ vertical: true, style: "spacing: 6px;" });
        labelGroup.add(fieldRow);
        labelGroup.add(new St.Label({ text: "This is the text that will appear on the button. \"Show Title\" controls whether it's drawn under the icon on the grid.", style_class: "xtream-deck-hint" }));
        this.contentLayout.add(labelGroup);

        this._commandEntry = new St.Entry({ style_class: "xtream-deck-entry", hint_text: "e.g. /home/user/scripts/my-script.sh" });
        this._commandEntry.set_text(this._slot.command);
        this.contentLayout.add(this._makeFieldGroup("Command", this._commandEntry, "Command or script to run when the button is clicked."));

        this._iconDropzone = new St.Button({
            style: "width: 460px; background-color: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.5); border-radius: 8px; padding: 12px;"
        });
        let iconRow = new St.BoxLayout({ vertical: false, style: "spacing: 16px;" });
        this._iconPreview = new St.Bin({ style: "width: 44px; height: 44px; background-color: rgba(255,255,255,0.1); border-radius: 6px;" });
        iconRow.add(this._iconPreview, { y_align: St.Align.MIDDLE, y_fill: false });
        let pickIconLabelBin = new St.Bin({ y_align: St.Align.MIDDLE });
        pickIconLabelBin.set_child(new St.Label({ text: "Pick icon…", style: "color: white; font-size: 16px;" }));
        iconRow.add(pickIconLabelBin, { y_align: St.Align.MIDDLE, y_fill: false });
        this._iconDropzone.set_child(iconRow);
        this._iconDropzone.connect("clicked", () => {
            let picker = new IconPickerDialog(this._deskletPath, (iconRef) => {
                this._slot.icon = iconRef;
                this._updateIconPreview();
            });
            picker.open();
        });
        this._updateIconPreview();
        this.contentLayout.add(this._makeFieldGroup("Icon", this._iconDropzone, "Choose an icon to represent this button."));

        let colorRow = new St.BoxLayout({ vertical: false, style: "spacing: 10px;" });
        let colorSwatches = [];

        const updateColorSwatches = () => {
            for (let entry of colorSwatches) {
                let selected = entry.colorValue === this._slot.color;
                let border = selected
                    ? "border: 3px solid white;"
                    : (entry.colorValue === "" ? "border: 2px solid rgba(255,255,255,0.5);" : "border: none;");
                let bg = entry.colorValue ? "background-color: " + entry.colorValue + ";" : "";
                entry.button.style = "width: 34px; height: 34px; border-radius: 8px; " + bg + " " + border;
            }
        };

        for (let c of PALETTE) {
            let swatch = new St.Button();
            swatch.connect("clicked", () => { this._slot.color = c; updateColorSwatches(); });
            colorRow.add(swatch, { y_align: St.Align.MIDDLE });
            colorSwatches.push({ button: swatch, colorValue: c });
        }
        let noColorBtn = new St.Button();
        noColorBtn.connect("clicked", () => { this._slot.color = ""; updateColorSwatches(); });
        colorRow.add(noColorBtn, { y_align: St.Align.MIDDLE });
        colorSwatches.push({ button: noColorBtn, colorValue: "" });

        updateColorSwatches();
        colorRow.add(new St.Bin({ style: "width: 1px; height: 30px; background-color: rgba(255,255,255,0.2);" }), { y_align: St.Align.MIDDLE });
        this.contentLayout.add(this._makeFieldGroup("Color", colorRow, "Select a color for the button."));

        this.setButtons([
            { label: "Clear button", action: () => { onClear(); this.close(); } },
            { label: "Cancel", action: () => this.close() },
            {
                label: "Save", focused: true, action: () => {
                    this._slot.label = this._labelEntry.get_text();
                    this._slot.command = this._commandEntry.get_text();
                    this._onSave(this._slot);
                    this.close();
                }
            }
        ]);
        this._styleFooterButtons();
    }

    _makeFieldGroup(labelText, contentActor, hintText) {
        let group = new St.BoxLayout({ vertical: true, style: "spacing: 6px;" });
        group.add(new St.Label({ text: labelText, style_class: "xtream-deck-field-label" }));
        group.add(contentActor);
        group.add(new St.Label({ text: hintText, style_class: "xtream-deck-hint" }));
        return group;
    }

    // Pill-shaped ON/OFF toggle: green with "ON" + a white dot on the right when
    // on, red with a white dot + "OFF" on the left when off.
    _makeToggle(initialValue, onChange, height) {
        let value = !!initialValue;
        let btn = new St.Button();
        let h = height || 26;
        let thumbSize = h - 6;

        const render = () => {
            let bg = value ? "#19BC97" : "#e6194b";
            btn.style = "width: 84px; height: " + h + "px; border-radius: " + (h / 2) + "px; padding: 0 4px; background-color: " + bg + ";";

            let row = new St.BoxLayout({ vertical: false, style: "spacing: 6px;" });
            let thumb = new St.Bin({ style: "width: " + thumbSize + "px; height: " + thumbSize + "px; border-radius: " + (thumbSize / 2) + "px; background-color: white;" });
            let text = new St.Label({ text: value ? "ON" : "OFF", style: "color: white; font-size: 12px; font-weight: bold;" });
            let textBin = new St.Bin({ x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE });
            textBin.set_child(text);

            if (value) {
                row.add(textBin, { expand: true, x_fill: true, y_align: St.Align.MIDDLE });
                row.add(thumb, { y_align: St.Align.MIDDLE });
            } else {
                row.add(thumb, { y_align: St.Align.MIDDLE });
                row.add(textBin, { expand: true, x_fill: true, y_align: St.Align.MIDDLE });
            }
            btn.set_child(row);
        };
        render();

        btn.connect("clicked", () => {
            value = !value;
            render();
            onChange(value);
        });

        return btn;
    }

    _iconLabelButtonChild(iconName, text) {
        let box = new St.BoxLayout({ vertical: false, style: "spacing: 8px;" });
        let gicon = makeWhiteIconFile(this._deskletPath, "solid", iconName);
        if (gicon) box.add(new St.Icon({ gicon: gicon, icon_size: 18 }), { y_align: St.Align.MIDDLE });
        box.add(new St.Label({ text: text, style: "color: white; font-size: 18px; font-weight: normal;" }), { y_align: St.Align.MIDDLE });
        return box;
    }

    _styleFooterButtons() {
        this._buttonLayout.style = "spacing: 14px;";
        let children = this._buttonLayout.get_children();
        for (let button of children) {
            let originalLabel = button.label;
            styleFooterButton(button);
            if (originalLabel === "Clear button") {
                button.label = "";
                button.set_child(this._iconLabelButtonChild("trash", "Clear button"));
            } else if (originalLabel === "Save") {
                button.label = "";
                button.set_child(this._iconLabelButtonChild("floppy-disk", "Save"));
            }
        }
    }

    _updateIconPreview() {
        this._iconPreview.destroy_all_children();
        let gicon = resolveIconGicon(this._deskletPath, this._slot.icon);
        if (!gicon) {
            gicon = makeWhiteIconFile(this._deskletPath, "solid", "image");
        }
        if (gicon) {
            let opacity = this._slot.icon ? 255 : 130;
            this._iconPreview.set_child(new St.Icon({ gicon: gicon, icon_size: 22, opacity: opacity }));
        }
    }
}

// Recolor a Font Awesome SVG (fill="currentColor") to white and cache it,
// so icons stay legible on any background color.
function makeWhiteIconFile(deskletPath, style, name) {
    try {
        let cacheDir = GLib.get_user_cache_dir() + "/xtream-desklet-deck/icons";
        GLib.mkdir_with_parents(cacheDir, 0o755);
        let cachedPath = cacheDir + "/" + style + "-" + name + ".svg";
        let cacheFile = Gio.File.new_for_path(cachedPath);
        if (!cacheFile.query_exists(null)) {
            let srcPath = deskletPath + "/icons/fontawesome/" + style + "/" + name + ".svg";
            let [ok, contents] = GLib.file_get_contents(srcPath);
            if (!ok) return null;
            let svg = ByteArray.toString(contents).replace(/currentColor/g, "#ffffff");
            GLib.file_set_contents(cachedPath, svg);
        }
        return Gio.icon_new_for_string(cachedPath);
    } catch (e) {
        global.logError("xtream-desklet-deck: failed to prepare icon " + style + "/" + name + ": " + e);
        return null;
    }
}

// Resolve a stored icon reference to a Gio icon. Supports three formats:
//  - "fa:<style>:<name>"  -> bundled Font Awesome icon (recolored white, cached)
//  - "/absolute/path.png" -> user-provided image file
//  - "icon-name"          -> themed system icon
function resolveIconGicon(deskletPath, iconRef) {
    if (!iconRef) return null;
    try {
        if (iconRef.startsWith("fa:")) {
            let parts = iconRef.split(":");
            return makeWhiteIconFile(deskletPath, parts[1], parts[2]);
        }
        return Gio.icon_new_for_string(iconRef);
    } catch (e) {
        return null;
    }
}

class XtreamDeckDesklet extends Desklet.Desklet {
    constructor(metadata, desklet_id) {
        super(metadata, desklet_id);
        this._metadata = metadata;
        this._statePath = GLib.get_home_dir() + "/.config/xtream-desklet-deck/instances/" + desklet_id + ".json";
        this._editMode = false;
        this._currentPage = 0;

        this._loadState();
        this._buildUI();
    }

    _loadState() {
        this._pages = [emptyPage()];
        if (!this._loadStateFrom(this._statePath)) {
            // Cinnamon assigns a new instance id (desklet_id) every time this desklet
            // is removed and re-added to the desktop, so a fresh instance normally has
            // no state file of its own yet. Recover the most recently saved state from
            // any other instance instead of starting from empty, so the user's button
            // configuration survives a remove/re-add (e.g. done to force a stylesheet
            // reload) instead of appearing to reset.
            let fallback = this._findMostRecentStateFile();
            if (fallback) {
                this._loadStateFrom(fallback);
            }
        }
        if (this._currentPage >= this._pages.length) this._currentPage = 0;
    }

    _loadStateFrom(path) {
        try {
            let [ok, contents] = GLib.file_get_contents(path);
            if (!ok) return false;
            let data = JSON.parse(ByteArray.toString(contents));
            if (!data || !Array.isArray(data.pages) || data.pages.length === 0) return false;
            this._pages = data.pages;
            if (typeof data.currentPage === "number") {
                this._currentPage = data.currentPage;
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    _findMostRecentStateFile() {
        try {
            let dirPath = GLib.path_get_dirname(this._statePath);
            let dir = Gio.File.new_for_path(dirPath);
            if (!dir.query_exists(null)) return null;
            let enumerator = dir.enumerate_children("standard::name,time::modified", Gio.FileQueryInfoFlags.NONE, null);
            let newestPath = null;
            let newestSeconds = 0;
            let info;
            while ((info = enumerator.next_file(null)) !== null) {
                let name = info.get_name();
                if (!name.endsWith(".json")) continue;
                let seconds = info.get_modification_time().tv_sec;
                if (seconds > newestSeconds) {
                    newestSeconds = seconds;
                    newestPath = dirPath + "/" + name;
                }
            }
            return newestPath;
        } catch (e) {
            global.logError("xtream-desklet-deck: failed to scan instance state files: " + e);
            return null;
        }
    }

    _saveState() {
        try {
            let dirPath = GLib.path_get_dirname(this._statePath);
            GLib.mkdir_with_parents(dirPath, 0o755);
            let data = { pages: this._pages, currentPage: this._currentPage };
            GLib.file_set_contents(this._statePath, JSON.stringify(data, null, 2));
        } catch (e) {
            global.logError("xtream-desklet-deck: failed to save state: " + e);
        }
    }

    _runCommand(command) {
        try {
            Util.spawnCommandLine(command);
        } catch (e) {
            global.logError("xtream-desklet-deck: failed to run command '" + command + "': " + e);
        }
    }

    _buildUI() {
        let root = new St.BoxLayout({ vertical: true, style_class: "xtream-deck-root", style: "background-color: rgba(20,20,20,0.85); border-radius: 10px; padding: 6px;" });

        let header = new St.BoxLayout({ vertical: false, style: "padding: 2px 4px 6px 4px;" });
        this._titleLabel = new St.Label({ text: this._metadata.name, style: "font-weight: bold; color: white; font-size: 13px;" });
        header.add(this._titleLabel, { expand: true, x_fill: true, x_align: St.Align.START, y_align: St.Align.MIDDLE });

        this._editButton = new St.Button({ style: "width: 24px; height: 24px; border-radius: 4px;" });
        header.add(this._editButton, { x_align: St.Align.END, y_align: St.Align.MIDDLE });
        this._editButton.connect("clicked", () => {
            this._editMode = !this._editMode;
            this._render();
        });

        root.add(header);

        this._gridBin = new St.Bin();
        root.add(this._gridBin);

        this._footer = new St.BoxLayout({ vertical: false, style: "padding: 6px 0 0 0;" });
        root.add(this._footer, { x_align: St.Align.MIDDLE });

        this.setContent(root);
        this._render();
    }

    _render() {
        this._renderGear();
        this._renderGrid();
        this._renderFooter();
    }

    _renderGear() {
        this._editButton.destroy_all_children();
        let gicon = makeWhiteIconFile(this._metadata.path, "solid", "gear");
        if (gicon) {
            this._editButton.set_child(new St.Icon({ gicon: gicon, icon_size: 14 }));
        } else {
            this._editButton.set_child(new St.Label({ text: "⚙", style: "color: white;" }));
        }
        this._editButton.style = this._editMode
            ? "width: 24px; height: 24px; border-radius: 4px; background-color: rgba(255,255,255,0.25);"
            : "width: 24px; height: 24px; border-radius: 4px;";
    }

    _renderGrid() {
        let grid = new St.Table({ homogeneous: false });
        let page = this._pages[this._currentPage];

        for (let i = 0; i < SLOTS_PER_PAGE; i++) {
            let row = Math.floor(i / COLUMNS);
            let col = i % COLUMNS;
            let slot = page.slots[i];
            grid.add(this._makeSlotButton(slot, i), { row: row, col: col, x_expand: false, y_expand: false });
        }

        this._gridBin.set_child(grid);
    }

    _makeSlotButton(slot, slotIndex) {
        let bgColor = slot.color || "rgba(255,255,255,0.06)";
        let hoverBgColor = slot.color || "rgba(255,255,255,0.16)";
        let borderColor = this._editMode ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.5)";
        let hoverBorderColor = "white";

        const baseStyle = () => "width: " + BUTTON_SIZE + "px; height: " + BUTTON_SIZE + "px; margin: 3px; " +
            "background-color: " + bgColor + "; border-radius: 10px; border: 2px solid " + borderColor + ";";
        const hoverStyle = () => "width: " + BUTTON_SIZE + "px; height: " + BUTTON_SIZE + "px; margin: 3px; " +
            "background-color: " + hoverBgColor + "; border-radius: 10px; border: 2px solid " + hoverBorderColor + ";";

        let button = new St.Button({ style: baseStyle() });

        // "Inchadinha": grows slightly and brightens on hover, same pattern used
        // across the gimmyclues app (.btn-secondary-purple:hover -> scale(1.04)).
        button.set_pivot_point(0.5, 0.5);
        button.connect("notify::hover", () => {
            if (button.hover) {
                button.scale_x = 1.04;
                button.scale_y = 1.04;
                button.style = hoverStyle();
            } else {
                button.scale_x = 1.0;
                button.scale_y = 1.0;
                button.style = baseStyle();
            }
        });

        let box = new St.BoxLayout({ vertical: true, x_align: St.Align.MIDDLE });

        if (this._editMode && !slot.icon) {
            let pencilGicon = makeWhiteIconFile(this._metadata.path, "solid", "pen-to-square");
            if (pencilGicon) {
                box.add(new St.Icon({ gicon: pencilGicon, icon_size: ICON_SIZE, opacity: 210 }), { x_fill: false, x_align: St.Align.MIDDLE });
            }
        } else if (this._editMode) {
            let gicon = resolveIconGicon(this._metadata.path, slot.icon);
            if (gicon) {
                box.add(new St.Icon({ gicon: gicon, icon_size: ICON_SIZE }), { x_fill: false, x_align: St.Align.MIDDLE });
            }
        } else {
            let gicon = resolveIconGicon(this._metadata.path, slot.icon);
            if (gicon) {
                box.add(new St.Icon({ gicon: gicon, icon_size: ICON_SIZE }), { x_fill: false, x_align: St.Align.MIDDLE });
            }
            if (slot.label && slot.showTitle !== false) {
                box.add(new St.Label({ text: slot.label, style: "font-size: 9px; color: white; text-align: center;" }), { x_fill: false, x_align: St.Align.MIDDLE });
            }
        }
        button.set_child(box);

        button.connect("clicked", () => {
            if (this._editMode) {
                this._openEditor(slotIndex);
            } else if (slot.command) {
                this._runCommand(slot.command);
            }
        });

        return button;
    }

    _openEditor(slotIndex) {
        let page = this._pages[this._currentPage];
        let slot = page.slots[slotIndex];

        let dialog = new ButtonEditorDialog(
            this._metadata.path,
            slot,
            (updatedSlot) => {
                page.slots[slotIndex] = updatedSlot;
                this._saveState();
                this._editMode = false;
                this._render();
            },
            () => {
                page.slots[slotIndex] = emptySlot();
                this._saveState();
                this._editMode = false;
                this._render();
            }
        );
        dialog.open();
    }

    _renderFooter() {
        this._footer.destroy_all_children();

        for (let p = 0; p < this._pages.length; p++) {
            let isCurrent = p === this._currentPage;
            let dot = new St.Button({
                style: "width: 22px; height: 22px; margin: 2px; border-radius: 11px; " +
                       (isCurrent ? "background-color: rgba(255,255,255,0.9);" : "background-color: rgba(255,255,255,0.2);"),
                label: String(p + 1)
            });
            dot.connect("clicked", () => {
                this._currentPage = p;
                this._saveState();
                this._render();
            });
            if (p >= 1) {
                dot.connect("button-release-event", (actor, event) => {
                    if (event.get_button() === 3) {
                        this._confirmRemovePage(p);
                    }
                    return false;
                });
            }
            this._footer.add(dot);
        }

        if (this._editMode && this._pages.length < MAX_PAGES) {
            let addBtn = new St.Button({ style: "width: 22px; height: 22px; margin: 2px; border-radius: 11px; background-color: rgba(255,255,255,0.2);", label: "+" });
            addBtn.connect("clicked", () => {
                this._pages.push(emptyPage());
                this._currentPage = this._pages.length - 1;
                this._saveState();
                this._render();
            });
            this._footer.add(addBtn);
        }
    }

    _confirmRemovePage(pageIndex) {
        let dialog = new ConfirmDialog(
            this._metadata.path,
            "Remove page " + (pageIndex + 1) + "?",
            "This will permanently delete all buttons configured on this page. This cannot be undone.",
            "Remove Page",
            () => this._removePage(pageIndex)
        );
        dialog.open();
    }

    _removePage(pageIndex) {
        if (pageIndex === 0 || this._pages.length <= 1) return;
        this._pages.splice(pageIndex, 1);
        if (this._currentPage >= this._pages.length) {
            this._currentPage = this._pages.length - 1;
        } else if (this._currentPage > pageIndex) {
            this._currentPage -= 1;
        }
        this._saveState();
        this._render();
    }
}

function main(metadata, desklet_id) {
    return new XtreamDeckDesklet(metadata, desklet_id);
}
