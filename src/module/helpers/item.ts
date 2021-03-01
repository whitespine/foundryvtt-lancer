/* ------------------------------------ */
/* Handlebars Helpers                    */
/* ------------------------------------ */

import {
  WeaponSize,
  WeaponType,
  RangeType,
  DamageType,
  Damage,
  LiveEntryTypes,
  SystemType,
  Range,
  RegEntry,
  EntryType,
  RegRef,
  OpCtx,
  Bonus,
  PilotArmor,
  PilotWeapon,
  PilotGear,
  Mech,
  Manufacturer,
  License,
  NpcFeature,
  FittingSize,
  Action,
} from "machine-mind";
import { MechWeapon } from "machine-mind";
import { TypeIcon } from "../config";
import { npc_reaction_effect_preview, npc_system_effect_preview, npc_tech_effect_preview, npc_trait_effect_preview, npc_weapon_effect_preview } from "./npc";
import { compact_tag_list } from "./tags";
import { effect_box, ext_helper_hash, HelperData, inc_if, resolve_dotpath, resolve_helper_dotpath, selected, std_checkbox, std_enum_select, std_num_input, std_string_input, std_x_of_y } from "./commons";
import { ref_commons, ref_params  } from "./refs";

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
export function range_editor(path: string, options: HelperData) {
  // Lookup the range so we can draw icon. 
  let range: Range = resolve_helper_dotpath(options, path);

  let icon_html = `<i class="cci ${range.Icon} i--m i--dark"></i>`;
  /* TODO: For a next iteration--would be really nifty to set it up to select images rather than text. 
    But that seems like a non-trivial task...
    <img class="med-icon" src="../systems/lancer/assets/icons/range.svg">
    <img class="med-icon" src="../systems/lancer/assets/icons/aoe_blast.svg">
    <img class="med-icon" src="../systems/lancer/assets/icons/damage_explosive.svg">
  */

  // Extend the options to not have to repeat lookup
  let type_options = ext_helper_hash(options, {"value": range.RangeType}, {"default": RangeType.Range});
  let range_type_selector = std_enum_select(path + ".RangeType", RangeType, type_options);

  let value_options = ext_helper_hash(options, {"value": range.Value});
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
export function damage_editor(path: string, options: HelperData) {
  // Lookup the damage so we can draw icon. 
  let damage: Damage = resolve_helper_dotpath(options, path);

  let icon_html = `<i class="cci ${damage.Icon} i--m"></i>`;

  let type_options = ext_helper_hash(options, {"value": damage.DamageType}, {"default": DamageType.Kinetic});
  let damage_type_selector = std_enum_select(path + ".DamageType", DamageType, type_options);

  let value_options = ext_helper_hash(options, {"value": damage.Value});
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
export function show_damage_array(damages: Damage[], options: HelperData): string {
  // Get the classes
  let classes = options.hash["classes"] || "";
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
export function show_range_array(ranges: Range[], options: HelperData): string {
  // Get the classes
  let classes = options.hash["classes"] || "";

  // Build out results
  let results: string[] = [];
  for(let range of ranges) {
    let range_item = `<span class="compact-range"><i class="cci ${range.Icon} i--m i--dark"></i>${range.Value}</span>`;
    results.push(range_item);
  }
  return `<div class="flexrow no-grow compact-range ${classes}">${results.join(" ")}</div>`
}

/**
 * Handlebars helper for an NPC feature preview attack bonus stat
 * @param atk {number} Attack bonus to render
 */
export function npc_attack_bonus_preview(atk: number, txt: string = "ATTACK") {
  return `<div class="compact-acc">
    <i style="margin-right: 5px;" class="cci cci-reticule i--m"></i>
    <span class="medium"> ${atk < 0 ? "-" : "+"}${atk} ${txt}</span>
  </div>`;
}

/**
 * Handlebars helper for an NPC feature preview accuracy stat
 * @param acc {number} Accuracy bonus to render
 */
export function npc_accuracy_preview(acc: number) {
  let icon: string;
  let text: string;
  if (acc > 0) {
    icon = "accuracy";
    text = `+${acc} ACCURACY`;
  } else if(acc < 0) {
    icon = "difficulty";
    text = `-${acc} DIFFICULTY`;
  } else {
    return "";
  }
  
  return `<div class="compact-acc">
      <i style="margin-right: 5px" class="cci cci-${icon} i--m"></i>
      <span class="medium">${text}</span>
    </div>`;
}


/**
 * Handlebars partial for weapon type selector
 */
export function system_type_selector(path: string, options: HelperData) {
  return std_enum_select(path, SystemType, ext_helper_hash(options, {}, {default: SystemType.System}));
}

/**
 * Handlebars partial for limited uses remaining
 * TODO: make look more like compcon
 */
export function uses_control(uses_path: string, max_uses: number, helper: HelperData) {
  const curr_uses = resolve_helper_dotpath(helper, uses_path, 0);
  return `
    <div class="card clipped">
      <span class="lancer-header"> USES </span>
      ${std_x_of_y(uses_path , curr_uses, max_uses)}
    </div>
    `;
}

/**
 * Handlebars partial for a mech system preview card.
 */
/*
export const mech_system_preview = `<li class="card clipped mech-system-compact item" data-item-id="{{system._id}}">
<div class="lancer-header" style="grid-area: 1/1/2/3; display: flex">
  <i class="cci cci-system i--m"> </i>
  <a class="system-macro macroable"><i class="mdi mdi-message"></i></a>
  <span class="minor grow">{{system.name}}</span>
  <a class="stats-control" data-action="delete"><i class="fas fa-trash"></i></a>
</div>
<div class="flexrow">
  <div style="float: left; align-items: center; display: inherit;">
    <i class="cci cci-system-point i--m i--dark"> </i>
    <span class="medium" style="padding: 5px;">{{system.data.sp}} SP</span>
  </div>
  {{#if system.data.uses}}
  <div class="compact-stat">
    <span class="minor" style="max-width: min-content;">USES: </span>
    <span class="minor" style="max-width: min-content;">{{system.data.uses}}</span>
    <span class="minor" style="max-width: min-content;" > / </span>
    <span class="minor" style="max-width: min-content;">{{system.data.max_uses}}</span>
  </div>
  {{/if}}
</div>
{{#if (ne system.data.description "")}}
<div class="desc-text" style="padding: 5px">
  {{{system.data.description}}}
</div>
{{/if}}
{{#with system.data.effect as |effect|}}
  {{#if effect.effect_type}}
    {{{eff-preview effect}}}
  {{else}}
    {{> generic-eff-preview effect=effect}}
  {{/if}}
{{/with}}
{{{ tag-list .sddata.tags}}
</li>`;
*/

export function npc_feature_preview(npc_feature_path: string, helper: HelperData) {
  let feature: NpcFeature = resolve_helper_dotpath(helper, npc_feature_path);

  switch (feature.FeatureType) {
    case "Reaction":
      return npc_reaction_effect_preview(npc_feature_path, helper);
    case "System":
      return npc_system_effect_preview(npc_feature_path, helper);
    case "Trait":
      return npc_trait_effect_preview(npc_feature_path, helper);
    case "Tech":
      return npc_tech_effect_preview(npc_feature_path, helper);
    case "Weapon":
      return npc_weapon_effect_preview(npc_feature_path, helper);
    default:
      return "bad feature";
  }
}



// Helper for showing a piece of armor, or a slot to hold it (if path is provided)
export function pilot_armor_slot(armor_path: string, helper: HelperData): string {
  // Fetch the item
  let armor_: PilotArmor | null = resolve_helper_dotpath(helper, armor_path);

  // Generate commons
  let cd = ref_commons(armor_);

  if (!cd) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `<div class="${EntryType.PILOT_ARMOR} ref drop-settable card" 
                        data-path="${armor_path}" 
                        data-type="${EntryType.PILOT_ARMOR}">
          <img class="ref-icon" src="${TypeIcon(EntryType.PILOT_ARMOR)}"></img>
          <span class="major">Equip armor</span>
      </div>`;
  }

  let armor = armor_!;

  // Need to look in bonuses to find what we need
  let armor_val = armor.Bonuses.find(b => b.ID == "pilot_armor")?.Value ?? "0";
  let speed_val = armor.Bonuses.find(b => b.ID == "pilot_speed")?.Value ?? "0";
  let edef_val = armor.Bonuses.find(b => b.ID == "pilot_edef")?.Value ?? "0";
  let eva_val = armor.Bonuses.find(b => b.ID == "pilot_evasion")?.Value ?? "0";
  let hp_val = armor.Bonuses.find(b => b.ID == "pilot_hp")?.Value ?? "0";

  return `<div class="valid ${cd.ref.type} ref drop-settable card clipped pilot-armor-compact item" 
                ${ref_params(cd.ref, armor_path)} >
            <div class="lancer-header">
              <i class="mdi mdi-shield-outline i--m i--light"> </i>
              <span class="minor">${armor!.Name}</span>
              <a class="gen-control" data-action="null" data-path="${armor_path}"><i class="fas fa-trash"></i></a>
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
            <div class="effect-text" style=" padding: 5px">
              ${armor.Description}
            </div>
            ${compact_tag_list(armor_path + ".Tags", helper)}
          </div>`;
}



// Helper for showing a pilot weapon, or a slot to hold it (if path is provided)
export function pilot_weapon_refview(weapon_path: string, helper: HelperData): string {
  // Fetch the item
  let weapon_: PilotWeapon | null = resolve_helper_dotpath(helper, weapon_path);

  // Generate commons
  let cd = ref_commons(weapon_);

  if (!cd) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `<div class="${EntryType.PILOT_WEAPON} ref drop-settable card flexrow" 
                        data-path="${weapon_path}" 
                        data-type="${EntryType.PILOT_WEAPON}">
          <img class="ref-icon" src="${TypeIcon(EntryType.PILOT_WEAPON)}"></img>
          <span class="major">Equip weapon</span>
      </div>`;
  }

  let weapon = weapon_!;
  return `<div class="valid ${EntryType.PILOT_WEAPON} ref drop-settable card clipped pilot-weapon-compact item macroable"
                ${ref_params(cd.ref, weapon_path)} >
    <div class="lancer-header">
      <i class="cci cci-weapon i--m i--light"> </i>
      <span class="minor">${weapon.Name}</span>
      <a class="gen-control i--light" data-action="null" data-path="${weapon_path}"><i class="fas fa-trash"></i></a>
    </div>
    <div class="flexcol">
      <div class="flexrow">
        <a class="flexrow roll-attack" style="max-width: min-content;">
          <i class="fas fa-dice-d20 i--sm i--dark"></i>
        </a>
        ${show_range_array(weapon.Range, helper)}
        <hr class="vsep">
        ${show_damage_array(weapon.Damage, helper)}
      </div>

      ${compact_tag_list(weapon_path + ".Tags", helper)}
    </div>
  </div>`;
}

// Helper for showing a pilot gear, or a slot to hold it (if path is provided)
export function pilot_gear_refview(gear_path: string, helper: HelperData): string {
  // Fetch the item
  let gear_: PilotGear | null = resolve_dotpath(helper.data?.root, gear_path);

  // Generate commons
  let cd = ref_commons(gear_);

  if (!cd) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `<div class="${EntryType.PILOT_GEAR} ref drop-settable card flexrow" 
                        data-path="${gear_path}" 
                        data-type="${EntryType.PILOT_GEAR}">
          <img class="ref-icon" src="${TypeIcon(EntryType.PILOT_GEAR)}"></img>
          <span class="major">Equip gear</span>
      </div>`;
  }

  let gear = gear_!;

  // Conditionally show uses
  let uses = "";
  let limited = gear.Tags.find(t => t.Tag.IsLimited);
  if(limited) {
    uses = `
      <div class="compact-stat">
        <span class="minor" style="max-width: min-content;">USES: </span>
        <span class="minor" style="max-width: min-content;">todo</span>
        <span class="minor" style="max-width: min-content;" > / </span>
        <span class="minor" style="max-width: min-content;">${limited.Value}</span>
      </div>
    `
  }

  return `<div class="valid ${EntryType.PILOT_GEAR} ref drop-settable card clipped macroable"
                ${ref_params(cd.ref, gear_path)} >
    <div class="lancer-header">
      <i class="cci cci-generic-item i--m"> </i>
      <a class="gear-macro macroable"><i class="mdi mdi-message"></i></a>
      <span class="minor">${gear.Name}</span>
      <a class="gen-control i--light" data-action="null" data-path="${gear_path}"><i class="fas fa-trash"></i></a>
    </div>
    <div class="flexcol">
      ${uses}

      <div class="effect-text" style=" padding: 5px">
        ${gear.Description}
      </div>

      ${compact_tag_list(gear_path + ".Tags", helper)}
    </div>
  </div>`;
}

