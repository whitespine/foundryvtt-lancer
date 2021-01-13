import {
  LancerPilotActorData,
  LancerNPCActorData,
  LancerDeployableActorData,
  LancerNPCData,
  LancerMountData,
} from "../interfaces";
import { LANCER, LancerActorType } from "../config";
import { EntryType, MountType, funcs, RegEntryTypes, RegMechData, OpCtx, Mech, Pilot, Deployable } from "machine-mind";
import { FoundryRegActorData, FoundryRegItemData } from "../mm-util/foundry-reg";
import { LancerHooks, LancerSubscription } from "../helpers/hooks";
import { mm_wrap_actor } from "../mm-util/helpers";
import { system_ready } from "../../lancer";
const lp = LANCER.log_prefix;

export function lancerActorInit(data: any) {
  // Some subtype of ActorData
  console.log(`${lp} Initializing new ${data.type}`);

  // Produce our default data
  let default_data: any = {};
  let display_mode: number = CONST.TOKEN_DISPLAY_MODES.ALWAYS;
  let disposition: number = CONST.TOKEN_DISPOSITIONS.FRIENDLY;
  switch (data.type) {
    case EntryType.NPC:
      default_data = funcs.defaults.NPC();
      disposition = CONST.TOKEN_DISPOSITIONS.HOSTILE;
      break;
    case EntryType.PILOT:
      default_data = funcs.defaults.PILOT();
      break;
    case EntryType.DEPLOYABLE:
      default_data = funcs.defaults.DEPLOYABLE();
      display_mode = CONST.TOKEN_DISPLAY_MODES.HOVER;
      disposition = CONST.TOKEN_DISPOSITIONS.NEUTRAL;
      break;
    case EntryType.MECH:
    default:
      // Idk, just in case
      default_data = funcs.defaults.MECH();
      break;
  }

  // Put in the basics
  mergeObject(data, {
    data: default_data,
    img: `systems/lancer/assets/icons/${data.type}.svg`,
    "token.bar1": { attribute: "current_hp" }, // Default Bar 1 to HP
    "token.bar2": { attribute: "current_heat" }, // Default Bar 2 to Heat
    "token.displayName": display_mode,
    "token.displayBars": display_mode,
    "token.disposition": disposition,
    name: data.name ?? default_data.name, // Set name to match internal
    "token.name": data.name ?? default_data.name, // Set token name to match internal
    "token.actorLink": [EntryType.PILOT, EntryType.MECH].includes(data.type), // Link the token to the Actor for pilots and mechs, but not for NPCs or deployables
  });

  console.log(data);
}

// Use for HP, etc
interface BoundedValue {
  min: number,
  max: number,
  value: number
}

/**
 * Extend the Actor class for Lancer Actors.
 */
export class LancerActor<T extends LancerActorType> extends Actor {
  data!: FoundryRegActorData<T> & {
    data: {
      // Include additional derived info
      derived: {
        // These are all derived and populated by MM
        hp: BoundedValue,
        heat: BoundedValue,
        stress: BoundedValue,
        structure: BoundedValue,
        overshield: BoundedValue, // Though not truly a bounded value, useful to have it as such for bars etc 

        // Other values we particularly appreciate having cached
        evasion: number,
        edef: number,
        save_target: number,
        // todo - bonuses and stuff. How to allow for accuracy?
      }
    }
  };

