import { LancerActorSheetData } from "../interfaces";
import { LANCER } from "../config";
import { LancerActorSheet } from "./lancer-actor-sheet";
import { EntryType, funcs, NpcClass, OpCtx } from "machine-mind";
import { ResolvedNativeDrop } from "../helpers/dragdrop";
import { MMEntityContext, mm_wrap_item } from "../mm-util/helpers";
const lp = LANCER.log_prefix;

/**
 * Extend the basic ActorSheet
 */
export class LancerNPCSheet extends LancerActorSheet<EntryType.NPC> {
  /**
   * Extend and override the default options used by the NPC Sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor", "npc"],
      template: "systems/lancer/templates/actor/npc.html",
      width: 800,
      height: 800,
      tabs: [
        {
          navSelector: ".lancer-tabs",
          contentSelector: ".sheet-body",
          initial: "mech",
        },
      ],
    });
  }

  // Just bound some values
  async _updateObject(event: Event | JQuery.Event, formData: any): Promise<any> {
    formData["mm.ent.Tier"] = funcs.bound_int(formData["mm.ent.Tier"], 1, 3); // Tier is 1-3

  }

  // Want to explicitly have npc class, for convenience
  async getData(): Promise<LancerActorSheetData<EntryType.NPC> & {class: NpcClass | null}> {
    let pre = await super.getData();
    let class_: NpcClass | null = null;
    if(pre.mm.ent.Classes.length) {
      class_ =  pre.mm.ent.Classes[0];
    } 
    return {
      class: class_,
      ...pre
    }
  }

  /* -------------------------------------------- */

  async _onDrop(event: any): Promise<any> {
    let drop: ResolvedNativeDrop | null = await super._onDrop(event);
    if (drop?.type != "Item") {
      return null; // Bail. 
    }

    const sheet_data = await this.getDataLazy();
    const this_mm = sheet_data.mm;
    const item = drop.entity;

    if (!LANCER.npc_items.includes(item.type)) {
      ui.notifications.error(`Cannot add Item of type "${item.type}" to an NPC.`);
      return null;
    }

    // Make the context for the item
    const item_mm: MMEntityContext<EntryType> = await mm_wrap_item(item);

    // Always add the item to the pilot inventory, now that we know it is a valid pilot posession
    // Make a new ctx to hold the item and a post-item-add copy of our mech
    let new_ctx = new OpCtx();
    let new_live_item = await item_mm.ent.insinuate(this_mm.reg, new_ctx);

    // Go ahead and bring in base features from templates
    if(new_live_item.Type == EntryType.NPC_TEMPLATE) {
      for(let b of new_live_item.BaseFeatures) {
        await b.insinuate(this_mm.reg, new_ctx);
      }
    }
    if(new_live_item.Type == EntryType.NPC_CLASS && !this_mm.ent.ActiveClass) { // Only bring in everything if we don't already have a class
      for(let b of new_live_item.BaseFeatures) {
        await b.insinuate(this_mm.reg, new_ctx);
      }
    }

    // Update this, to re-populate arrays etc to reflect new item
    let new_live_this = (await this_mm.ent.refreshed(new_ctx))!;

    // Fill our hp, stress, and structure to match new maxes
    new_live_this.CurrentHP = new_live_this.MaxHP;
    new_live_this.CurrentStress = new_live_this.MaxStress;
    new_live_this.CurrentStructure = new_live_this.MaxStructure;
    await new_live_this.writeback();
  }
}