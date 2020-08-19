import { LancerPilotSheetData, LancerMechData, LancerTalentData, LancerCoreBonusData, LancerSkillData, LancerLicenseData, LancerFrameData, LancerMechLoadoutData, LancerMechSystemData, LancerNPCClassData, LancerNPCTemplateData, LancerMechWeaponData, LancerPilotGearData, LancerPilotWeaponData, LancerPilotArmorData, LancerNPCFeatureData, LancerNPCClassStatsData } from "./interfaces";

// const x: LancerPilotData;
import {IPilotData, IRankedData, IMechData, IMechLoadoutData, IMountData, CompendiumCategory, IEquipmentData, PersistentStore, ITalentData, ISkillData, IContentPack, ICoreBonusData, IFrameData, IWeaponModData, INpcClassData, INpcFeatureData, INpcTemplateData, IPilotGearData, IPilotEquipmentData, IPilotArmorData, IPilotWeaponData, IMechSystemData, IMechWeaponData, store} from "machine-mind";
import { LancerTalent, LancerCoreBonus, LancerSkill, LancerNPCTemplate, LancerNPCClass, LancerPilotArmor } from "./item/lancer-item";
import { IContentPackData, ContentPack } from "machine-mind/dist/classes/ContentPack";
import { INpcClassStats } from "machine-mind/dist/classes/npc/NpcClassStats";
// import { Compendium } from "machine-mind/dist/store/compendium";

// Temporary placeholders for while we work
const NOT_APPLICABLE = "";
const NOT_YET_IMPLEMENTED = "todo";
const CC_VERSION = "ERR"; // this can't be right, but it is what was in my example file

// References a specific lookup to the compendium
interface CompendiumID {
    id: string;
    category: CompendiumCategory
}

// Simple function for generating "unique" keys. TODO: Replace with an actual UUID func
let _ctr = 0;
function uid(): string {
    _ctr += 1;
    return _ctr.toString();
}

export class Converter {
    brew: string;

    constructor(brew: string) {
        this.brew = brew;
    }

// TALENTS
 LancerTalentData_to_IRankedData(t: LancerTalentData): IRankedData {
    return t;
}

 LancerTalentData_to_ITalentData(t: LancerTalentData): ITalentData {
    return {
        id: t.id,
        description: t.description,
        name: t.name,
        ranks: t.ranks, // These are, fortunately, the exact same type, kinda!!!
        brew: this.brew, counters: []
    }
}

// SKILLS
 LancerSkillData_to_IRankedData(t: LancerSkillData): IRankedData {
    return {
        id: t.id,
        rank: t.rank
    }
}

 LancerSkillData_to_ISkillData(t: LancerSkillData): ISkillData {
    return {
        id: t.id,
        brew: this.brew,
        counters: [],
        description: t.description,
        detail: t.detail,
        family: t.family,
        name: t.name
    }
}


// CORE BONUSES
 LancerCoreBonusData_to_CompID(t: LancerCoreBonusData): CompendiumID {
    return {
        id: t.id,
        category: "CoreBonuses"
    };
}

 LancerCoreBonusData_to_ICoreBonusData(t: LancerCoreBonusData): ICoreBonusData {
    return {
        id: t.id,
        brew: this.brew,
        counters: [],
        description: NOT_YET_IMPLEMENTED,
        mounted_effect: t.mounted_effect,
        name: t.name,
        effect: t.effect,
        source: t.source
    };
}

// LICENSES
// Note that this just handles the rank - we will need to do a conversion of the full license elsewhere
 LancerLicenseData_to_IRankedData(t: LancerLicenseData): IRankedData {
    return {
        id: t.name,
        rank: t.rank
    }
}

// FRAMES
 LancerFrameData_to_IFrameData(t: LancerFrameData): IFrameData {
    return {
        brew: this.brew,
        counters: [],
       ...t
    }
}

// MODS
 LancerModData_to_IWeaponModData(t: LancerMechSystemData): IWeaponModData {
    return null as any;
    // TODO!
    // return {
        

    // }
}


// NPCs
 LancerNPCClassStatsData_to_INpcClassStatsData(t: LancerNPCClassStatsData): INpcClassStats {
    return {
        ...t,
        evade: t.evasion,
        sensor: t.sensor_range,
        size: [t.size] // TODO: deal with lossiness here (we're only getting one npc size)
    }
}