  /**
   * Change Class or Tier on a NPC. Recalculates all stats on the NPC.
   * @param newNPCClass Stats object from the new Class.
   */
  /*
  async swapNPCClassOrTier(
    newNPCClass: LancerNPCClassStatsData,
    ClassSwap: boolean,
    tier?: string
  ): Promise<void> {
    // Function is only applicable to NPCs.
    if (this.data.type !== "npc") return;

    let data = duplicate(this.data) as LancerNPCActorData;
    const mech = duplicate((this.data as LancerNPCActorData).data.mech);

    if (ClassSwap) {
      data.data.tier = "npc-tier-1";
      tier = "npc-tier-1";
    }
    let i = 0;
    data.data.tier_num = 1;
    switch (tier) {
      case "npc-tier-custom":
        data.data.tier_num = 4;
        await this.update(data);
        return;
      case "npc-tier-2":
        data.data.tier_num = 2;
        i = 1;
        break;
      case "npc-tier-3":
        data.data.tier_num = 3;
        i = 2;
    }
    console.log(`LANCER| Swapping to Tier ${data.data.tier_num}`);

    //HASE
    mech.hull = newNPCClass.hull[i];
    mech.agility = newNPCClass.agility[i];
    mech.systems = newNPCClass.systems[i];
    mech.engineering = newNPCClass.engineering[i];

    // Resources
    mech.hp.max = newNPCClass.hp[i];
    mech.hp.value = mech.hp.max;
    mech.heat.max = newNPCClass.heatcap[i];
    mech.heat.value = 0;
    if (Array.isArray(newNPCClass.structure) && newNPCClass.structure[i]) {
      mech.structure.max = newNPCClass.structure[i];
      mech.structure.value = mech.structure.max;
    } else {
      mech.structure.max = 1;
      mech.structure.value = 1;
    }
    if (Array.isArray(newNPCClass.stress) && newNPCClass.stress[i]) {
      mech.stress.max = newNPCClass.stress[i];
      mech.stress.value = mech.stress.max;
    } else {
      mech.stress.max = 1;
      mech.stress.value = 1;
    }

    // Stats
    mech.size = newNPCClass.size[i];
    mech.armor = newNPCClass.armor[i];
    mech.speed = newNPCClass.speed[i];
    mech.evasion = newNPCClass.evasion[i];
    mech.edef = newNPCClass.edef[i];
    mech.sensors = newNPCClass.sensor_range[i];
    mech.save = newNPCClass.save[i];
    if (Array.isArray(newNPCClass.size) && newNPCClass.size[i]) {
      mech.size = newNPCClass.size[i];
      if (newNPCClass.size[i] === 0.5) {
        data.data.npc_size = "size-half";
      } else {
        data.data.npc_size = `size-${newNPCClass.size[i]}`;
      }
    } else {
      mech.size = 1;
      data.data.npc_size = `size-1`;
    }
    data.data.activations = newNPCClass.activations[i];

    // Update the actor
    data.data.mech = mech;
    await this.update(data);
  }
  */

  /* -------------------------------------------- */

  /** @override 
   * Prepare any derived data which is actor-specific and does not depend on Items or Active Effects
   */
  prepareBaseData() {
    // console.log("Prepare base", this.data.name, this.data);
    // switch ( this.data.type ) {
      // case EntryType.PILOT:
        // break;
      // case "npc":
        // break;
      // case "vehicle":
        // break;
    // }
  }

  /* -------------------------------------------- */

  subscriptions = new Array<LancerSubscription>()


