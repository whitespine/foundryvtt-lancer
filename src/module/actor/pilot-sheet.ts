import { LANCER } from "../config";
import { LancerActorSheet } from "./lancer-actor-sheet";
import { EntryType, OpCtx } from "machine-mind";
import { FoundryFlagData , FoundryReg } from "../mm-util/foundry-reg";
import { MMEntityContext, mm_wrap_item } from "../mm-util/helpers";
import { funcs } from "machine-mind";
import { ResolvedNativeDrop } from "../helpers/dragdrop";

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

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    if (this.actor.owner) {
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
            let mech_actor = (mech.Flags as FoundryFlagData<EntryType.MECH>).orig_doc;
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

