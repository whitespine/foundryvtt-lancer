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
    LancerItemData,
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
    Frame,
    CoreBonus,
    License,
    PilotArmor,
    PilotWeapon,
    PilotGear,
    Pilot,
    IContentPack,
    store,
    ContentPack,
} from "machine-mind";

import { Converter } from "../ccdata_io";
import {
    LancerSkillData,
    LancerTalentData,
    LancerCoreBonusData,
    LancerPilotArmorData,
    LancerPilotWeaponData,
    LancerPilotGearData,
    LancerFrameData,
    LancerMechSystemData,
    LancerMechWeaponData,
    LancerNPCTemplateData,
    LancerNPCClassData,
    LancerNPCFeatureData,
} from "../interfaces";
import { IContentPackData } from "machine-mind/dist/classes/ContentPack";

// Useful constants
export const SKILLS_PACK = "lancer.skills";
export const TALENTS_PACK = "lancer.talents";
export const CORE_BONUS_PACK = "lancer.core_bonuses";
export const PILOT_ARMOR_PACK = "lancer.pilot_armor";
export const PILOT_WEAPON_PACK = "lancer.pilot_weapons";
export const PILOT_GEAR_PACK = "lancer.pilot_gear";
export const FRAME_PACK = "lancer.frames";
export const MECH_SYSTEM_PACK = "lancer.systems";
export const MECH_WEAPON_PACK = "lancer.weapons";
export const NPC_CLASS_PACK = "lancer.npc_classes";
export const NPC_TEMPLATE_PACK = "lancer.npc_templates";
export const NPC_FEATURE_PACK = "lancer.npc_features";

// Quick helper
async function get_pack<T>(pack_name: string): Promise<T[]> {
    return game.packs
        .get(pack_name)
        .getContent()
        .then(g => g.map(v => v.data)) as Promise<T[]>;
}

// Quick accessors to entire arrays of rhe descript items
export async function get_Skills_pack(): Promise<LancerSkill[]> {
    return get_pack(SKILLS_PACK);
}
export async function get_Talents_pack(): Promise<LancerTalent[]> {
    return get_pack(TALENTS_PACK);
}
export async function get_CoreBonuses_pack(): Promise<LancerCoreBonus[]> {
    return get_pack(CORE_BONUS_PACK);
}
export async function get_PilotArmor_pack(): Promise<LancerPilotArmor[]> {
    return get_pack(PILOT_ARMOR_PACK);
}
export async function get_PilotWeapons_pack(): Promise<LancerPilotWeapon[]> {
    return get_pack(PILOT_WEAPON_PACK);
}
export async function get_PilotGear_pack(): Promise<LancerPilotGear[]> {
    return get_pack(PILOT_GEAR_PACK);
}
export async function get_Frames_pack(): Promise<LancerFrame[]> {
    return get_pack(FRAME_PACK);
}
export async function get_MechSystems_pack(): Promise<LancerMechSystem[]> {
    return get_pack(MECH_SYSTEM_PACK);
}
export async function get_MechWeapons_pack(): Promise<LancerMechWeapon[]> {
    return get_pack(MECH_WEAPON_PACK);
}
export async function get_NpcClassses_pack(): Promise<LancerNPCClass[]> {
    return get_pack(NPC_CLASS_PACK);
}
export async function get_NpcTemplates_pack(): Promise<LancerNPCTemplate[]> {
    return get_pack(NPC_TEMPLATE_PACK);
}
export async function get_NpcFeatures_pack(): Promise<LancerNPCFeature[]> {
    return get_pack(NPC_FEATURE_PACK);
}

// Lookups
async function pack_lookup<T>(pack_name: string, name: string): Promise<T | null> {
    let pack = game.packs.get(pack_name);
    let index = await pack.getIndex();
    let found = index.find(i => i.name === name);
    if (!found) {
        return null;
    }

    // Get by index
    let x = pack.getEntry(found.id);
    return x;
}
// Quick accessors to content pack items

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
    return [...flatten_npc_manifest(man), ...flatten_pilot_manifest(man)];
}