  /** @override 
   * We need to both:
   *  - Re-generate all of our subscriptions
   *  - Re-initialize our MM context
  */
  prepareDerivedData() {
    this.subscriptions?.forEach( subscription => {
      subscription.unsubscribe()
    })
    this.subscriptions = []
    this.setupLancerHooks();

    // Prepare our derived stat data by first initializing an empty has
    let dr: this["data"]["data"]["derived"] = {} as any;

    // We set it via defineProperty so it does not show up in JSON stringifies. Also, no point in having it writeable
    Object.defineProperty(this.data.data, "derived", {
      value: dr,
      configurable: true // So we can overwrite it!
    });


    // Default in fields
    let default_bounded = () => ({
      min: 0,
      max: 0,
      value: 0,
    });
    dr.edef = 0;
    dr.evasion = 0;
    dr.save_target = 0
    dr.heat = default_bounded();
    dr.hp = default_bounded();
    dr.overshield = default_bounded();
    dr.structure = default_bounded();
    dr.stress = default_bounded();

    // Begin the task of wrapping our actor. When done, it will setup our derived fields
    // Need to wait for system ready to avoid having this break if prepareData called during init step (spoiler alert - it is)
    dr.mmec_ready = system_ready.then(() => mm_wrap_actor(this)).then(async mmec => {
      // Always save the context
      dr.mmec = mmec;

      // Depending on type, setup fields more precisely as able
      if(mmec.ent.Type == EntryType.MECH) {
        let mech = mmec.ent as Mech;
        dr.edef = mech.EDefense;
        dr.evasion = mech.Evasion;
        dr.save_target = mech.SaveTarget;

        dr.heat.max = mech.HeatCapacity;
        dr.heat.value = mech.CurrentHeat;

        dr.hp.max = mech.MaxHP;
        dr.hp.value = mech.CurrentHP;

        dr.overshield.max = mech.MaxHP; // As good a number as any i guess.
        dr.overshield.value = mech.Overshield;

        dr.structure.max = mech.MaxStructure;
        dr.structure.value = mech.CurrentStructure;

        dr.stress.max = mech.MaxStress;
        dr.stress.value = mech.CurrentStress;
      } else if (mmec.ent.Type == EntryType.PILOT) {
        // Pilots only really have base stats + hp + overshield
        let pilot = mmec.ent as Pilot;
        dr.edef = pilot.EDefense;
        dr.evasion = pilot.Evasion;

        dr.hp.max = pilot.MaxHP;
        dr.hp.value = pilot.CurrentHP;

        dr.overshield.max = pilot.MaxHP; // As good a number as any i guess.
        dr.overshield.value = pilot.Overshield;
      } else if (mmec.ent.Type == EntryType.DEPLOYABLE) {
        // Ditto, although some deployables could theoretically have heat?
        // let dep = mmec.ent as Deployable;
        console.log("Deployable stats are not yet put in derived data, pending full implementation in machine mind");
      } else if (mmec.ent.Type == EntryType.NPC) {
        console.log("NPC stats are not yet put in derived data, pending full implementation in machine mind");
      }
    });
  }


  /** @override */
  _onUpdate(data: object, options: object, userId: string, context: object) {
    super._onUpdate(data, options, userId, context)
    LancerHooks.call(this)
  }

  setupLancerHooks() {
    let mechData = this.data.data as unknown as RegMechData; // An uncertain casting, which is why we check for pilot
    if (mechData.pilot) {
      let sub = LancerHooks.on(mechData.pilot, (async (pilot: LancerActor<EntryType.PILOT>) => {
        this.update(this.data);
      }).bind(this))
      this.subscriptions.push(sub);
    }
  }
}

// Discrete types for all of our possible generic values
export type LancerMech = LancerActor<EntryType.MECH>;
export type LancerMechData = FoundryRegActorData<EntryType.MECH>;
export type LancerNpc = LancerActor<EntryType.NPC>;
export type LancerNpcData = FoundryRegActorData<EntryType.NPC>;
export type LancerPilot = LancerActor<EntryType.PILOT>;
export type LancerPilotData = FoundryRegActorData<EntryType.PILOT>;
export type LancerDeployable = LancerActor<EntryType.DEPLOYABLE>;
export type LancerDeployableData = FoundryRegActorData<EntryType.DEPLOYABLE>;

/* ------------------------------------ */
/* Handlebars Helpers                    */
/* ------------------------------------ */


/**
 * Handlebars helper for an NPC tier selector
 * @param tier The tier ID string
 */
export function npc_tier_selector(tier: number) {
  let template = `<select id="tier-type" class="tier-control" data-action="update">
    <option value="npc-tier-1" ${tier === 1 ? "selected" : ""}>TIER 1</option>
    <option value="npc-tier-2" ${tier === 2 ? "selected" : ""}>TIER 2</option>
    <option value="npc-tier-3" ${tier === 3 ? "selected" : ""}>TIER 3</option>
    <option value="npc-tier-custom" ${
      tier != 1 && tier != 2 && tier != 3 ? "selected" : ""
    }>CUSTOM</option>
  </select>`;
  return template;
}