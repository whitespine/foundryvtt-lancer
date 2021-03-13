import { NpcFeature, NpcFeatureType } from "machine-mind";
import { LancerActorType } from "../actor/lancer-actor";
import { ActivationType } from "../enums";
import { ItemMacroCtx, macro_elt_params, TechMacroCtx, WeaponMacroCtx } from "../macros";
import { MMEntityContext } from "../mm-util/helpers";
import { effect_box, HelperData, inc_if, resolve_helper_dotpath } from "./commons";
import {
  show_damage_array,
  show_range_array,
} from "./item";
import { ref_params } from "./refs";
import { compact_tag_list } from "./tags";

export const EffectIcons = {
  Generic: "systems/lancer/assets/icons/generic_item.svg",
  Basic: "systems/lancer/assets/icons/generic_item.svg",
  Charge: "systems/lancer/assets/icons/mine.svg",
  Deployable: "systems/lancer/assets/icons/deployable.svg",
  AI: "systems/lancer/assets/icons/mech_system.svg",
  Protocol: "systems/lancer/assets/icons/protocol.svg",
  Reaction: "systems/lancer/assets/icons/reaction.svg",
  Tech: "systems/lancer/assets/icons/tech_quick.svg",
  Drone: "systems/lancer/assets/icons/drone.svg",
  Bonus: "systems/lancer/assets/icons/shape_polygon_plus.svg",
  Offensive: "systems/lancer/assets/icons/sword_array.svg",
  Profile: "systems/lancer/assets/icons/weapon_profile.svg",
};

/* ------------------------------------ */
/* Handlebars Helpers                   */
/* ------------------------------------ */

export function action_type_icon(a_type: string) {
  const a = a_type ? a_type.toLowerCase() : ActivationType.None.toLowerCase();
  let html = "";
  if (a === ActivationType.Full.toLowerCase()) {
    html += `<i class="cci cci-activation-full i--m"></i>`;
  } else if (a === ActivationType.Quick.toLowerCase()) {
    html += `<i class="cci cci-activation-quick i--m"></i>`;
  } else if (a === ActivationType.Reaction.toLowerCase()) {
    html += `<i class="cci cci-reaction i--m"></i>`;
  } else if (a === ActivationType.Protocol.toLowerCase()) {
    html += `<i class="cci cci-protocol i--m"></i>`;
  }
  return html;
}

/**
 * Handlebars helper for effect action type
 */
export function action_type_selector(a_type: string, data_target: string) {
  const a = a_type ? a_type.toLowerCase() : ActivationType.None.toLowerCase();
  let html = '<div class="flexrow flex-center" style="padding: 5px; flex-wrap: nowrap;">';
  html += action_type_icon(a_type);
  html += `<select name="${data_target}" data-dtype="String" style="height: 2em;float: right" >
    <option value="${ActivationType.None}" ${
    a === ActivationType.None.toLowerCase() ? "selected" : ""
  }>NONE</option>
    <option value="${ActivationType.Full}" ${
    a === ActivationType.Full.toLowerCase() ? "selected" : ""
  }>FULL</option>
    <option value="${ActivationType.Quick}" ${
    a === ActivationType.Quick.toLowerCase() ? "selected" : ""
  }>QUICK</option>
    <option value="${ActivationType.Reaction}" ${
    a === ActivationType.Reaction.toLowerCase() ? "selected" : ""
  }>REACTION</option>
    <option value="${ActivationType.Protocol}" ${
    a === ActivationType.Protocol.toLowerCase() ? "selected" : ""
  }>PROTOCOL</option>
    <option value="${ActivationType.Passive}" ${
    a === ActivationType.Passive.toLowerCase() ? "selected" : ""
  }>PASSIVE</option>
    <option value="${ActivationType.Other}" ${
    a === ActivationType.Other.toLowerCase() ? "selected" : ""
  }>OTHER</option>
  </select>
  </div>`;
  return html;
}

// TODO: Make this globally consistent
function del_button(path: string): string {
  return `<a class="gen-control" data-action="delete" data-path="${path}"><i class="fas fa-trash"></i></a>`
}

function npc_feature_scaffold(path: string, npc_feature: NpcFeature, body: string, helper: HelperData) {
  let feature_class = `npc-${npc_feature.FeatureType.toLowerCase()}`

  // Macro if needed
  let macro = "";
  if(helper.hash["macro-actor"]) {
    let actor_mmec = helper.hash["macro-actor"] as MMEntityContext<LancerActorType>;
    let macro_ctx: ItemMacroCtx = {
      item: npc_feature.as_ref(),
      name: npc_feature.Name,
      type: "generic_item",
      actor: actor_mmec.ent.as_ref(),
    }
    macro = macro_elt_params(macro_ctx);
  }

  // Decide icon
  let feature_icon ="cci cci-${npc_feature.FeatureType.toLowerCase()}";
  if(npc_feature.FeatureType == NpcFeatureType.Tech) {
    feature_icon ="cci cci-tech-quick";
  }

  return `
  <div class="valid ref card ${feature_class}" ${ref_params(npc_feature.as_ref())}>
    <div class="flexrow lancer-header clipped-top collapse-ctrl" collapse-id="${npc_feature.RegistryID}" >
      <i class="${feature_icon} i--m"> </i>
      ${inc_if(`<a class="lancer-macro mdi mdi-message" ${macro}></a>`, macro)}
      <span class="major grow">${npc_feature.Name}</span>
      ${del_button(path)}
    </div>
    <div class="collapse-item" collapse-id="${npc_feature.RegistryID}">
      ${body}
    </div>
  </div>`;
}

