import { EntryType, Mech, MechLoadout, SystemMount, Pilot, Frame, Damage, DamageType, FittingSize, MechWeapon, WeaponMount, Range, MechSystem, funcs  } from "machine-mind";
import { AnyMMActor } from "../actor/lancer-actor";
import { TypeIcon } from "../config";
import { WeaponMacroCtx, macro_elt_params, ActionMacroCtx, ItemMacroCtx } from "../macros";
import { action_list_display } from "./actions";
import { effect_box, ext_helper_hash, HelperData, inc_if, resolve_helper_dotpath } from "./commons";
import { show_damage_array, show_range_array, uses_control } from "./item";
import { ref_commons, ref_params, simple_mm_ref } from "./refs";
import { compact_tag_list } from "./tags";

// A drag-drop slot for a system mount. TODO: delete button, clear button
function system_mount(
  mech_path: string,
  mount_path: string,
  helper: HelperData
): string {
  let slot = mech_system_refview(`${mount_path}.System`, mech_path, helper);

  return ` 
    <div class="mount card">
      <span class="lancer-header">
        <span>System Mount</span>
        <a class="gen-control fas fa-trash" data-action="splice" data-path="${mount_path}"></a>
        <a class="reset-system-mount-button fas fa-redo" data-path="${mount_path}"></a>
      </span>
      <div class="lancer-body">
        ${slot}
      </div>
    </div>`;
}

// A drag-drop slot for a weapon mount. 
function weapon_mount(
  mech_path: string,
  mount_path: string,
  helper: HelperData
): string {
  let mount = resolve_helper_dotpath(helper, mount_path) as WeaponMount
  // let mech = resolve_helper_dotpath(helper, mech_path, EntryType.MECH);
  let slots = mount.Slots.map((slot, index) => mech_weapon_refview(`${mount_path}.Slots.${index}.Weapon`, mech_path, ext_helper_hash(helper, {size: slot.Size})));
  let err = mount.validate() ?? "";

  return ` 
    <div class="mount card" >
      <div class="lancer-header mount-type-ctx-root" data-path="${mount_path}">
        <span>${mount.MountType} Weapon Mount</span>
        <a class="gen-control fas fa-trash" data-action="splice" data-path="${mount_path}"></a>
        <a class="reset-weapon-mount-button fas fa-redo" data-path="${mount_path}"></a>
      </div>
      ${inc_if(`
        <span class="lancer-header error">${err.toUpperCase()}</span>`, 
        err)}
      <div class="lancer-body">
        ${slots.join("")}
      </div>
    </div>`;
}

// Helper to display all weapon mounts on a mech loadout
function all_weapon_mount_view(mech_path: string, loadout_path: string, helper: HelperData) {
  let loadout = resolve_helper_dotpath(helper, loadout_path) as MechLoadout;
  const weapon_mounts = loadout.WepMounts.map((wep, index) => weapon_mount(mech_path, `${loadout_path}.WepMounts.${index}`, helper));

  return `
    <span class="lancer-header loadout-category submajor">
        <span>MOUNTED WEAPONS</span>
        <a class="gen-control fas fa-plus" data-action="append" data-path="${loadout_path}.WepMounts" data-action-value="(struct)wep_mount"></a>
        <a class="reset-all-weapon-mounts-button fas fa-redo" data-path="${loadout_path}.WepMounts"></a>
    </span>
    <div class="wraprow double">
      ${weapon_mounts.join("")}
    </div>
    `;
}

// Helper to display all system mounts on a mech loadout
function all_system_mount_view(mech_path: string, loadout_path: string, helper: HelperData) {
  let loadout = resolve_helper_dotpath(helper, loadout_path) as MechLoadout;
  const system_slots = loadout.SysMounts.map((sys, index) => system_mount(mech_path, `${loadout_path}.SysMounts.${index}`, helper));

  return `
    <span class="lancer-header loadout-category submajor">
        <span>MOUNTED SYSTEMS</span>
        <a class="gen-control fas fa-plus" data-action="append" data-path="${loadout_path}.SysMounts" data-action-value="(struct)sys_mount"></a>
        <a class="gen-control fas fa-trash" data-action="set" data-path="${loadout_path}.SysMounts" data-action-value="(struct)empty_array"></a>
    </span>
    <div class="wraprow quadruple">
      ${system_slots.join("")}
    </div>
    `;
}

