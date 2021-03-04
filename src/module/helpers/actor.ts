import { EntryType,funcs, Mech, Npc, Pilot  } from "machine-mind";
import { LancerActorType } from "../actor/lancer-actor";
import { macro_elt_params, StatMacroCtx } from "../macros";
import { MMEntityContext } from "../mm-util/helpers";
import { ext_helper_hash, HelperData, inc_if, resolve_helper_dotpath, selected, std_num_input, std_x_of_y } from "./commons";
import { simple_mm_ref } from "./refs";
// ---------------------------------------
// Some simple stat editing thingies

// Shows an X / MAX clipped card
export function stat_edit_card_max(title: string, data_path: string, max_path: string, helper: HelperData): string {
  let data_val = resolve_helper_dotpath(helper, data_path, 0);
  let max_val = resolve_helper_dotpath(helper, max_path, 0);
  let icon = helper.hash["icon"] ?? "";
  return `
    <div class="card clipped">
      <div class="lancer-header">
        ${inc_if(`<i class="${icon} i--m header-icon"> </i>`, icon)}
        <span class="major">${title}</span>
      </div>
      ${std_x_of_y(data_path, data_val, max_val, "lancer-stat")}
    </div>
    `;
}

// Shows an X clipped card
export function stat_edit_card(title: string, data_path: string, helper: HelperData): string {
  let icon = helper.hash["icon"] ?? "";
  return `
    <div class="card clipped">
      <div class="lancer-header">
        ${inc_if(`<i class="${icon} i--m header-icon"> </i>`, icon)}
        <span class="major">${title}</span>
      </div>
      ${std_num_input(data_path, ext_helper_hash(helper, {classes: "lancer-stat lancer-invisible-input"}))}
    </div>
    `;
}

// 
/**
 * Shows a readonly value clipped card with a number inside
 * If "icon" is provided, that icon will be shown to the left of the title.
 * If "macro-actor" is provided (as an MMEntityContext for the actor), a die icon will function as a macro for this stat on that actor
 */
export function stat_view_card(title: string, data_path: string, helper: HelperData): string {
  // Get basic display info
  let icon = helper.hash["icon"] ?? "";
  let data_val = resolve_helper_dotpath(helper, data_path);

  // Inject a macro if need be
  let macro_txt = "";
  if(helper.hash["macro-actor"]) {
    let actor = helper.hash["macro-actor"] as MMEntityContext<LancerActorType>;
    let macro: StatMacroCtx = {
      actor: actor.ent.as_ref(),
      stat_path: data_path,
      title,
      type: "stat",
      name: title,
      icon: icon || undefined
    }
    macro_txt = `<a class="lancer-macro i--s fas fa-dice-d20" ${macro_elt_params(macro)}></a>`;
  }

  return `
    <div class="card clipped">
      <div class="lancer-header">
        ${inc_if(`<i class="${icon} i--m header-icon"> </i>`, icon)}
        <span class="major">${title}</span>
      </div>
      <div class="flexrow">
        ${macro_txt}
        <span class="lancer-stat major">${data_val}</span>
      </div>
    </div>
    `;
}

// Shows a compact readonly value
export function compact_stat_view(icon: string, data_path: string, options: HelperData): string {
  let data_val = resolve_helper_dotpath(options, data_path);
  return `        
    <div class="compact-stat">
        <i class="${icon} i--m i--dark"></i>
        <span class="lancer-stat minor">${data_val}</span>
    </div>
    `;
}

// Shows a compact editable value
export function compact_stat_edit(icon: string, data_path: string, max_path: string, options: HelperData): string {
  let data_val = resolve_helper_dotpath(options, data_path);
  let max_val = resolve_helper_dotpath(options, max_path);
  return `        
        <div class="compact-stat">
          <i class="${icon} i--m i--dark"></i>
          ${std_num_input(data_path, ext_helper_hash(options, {classes: "lancer-stat minor"}))}
          <span class="minor" style="max-width: min-content;" > / </span>
          <span class="lancer-stat minor">${max_val}</span>
        </div>
    `;
}

