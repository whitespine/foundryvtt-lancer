import {
  LancerSkill,
  LancerTalent,
  LancerCoreBonus,
  LancerLicense,
  LancerFrame,
  LancerPilotArmor,
  LancerPilotWeapon,
  LancerPilotGear,
  LancerMechWeapon,
  LancerMechSystem,
  LancerNpcFeature,
  LancerNpcClass,
  LancerNpcTemplate,
  LancerItemData,
  LancerItemType,
} from "./item/lancer-item";
import { RangeType, NPCTag } from "./enums";
import { EffectData } from "./helpers/npc";
import * as mm from "machine-mind";
import {
  EntryType,
  ITagTemplateData,
  License,
  MountType,
  OpCtx,
  Pilot,
  RegEntryTypes,
  Registry,
  RegNpcData,
  RegPilotData,
  RegSkillData,
  TagInstance,
} from "machine-mind";
import { FoundryRegActorData, FoundryRegItemData } from "./mm-util/foundry-reg";
import { MMEntityContext, abracadabra } from "./mm-util/helpers";
import { AnyMMActor, LancerActorType } from "./actor/lancer-actor";
// ------------------------------------------------------
// |       UTILITY
// ------------------------------------------------------

declare interface ResourceData {
  value: number;
  min: number;
  max: number;
}

// ------------------------------------------------------
// |       SHEET DATA TYPES                             |
// ------------------------------------------------------


// These single generic type should cover all basic sheet use cases
export type LancerItemSheetData<T extends LancerItemType> = {
  item: FoundryRegItemData<T>;
  data: LancerItem<T>["data"];

  // Can we edit? 
  editable: boolean;

  // reg ctx
  mm: MMEntityContext<T>;

  // Our owning actor, as an mm entity
  mm_owner: AnyMMActor | null;

  // The license, if it could be recovered
  license: License | null;
};

export interface LancerActorSheetData<T extends LancerActorType> extends ActorSheetData {
  actor: FoundryRegActorData<T>;
  data: LancerActor<T>["data"];
  items: Item[];

  // Can we edit? 
  editable: boolean;

  // reg ctx
  mm: MMEntityContext<T>;
};