export function npc_reaction_effect_preview(path: string, helper: HelperData) {
  let npc_feature: NpcFeature = resolve_helper_dotpath(helper, path);
  return npc_feature_scaffold(
    path,
    npc_feature,
    `<div class="flexcol lancer-body">
      ${effect_box("TRIGGER", npc_feature.Trigger, helper)}
      ${effect_box("EFFECT", npc_feature.Effect, helper)}
      ${compact_tag_list(path + ".Tags", helper)}
    </div>`,
    helper
  );
}

// The below 2 funcs just map to this one, because they all do the same thing
function npc_system_trait_effect_preview(path: string, helper: HelperData) {
  let npc_feature: NpcFeature = resolve_helper_dotpath(helper, path);
  return npc_feature_scaffold(
    path,
    npc_feature,
    `<div class="flexcol lancer-body">
      ${effect_box("EFFECT", npc_feature.Effect, helper)}
      ${compact_tag_list(path + ".Tags", helper)}
    </div>`,
    helper
  );
}

export function npc_system_effect_preview(path: string, helper: HelperData) {
  return npc_system_trait_effect_preview(path, helper);
}

export function npc_trait_effect_preview(path: string, helper: HelperData) {
  return npc_system_trait_effect_preview(path, helper);
}

export function npc_tech_effect_preview(
  path: string,
  helper: HelperData
) {
  // Get the feature
  let npc_feature: NpcFeature = resolve_helper_dotpath(helper, path);

  // Get the tier (or default 1)
  let tier_index: number = (helper.hash["tier"] ?? 1) - 1;

  let sep = `<hr class="vsep">`;
  let subheader_items: string[] = [];

  // Make up a macro if necessary
  if(helper.hash["macro-actor"]) {
    let macro: TechMacroCtx = {
      item: npc_feature.as_ref(),
      name: npc_feature.Name,
      type: "tech",
      actor: (helper.hash["macro-actor"] as MMEntityContext<LancerActorType>).ent.as_ref()
    };
    subheader_items.push(`<a class="lancer-macro no-grow" ${macro_elt_params(macro)}><i class="fas fa-dice-d20 i--m i--dark"></i></a>`);
  }

  let attack_bonus = npc_feature.AttackBonus[tier_index];
  let from_sys = false;

  // If we didn't find one, retrieve. Maybe check for undefined as we want an explicit 0 to be a true 0? How to support this in UI?
  if(!attack_bonus) {
    resolve_helper_dotpath(helper, "mm.ent.Systems", 0); // A bit lazy. Expand this to cover more cases if needed
    from_sys = true;
  }
  if (attack_bonus) {
    subheader_items.push(npc_attack_bonus_preview(attack_bonus, from_sys ? "ATK (SYS)" : "ATTACK"));
  }

  // Accuracy much simpler. If we got it, we got it
  if (npc_feature.Accuracy[tier_index]) {
    subheader_items.push(npc_accuracy_preview(npc_feature.Accuracy[tier_index]));
  }

  return npc_feature_scaffold(
    path,
    npc_feature,
    `
    <div class="lancer-body flex-col">
      <div class="flexrow">
        ${subheader_items.join(sep)}
      </div>
      <div class="flexcol" style="padding: 0 10px;">
        ${effect_box("EFFECT", npc_feature.Effect, helper)}
        ${compact_tag_list(path + ".Tags", helper)}
      </div>
    </div>
    `,
    helper
  );
}

export function npc_weapon_effect_preview(
  path: string,
  helper: HelperData
) {
  // Get the feature
  let npc_feature: NpcFeature = resolve_helper_dotpath(helper, path);

  // Get the tier (or default 1)
  let tier_index: number = (helper.hash["tier"] ?? 1) - 1;

  let sep = `<hr class="vsep">`;
  let subheader_items = [];
  
  // Make up a macro if necessary
  if(helper.hash["macro-actor"]) {
    let macro: WeaponMacroCtx = {
      item: npc_feature.as_ref(),
      name: npc_feature.Name,
      type: "weapon",
      actor: (helper.hash["macro-actor"] as MMEntityContext<LancerActorType>).ent.as_ref()
    };
    subheader_items.push(`<a class="lancer-macro no-grow" ${macro_elt_params(macro)}><i class="fas fa-dice-d20 i--m i--dark"></i></a>`);
  }

  // Weapon info

  // Topline stuff
  if (npc_feature.AttackBonus[tier_index]) {
    subheader_items.push(npc_attack_bonus_preview(npc_feature.AttackBonus[tier_index]));
  }
  if (npc_feature.Accuracy[tier_index]) {
    subheader_items.push(npc_accuracy_preview(npc_feature.Accuracy[tier_index]));
  }

  // Get the mid-body stuff. Real meat and potatos of a weapon
  if (npc_feature.Range.length) {
    subheader_items.push(show_range_array(npc_feature.Range, helper));
  }
  if (npc_feature.Damage[tier_index] && npc_feature.Damage[tier_index].length) {
    subheader_items.push(show_damage_array(npc_feature.Damage[tier_index], helper));
  }

  return npc_feature_scaffold(
    path,
    npc_feature,
    `
    <div class="lancer-body flex-col">
      <div class="flexrow no-wrap flex-center">
        ${subheader_items.join(sep)}
      </div>
      <div>
        <span>${npc_feature.WepType ?? "Weapon"} // ${npc_feature.Origin.name} ${npc_feature.Origin.type} Feature</span>
      </div>
      ${effect_box("ON HIT", npc_feature.OnHit, helper)}
      ${effect_box("EFFECT", npc_feature.Effect, helper)}
      ${compact_tag_list(path + ".Tags", helper)}
    </div>
    `,
    helper
  );
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