// An editable field with +/- buttons
export function clicker_num_input(data_path: string, options: HelperData) {
    return `<div class="flexrow arrow-input-container">
      <button class="mod-minus-button" type="button">-</button>
      ${std_num_input(data_path, ext_helper_hash(options, {classes: "lancer-stat minor", default: 0}))}
      <button class="mod-plus-button" type="button">+</button>
    </div>`;
}

/** Produces a card with the specified header, with +/- buttons for editing the number at the specified path
 * If 'icon' is supplied, will be placed to left of title
 */
export function clicker_stat_card(title: string, data_path: string, helper: HelperData): string {
  let icon = helper.hash["icon"] ?? "";
  return `<div class="card clipped">
      <div class="lancer-header major">
        ${inc_if(`<i class="${icon} i--m header-icon"> </i>`, icon)}
        <span>${title}</span>
      </div>
      ${clicker_num_input(data_path, helper)}
    </div>
  `;
}

export function npc_clicker_stat_card(title: string, data_path: string, helper: HelperData): string {
  let data_val_arr: number[] = resolve_helper_dotpath(helper, data_path) ?? [];
  let tier_clickers: string[] = [];
  let tier = 1;
  let icon = helper.hash["icon"] ?? "";

  // Reset button

  // Make a clicker for every tier
  for(let val of data_val_arr) {
    tier_clickers.push(`
      <div class="flexrow stat-container" style="align-self: center;">
        <i class="cci cci-npc-tier-${tier} i--m i--dark"></i>
        ${clicker_num_input(`${data_path}.${tier-1}`, helper)}
      </div>`);
      tier++;
  }
  return `
    <div class="card clipped">
      <div class="flexrow lancer-header major">
        ${inc_if(`<i class="${icon} i--m header-icon"> </i>`, icon)}
        <span class="lancer-header major ">${title}</span>
        <a class="gen-control" data-path="${data_path}" data-action="set" data-action-value="(struct)npc_stat_array"><i class="fas fa-redo"></i></a>
      </div>
      ${tier_clickers.join("")}
    </div>`;
}

/**
 * Handlebars helper for an overcharge button
 * Currently this is overkill, but eventually we want to support custom overcharge values
 * @param overcharge_path Path to current overcharge level, from 0 to 3
 */
export const OVERCHARGE_SEQUENCE = ["1", "1d3", "1d6", "1d6 + 4"];
export function overcharge_button(overcharge_path: string, options: HelperData): string {
  let index = resolve_helper_dotpath(options, overcharge_path) as number;
  index = funcs.bound_int(index, 0, OVERCHARGE_SEQUENCE.length - 1)
  let over_val = OVERCHARGE_SEQUENCE[index];
  return `
    <div class="card clipped flexcol">
      <div class="lancer-header ">
        <span class="major">OVERCHARGE</span>
      </div>
      <div class=flexrow>
        <a class="overcharge-button">
          <i class="cci cci-overcharge i--dark i--sm"> </i>
        </a>
        <span>${over_val}</span>
      </div>
    </div>`;
}


/**
 * Handlebars helper for an NPC tier selector
 * @param tier The tier ID string
 */
export function npc_tier_selector(tier_path: string, helper: HelperData) {
  let tier: number = resolve_helper_dotpath(helper, tier_path) ?? 1;
  let tiers: string[] = [1, 2, 3].map(tier_option => `
    <option value="${tier_option}" ${selected(tier_option === tier)}>TIER ${tier_option}</option>
  `);
  let template = `<select class="tier-control" name="npctier">
    ${tiers.join("")}
  </select>`;
  return template;
}

// Create a div with flags for dropping native pilots/mechs/npcs
export function deployer_slot(data_path: string, options: HelperData): string {
  // get the existing
  let existing = resolve_helper_dotpath<Pilot | Mech | Npc | null>(options, data_path, null);
  return simple_mm_ref([EntryType.PILOT, EntryType.MECH, EntryType.NPC], existing, "No Deployer", data_path, true);
}

