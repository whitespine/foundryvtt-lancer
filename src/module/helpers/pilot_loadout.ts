import { EntryType, PilotArmor, PilotGear, PilotWeapon, Talent, TalentRank } from "machine-mind";
import { limited_max } from "machine-mind/dist/classes/mech/EquipUtil";
import { AnyMMActor } from "../actor/lancer-actor";
import { TypeIcon } from "../config";
import { WeaponMacroCtx, macro_elt_params, ItemMacroCtx, TalentMacroCtx } from "../macros";
import {
  HelperData,
  resolve_helper_dotpath,
  resolve_dotpath,
  inc_if,
  ext_helper_hash,
  DOMTag,
} from "./commons";
import { show_range_array, show_damage_array, uses_control } from "./item";
import { ref_commons } from "./refs";
import { compact_tag_list } from "./tags";

// Helper for showing a piece of armor, or a slot to hold it (if path is provided)
export function pilot_armor_slot(armor_path: string, helper: HelperData): string {
  // Fetch the item
  let armor_: PilotArmor | null = resolve_helper_dotpath(helper, armor_path);

  // Generate commons
  let cd = ref_commons(armor_);

  // Create outer card - used regardless of if filled yet
  let card = new DOMTag("div").ref({
    allow_type: EntryType.PILOT_ARMOR,
    ref: cd?.ref,
    path: armor_path,
    allow_drop: true
  }).with_class("card");


  if (!cd) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return card.with_class("flexrow").render(`<img class="ref-icon" src="${TypeIcon(EntryType.PILOT_ARMOR)}"></img>
                                              <span class="major">Equip armor</span>`);
  }

  let armor = armor_!;

  // Need to look in bonuses to find what we need
  let armor_val = armor.Bonuses.find(b => b.ID == "pilot_armor")?.Value ?? "0";
  let speed_val = armor.Bonuses.find(b => b.ID == "pilot_speed")?.Value ?? "0";
  let edef_val = armor.Bonuses.find(b => b.ID == "pilot_edef")?.Value ?? "0";
  let eva_val = armor.Bonuses.find(b => b.ID == "pilot_evasion")?.Value ?? "0";
  let hp_val = armor.Bonuses.find(b => b.ID == "pilot_hp")?.Value ?? "0";

  return card.with_class("clipped").render(`
            <div class="lancer-header">
              <i class="mdi mdi-shield-outline i--m i--light"> </i>
              <span class="minor">${armor!.Name}</span>
              <a class="gen-control fas fa-trash" data-action="null" data-path="${armor_path}"></a>
            </div>
            <div class="flexrow" style="align-items: center; padding: 5px">
              <div class="compact-stat">
                <i class="mdi mdi-shield-outline i--s i--dark"></i>
                <span class="minor">${armor_val}</span>
              </div>
              <div class="compact-stat">
                <i class="mdi mdi-heart i--s i--dark"></i>
                <span class="minor">+${hp_val}</span>
              </div>
              <div class="compact-stat">
                <i class="cci cci-edef i--s i--dark"></i>
                <span class="minor">${edef_val}</span>
              </div>
              <div class="compact-stat">
                <i class="cci cci-evasion i--s i--dark"></i>
                <span class="minor">${eva_val}</span>
              </div>
              <div class="compact-stat">
                <i class="mdi mdi-arrow-right-bold-hexagon-outline i--s i--dark"></i>
                <span class="minor">${speed_val}</span>
              </div>
            </div>
            <div class="desc-text" style=" padding: 5px">
              ${armor.Description}
            </div>
            ${compact_tag_list(armor_path + ".Tags", helper)}`);
}

/** Helper for showing a pilot weapon, or a slot to hold it (if path is provided)
 * If "macro-actor" is provided, that actor mmec will be used to show a macro
 */
export function pilot_weapon_refview(weapon_path: string, helper: HelperData): string {
  // Fetch the item
  let weapon_: PilotWeapon | null = resolve_helper_dotpath(helper, weapon_path);

  // Generate commons
  let cd = ref_commons(weapon_);

  // Create outer card - used regardless of if filled yet
  let card = new DOMTag("div").ref({
    allow_type: EntryType.PILOT_WEAPON,
    ref: cd?.ref,
    path: weapon_path,
    allow_drop: true,
    draggable: true
  }).with_class("card");


  if (!cd) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return card.with_class("flexrow").render(`<img class="ref-icon" src="${TypeIcon(EntryType.PILOT_WEAPON)}"></img> 
                                              <span class="major">Equip weapon</span>`);
  }

  let weapon = weapon_!;

  // Make a macro, maybe
  let macro = "";
  if (helper.hash["macro-actor"]) {
    let macro_ctx: WeaponMacroCtx = {
      name: weapon.Name,
      type: "weapon",
      item: weapon.as_ref(),
      actor: (helper.hash["macro-actor"] as AnyMMActor).as_ref(),
    };
    macro = `<a class="lancer-macro i--sm fas fa-dice-d20" ${macro_elt_params(macro_ctx)}> </a>`;
  }

  return card.with_class("clipped").render(`
    <div class="lancer-header">
      <i class="cci cci-weapon i--m"> </i>
      <span class="minor">${weapon.Name}</span>
      <a class="gen-control fas fa-trash" data-action="null" data-path="${weapon_path}"></a>
    </div>
    <div class="flexcol">
      <div class="flexrow flexcenter">
        ${macro}
        ${show_range_array(weapon.Range, helper)}
        <hr class="vsep--m">
        ${show_damage_array(weapon.Damage, helper)}
      </div>

      ${compact_tag_list(weapon_path + ".Tags", helper)}
    </div>`);
}

