/* ------------------------------------ */
/* Handlebars Helpers                    */
/* ------------------------------------ */

import {
  WeaponSize,
  WeaponType,
  RangeType,
  DamageType,
  Damage,
  SystemType,
  Range,
  EntryType,
  PilotArmor,
  PilotWeapon,
  PilotGear,
  Manufacturer,
  License,
} from "machine-mind";
import { TypeIcon } from "../config";
import { compact_tag_list } from "./tags";
import { ext_helper_hash, HelperData, resolve_dotpath, resolve_helper_dotpath, std_enum_select, std_string_input, std_x_of_y } from "./commons";
import { ref_commons, ref_params  } from "./refs";
import { macro_elt_params, WeaponMacroCtx } from "../macros";
import { AnyMMActor } from "../actor/lancer-actor";

// Generic item utilities ahred across several other categories

/**
 * Handlebars helper for weapon size selector
 */
export function weapon_size_selector(path: string, helper: HelperData) {
  if(!helper.hash["default"]) {
    helper.hash["default"] = WeaponSize.Main;
  }
  return std_enum_select(path, WeaponSize, helper);
}

/**
 * Handlebars helper for weapon type selector. First parameter is the existing selection.
 */
export function weapon_type_selector(path: string, helper: HelperData) {
  if(!helper.hash["default"]) {
    helper.hash["default"] = WeaponType.Rifle;
  }
  return std_enum_select(path, WeaponType, helper);
}

/**
 * Handlebars helper for range type/value editing
 * Supply with path to Range, and any args that you'd like passed down to the standard input editors, as well as
 */
export function range_editor(path: string, helper: HelperData) {
  // Lookup the range so we can draw icon. 
  let range: Range = resolve_helper_dotpath(helper, path);

  let icon_html = `<i class="cci ${range.Icon} i--m i--dark"></i>`;
  /* TODO: For a next iteration--would be really nifty to set it up to select images rather than text. 
    But that seems like a non-trivial task...
    <img class="med-icon" src="../systems/lancer/assets/icons/range.svg">
    <img class="med-icon" src="../systems/lancer/assets/icons/aoe_blast.svg">
    <img class="med-icon" src="../systems/lancer/assets/icons/damage_explosive.svg">
  */

  // Extend the options to not have to repeat lookup
  let type_options = ext_helper_hash(helper, {"value": range.RangeType}, {"default": RangeType.Range});
  let range_type_selector = std_enum_select(path + ".RangeType", RangeType, type_options);

  let value_options = ext_helper_hash(helper, {"value": range.Value});
  let value_input = std_string_input(path + ".Value", value_options);

  return `<div class="flexrow flex-center" style="padding: 5px;">
    ${icon_html}
    ${range_type_selector}
    ${value_input}
  </div>
  `;
}

/**
 * Handlebars helper for weapon damage type/value editing.
 * Supply with path to Damage, and any args that you'd like passed down to the standard input editors
 */
export function damage_editor(path: string, helper: HelperData) {
  // Lookup the damage so we can draw icon. 
  let damage: Damage = resolve_helper_dotpath(helper, path);

  let icon_html = `<i class="cci ${damage.Icon} i--m"></i>`;

  let type_options = ext_helper_hash(helper, {"value": damage.DamageType}, {"default": DamageType.Kinetic});
  let damage_type_selector = std_enum_select(path + ".DamageType", DamageType, type_options);

  let value_options = ext_helper_hash(helper, {"value": damage.Value});
  let value_input = std_string_input(path + ".Value", value_options);

  return `<div class="flexrow flex-center" style="padding: 5px;">
    ${icon_html}
    ${damage_type_selector}
    ${value_input}
  </div>
  `;
}

/**
 * Handlebars helper for showing damage values.
 * Supply with the array of Damage[], as well as:
 * - classes: Any additional classes to put on the div holding them
 */
export function show_damage_array(damages: Damage[], helper: HelperData): string {
  // Get the classes
  let classes = helper.hash["classes"] || "";
  let results: string[] = [];
  for(let damage of damages) {
    let damage_item = `<span class="compact-damage"><i class="cci ${damage.Icon} i--m i--dark"></i>${damage.Value}</span>`;
    results.push(damage_item);
  }
  return `<div class="flexrow no-grow ${classes}">${results.join(" ")}</div>`
}

