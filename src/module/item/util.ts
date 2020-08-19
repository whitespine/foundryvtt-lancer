import {
  LancerSkill,
  LancerCoreBonus,
  LancerTalent,
  LancerLicense,
  LancerPilotArmor,
  LancerPilotWeapon,
  LancerPilotGear,
  LancerFrame,
  LancerMechWeapon,
  LancerMechSystem,
  LancerNPCClass,
  LancerNPCTemplate,
  LancerNPCFeature,
  LancerItem,
} from "./lancer-item";
import {
  NpcFeature,
  MechSystem,
  MechWeapon,
  NpcClass,
  NpcTemplate,
  CompendiumItem,
  Skill,
  Talent,
} from "machine-mind";
import { Converter } from "../ccdata_io";

// This is a useful accumulator class for sorting all of the items a player might have
export interface PilotItemManifest {
  skills: LancerSkill[];
  talents: LancerTalent[];
  core_bonuses: LancerCoreBonus[];
  licenses: LancerLicense[];
  pilot_armor: LancerPilotArmor[];
  pilot_weapons: LancerPilotWeapon[];
  pilot_gear: LancerPilotGear[];
  frames: LancerFrame[];
  mech_weapons: LancerMechWeapon[];
  mech_systems: LancerMechSystem[];
}

// Similarly for an npc
export interface NpcItemManifest {
  npc_classes: LancerNPCClass[];
  npc_templates: LancerNPCTemplate[];
  npc_features: LancerNPCFeature[];
}

// Both, for when we don't super care about keys
export type ItemManifest = PilotItemManifest & NpcItemManifest;

// Does what it says on the tin. Annoying to keep doing
export function blank_npc_manifest(): NpcItemManifest {
  return {
    npc_classes: [],
    npc_features: [],
    npc_templates: [],
  };
}

// Ditto
export function blank_pilot_manifest(): PilotItemManifest {
  return {
    core_bonuses: [],
    frames: [],
    licenses: [],
    mech_systems: [],
    mech_weapons: [],
    pilot_armor: [],
    pilot_gear: [],
    pilot_weapons: [],
    skills: [],
    talents: [],
  };
}

// Synthesis
export function blank_item_manifest(): ItemManifest {
  return { ...blank_pilot_manifest(), ...blank_npc_manifest() };
}

// Categorizes items into their appropriate types. Generic, works for both actor types
export function categorize(items: LancerItem[]): ItemManifest {
  let result = blank_item_manifest();

  // Ugly as sin - sorry.
  for (let data of items) {
    if (data.type === "skill") {
      result.skills.push(data as LancerSkill);
    } else if (data.type === "talent") {
      result.talents.push(data as LancerTalent);
    } else if (data.type === "core_bonus") {
      result.core_bonuses.push(data as LancerCoreBonus);
    } else if (data.type === "license") {
      result.licenses.push(data as LancerLicense);
    } else if (data.type === "pilot_armor") {
      result.pilot_armor.push(data as LancerPilotArmor);
    } else if (data.type === "pilot_weapon") {
      result.pilot_weapons.push(data as LancerPilotWeapon);
    } else if (data.type === "pilot_gear") {
      result.pilot_gear.push(data as LancerPilotGear);
    } else if (data.type === "frame") {
      result.frames.push(data as LancerFrame);
    } else if (data.type === "mech_weapon") {
      result.mech_weapons.push(data as LancerMechWeapon);
    } else if (data.type === "mech_system") {
      result.mech_systems.push(data as LancerMechSystem);
    } else if (data.type === "npc_class") {
      result.npc_classes.push(data as LancerNPCClass);
    } else if (data.type === "npc_template") {
      result.npc_templates.push(data as LancerNPCTemplate);
    } else if (data.type === "npc_feature") {
      result.npc_features.push(data as LancerNPCFeature);
    }
  }

  return result;
}

// Flatten a manifest
export function flatten_item_manifest(man: ItemManifest): LancerItem[] {
    return [...flatten_npc_manifest(man), ...flatten_pilot_manifest(man)]
}

export function flatten_pilot_manifest(man: PilotItemManifest): LancerItem[] {
    return [...man.core_bonuses, ...man.frames, ...man.licenses, ...man.mech_systems, ...man.mech_weapons, ...man.pilot_armor, ...man.pilot_gear, ...man.pilot_weapons, ...man.skills, ...man.talents];
}

export function flatten_npc_manifest(man: NpcItemManifest): LancerItem[] {
     return [...man.npc_classes, ...man.npc_features, ...man.npc_templates];
}


// Counts the sp for systems, weapons, mods, etc
export function count_sp(items: ItemManifest) {
    let acc = 0;
    // Systems
    for(let sys of items.mech_systems) {
        acc += sys.data.data.sp;
    }

    // Mods
    //for(let mod of items.mo

    // Weapons
    for(let wep of items.mech_weapons) {
        acc += wep.data.data.sp;
    }

    return acc;
}

export function compendium_items_to_lancer_items(x: CompendiumItem[]): ItemManifest {
}

export function compendium_item_to_lancer_item(x: CompendiumItem): LancerItem {
    let conv = new Converter("");
    let result = blank_item_manifest();

    // In most cases, serialized data is fine
    if(x instanceof Skill) {
        let type = "skill";
        let data = x.Description
    } else if(i instanceof Talent) {
        type = "talent";
        sorted.skills.push(conv.LancerSi);
    }







    }
}