/** The loadout view for a mech (tech here can mostly be reused for pilot)
 * TODO:
 * - Weapon mods
 * - .... system mods :)
 * - Ref validation (you shouldn't be able to equip another mechs items, etc)
 */
export function mech_loadout(mech_path: string, helper: HelperData): string {
  const mech: Mech = resolve_helper_dotpath(helper, mech_path);
  if(!mech) {return "err";}
  const loadout_path = `${mech_path}.Loadout`;

  return `
    <div class="flexcol">
        ${frame_refview(`${loadout_path}.Frame`, helper)}
        ${all_weapon_mount_view(mech_path, loadout_path, helper)}
        ${all_system_mount_view(mech_path, loadout_path, helper)}
    </div>`;
}

// Create a div with flags for dropping native pilots
export function pilot_slot(data_path: string, helper: HelperData): string {
  // get the existing
  let existing = resolve_helper_dotpath<Pilot | null>(helper, data_path, null);
  return simple_mm_ref(EntryType.PILOT, existing, "No Pilot", data_path, true);
}

// A drag-drop slot for a frame. TODO: fancify, giving basic stats or something???
export function frame_refview(frame_path: string, helper: HelperData): string {
  let frame = resolve_helper_dotpath<Frame | null>(helper, frame_path, null);
  return `<div class="lancer-header loadout-category submajor">
            <span>CURRENT FRAME</span>
          </div>
          ${simple_mm_ref(EntryType.FRAME, frame, "No Frame", frame_path)}
          `;
}

/**
 * Handlebars helper for a mech weapon preview card. Doubles as a slot. Mech path needed for bonuses
 * @argument "macro-actor" If supplied in hash, this MM actor entry will be used as the macro's actor
 */
export function mech_weapon_refview(weapon_path: string, mech_path: string, helper: HelperData): string { 
  // Fetch the item(s)
  let weapon_: MechWeapon | null = resolve_helper_dotpath(helper, weapon_path);
  let mech_: Mech | null = resolve_helper_dotpath(helper, mech_path);

  // Determine the size
  let size: FittingSize | null = helper.hash["size"] || null;

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
  helper = ext_helper_hash(helper, {"override": weapon_path});

  // What profile are we using?
  let profile = weapon.SelectedProfile;
  let profile_path = `${weapon_path}.Profiles.${weapon.SelectedProfileIndex}`;

  // Augment ranges
  let ranges = profile.BaseRange;
  if(mech_) {
    ranges = Range.calc_range_with_bonuses(weapon, profile, mech_);
  }

  // Augment damages
  let damages = profile.BaseDamage;
  if(mech_) {
    let dmg_bonuses = mech_.AllBonuses.filter(b => b.ID == "damage");
    dmg_bonuses = dmg_bonuses.filter(d => {
      for(let r of ranges) {
        if(d.applies_to_weapon(weapon, profile, r)) {
          return true;
        }
      }
      return false;
    });

    // We don't know the types, just fix as variable
    for(let b of dmg_bonuses) {
      damages.push(new Damage({
        type: DamageType.Variable,
        val: b.Value
      }));
    }
  }

  // Generate loading segment as needed
  let loading = "";
  if(weapon.IsLoading) {
    let loading_icon = `i--m mdi mdi-hexagon-${weapon.Loaded ? 'slice-6' : 'outline'}`;
    loading = `<span> 
                LOADED: 
                <a class="gen-control ${loading_icon}" data-action="set" data-action-value="(bool)${!weapon.Loaded}" data-path="${weapon_path}.Loaded" data-commit-item="${weapon_path}"></a>
              </span>`;
  }

  // Generate limited segment as needed
  let uses = "";
  let max_uses = funcs.tag_util.limited_max(weapon);
  if(max_uses) {
    let lb = mech_?.LimitedBonus ?? 0;
    uses = uses_control(`${weapon_path}.Uses`, max_uses + lb, helper);
  }

  // Make a macro, maybe
  let macro = "";
  if(helper.hash["macro-actor"]) {
    let macro_ctx: WeaponMacroCtx = {
      name: weapon.Name,
      type: "weapon",
      item: weapon.as_ref(),
      actor: (helper.hash["macro-actor"] as AnyMMActor).as_ref()
      // Should we specify profile? Or just use selected? Opting with the latter for now
    }
    macro = `<a class="lancer-macro" style="max-width: min-content;"  ${macro_elt_params(macro_ctx)}>
                <i class="fas fa-dice-d20 i--sm i--dark"></i>
              </a>`;
  }


  // Generate effects
  let effect = profile.Effect ? effect_box("Effect", profile.Effect, helper) : "";
  let on_attack = profile.OnAttack ? effect_box("On Attack", profile.OnAttack, helper) : "";
  let on_hit = profile.OnHit ? effect_box("On Hit", profile.OnHit, helper) : "";
  let on_crit = profile.OnCrit ? effect_box("On Crit", profile.OnCrit, helper) : "";

  return `
  <div class="valid ${EntryType.MECH_WEAPON} ref drop-settable double-click-ref flexcol clipped-top"
                ${ref_params(cd.ref, weapon_path)}
                data-commit-item="${weapon_path}"
                style="max-height: fit-content;">
    <div class="lancer-header">
      <i class="cci cci-weapon i--m"> </i>
      <span class="minor">${weapon.Name} // ${weapon.Size.toUpperCase()} ${weapon.SelectedProfile.WepType.toUpperCase()}</span>
      <a class="gen-control i--light" data-action="null" data-path="${weapon_path}"><i class="fas fa-trash"></i></a>
    </div> 
    <div class="lancer-body">
      <div class="flexrow flex-center" style="text-align: left; white-space: nowrap;">
        ${macro}
        <hr class="vsep--m">
        ${show_range_array(ranges, helper)}
        <hr class="vsep--m">
        ${show_damage_array(weapon.SelectedProfile.BaseDamage, helper)}

        ${inc_if(`<hr class="vsep--m"> ${loading}`, loading)}
        ${inc_if(`<hr class="vsep--m"> ${uses}`, uses)}
      </div>
      
      <div class="flexcol">
        ${effect}
        ${on_attack}
        ${on_hit}
        ${on_crit}
        ${compact_tag_list(profile_path + ".Tags", helper)}
      </div>
    </div>
  </div>`
};

