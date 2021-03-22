import { LANCER } from "../config";
import { LancerActorSheet } from "./lancer-actor-sheet";
import { EntryType, funcs, MechWeapon, MountType, OpCtx, RegRef, SystemMount, WeaponMount, WeaponSlot } from "machine-mind";
import { MMEntityContext, mm_wrap_item } from "../mm-util/helpers";
import { ResolvedNativeDrop } from "../helpers/dragdrop";
import { gentle_merge, resolve_dotpath } from "../helpers/commons";
import { OVERCHARGE_SEQUENCE } from "../helpers/actor";

/**
 * Extend the basic ActorSheet
 */
export class LancerMechSheet extends LancerActorSheet<EntryType.MECH> {
  /**
   * Extend and override the default options used by the NPC Sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["lancer", "sheet", "actor", "npc"],
      template: "systems/lancer/templates/actor/mech.html",
      width: 800,
      height: 800,
    });
  }

  /* -------------------------------------------- */

  /**
   * @override
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTMLElement}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html: any) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    this._activateOverchargeControls(html);
    this._activateLoadoutControls(html);
    this._activateMountContextMenus(html);
  }

  /* -------------------------------------------- */

  // Baseline drop behavior. Let people add stuff to the mech
  async _onDrop(event: any): Promise<any> {
    let drop: ResolvedNativeDrop | null = await super._onDrop(event);
    if (drop?.type != "Item") {
      return null; // Bail. 
    }

    // Prep data
    let item = drop.entity;
    const sheet_data = await this.getDataLazy();
    const this_mm = sheet_data.mm;

    // Check if we can even do anything with it first
    if (!LANCER.mech_items.includes(item.type)) {
      ui.notifications.error(`Cannot add Item of type "${item.type}" to a Mech.`);
      return null;
    }

    // Make the context for the item
    const item_mm: MMEntityContext<EntryType> = await mm_wrap_item(item);

    // Always add the item to the mech, now that we know it is a valid mech posession
    // Make a new ctx to hold the item and a post-item-add copy of our mech
    let new_ctx = new OpCtx();
    let new_live_item = await item_mm.ent.insinuate(this_mm.reg, new_ctx);

    // Update this, to re-populate arrays etc to reflect new item
    let new_live_this = (await this_mm.ent.refreshed(new_ctx))!;

    // Now, do sensible things with it
    if (new_live_item.Type === EntryType.FRAME) {
      // If frame, auto swap with prior frame
      new_live_this.Loadout.Frame = new_live_item;

      // Reset mounts
      await new_live_this.Loadout.reset_weapon_mounts();
    } else if (new_live_item.Type === EntryType.MECH_WEAPON) {
      // If frame, weapon, put it in an available slot
      new_live_this.Loadout.equip_weapon(new_live_item);
    } else if (new_live_item.Type === EntryType.MECH_SYSTEM) {
      new_live_this.Loadout.equip_system(new_live_item);
    }
    // Most other things (weapon mods) aren't directly equipped to the mech and should be handled in their own sheet / their own subcomponents. We've already taken posession, and do nothing more

    // Writeback when done. Even if nothing explicitly changed, probably good to trigger a redraw (unless this is double-tapping? idk)
    await new_live_this.writeback();

    // Always return the item if we haven't failed for some reason
    return item;
  }  
  
  /**
   * Handles actions in the overcharge panel 
   */
  _activateOverchargeControls(html: any) {
    let button = html.find(".overcharge-button");

    // Left click behavior handled by macro functionality

    // Decrement on right click
    button.on("contextmenu", async (evt: JQuery.ClickEvent) => {
      evt.preventDefault();
      this._event_handler("overcharge-rollback", evt);
    });
  }

  /**
   * Handles more niche controls in the loadout in the overcharge panel 
   */
  _activateLoadoutControls(html: any) {
    html.find(".reset-weapon-mount-button").on("click", async (evt: JQuery.ClickEvent) => {
      this._event_handler("reset-wep", evt);
    });

    html.find(".reset-ll-weapon-mounts-button").on("click", async (evt: JQuery.ClickEvent) => {
      this._event_handler("reset-all-weapon-mounts", evt);
    });

    html.find(".reset-system-mount-button").on("click", async (evt: JQuery.ClickEvent) => {
      this._event_handler("reset-sys", evt);
    });

  }

  // Allows user to change mount size via right click ctx
  _activateMountContextMenus(html: any) {
    let mount_options: any[] = [];
    for(let mount_type of Object.values(MountType)) {
      mount_options.push({
        name: mount_type,
        icon: '',
        // condition: game.user.isGM,
        callback: async (html: JQuery) => {
          let cd = await this.getDataLazy();
          let mount_path = html[0].dataset.path ?? "";

          // Get the current mount
          let mount: WeaponMount = resolve_dotpath(cd, mount_path);
          if(!mount) {
            console.error("Bad mountpath:", mount_path);
          }

          // Edit it. 
          let old_weapons = mount.Slots.map(s => s.Weapon).filter(w => w) as MechWeapon[];

          // Sort biggest to smallest
          old_weapons.sort((a, b) => funcs.weapon_size_magnitude(b.Size) - funcs.weapon_size_magnitude(a.Size));

          // Change the weapon mount and clear it
          mount.MountType = mount_type;
          mount.reset();

          // Try re-adding all weapons, biggest to smallest
          for(let wep of old_weapons) {
            mount.try_add_weapon(wep);
          }

          // Write back
          await this._commitCurrMM();
        }
      });
    }

    new ContextMenu(html, ".mount-type-ctx-root", mount_options);
  }



  // Save ourselves repeat work by handling most events clicks actual operations here
  async _event_handler(mode: "reset-wep" | "reset-all-weapon-mounts" | "reset-sys" | "overcharge" | "overcharge-rollback", evt: JQuery.ClickEvent) {
    evt.stopPropagation();
    let data = await this.getDataLazy();
    let ent = data.mm.ent;
    let path = evt.currentTarget?.dataset?.path;

    switch(mode) {
      case "reset-all-weapon-mounts":
        await ent.Loadout.reset_weapon_mounts();
        break;
      case "reset-sys":
        if(!path) return;
        let sys_mount = resolve_dotpath(data, path) as SystemMount;
        sys_mount.System = null;
        break;
      case "reset-wep":
        if(!path) return;
        let wep_mount = resolve_dotpath(data, path) as WeaponMount;
        wep_mount?.reset();
        break;
      case "overcharge-rollback":
        ent.CurrentOvercharge = funcs.bound_int(ent.CurrentOvercharge - 1, 0, OVERCHARGE_SEQUENCE.length - 1);
        break;
      default:
        return; // no-op
    }

    await this._commitCurrMM();
  };
}