export function flatten_pilot_manifest(man: PilotItemManifest): LancerItem[] {
    return [
        ...man.core_bonuses,
        ...man.frames,
        ...man.licenses,
        ...man.mech_systems,
        ...man.mech_weapons,
        ...man.pilot_armor,
        ...man.pilot_gear,
        ...man.pilot_weapons,
        ...man.skills,
        ...man.talents,
    ];
}

export function flatten_npc_manifest(man: NpcItemManifest): LancerItem[] {
    return [...man.npc_classes, ...man.npc_features, ...man.npc_templates];
}

// Counts the sp for systems, weapons, mods, etc
export function count_sp(items: ItemManifest) {
    let acc = 0;
    // Systems
    for (let sys of items.mech_systems) {
        acc += sys.data.data.sp;
    }

    // Mods
    //for(let mod of items.mo

    // Weapons
    for (let wep of items.mech_weapons) {
        acc += wep.data.data.sp;
    }

    return acc;
}

export function compendium_items_to_lancer_items(x: CompendiumItem[]): ItemManifest {
    return (null as unknown) as any;
}

export function compendium_item_to_lancer_item_data(
    x:
        | Skill
        | Talent
        | CoreBonus
        | License
        | PilotArmor
        | PilotWeapon
        | PilotGear
        | Frame
        | MechWeapon
        | MechSystem
        | NpcClass
        | NpcTemplate
        | NpcFeature
): LancerItemData {
    let conv = new Converter("");
    let result = blank_item_manifest();

    // In most cases, serialized data is fine
    if (x instanceof Skill) {
        //return conv.ISkillData_to_LancerSkillData(Skill.Serialize(x));
    }
    return null as any;
}

// Basically, just wraps the awaiting and null checking aspects of pushing found items to an array
async function push_helper<T>(into: T[], pack: string, name: string) {
    let item = await pack_lookup<T>(pack, name);
    if (item) {
        into.push(item);
    }
}

// Just hunts items down by matching ids
export async function try_lookup_pilot_items(p: Pilot): Promise<LancerItem[]> {
    let mech = p.ActiveMech.ActiveLoadout;
    let pilot = p.Loadout;

    // Pilot data
    let pilot_armor = pilot.Armor;
    let pilot_gear = [...pilot.Gear, ...pilot.ExtendedGear];

    // Mech data
    let mech_weapons = mech.Weapons;
    let mech_systems = mech.Systems;

    // The mech itself
    let mech_frame = p.ActiveMech.Frame;

    // Pilot licenses etc
    let licenses = p.Licenses;
    let core_bonuses = p.CoreBonuses;

    // Skills
    let skills = p.Skills;
    let talents = p.Talents;

    // Consolidate them all
    // let all_items: CompendiumItem[] = [...pilot_weapons, ...pilot_armor, ...pilot_gear, ...mech_weapons, ...mech_systems, mech_frame, ...licenses, ...core_bonuses, ...skills, ...talents];
    let r: LancerItem[] = [];

    for (let x of [...pilot.Weapons, ...pilot.ExtendedWeapons]) {
        await push_helper(r, PILOT_WEAPON_PACK, x.Name);
    }

    for (let x of pilot.Armor) {
        await push_helper(r, PILOT_ARMOR_PACK, x.Name);
    }

    for (let x of [...pilot.Gear, ...pilot.ExtendedGear]) {
        await push_helper(r, PILOT_GEAR_PACK, x.Name);
    }

    for (let x of mech.Weapons) {
        await push_helper(r, MECH_WEAPON_PACK, x.Name);
    }

    for (let x of mech.Systems) {
        await push_helper(r, MECH_SYSTEM_PACK, x.Name);
    }

    await push_helper(r, FRAME_PACK, p.ActiveMech.Frame.Name);

    // for(let x of p.Licenses) {
    // await push_helper(r, LICENSE_PACK, x.ID);
    // }

    for (let x of p.CoreBonuses) {
        await push_helper(r, CORE_BONUS_PACK, x.Name);
    }

    for (let x of p.Skills) {
        await push_helper(r, SKILLS_PACK, x.Skill.Name);
    }

    for (let x of p.Talents) {
        await push_helper(r, SKILLS_PACK, x.Talent.Name);
    }

    return r;
}