/**
 * Handlebars helper for a mech system preview card. Doubles as a slot. Mech path needed for bonuses
 * @argument "macro-actor" If supplied in hash, this MM actor entry will be used as the macro's actor
 * 
 * NOTE: Trash can option is assuming this is in a weapon slot. 
 */
export function mech_system_refview(system_path: string, mech_path: string, helper: HelperData): string { 
  // Fetch the item(s)
  let system_: MechSystem | null = resolve_helper_dotpath(helper, system_path);
  let mech_: Mech | null = resolve_helper_dotpath(helper, mech_path);

  // Generate commons
  let cd = ref_commons(system_);

  if (!cd) {
    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `
      <div class="${EntryType.MECH_SYSTEM} ref drop-settable card flexrow" 
                        data-path="${system_path}" 
                        data-type="${EntryType.MECH_SYSTEM}">
        <img class="ref-icon" src="${TypeIcon(EntryType.MECH_SYSTEM)}"></img>
        <span class="major">Insert system</span>
      </div>`;
  }

  // Assert not null
  let system = system_!;
  helper = ext_helper_hash(helper, {"override": system_path});

  // Make a macro, maybe
  let macro = "";
  if(helper.hash["macro-actor"]) {
    let macro_ctx: ItemMacroCtx = {
      name: system.Name,
      type: "generic_item",
      item: system.as_ref(),
      actor: (helper.hash["macro-actor"] as AnyMMActor).as_ref()
    }
    macro = `<a class="lancer-macro" style="max-width: min-content;"  ${macro_elt_params(macro_ctx)}>
                <i class="mdi mdi-message i--sm"></i>
              </a>`;
  }
  
  // Generate limited segment as needed
  let uses = "";
  let max_uses = funcs.tag_util.limited_max(system);
  if(max_uses) {
    let lb = mech_?.LimitedBonus ?? 0;
    uses = uses_control(`${system_path}.Uses`, max_uses + lb, helper);
  }


  return `
  <div class="valid ${EntryType.MECH_SYSTEM} ref drop-settable double-click-ref flexcol clipped-top"
                ${ref_params(cd.ref, system_path)}
                data-commit-item="${system_path}"
                style="max-height: fit-content;">
    <div class="lancer-header">
      <i class="cci cci-system i--m"> </i>
      ${macro}
      <span>${system.Name}</span>
      <a class="gen-control i--light" data-action="null" data-path="${system_path}"><i class="fas fa-trash"></i></a>
    </div> 
    <div class="lancer-body">
      ${uses}
      <div class="effect-text">
        ${system.Effect}
      </div>
      ${inc_if(action_list_display(system_path, "Actions", helper), system.Actions.length)}
    </div>
  </div>`
};