/**
 * Handlebars helper for showing range values
 */
export function show_range_array(ranges: Range[], helper: HelperData): string {
  // Get the classes
  let classes = helper.hash["classes"] || "";

  // Build out results
  let results: string[] = [];
  for(let range of ranges) {
    let range_item = `<span class="compact-range"><i class="cci ${range.Icon} i--m i--dark"></i>${range.Value}</span>`;
    results.push(range_item);
  }
  return `<div class="flexrow no-grow compact-range ${classes}">${results.join(" ")}</div>`
}

/**
 * Handlebars partial for system type selector
 */
export function system_type_selector(path: string, helper: HelperData) {
  return std_enum_select(path, SystemType, ext_helper_hash(helper, {}, {default: SystemType.System}));
}

/**
 * Handlebars partial for limited uses remaining
 * TODO: make look more like compcon
 * @argument `override` If provided, will be used as a data-commit-path
 */
export function uses_control(uses_path: string, max_uses: number, helper: HelperData) {
  const curr_uses = resolve_helper_dotpath(helper, uses_path, 0);
  /*
  return `
    <div class="card clipped">
      <span class="lancer-header"> USES </span>
      ${std_x_of_y(uses_path , curr_uses, max_uses)}
    </div>
    `;
    */

  // Display a series of hexes. Clicking on the one matching current value will set to one less than that
  let empty = "i--m mdi mdi-hexagon-outline";
  let full = "i--m mdi mdi-hexagon-slice-6";
  let cells: string[] = [];
  for(let use=1; use <= max_uses; use++) {
    let icon: string;
    let set_to: number;
    if(use < curr_uses) {
      // Clicked on non-rightmost one. Drop down to that specific cells uses remaining. Click again to clear it
      icon = full;
      set_to = use;
    } else if(use == curr_uses) {
      // Rightmost filled one. Clear just that one on click
      icon = full;
      set_to = use - 1;
    } else {
      // Should be empty, and set to filled on click
      icon = empty;
      set_to = use;
    }
    let commit_item = helper.hash["override"] ? `data-commit-item=${helper.hash["override"]}` : "";
    cells.push(`<a class="gen-control ${icon}" data-action="set" data-action-value="(int)${set_to}" data-path="${uses_path}" ${commit_item}></a>`);
  }
  return `<div class="flexrow flex-center"> USES: ${cells.join(" ")} </div>`;
}

// A specific MM ref helper focused on displaying manufacturer info.
export function manufacturer_ref(source_path: string, helper: HelperData): string {
  let source_: Manufacturer | null = resolve_helper_dotpath(helper, source_path);
  let cd = ref_commons(source_);
  // TODO? maybe do a little bit more here, aesthetically speaking
  if (cd) {
    let source = source_!;
    return `<div class="valid ${EntryType.MANUFACTURER} ref list-card drop-settable" ${ref_params(cd.ref, source_path)}> 
              <h3 class="mfr-name" style="color: ${source!.GetColor(false)};">
                <i class="i--m cci ${source.Logo}"></i>
                ${source!.ID}
              </h3>
                
            </div>
        `;
  } else {
    return `<div class="ref list-card drop-settable ${EntryType.MANUFACTURER}">
              <h3 class="mfr-name">No source specified</h3>
            </div>
        `;
  }
}

// A specific MM ref helper focused on displaying license info.
// This if for display purposes and does not provide editable fields
export function license_ref(license: License | null, level: number): string {
  let cd = ref_commons(license);
  // TODO? maybe do a little bit more here, aesthetically speaking
  if (cd) {
    return `<div class="valid ${EntryType.LICENSE} ref list-card" ${ref_params(cd.ref)}> 
              <h3 class="license-name">${license!.Name} ${level}</h3>
            </div>
        `;
  } else {
    return `<div class="ref list-card">
              <h3 class="license-name">No license specified</h3>
            </div>
        `;
  }
}