/**
 * Handlebars helper for a mech weapon preview card. Doubles as a slot. Mech path needed for bonuses
 */
export function mech_weapon_refview(weapon_path: string, mech_path: string | "", helper: HelperData, size?: FittingSize): string { 
  // Fetch the item(s)
  let weapon_: MechWeapon | null = resolve_helper_dotpath(helper, weapon_path);
  let mech_: Mech | null = resolve_helper_dotpath(helper, mech_path);

  // Generate commons
  let cd = ref_commons(weapon_);

  if (!cd) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `
      <div class="${EntryType.MECH_WEAPON} ref drop-settable card flexrow" 
                        data-path="${weapon_path}" 
                        data-type="${EntryType.MECH_WEAPON}">
        <img class="ref-icon" src="${TypeIcon(EntryType.MECH_WEAPON)}"></img>
        <span class="major">Insert ${size ? size : "any"} weapon</span>
      </div>`;
  }

  // Assert not null
  let weapon = weapon_!;

  // What profile are we using?
  let profile = weapon.SelectedProfile;
  let profile_path = `${weapon_path}.Profiles.${weapon.SelectedProfileIndex}`;

  // Augment ranges
  let ranges = profile.BaseRange;
  if(mech_) {
    ranges = Range.calc_range_with_bonuses(weapon, profile, mech_);
  }

  // Generate loading segment as needed
  let loading = "";
  if(weapon.IsLoading) {
    let loading_icon = `mdi mdi-hexagon-slice-${weapon.Loaded ? 6 : 0}`;
    loading = `<span> 
                LOADED: 
                <a class="gen-control" data-action="set" data-set-value="(bool)${!weapon.Loaded}" data-path="${weapon_path}.Loaded"><i class="${loading_icon}"></i></a>
                </span>`;
  }

  // Generate effects
  let effect = profile.Effect ? effect_box("Effect", profile.Effect, helper) : "";
  let on_attack = profile.OnAttack ? effect_box("On Attack", profile.OnAttack, helper) : "";
  let on_hit = profile.OnHit ? effect_box("On Hit", profile.OnHit, helper) : "";
  let on_crit = profile.OnCrit ? effect_box("On Crit", profile.OnCrit, helper) : "";

  return `
  <div class="valid ${EntryType.MECH_WEAPON} ref drop-settable flexcol clipped lancer-weapon-container macroable item"
                ${ref_params(cd.ref, weapon_path)}
                style="max-height: fit-content;">
    <div class="lancer-header">
      <i class="cci cci-weapon i--m i--light"> </i>
      <span class="minor">${weapon.Name} // ${weapon.Size.toUpperCase()} ${weapon.SelectedProfile.WepType.toUpperCase()}</span>
      <a class="gen-control i--light" data-action="null" data-path="${weapon_path}"><i class="fas fa-trash"></i></a>
    </div> 
    <div class="lancer-body">
      <div class="flexrow" style="text-align: left; white-space: nowrap;">
        <a class="roll-attack"><i class="fas fa-dice-d20 i--m i--dark"></i></a>
        <hr class="vsep">
        ${show_range_array(ranges, helper)}
        <hr class="vsep">
        ${show_damage_array(weapon.SelectedProfile.BaseDamage, helper)}

        <!-- Loading toggle, if we are loading-->
        ${inc_if(`<hr class="vsep"> ${loading}`, loading)}
      </div>
      
      <div class="flexcol">
        <span>${weapon.SelectedProfile.Description}</span>
        ${effect}
        ${on_attack}
        ${on_hit}
        ${on_crit}
        ${compact_tag_list(profile_path + ".Tags", helper)}
      </div>
    </div>
  </div>`
};

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