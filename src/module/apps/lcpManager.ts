import { LANCER } from "../config";
const lp = LANCER.log_prefix;
import { import_cp, clear_all } from "../compBuilder";
import * as mm from "machine-mind";
import { IContentPack, IContentPackManifest } from "machine-mind";

function addLCPManager(app: Application, html: any) {
  if (app.options.id == "compendium") {
    const buttons = $(html).find(".header-actions");
    if (!buttons) {
      ui.notifications.error(
        "Unable to add LCP Manager button - Compendium Tab buttons not found!",
        {
          permanent: true,
        }
      );
      return;
    }
    const button = document.createElement("button");
    button.setAttribute("style", "flex-basis: 100%;margin-top: 5px;");
    button.innerHTML = "<i class='cci cci-content-manager i--s'></i> LANCER Compendium Manager";
    buttons.append(button);
    button.addEventListener("click", () => {
      new LCPManager().render(true);
    });
  }
}

class LCPIndex {
  index: IContentPackManifest[];

  constructor(index: IContentPackManifest[] | null) {
    if (index) {
      this.index = index;
    } else {
      this.index = [];
    }
  }

  addManifest(manifest: IContentPackManifest) {
    this.index.push(manifest);
  }

  updateManifest(manifest: IContentPackManifest) {
    let existing: boolean = false;
    for (let i = 0; i < this.index.length; i++) {
      const m = this.index[i];
      // if (Array.isArray(m) && m.length === 0) {
      //   this.index.splice(i, 1);
      // }
      if (m.name === manifest.name && m.author === manifest.author) {
        existing = true;
        this.index.splice(i, 1);
        break;
      }
    }
    this.addManifest(manifest);
  }
}

class LCPManager extends Application {
  lcpFile: File | null;
  cp: IContentPack | null;
  manifest: any;
  coreVersion: string;
  coreUpdate: string | null;
  lcpIndex: LCPIndex;

