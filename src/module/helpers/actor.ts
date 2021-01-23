import { HelperOptions } from "handlebars";
import { EntryType,funcs, RegEntry  } from "machine-mind";
import { LancerItemType } from "../item/lancer-item";
import { resolve_helper_dotpath } from "./commons";
import { ref_commons } from "./refs";
// ---------------------------------------
// Some simple stat editing thingies

// Shows an X / MAX clipped card
export function stat_edit_card_max(title: string, icon: string, data_path: string, max_path: string, options: HelperOptions): string {
  let data_val = resolve_helper_dotpath(options, data_path);
  let max_val = resolve_helper_dotpath(options, max_path);
  return `
    <div class="flexcol card clipped">
      <div class="lancer-stat-header clipped-top flexrow">
        <i class="${icon} i--m i--light" style="float: left; padding-left: 10px"> </i>
        <span class="major">${title}</span>
      </div>
      <div class="flexrow" style="align-items: center">
        <input class="lancer-stat major" type="number" name="${data_path}" value="${data_val}" data-dtype="Number"/>
        <span class="medium" style="max-width: min-content;">/</span>
        <span class="lancer-stat major">${max_val}</span>
      </div>
    </div>
    `;
}

// Shows an X clipped card
export function stat_edit_card(title: string, icon: string, data_path: string, options: HelperOptions): string {
  let data_val = resolve_helper_dotpath(options, data_path);
  return `
    <div class="flexcol card clipped">
      <div class="lancer-stat-header clipped-top flexrow">
        <i class="${icon} i--m i--light" style="float: left; padding-left: 10px"> </i>
        <span class="major">${title}</span>
      </div>
      <input class="lancer-stat major" type="number" name="${data_path}" value="${data_val}" data-dtype="Number"/>
    </div>
    `;
}

// Shows a readonly value clipped card
export function stat_view_card(title: string, icon: string, data_path: string, options: HelperOptions): string {
  let data_val = resolve_helper_dotpath(options, data_path);
  return `
    <div class="flexcol card clipped">
      <div class="lancer-stat-header clipped-top flexrow">
        <i class="${icon} i--m i--light" style="float: left; padding-left: 10px"> </i>
        <span class="major">${title}</span>
      </div>
      <span class="lancer-stat major">${data_val}</span>
    </div>
    `;
}

// Shows a compact readonly value
export function compact_stat_view(icon: string, data_path: string, options: HelperOptions): string {
  let data_val = resolve_helper_dotpath(options, data_path);
  return `        
    <div class="compact-stat">
        <i class="${icon} i--m i--dark"></i>
        <span class="lancer-stat minor">${data_val}</span>
    </div>
    `;
}

// Shows a compact editable value
export function compact_stat_edit(icon: string, data_path: string, max_path: string, options: HelperOptions): string {
  let data_val = resolve_helper_dotpath(options, data_path);
  let max_val = resolve_helper_dotpath(options, max_path);
  return `        
        <div class="compact-stat">
          <i class="${icon} i--m i--dark"></i>
          <input class="lancer-stat minor" type="number" name="${data_path}" value="${data_val}" data-dtype="Number"/>
          <span class="minor" style="max-width: min-content;" > / </span>
          <span class="lancer-stat minor">${max_val}</span>
        </div>
    `;
}

// An editable field with +/- buttons
export function clicker_num_input(target: string, value: string) {
    // Init value to 0 if it doesn't exist
    // So the arrows work properly
    if (!value) {
      value = "0";
    }

    return `<div class="flexrow arrow-input-container">
      <button class="mod-minus-button" type="button">-</button>
      <input class="lancer-stat major" type="number" name="${target}" value="${value}" data-dtype="Number"\>
      <button class="mod-plus-button" type="button">+</button>
    </div>`;
}

// The above, in card form
export function clicker_stat_card(title: string, icon: string, data_path: string, options: HelperOptions): string {
  let data_val = resolve_helper_dotpath(options, data_path);
  return `<div class="flexcol card clipped">
      <div class="lancer-stat-header clipped-top flexrow">
        <i class="${icon} i--m i--light" styles="float: left; padding-left: 10px"> </i>
        <span class="major">${title}</span>
      </div>
      ${clicker_num_input(data_path, data_val)}
    </div>
  `;
}

export function npc_clicker_stat_card(title: string, data_path: string, options: HelperOptions): string {
  let data_val_arr = resolve_helper_dotpath(options, data_path) ?? [];
  let tier_clickers: string[] = [];
  let tier = 1;

  // Make a clicker for every tier
  for(let val of data_val_arr) {
    tier_clickers.push(`
      <div class="flexrow stat-container" style="align-self: center;">
        <i class="cci cci-npc-tier-${tier} i--m i--dark"></i>
        ${clicker_num_input(`${data_path}.${tier-1}`, val)}
      </div>`);
      tier++;
  }
  return `
    <div class="flexcol card clipped">
      <span class="lancer-stat-header major clipped-top">${title}</span>
      ${tier_clickers.join("")}
    </div>`;
}

/**
 * Handlebars helper for an overcharge button
 * Currently this is overkill, but eventually we want to support custom overcharge values
 * @param overcharge_path Path to current overcharge level, from 0 to 3
 */
export function overcharge_button(overcharge_path: string, options: HelperOptions): string {
  const overcharge_sequence = ["1", "1d3", "1d6", "1d6 + 4"];

  let index = resolve_helper_dotpath(options, overcharge_path) as number;
  index = funcs.bound_int(index, 0, overcharge_sequence.length - 1)
  let over_val = overcharge_sequence[index];
  return `
    <div class="card clipped flexcol">
      <div class="lancer-stat-header clipped-top">
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