// Move data to cc from foundry, and vice versa
const COMPENDIUM_CONTENT_PACK = "vtt_cmp";

export async function CompendiumData_as_ContentPack(): Promise<IContentPack> {
    let conv = new Converter("");

    // Get them packs
    let raw_skills = await get_Skills_pack();
    let raw_talents = await get_Talents_pack();
    let raw_core_bonuses = await get_CoreBonuses_pack();
    let raw_armor = await get_PilotArmor_pack();
    let raw_pilot_weapons = await get_PilotWeapons_pack();
    let raw_gear = await get_PilotGear_pack();
    let raw_frames = await get_Frames_pack();
    let raw_systems = await get_MechSystems_pack();
    let raw_weapons = await get_MechWeapons_pack();
    let raw_npc_templates = await get_NpcTemplates_pack();
    let raw_npc_classes = await get_NpcClassses_pack();
    let raw_npc_features = await get_NpcFeatures_pack();

    // Convert
    let skills = raw_skills.map(c => conv.LancerSkillData_to_ISkillData(c.data.data));
    let coreBonuses = raw_core_bonuses.map(c =>
        conv.LancerCoreBonusData_to_ICoreBonusData(c.data.data)
    );
    let frames = raw_frames.map(c => conv.LancerFrameData_to_IFrameData(c.data.data));
    // let mods = raw_frames.map(LancerModData_to_IModData);
    let npcClasses = raw_npc_classes.map(c =>
        conv.LancerNPCClassData_to_INpcClassData(c.data.data)
    );
    let npcFeatures = raw_npc_features.map(c =>
        conv.LancerNPCFeatureData_to_INpcFeatureData(c.data.data)
    );
    let npcTemplates = raw_npc_templates.map(c =>
        conv.LancerNPCTemplateData_to_INpcTemplateData(c.data.data)
    );
    let pilotGear = raw_gear.map(c => conv.LancerPilotGearData_to_IPilotEquipment(c.data.data));
    let pilotArmor = raw_armor.map(c => conv.LancerPilotArmorData_to_IPilotEquipment(c.data.data));
    let pilotWeapons = raw_pilot_weapons.map(c =>
        conv.LancerPilotWeaponData_to_IPilotEquipment(c.data.data)
    );
    let systems = raw_systems.map(c => conv.LancerMechSystemData_to_IMechSystemData(c.data.data));
    let talents = raw_talents.map(c => conv.LancerTalentData_to_ITalentData(c.data.data));
    let weapons = raw_weapons.map(c => conv.LancerMechWeaponData_to_IMechWeaponData(c.data.data));

    let res: IContentPackData = {
        skills,
        coreBonuses,
        frames,

        mods: [], // todo
        npcClasses,
        npcFeatures,
        npcTemplates,
        pilotGear: [...pilotArmor, ...pilotGear, ...pilotWeapons],
        systems,
        tags: [], // todo
        talents,
        weapons,

        factions: [],
        manufacturers: [],
    };

    let icp: IContentPack = {
        active: true,
        data: res,
        id: "vtt_cc",
        manifest: {
            author: "machine-mind",
            item_prefix: "", // We assume that it has been pre-prefixed
            name: "Combined foundry vtt compendium data",
            version: "0.0.0",
        },
    };

    return icp;
}

// Populates the store with all compendium items
export async function reload_store(): Promise<void> {
    // Get all compendium data
    let comp = CompendiumData_as_ContentPack();

    // Get all player data
    // -- todo

    // Add the data
    store.compendium.deleteContentPack(COMPENDIUM_CONTENT_PACK);
    store.compendium.addContentPack(new ContentPack(await comp));
    store.compendium.populate();
}
