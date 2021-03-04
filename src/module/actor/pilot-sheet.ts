import {
  LancerMechWeapon,
  LancerPilotWeapon,
} from "../item/lancer-item";
import { LANCER } from "../config";
import { LancerActorSheet } from "./lancer-actor-sheet";
import { EntryType, MountType, OpCtx } from "machine-mind";
import { FlagData, FoundryReg } from "../mm-util/foundry-reg";
import { MMEntityContext, mm_wrap_item } from "../mm-util/helpers";
import { funcs } from "machine-mind";
import { ResolvedNativeDrop } from "../helpers/dragdrop";
import { prepareFrameMacro } from "../macros";

const lp = LANCER.log_prefix;

// TODO: should probably move to HTML/CSS
const entryPrompt = "//:AWAIT_ENTRY>";

/**
 * Extend the basic ActorSheet
 */
export class LancerPilotSheet extends LancerActorSheet<EntryType.PILOT> {
  /**
   * Extend and override the default options used by the Pilot Sheet
   * @returns {Object}
   */
  static get defaultOptions(): object {
    return mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor", "pilot"],
      template: "systems/lancer/templates/actor/pilot.html",
      width: 800,
      height: 800,
      tabs: [
        {
          navSelector: ".lancer-tabs",
          contentSelector: ".sheet-body",
          initial: "pilot",
        },
      ],
    });
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {JQuery}   The prepared HTML object ready to be rendered into the DOM
   */
  async activateListeners(html: JQuery) {
    super.activateListeners(html);

    if (this.actor.owner) {
      // Need to know ourself to activate some macros
      let data = this._currData!; // We actually know this must be valid right now

      // Talent rollers
      let talentMacro = html.find(".talent-macro");
      talentMacro.on("click", (ev) => {
        if (!ev.currentTarget) return; // No target, let other handlers take care of it.
        ev.stopPropagation(); // Avoids triggering parent event handlers

        const el = $(ev.currentTarget).closest(".item")[0] as HTMLElement;

        game.lancer.prepareItemMacro(this.actor._id, el.getAttribute("data-item-id")!, {
          rank: (<HTMLDataElement>ev.currentTarget).getAttribute("data-rank"),
        });
      });

      // Core active & passive text rollers
      let CAMacro = html.find(".core-active-macro");
      CAMacro.on("click", (ev: any) => {
        ev.stopPropagation(); // Avoids triggering parent event handlers
        prepareFrameMacro({
          type: "frame",
          subtype: "active",
          actor: data.mm.ent.as_ref(),
          name: "Core Active"
        });
      });

      let CPMacro = html.find(".core-passive-macro");
      CPMacro.on("click", (ev: any) => {
        ev.stopPropagation(); // Avoids triggering parent event handlers
        prepareFrameMacro({
          type: "frame",
          subtype: "passive",
          actor: data.mm.ent.as_ref(),
          name: "Core Passive"
        });
      });
    }

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    if (this.actor.owner) {
      // Item/Macroable Dragging
      const statMacroHandler = (e: DragEvent) => this._onDragMacroableStart(e);
      const talentMacroHandler = (e: DragEvent) => this._onDragTalentMacroableStart(e);
      const textMacroHandler = (e: DragEvent) => this._onDragTextMacroableStart(e);
      const CAMacroHandler = (e: DragEvent) => this._onDragCoreActiveStart(e);
      const CPMacroHandler = (e: DragEvent) => this._onDragCorePassiveStart(e);
      html
        .find('li[class*="item"]')
        .add('span[class*="item"]')
        .add('[class*="macroable"]')
        .each((i: number, item: any) => {
          if (item.classList.contains("inventory-header")) return;
          if (item.classList.contains("stat-macro"))
            item.addEventListener("dragstart", statMacroHandler, false);
          if (item.classList.contains("talent-macro"))
            item.addEventListener("dragstart", talentMacroHandler, false);
          if (item.classList.contains("text-macro"))
            item.addEventListener("dragstart", textMacroHandler, false);
          if (item.classList.contains("core-active-macro"))
            item.addEventListener("dragstart", CAMacroHandler, false);
          if (item.classList.contains("core-passive-macro"))
            item.addEventListener("dragstart", CPMacroHandler, false);
          if (item.classList.contains("item"))
            item.addEventListener("dragstart", (ev: any) => this._onDragStart(ev), false);
          item.setAttribute("draggable", true);
        });

      // Cloud download
      let download = html.find('.cloud-control[data-action*="download"]');
      download.on("click", async (ev) => {
        ev.stopPropagation();
        // Get the data
        try {
          ui.notifications.info("Importing character...");
          let self = await this.getDataLazy();
          let raw_pilot_data = await funcs.gist_io.download_pilot(self.mm.ent.CloudID);

          // Pull the trigger
          let pseudo_compendium = new FoundryReg({ // We look for missing items here
            item_source: ["compendium", null],
            actor_source: "world"
          });
          let synced_data = await funcs.cloud_sync(raw_pilot_data, self.mm.ent, [pseudo_compendium]);
          if(!synced_data) {
            throw new Error("Pilot was somehow destroyed by the sync");
          }

          // Back-populate names and images
          await this.actor.update({
            name: synced_data.pilot.Name || this.actor.name,
            img: synced_data.pilot.CloudPortrait || this.actor.img,
          });

          for(let mech of synced_data.pilot_mechs) {
            let mech_actor = (mech.flags as FlagData<EntryType.MECH>).orig_entity;
            await mech_actor.update({
              name: mech.Name || mech_actor.name,
              img: mech.CloudPortrait || mech_actor.img
            }, {});
            mech_actor.render();
          }

          // Reset curr data and render all
          this._currData = null;
          this.actor.render();
          ui.notifications.info("Successfully loaded pilot state from cloud");
        } catch (e) {
          console.warn(e);
          ui.notifications.warn(
            "Failed to update pilot, likely due to missing LCP data: " + e.message
          );
        }
      });
    }
  }

  _onDragMacroableStart(event: DragEvent) {
    // For roll-stat macros
    event.stopPropagation(); // Avoids triggering parent event handlers
    // It's an input so it'll always be an InputElement, right?
    let path = this.getStatPath(event);
    if (!path) return ui.notifications.error("Error finding stat for macro.");

    let tSplit = path.split(".");
    let data = {
      title: tSplit[tSplit.length - 1].toUpperCase(),
      dataPath: path,
      type: "actor",
      actorId: this.actor._id,
    };
    event.dataTransfer?.setData("text/plain", JSON.stringify(data));
  }

  _onDragTalentMacroableStart(event: DragEvent) {
    // For talent macros
    event.stopPropagation(); // Avoids triggering parent event handlers

    let target = <HTMLElement>event.currentTarget;

    let data = {
      itemId: target.closest(".item")?.getAttribute("data-item-id"),
      actorId: this.actor._id,
      type: "Item",
      title: target.nextElementSibling?.textContent,
      rank: target.getAttribute("data-rank"),
      data: {
        type: EntryType.TALENT,
      },
    };

    event.dataTransfer?.setData("text/plain", JSON.stringify(data));
  }

  // Baseline drop behavior. Let people add stuff to the pilot
  async _onDrop(event: any): Promise<any> {
    let drop: ResolvedNativeDrop | null = await super._onDrop(event);
    if (drop?.type != "Item") {
      return null; // Bail. 
    }

    const sheet_data = await this.getDataLazy();
    const this_mm = sheet_data.mm;
    const item = drop.entity;

    // Check if we can even do anything with it first
    if (!LANCER.pilot_items.includes(item.type)) {
      ui.notifications.error(`Cannot add Item of type "${item.type}" to a Pilot.`);
      return null;
    }

    // Make the context for the item
    const item_mm: MMEntityContext<EntryType> = await mm_wrap_item(item);

    // Always add the item to the pilot inventory, now that we know it is a valid pilot posession
    // Make a new ctx to hold the item and a post-item-add copy of our mech
    let new_ctx = new OpCtx();
    let new_live_item = await item_mm.ent.insinuate(this_mm.reg, new_ctx);

    // Update this, to re-populate arrays etc to reflect new item
    let new_live_this = (await this_mm.ent.refreshed(new_ctx))!;

    // Now, do sensible things with it
    let loadout = new_live_this.Loadout;
    if (new_live_item.Type === EntryType.PILOT_WEAPON) {
      // If weapon, try to equip to first empty slot
      for(let i = 0; i < loadout.Weapons.length; i++) {
        if(!loadout.Weapons[i]) {
          loadout.Weapons[i] = new_live_item;
          break;
        }
      }
    } else if (new_live_item.Type === EntryType.PILOT_GEAR) {
      // If gear, try to equip to first empty slot
      for(let i = 0; i < loadout.Gear.length; i++) {
        if(!loadout.Gear[i]) {
          loadout.Gear[i] = new_live_item;
          break;
        }
      }
    } else if (new_live_item.Type === EntryType.PILOT_ARMOR) {
      // If armor, try to equip to first empty slot
      for(let i = 0; i < loadout.Armor.length; i++) {
        if(!loadout.Gear[i]) {
          loadout.Armor[i] = new_live_item;
          break;
        }
      }
    } else if (new_live_item.Type === EntryType.SKILL || new_live_item.Type == EntryType.TALENT) {
      // If skill or talent, reset to level 1
      new_live_item.CurrentRank = 1;
      await new_live_item.writeback(); // Since we're editing the item, we gotta do this
    } 

    // Most other things we really don't need to do anything with

    // Writeback when done. Even if nothing explicitly changed, probably good to trigger a redraw (unless this is double-tapping? idk)
    await new_live_this.writeback();
  

    // Always return the item if we haven't failed for some reason
    return item;
  }

  /**
   * For macros which simple expect a title & description, no fancy handling.
   * Assumes data-path-title & data-path-description defined
   * @param event   The associated DragEvent
   */
  _onDragTextMacroableStart(event: DragEvent) {
    event.stopPropagation(); // Avoids triggering parent event handlers

    let target = <HTMLElement>event.currentTarget;

    let data = {
      title: target.getAttribute("data-path-title"),
      description: target.getAttribute("data-path-description"),
      actorId: this.actor._id,
      type: "Text",
    };

    event.dataTransfer?.setData("text/plain", JSON.stringify(data));
  }

  /**
   * For dragging the core active to the hotbar
   * @param event   The associated DragEvent
   */
  _onDragCoreActiveStart(event: DragEvent) {
    event.stopPropagation(); // Avoids triggering parent event handlers

    // let target = <HTMLElement>event.currentTarget;

    let data = {
      actorId: this.actor._id,
      // Title will simply be CORE ACTIVE since we want to keep the macro dynamic
      title: "CORE ACTIVE",
      type: "Core-Active",
    };

    event.dataTransfer?.setData("text/plain", JSON.stringify(data));
  }

  /**
   * For dragging the core passive to the hotbar
   * @param event   The associated DragEvent
   */
  _onDragCorePassiveStart(event: DragEvent) {
    event.stopPropagation(); // Avoids triggering parent event handlers

    // let target = <HTMLElement>event.currentTarget;

    let data = {
      actorId: this.actor._id,
      // Title will simply be CORE PASSIVE since we want to keep the macro dynamic
      title: "CORE PASSIVE",
      type: "Core-Passive",
    };

    event.dataTransfer?.setData("text/plain", JSON.stringify(data));
  }
  /* -------------------------------------------- */

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  async _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    // Only unique behavior we've got here is we want to set the token name using the callsign
    formData["actor.token.name"] = formData["data.callsign"];
    return super._updateObject(event, formData);
  }
}