 LancerNPCClassData_to_INpcClassData(t: LancerNPCClassData): INpcClassData {
    return {
        id: t.id,
        name: t.name,
        base_features: t.base_features,
        optional_features: t.optional_features,
        stats: this.LancerNPCClassStatsData_to_INpcClassStatsData(t.stats),
        info: {
            flavor: t.flavor_name,
            tactics: t.flavor_description
        },
        brew: this.brew,
        role: NOT_YET_IMPLEMENTED,
        power: 0 //NOT_YET_IMPLEMENTED
    }
}

 LancerNPCFeatureData_to_INpcFeatureData(t: LancerNPCFeatureData): INpcFeatureData {
    return {
        brew: this.brew,
        hide_active: false,
        id: t.id,
        locked: false,
        name: t.name,
        origin: {
            base: t.origin_base,
            name: t.origin_name,
            type: t.origin_type
        },
        tags: t.tags,
        type: t.feature_type,
        bonus: t.bonus,
        effect: t.effect,
        override: t.override
    }
}

 LancerNPCTemplateData_to_INpcTemplateData(t: LancerNPCTemplateData): INpcTemplateData {
    return {
        brew: this.brew,
        base_features: t.basefeatures,
        description: t.description,
        id: t.id,
        name: t.name,
        optional_features: t.optional_features,
        power: 0 // NOT_APPLICABLE
    }
}

// Pilot equipment
 LancerPilotGearData_to_IPilotEquipment(t: LancerPilotGearData): IPilotGearData {
    return {
        brew: this.brew,
        counters: [],
        ...t
    }
}

 LancerPilotWeaponData_to_IPilotEquipment(t: LancerPilotWeaponData): IPilotWeaponData {
    return {
        brew: this.brew,
        counters: [],
        ...t ,
    }
}

 LancerPilotArmorData_to_IPilotEquipment(t: LancerPilotArmorData): IPilotArmorData {
    return {
        brew: this.brew,
        counters: [],
        ...t
    }
}

// SYSTEMS
 LancerMechSystemData_to_IMechSystemData(t: LancerMechSystemData): IMechSystemData {
        return {
            ...t,
        brew: this.brew,
        counters: [],
        type: t.system_type
    }
}

// WEAPONS
 LancerMechWeaponData_to_IMechWeaponData(t: LancerMechWeaponData): IMechWeaponData {
    return {
        ...t,
        brew: this.brew,
        counters: [],
        type: t.weapon_type
    };
}


// TODO: This needs heavy work, but first I need to figure out how mounts be
 LancerMechLoadoutData_to_IMechLoadoutData(t: LancerMechLoadoutData): IMechLoadoutData {
    return {
        id: uid(),
        improved_armament: {
            mount_type: "Flex",
            bonus_effects: [],
            extra: [],
            lock: true,
            slots: []
        }, // convert_equippable_mount(t.mounts,
        integratedMounts: [],
        integratedSystems: [],
        integratedWeapon: {
            mount_type:  "Aux",
            bonus_effects: [],
            extra: [],
            lock: true,
            slots: []
        },
        mounts: [],
        name: "Current Loadout",
        systems: t.systems.map(this.LancerMechSystemData_to_IEquipmentData)
    }
}

// Converts the active state of a system to equip data. Note: still need to do compendium loading
 LancerMechSystemData_to_IEquipmentData(s: LancerMechSystemData): IEquipmentData {
    return {
        cascading: s.cascading,
        destroyed: s.destroyed,
        id: s.id,
        note: s.note,
        // customDamageType: s.
        uses: s.uses
    };
}
}

 function convert_mech(t: LancerMechData, f: LancerFrameData, l: LancerMechLoadoutData, with_id: string): IMechData {
    let loadouts = [convert_loadout(l)];
    return  {
        activations: 1,
        active: true, // We assume only converting the active mech, for the time being
        active_loadout_index: 0, // Also assume a single loadout
        burn: 0, // TODO: When foundry status support rolls out, yo!
        cc_ver: CC_VERSION,
        cloud_portrait: NOT_APPLICABLE,
        conditions: [], // TODO: When foundry status support rolls out, yo!
        current_core_energy: 0, // NOT_YET_IMPLEMENTED
        current_heat: t.heat.value,
        current_hp: t.hp.value,
        current_overcharge: 0, // NOT_YET_IMPLEMENTED
        current_repairs: t.repairs.value,
        current_stress: t.stress.value,
        current_structure: t.structure.value,
        defeat: "", // NOT_YET_IMPLEMENTED
        destroyed: false, // NOT_YET_IMPLEMENTED
        ejected: false, // NOT_YET_IMPLEMENTED - status
        frame: f.name,
        gm_note: "",
        id: with_id,
        loadouts,
        meltdown_imminent: false, // NOT_YET_IMPLEMENTED
        name: t.name,
        notes: "",
        overshield: 0, // NOT_YET_IMPLEMENTED
        portrait: "",
        reactions: [], // DO WE EVEN CARE?
        reactor_destroyed: false, // NOT_YET_IMPLEMENTED
        resistances: [], // NOT_YET_IMPLEMENTED
        statuses: [], // NOT_YET_IMPLEMENTED

        // We just punt this data for now. If we want it, it'd be coming from compcon, not the other way (probably)
        state: {
            actions: 2,
            braced: false,
            bracedCooldown: false,
            history: [],
            move: 0,
            overcharged: false,
            overwatch: false,
            prepare: false,
            redundant: false,
            stage: "",
            turn: 0
        }
    };
}