/** Helper for showing a pilot gear, or a slot to hold it (if path is provided)
 * @argument "macro-actor" If supplied in hash, this MM actor entry will be used as the macro's actor
 */
export function pilot_gear_refview(gear_path: string, helper: HelperData): string {
  // Fetch the item
  let gear_: PilotGear | null = resolve_dotpath(helper.data?.root, gear_path);

  // Generate commons
  let cd = ref_commons(gear_);

  // Create outer card - used regardless of if filled yet
  let card = new DOMTag("div").ref({
    allow_type: EntryType.PILOT_GEAR,
    ref: cd?.ref,
    path: gear_path,
    allow_drop: true,
    draggable: true
  }).with_class("card");

  if (!cd) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return card.with_class("flexrow").render(`<img class="ref-icon" src="${TypeIcon(EntryType.PILOT_GEAR)}"></img>
                                              <span class="major">Equip gear</span>`);
  }

  // Assert not null. Setup helper to intercept gen-controls
  let gear = gear_!;
  helper = ext_helper_hash(helper, { override: gear_path });

  // Conditionally show uses
  let uses = "";
  let limited = gear.Tags.find(t => t.Tag.IsLimited);
  if (limited) {
    uses = uses_control(`${gear_path}.Uses`, limited.as_number(1), helper);
    uses = `
      <div class="compact-stat">
        <span class="minor" style="max-width: min-content;">USES: </span>
        <span class="minor" style="max-width: min-content;">${gear.Uses}</span>
        <span class="minor" style="max-width: min-content;" > / </span>
        <span class="minor" style="max-width: min-content;">${limited.Value}</span>
      </div>`;
  }

  // Macro if needed
  let macro = "";
  if (helper.hash["macro-actor"]) {
    let macro_ctx: ItemMacroCtx = {
      item: gear.as_ref(),
      name: gear.Name,
      type: "generic_item",
      actor: (helper.hash["macro-actor"] as AnyMMActor).as_ref(),
    };
    macro = macro_elt_params(macro_ctx);
  }

  // Finally, render
  return card.with_class("clipped").render(`
    <div class="lancer-header">
      <i class="cci cci-generic-item i--m"> </i>
      ${inc_if(`<a class="lancer-macro mdi mdi-message" ${macro}></a>`, macro)}
      <span>${gear.Name}</span>
      <a class="gen-control fas fa-trash" data-action="null" data-path="${gear_path}"></a>
    </div>
    <div class="flexcol">
      ${uses}

      <div class="desc-text" style=" padding: 5px">
        ${gear.Description}
      </div>

      ${compact_tag_list(gear_path + ".Tags", helper)}
    </div>`);
}

// Shows an individual rank. Path is needed for macros
function talent_rank_refview(
  talent: Talent,
  rank_index: number,
  macro_actor: AnyMMActor | null,
  unlocked: boolean
): string {
  let rank = talent.Ranks[rank_index];

  // Macro if needed
  let macro = "";
  if (macro_actor) {
    let macro_ctx: TalentMacroCtx = {
      item: talent.as_ref(),
      name: rank.Name,
      type: "talent",
      rank: rank_index + 1,
      actor: macro_actor.as_ref(),
    };
    macro = macro_elt_params(macro_ctx);
  }

  // Retern the item
  return `<div class="card ${inc_if("locked", !unlocked)}" style="grid-area: 1/${
    rank_index + 1
  }/2/${rank_index + 2}">
    <div class="lancer-header">
      <i class="cci cci-rank-${rank_index + 1} i--s"></i>
      ${inc_if(`<a class="lancer-macro mdi mdi-message" ${macro}></a>`, macro)}
      <span>${rank.Name}</span>
      <span class="minor">// RANK ${rank_index + 1}</span>
    </div>
    <div class="minor desc-text">
      ${rank.Description}
    </div>
  </div>`;
}

/** Helper for showing a pilot talent
 * @argument "macro-actor" If supplied in hash, this MM actor entry will be used as the macro's actor
 */
export function pilot_talent_refview(talent_path: string, helper: HelperData): string {
  // Fetch the item
  let talent_: Talent | null = resolve_dotpath(helper.data?.root, talent_path);

  // Generate commons
  let cd = ref_commons(talent_);

  // Create outer card - used regardless of if filled yet
  let card = new DOMTag("div").ref({
    allow_type: EntryType.TALENT,
    ref: cd?.ref,
    path: talent_path
  }).with_class("card");

  if (!cd) {
    return `<span> Error: path failed to resolve talent </span>`;
  }

  let talent = talent_!;

  // Draw out each rank
  let ranks: string[] = [];
  for (let i = 0; i < talent.Ranks.length; i++) {
    ranks.push(
      talent_rank_refview(talent, i, helper.hash["macro-actor"] ?? null, talent.CurrentRank > i)
    );
  }

  // Finally, render the whole box
  return card.control({
    action: "delete",
    context: true,
    path: talent_path,
    confirm: true
  }).render(`
    <div class="lancer-header">
      <i class="cci cci-rank-${talent.CurrentRank} i--m"> </i>
      <span>${talent.Name}</span>
      <a class="gen-control fas fa-trash" data-action="delete" data-path="${talent_path}"></a>
    </div>
    <div  style="display: grid; grid-template: 1fr / repeat(${talent.Ranks.length}, 1fr);" >
      ${ranks.join("\n")}
    </div>`);
}