  constructor(...args: any[]) {
    super(...args);
    this.lcpFile = null;
    this.cp = null;
    this.manifest = null;
    this.coreVersion = game.settings.get(LANCER.sys_name, LANCER.setting_core_data);
    // TODO: pull available core version from machine-mind
    this.coreUpdate = "2.0.35";
    this.lcpIndex = new LCPIndex(game.settings.get(LANCER.sys_name, LANCER.setting_lcps).index);
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/lancer/templates/lcp/lcp-manager.html",
      title: "LANCER Compendium Manager",
      width: 800,
      height: 800,
    });
  }

  getData() {
    let data = super.getData();
    data.core_version = this.coreVersion;
    data.core_update = this.coreUpdate;
    data.manifest = this.manifest;
    data.lcps = this.lcpIndex;
    return data;
  }

  updateLcpIndex(manifest: IContentPackManifest) {
    if (!this.lcpIndex)
      this.lcpIndex = new LCPIndex(game.settings.get(LANCER.sys_name, LANCER.setting_lcps).index);
    else this.lcpIndex.updateManifest(manifest);
    game.settings
      .set(LANCER.sys_name, LANCER.setting_lcps, this.lcpIndex)
      .then(() => this.render());
  }

  async clearCompendiums() {
    ui.notifications.info(`Clearing all LANCER Compendium data. Please wait.`);
    await game.settings.set(LANCER.sys_name, LANCER.setting_core_data, "0.0.0");
    await game.settings.set(LANCER.sys_name, LANCER.setting_lcps, new LCPIndex(null));
    await clear_all();
    ui.notifications.info(`LANCER Compendiums cleared.`);
    this.coreVersion = game.settings.get(LANCER.sys_name, LANCER.setting_core_data);
    this.lcpIndex = new LCPIndex(game.settings.get(LANCER.sys_name, LANCER.setting_lcps).index);
    this.render(true);
  }

  activateListeners(html: HTMLElement | JQuery) {
    super.activateListeners(html);
    document.getElementsByClassName("lcp-core-update")[0].addEventListener("click", (ev: Event) => {
      this._onCoreUpdateButtonClick(<MouseEvent>ev).then();
    });
    let fileInput = document.getElementById("lcp-file");
    if (fileInput) {
      fileInput.onchange = (ev: Event) => {
        this._onLcpPicked(ev);
      };
    }
    document.getElementsByClassName("lcp-import")[0].addEventListener("click", () => {
      this._onImportButtonClick().then();
    });
    document.getElementsByClassName("lcp-clear-all")[0].addEventListener("click", (ev: Event) => {
      this._onClearAllButtonClick(<MouseEvent>ev);
    });
  }

  async _onCoreUpdateButtonClick(ev: MouseEvent) {
    if (!game.user.isGM) return ui.notifications.warn(`Only GM can modify the Compendiums.`);
    if (!ev.currentTarget || !this.coreUpdate) return;
    ui.notifications.info(`Updating Lancer Core data to v${this.coreUpdate}. Please wait.`);

    await import_cp(mm.funcs.get_base_content_pack(), (x, y) => this.update_progress_bar(x, y));

    ui.notifications.info(`Lancer Core data update complete.`);
    await game.settings.set(LANCER.sys_name, LANCER.setting_core_data, this.coreUpdate);
    this.coreVersion = this.coreUpdate;
    this.render();
  }

  _onClearAllButtonClick(ev: MouseEvent) {
    if (!game.user.isGM) return ui.notifications.warn(`Only GM can modify the Compendiums.`);
    if (!ev.currentTarget) return;
    new Dialog({
      title: "Confirm Clearing LANCER Compendiums",
      content: `Are you sure you want to delete ALL data from the Compendiums created by the LCP Manager?`,
      buttons: {
        confirm: {
          label: "Confirm",
          callback: async () => {
            await this.clearCompendiums();
          },
        },
        cancel: {
          label: "Cancel",
        },
      },
      default: "Cancel",
    }).render(true);
  }

  _onLcpPicked(ev: Event) {
    let files = (ev.target as HTMLInputElement).files;
    if (files) this.lcpFile = files[0];
    if (!this.lcpFile) return;

    const fr = new FileReader();
    fr.readAsBinaryString(this.lcpFile);
    fr.addEventListener("load", (ev: ProgressEvent) => {
      this._onLcpParsed((ev.target as FileReader).result as string).then();
    });
  }

  async _onLcpParsed(fileData: string | null) {
    if (!fileData) return;
    this.cp = await mm.funcs.parseContentPack(fileData);
    this.manifest = {
      ...this.cp.manifest,
      item_prefix: "",
      skills: this.cp.data.skills?.length ?? 0,
      talents: this.cp.data.talents.length ?? 0,
      gear: this.cp.data.pilotGear.length ?? 0,
      frames: this.cp.data.frames.length,
      systems: this.cp.data.systems.length,
      weapons: this.cp.data.weapons.length,
      // mods: this.cp.WeaponMods.length,
      npc_classes: this.cp.data.npcClasses.length,
      npc_templates: this.cp.data.npcTemplates.length,
      npc_features: this.cp.data.npcFeatures.length,
    };
    this.render();
  }

  async _onImportButtonClick() {
    if (!game.user.isGM) {
      ui.notifications.warn(`Only GM can modify the Compendiums.`);
      return;
    }
    if (!this.lcpFile) {
      ui.notifications.error(`Import error: no file selected.`);
      return;
    }

    const cp = this.cp;
    const manifest = this.manifest;
    if (!cp || !manifest) return;

    ui.notifications.info(
      `Starting import of ${cp.manifest.name} v${cp.manifest.version}. Please wait.`
    );
    await import_cp(cp, (x, y) => this.update_progress_bar(x, y));
    ui.notifications.info(`Import of ${cp.manifest.name} v${cp.manifest.version} complete.`);

    this.updateLcpIndex(manifest);
  }

  update_progress_bar(done: number, out_of: number) {
    $(this.element).find(".lcp-progress").prop("value", done);
    $(this.element).find(".lcp-progress").prop("max", out_of);
  }
}

export { LCPManager, addLCPManager, LCPIndex };