// Converts to the Compcon canonical format
function pilot_from_vtt(t: LancerPilotSheetData): IPilotData {
    let p = t.data.pilot;
    let m = t.data.mech;
    // Do some sub-parts first
    let talents = t.talents.map(x => this.LancerTalentData_to_IRankedData(x.data.data));
    let core_bonuses = t.core_bonuses.map(x => this.LancerCoreBonusData_to_CompID(x.data.data).id);
    let skills = t.skills.map(x => this.LancerSkillData_to_IRankedData(x.data.data));
    let mech_id = uid();
    let mechs = [convert_mech(t.data.mech, t.frame.data.data, t.data.mech_loadout, mech_id)];

    return {
        id: "unique",
        campaign: NOT_APPLICABLE,
        group: NOT_APPLICABLE,
        sort_index: 0,
        cloudID: NOT_YET_IMPLEMENTED,
        cloudOwnerID: NOT_YET_IMPLEMENTED,
        lastCloudUpdate: NOT_APPLICABLE,
        level: p.level,
        callsign: p.callsign,
        name: p.name,
        player_name: NOT_YET_IMPLEMENTED,
        status: p.status,
        mounted: true, // NOT_YET_IMPLEMENTED
        factionID: NOT_APPLICABLE,
        text_appearance: NOT_APPLICABLE,
        notes: p.notes,
        history: p.history,
        portrait: NOT_APPLICABLE,
        cloud_portrait: NOT_APPLICABLE,
        quirk: p.quirk,
        current_hp: p.stats.hp.value,
        background: p.background,
        mechSkills: [m.hull, m.agility, m.systems, m.engineering],
        licenses: [], // Don't really care
        skills,
        talents,
        core_bonuses,
        reserves: [], // Just track in compcon
        orgs: [], // Ditto
        loadout: {
            armor: [], // TODO
            weapons: [], // TODO
            gear: [], // TODO
            extendedGear: [], // NOT_APPLICABLE
            extendedWeapons: [], // NOT_APPLICABLE
            id: uid() + "pilot_loadout",
            name: "Loadout"
        },
        mechs,
        active_mech: mech_id,
        cc_ver: CC_VERSION,
        counter_data: [], // ICounterSaveData[], TODO ??? Maybe???
        custom_counters: [], // Same ??? object[],
        brews: [this.brew] // TODO
    }
}

// function init_compendium_from_items()
const SKILLS_PACK = "lancer.skills";
  const TALENTS_PACK = "lancer.talents";
  const COREBONUS_PACK = "lancer.core_bonuses";
  const ARMOR_PACK = "lancer.pilot_armor";
  const PILOT_WEAPON_PACK = "lancer.pilot_weapons";
  const GEAR_PACK = "lancer.pilot_gear";
  const FRAME_PACK = "lancer.frames";
  const SYSTEM_PACK = "lancer.systems";
  const WEAPON_PACK = "lancer.weapons";
  const NPC_CLASS_PACK = "lancer.npc_classes";
  const NPC_TEMPLATE_PACK = "lancer.npc_templates";
const NPC_FEATURE_PACK = "lancer.npc_features";

const COMPENDIUM_CONTENT_PACK = "vtt_cmp";

export async function CompendiumData_as_ContentPack(): Promise<IContentPack> {
    let conv = new Converter("");

    // Quick helper
    let gq = (x: string) => game.packs.get(x).getContent().then(g => g.map(v => v.data)) as Promise<any>;

    let raw_skills = (await gq(SKILLS_PACK)) as LancerSkillData[];
    let raw_talents = (await gq(TALENTS_PACK)) as LancerTalentData[];
    let raw_core_bonuses = (await gq(COREBONUS_PACK)) as LancerCoreBonusData[];
    let raw_armor = (await gq(ARMOR_PACK)) as LancerPilotArmorData[];
    let raw_pilot_weapons = (await gq(PILOT_WEAPON_PACK)) as LancerPilotWeaponData[];
    let raw_gear = (await gq(GEAR_PACK)) as LancerPilotGearData[];
    let raw_frames = (await gq(FRAME_PACK)) as LancerFrameData[];
    let raw_systems = (await gq(SYSTEM_PACK)) as LancerMechSystemData[];
    let raw_weapons = (await gq(WEAPON_PACK)) as LancerMechWeaponData[];
    let raw_npc_templates = (await gq(NPC_TEMPLATE_PACK)) as LancerNPCTemplateData[];
    let raw_npc_classes = (await gq(NPC_CLASS_PACK)) as LancerNPCClassData[];
    let raw_npc_features = (await gq(NPC_FEATURE_PACK)) as LancerNPCFeatureData[];

    // Convert
    let skills = raw_skills.map(conv.LancerSkillData_to_ISkillData);
    let coreBonuses = raw_core_bonuses.map(conv.LancerCoreBonusData_to_ICoreBonusData);
    let frames = raw_frames.map(conv.LancerFrameData_to_IFrameData);
    // let mods = raw_frames.map(LancerModData_to_IModData);
    let npcClasses = raw_npc_classes.map(conv.LancerNPCClassData_to_INpcClassData);
    let npcFeatures = raw_npc_features.map(conv.LancerNPCFeatureData_to_INpcFeatureData);
    let npcTemplates = raw_npc_templates.map(conv.LancerNPCTemplateData_to_INpcTemplateData);
    let pilotGear = raw_gear.map(conv.LancerPilotGearData_to_IPilotEquipment);
    let pilotArmor = raw_armor.map(conv.LancerPilotArmorData_to_IPilotEquipment);
    let pilotWeapons = raw_pilot_weapons.map(conv.LancerPilotWeaponData_to_IPilotEquipment);
    let systems = raw_systems.map(conv.LancerMechSystemData_to_IMechSystemData);
    let talents = raw_talents.map(conv.LancerTalentData_to_ITalentData);
    let weapons = raw_weapons.map(conv.LancerMechWeaponData_to_IMechWeaponData);

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
        }
    }

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

// Stores/retrieves. For now does nothing. Might eventually hook into entity ids, perhaps?
export class FauxPersistor extends PersistentStore {
    set_item(key: string, val: any): Promise<void> {
        return null;
    }
    get_item<T>(key: string): Promise<T> {
        return null;    
    }


}