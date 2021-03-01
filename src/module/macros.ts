// Import TypeScript modules
import { LANCER } from "./config";
import {
  AnyLancerItem,
  LancerCoreBonus,
  LancerItem,
  LancerItemType,
  LancerMechSystem,
  LancerMechWeapon,
  LancerNpcFeature,
  LancerPilotGear,
  LancerPilotWeapon,
} from "./item/lancer-item";
import {
  AnyLancerActor,
  LancerActor,
  LancerActorType,
  LancerMech,
  LancerNpc,
  overheat_mech,
  structure_mech,
} from "./actor/lancer-actor";
// Import JSON data
import {
  BaseActionsMap,
  Action,
  ActivationType,
  AnyRegNpcFeatureData,
  Damage,
  DamageType,
  EntryType,
  LiveEntryTypes,
  Mech,
  MechSystem,
  MechWeapon,
  MechWeaponProfile,
  Npc,
  NpcFeature,
  NpcFeatureType,
  OpCtx,
  Pilot,
  PilotWeapon,
  RegDamageData,
  RegRef,
  Skill,
  TagInstance,
  Talent,
  RegNpcData,
  funcs,
} from "machine-mind";
import { FoundryReg, FoundryRegCat } from "./mm-util/foundry-reg";
import { resolve_dotpath } from "./helpers/commons";
import { OVERCHARGE_SEQUENCE } from "./helpers/actor";

const lp = LANCER.log_prefix;

// No matter what, we want these basics
interface MacroCtx {
  // If not supplied, default to the current speaker (in most cases this will be the selected token). 
  // When drag-generated, will by default be specific to the sheet actor, but not to the sheet token. 
  // If clicked, however, it will be of the sheet token synthetic actor if possible, as we assume in that case maximum specificity is desired
  actor?: RegRef<LancerActorType>; 
  type: string;
}

interface MacroRollMods {
  flat_bonus?: string;
  acc_diff?: number;
  damage_bonus?: RegDamageData[];
}

// Provides all the information needed to lookup an action on an item, and thus to also invoke it as an action
export interface ActionMacroCtx extends MacroCtx, MacroRollMods {
  type: "action";
  item: RegRef<LancerItemType> | null; // Some actions are item-based such as specific skirmishes etc
  action_id: string | number; // The unique identifier of the action of the object. If numeric, use that index. If not matched, just use first found action. (TODO:) Also supports "boost", "ram", "bolster", "stabilize", "lock-on", "grapple"
  // Also supports any action id's located here. Only check these if item action could not resolve by name/index. https://github.com/massif-press/lancer-data/blob/9117622a10cdf692f5aa0ad2c5a27d12cc7c0011/lib/actions.json
  profile?: number; // The profile index, if applicable
}

// Provides all the information needed to roll a tech attack
export interface TechMacroCtx extends MacroCtx, MacroRollMods {
  type: "tech";
  item?: RegRef<LancerItemType>; // Must be included for any tech attack other than fragment signal.
  action_id?: string | number; // The unique identifier of the tech action. Ditto above. Semantics mirror ActionMacroCtx
}

// Provides all information needed skirmishing a weapon
export interface WeaponMacroCtx extends MacroCtx, MacroRollMods {
  type: "weapon";
  item: RegRef<EntryType.MECH_WEAPON | EntryType.PILOT_WEAPON | EntryType.NPC_FEATURE> | null; // Some actions are item-based such as specific skirmishes etc
  profile?: number; // The profile index, if applicable
}

// Provides all information needed for other miscellaneous items. If a weapon or system are provided, will just fire with current profile / use the first available action.
// Attempts to use more specific functions when possible
export interface ItemMacroCtx extends MacroCtx {
  type: "item";
  item: RegRef<LancerItemType>; // Some actions are item-based such as specific skirmishes etc
  rank?: number; // Specifically for skills and talents, which aren't otherwise interesting enough to warrant their own macro types
}

// Just text
export interface TextMacroCtx extends MacroCtx {
  type: "text";
  title: string;
  body: string;
  tags?: TagInstance[]; // Additional tags to display
}

// For rolling struct and stress
export interface StructStressMacroCtx extends MacroCtx {
  type: "struct-stress";
}

export interface OverchargeMacroCtx extends MacroCtx {
  type: "overcharge";
}

// Necessities for rolling a stat
export interface StatMacroCtx extends MacroCtx, MacroRollMods {
  actor: Required<MacroCtx["actor"]>;
  type: "stat";
  stat_path: string; // The path to the stat on the MM entity. EX: "Hull", "Grit", etc
  title: string; // The name to show at the header of the card
}

// Necessities for rolling the details for a Frame's systems. Rolls the current frame of the mech, if avaailable
export interface FrameMacroCtx extends MacroCtx {
  type: "frame";
  subtype: "passive" | "active" | "trait";
  trait_index?: number;
}

// Any of the above
export type AnyMacroCtx =
  | ActionMacroCtx
  | ItemMacroCtx
  | TextMacroCtx
  | StructStressMacroCtx
  | OverchargeMacroCtx
  | WeaponMacroCtx
  | TechMacroCtx
  | StatMacroCtx
  | FrameMacroCtx;

// What we pack into element params, in base36. Can both be used for click-to-roll (in which case sheet-actor will be used), as well as dragging to hotbar.
export interface MacroInfo {
  macro: AnyMacroCtx;
}


// Describes a d20 roll
export interface Lancer20Roll {
  acc_diff?: number; // Positive for accuracy, negative for difficulty. Note that this is just the starting value for the prompt
  flat_bonus?: number; // For grit, deaths head, NPC ram bonus, etc
  title: string; // Title bar of card
  body: string; // Body of card. Effect, etc
}

/**
 * Generic macro preparer for any macro ctx.
 */
export async function prepareMacro(macro: AnyMacroCtx) {
  // Attempt to use more specific options
  if(macro.type == "action") {
    return prepareActionMacro(macro);
  } else if(macro.type == "frame") {
    return prepareFrameMacro(macro);
  } else if(macro.type == "stat") {
    return prepareStatMacro(macro);
  } else if(macro.type == "tech") {
    return prepareTechMacro(macro);
  } else if(macro.type == "text") {
    return prepareTextMacro(macro);
  } else if(macro.type == "weapon") {
    return prepareWeaponMacro(macro);
  }

  // Determine which Actor to speak as
  let actor = await get_macro_speaker(macro.actor);
  let raw_item = await get_macro_item(macro, true);

  // Get its mm
  let mmec = await raw_item.data.data.derived.mmec_promise;
  let item = mmec.ent;

  switch (item.Type) {
    // Skills
    case EntryType.SKILL:
      await rollTriggerMacro(actor, item);
      break;
    // Pilot OR Mech weapon. We prefer direct invocation of prepareAttackMacro, but this is fine
    case "mech_weapon":
    case "pilot_weapon":
      await prepareWeaponMacro({
        ...macro,
        type: "weapon",
        item: macro.item as RegRef<EntryType.PILOT_WEAPON | EntryType.MECH_WEAPON>,
        actor: macro.actor,
      });
      break;
    // Systems. We prefer direct invocation of prepareSystemMacro
    case "mech_system":
      if (item.Actions.length) {
        // Do first action
        let action_data: ActionMacroCtx = {
          ...macro,
          action_id: 0,
          type: "action",
        };
        await prepareActionMacro(action_data);
      } else {
        // Just do a text macro
        prepareTextMacro({
          ...macro,
          body: item.Description,
          title: item.Name,
          type: "text",
        });
      }
      break;
    // Talents
    case "talent":
      await rollTalentMacro(actor, item, macro.rank || item.CurrentRank);
      break;
    // Gear
    case "pilot_gear":
    case "pilot_armor":
      await rollTextMacro(actor, item.Name, item.Description, item.Tags);
      break;
    // Core bonuses can just be text, right?
    case "core_bonus":
      await rollTextMacro(actor, item.Name, item.Effect, []);
      break;
    case "npc_feature":
      // We need to know the tier
      let tier = item.TierOverride || ((actor as LancerNpc).data.data as RegNpcData).tier;
      switch (item.FeatureType) {
        case NpcFeatureType.Weapon:
          await prepareWeaponMacro({
            ...macro,
            type: "weapon",
            item: macro.item as RegRef<EntryType.NPC_FEATURE>,
          });
          break;
        case NpcFeatureType.Tech:
          await prepareTechMacro({
            ...macro,
            type: "tech",
            item: macro.item as RegRef<EntryType.NPC_FEATURE>,
          });
          break;
        case NpcFeatureType.System:
        case NpcFeatureType.Trait:
          await rollTextMacro(actor, item.Name, item.FormattedEffectByTier(tier));
          break;
        case NpcFeatureType.Reaction:
          await rollReactionMacro(actor, item, tier);
          break;
      }
      break;
    default:
      console.log("No macro exists for that item type");
      return ui.notifications.error(`Error - No macro exists for that item type`);
  }
}

// Our standardized method for figuring out who or what is calling a macro.
export async function get_macro_speaker(actor?: RegRef<LancerActorType>): Promise<AnyLancerActor> {
  /**
   * Determine which actor to speak/perform macro as.
   * Our resolution is as follows:
   * - If actor is supplied, first check if an instance of that actor's token is selected. If so, we use that token's synthetic actor instead.
   * - If no actor is supplied, we attempt to use the current selected token's synthetic actor.
   *   - If no token is selected, this will fail.
   *   - It will additionally fail if said actor does not have items required for the macro
   * - If actor is supplied and no matching token is selected, we use that actor's world entry.
   *   - If the actor's world entry token is unlinked, then we fail.
   */

  let was_actor_supplied = !!actor;

  // Get the speaker
  const speaker: {
    scene: string | null; // Scene id, if one exists
    actor: string | null; // Actor ID
    token: string | null; // Specific token id, if applicable
    alias: string; // The token's name, or actor's name, with the former taking priority over the latter
  } = ChatMessage.getSpeaker();

  // Determine which Actor to speak as.
  if (!actor || actor.id === speaker.actor) {
    // Coerce it into a RegRef
    if (!speaker) {
      ui.notifications.error(
        `Macro does not specify an actor, and no valid actor token is selected. Try selecting the actor you wish to perform this macro.`
      );
      console.error("Speaker:", speaker);
      throw new Error("Unable to resolve speaker via ChatMessage.getSpeaker()");
    } else {
      actor = {
        id: speaker.token || speaker.actor || "",
        fallback_mmid: speaker.alias,
        reg_name: speaker.token ? "world|token" : "world|world",
        type: null,
      };
    }
  }

  // Now we 100% have a regref. Simply need to resolve it
  let reg = new FoundryReg();

  // Check cats individuall
  let result = (await reg.resolve_to_foundry_doc(actor)) as AnyLancerActor;
  if (!result) {
    ui.notifications.error(
      `Macro was unable to resolve its bound actor. Does it still exist? See console`
    );
    console.error(
      `===============================================================================\n
Unable to resolve macro actor.\n
Typically this means that whatever actor you dragged this macro off of no longer exists.\n
If this macro was generated for a specific token but you want it to be general to that actor, you might wish to replace the "actor" property in the macro script with the commented out actor value below it.\n
If you want the macro to attempt to invoke itself for ANY actor (For things like Engineering checks), then remove the "actor" property entirely
Foundry will do its best to use the selected token whenever that token is an instance of the bound macro's actor.
`,
      actor
    );
    throw new Error("Unable to resolve speaker from foundry entity db");
  }

  // Sanity check - don't allow macro invocation of unlinked actors if not resolved as token
  //@ts-ignore actorLink isn't documented
  if (result.data?.token?.actorLink && !was_actor_supplied) {
    ui.notifications.error(
      `Macros for an unlinked actor must be invoked with a specific token selected. If this is undesired, link the actor's token prototype.`
    );
  }

  return result;
}

// lil' helper for getting items from macros, since we do that a lot. Note that it is typically simpler to just use resolve functions directly.
// However, this guarantees the item comes from the right actor. I'm not really sure if that matters, but oh well
async function get_macro_item(macro: AnyMacroCtx, required: false): Promise<AnyLancerItem | null>;
async function get_macro_item(macro: AnyMacroCtx, required: true): Promise<AnyLancerItem>;
async function get_macro_item(
  macro: AnyMacroCtx,
  required: boolean
): Promise<AnyLancerItem | null> {
  if (is_item(macro) || is_tech(macro) || is_weapon(macro)) {
    let item = macro.item;
    if (item) {
      return new FoundryReg().resolve_to_foundry_doc(item) as Promise<AnyLancerItem | null>;
    }
  }
  if (required) {
    let item_str = `${(macro as any).item?.id}|${(macro as any).item?.fallback_mmid}`;
    let actor_str = `${macro.actor?.id}|${macro.actor?.fallback_mmid}`;
    let err = `Error preparing macro: could not find Item ${item_str} owned by Actor ${actor_str}.`;
    ui.notifications.warn(err);
    console.error("Couldn't resolve item required for macro", macro);
    throw new Error(err);
  }
  return null;
}

export async function renderMacro(actor: Actor, template: string, templateData: any) {
  const html = await renderTemplate(template, templateData);
  let roll = templateData.roll || templateData.attack;
  let chat_data = {
    user: game.user,
    type: roll ? CONST.CHAT_MESSAGE_TYPES.ROLL : CONST.CHAT_MESSAGE_TYPES.IC,
    roll: roll,
    speaker: {
      actor: actor,
      token: actor.token,
      alias: actor.token ? actor.token.name : null,
    },
    content: html,
  };
  let cm = await ChatMessage.create(chat_data);
  cm.render();
  return Promise.resolve();
}

async function buildAttackRollString(
  title: string,
  acc: number,
  bonus: string
): Promise<string | null> {
  let abort: boolean = false;
  await promptAccDiffModifier(acc, title).then(
    resolve => (acc = resolve),
    reject => (abort = reject)
  );
  if (abort) return null;

  // Do the attack rolling
  let acc_str = acc != 0 ? ` + ${acc}d6kh1` : "";
  return `1d20+${bonus}${acc_str}`;
}

/** Rolls a macro as the specified actor, for the provided stat info */
export async function prepareStatMacro(macro: StatMacroCtx) {
  // Determine which Actor to speak as
  let actor = await get_macro_speaker(macro.actor);
  let ent = await actor.data.data.derived.mmec_promise;
  let stat = resolve_dotpath(ent, macro.stat_path);

  await rollStatMacro(actor, {
    ...macro,
    body: "",
    title: macro.title,
    flat_bonus: stat,
  });
}

async function prepareActionMacro(macro: ActionMacroCtx) {
  // Construct the template
  // const templateData = {
  // title: data.title,
  // effect: data.effect ? data.effect : null,
  // };
  // const template = `systems/lancer/templates/chat/system-card.html`;
  // return renderMacro(actor, template, templateData);
}

// Rollers
async function rollTriggerMacro(actor: Actor, skill: Skill) {
  return await rollStatMacro(actor, {
    acc_diff: 0,
    body: skill.Description,
    title: skill.Name,
    flat_bonus: skill.CurrentRank * 2,
  });
}

// Rolls a d20+acc/diff+bonus
async function rollStatMacro(actor: Actor, data: Lancer20Roll) {
  if (!actor) return Promise.resolve();

  // Get accuracy/difficulty with a prompt
  let acc: number = 0;
  let abort: boolean = false;
  await promptAccDiffModifier(acc).then(
    resolve => (acc = resolve),
    () => (abort = true)
  );
  if (abort) return Promise.resolve();

  // Do the roll
  let acc_str = acc != 0 ? ` + ${acc}d6kh1` : "";
  let roll = new Roll(`1d20+${data.flat_bonus}${acc_str}`).roll();

  const roll_tt = await roll.getTooltip();

  // Construct the template
  const templateData = {
    title: data.title,
    roll: roll,
    roll_tooltip: roll_tt,
    effect: data.body ?? null,
  };
  const template = `systems/lancer/templates/chat/stat-roll-card.html`;
  return renderMacro(actor, template, templateData);
}

async function rollTalentMacro(actor: Actor, talent: Talent, rank: number) {
  // Construct the template
  const templateData = {
    title: talent.Name,
    rank: talent.Rank(rank),
    lvl: talent.CurrentRank,
  };
  const template = `systems/lancer/templates/chat/talent-card.html`;
  return renderMacro(actor, template, templateData);
}

/**
 * Standalone prepare function for attacks, since they're complex.
 */
async function prepareWeaponMacro(macro: WeaponMacroCtx) {
  // Split up args into sensible bits
  let raw_actor = await get_macro_speaker(macro.actor);
  let raw_item = (await get_macro_item(macro, true)) as
    | LancerMechWeapon
    | LancerNpcFeature
    | LancerPilotWeapon;

  // Get as mm
  let item = (await raw_item.data.data.derived.mmec_promise).ent;
  let actor = (await raw_actor.data.data.derived.mmec_promise).ent;

  let corrected: PilotWeapon | MechWeaponProfile | NpcFeature; // Align them so we can get tags
  if (item instanceof MechWeapon) {
    corrected = macro.profile ? item.Profiles[macro.profile] : item.SelectedProfile;
  } else {
    corrected = item;
  }

  // Begin creating our info
  let title = item.Name;
  let flat_bonuses = macro.flat_bonus ? [macro.flat_bonus] : [];
  let acc = macro.acc_diff ?? 0;
  let damage: Damage[] = macro.damage_bonus?.map(d => new Damage(d)) ?? [];
  let tags = corrected.Tags;
  let overkill = corrected.Tags.some(t => t.Tag.IsOverkill);
  let effects: Effect[] = [];
  
  if(corrected.Effect) {
    effects.push({
      title: "EFFECT",
      body:  corrected.Effect
    });
  }

  // Deduce tier, if applicable. Account for override. While we're at it, set on hit
  let tier = 0;
  if (actor instanceof Npc) {
    let feature = item as NpcFeature;
    tier = feature.TierOverride || actor.Tier;
    let on_hit = (item as NpcFeature).OnHit;
    if(on_hit) {
      effects.push({
        title: "EFFECT",
        body: NpcFeature.format_tiered_string(on_hit, tier)
      });
    }
  }

  // Set base attack bonus
  if (actor instanceof Pilot) {
    flat_bonuses.push(actor.Grit.toString());
  } else if (actor instanceof Mech) {
    flat_bonuses.push(actor.AttackBonus.toString());
  } else if (item instanceof NpcFeature) {
    flat_bonuses.push(item.AttackBonus[tier].toString());
  }

  // Set base accuracy
  if (item instanceof NpcFeature) {
    acc = item.Accuracy[tier];
  } else if (item instanceof PilotWeapon || item instanceof MechWeapon) {
    if (corrected.Tags.some(t => t.Tag.IsAccurate)) {
      acc++;
    }
    if (corrected.Tags.some(t => t.Tag.IsInaccurate)) {
      acc--;
    }
  }

  // Set damage
  if (item instanceof NpcFeature) {
    damage.push(...item.Damage[tier]);
  } else if (item instanceof PilotWeapon) {
    damage.push(...item.Damage);
  } else if (item instanceof MechWeapon) {
    damage.push(...item.Profiles[macro.profile ?? 0].BaseDamage); // TODO: Incorporate mods
  }

  // Set hit effects for mech weapons
  if (corrected instanceof MechWeaponProfile) {
    if(corrected.OnAttack) {
      effects.push({
        title: "ON ATTACK",
        body: corrected.OnAttack
      });
    }
    if(corrected.OnHit) {
      effects.push({
        title: "ON HIT",
        body: corrected.OnHit
      });
    }
    if(corrected.OnCrit) {
      effects.push({
        title: "ON CRIT",
        body: corrected.OnCrit
      });
    }
  }

  await rollAttackMacro({
    actor: raw_actor,
    acc,
    damage,
    effects,
    flat_bonus: flat_bonuses.join("+"),
    overkill,
    tags,
    title,
  }).then();
}

// Handles the actual dicing of an attack macro
async function rollAttackMacro({
  actor,
  title,
  effects,
  acc,
  flat_bonus,
  damage,
  tags,
  overkill,
}: {
  actor: AnyLancerActor;
  title: string;
  effects: Effect[];
  acc: number;
  flat_bonus: string;
  damage: Damage[];
  tags: TagInstance[];
  overkill: boolean;
}) {
  let atk_str = await buildAttackRollString(title, acc, flat_bonus);
  if (!atk_str) return;
  let attack_roll = new Roll(atk_str).roll();
  const attack_tt = await attack_roll.getTooltip();

  // Iterate through damage types, rolling each
  let damage_results: Array<{
    roll: Roll;
    tt: HTMLElement | JQuery;
    d_type: DamageType;
  }> = [];
  let overkill_heat: number = 0;
  for (const dam of damage) {
    if (!dam.Value) continue; // Skip undefined and zero damage

    let droll: Roll | null;
    let tt: HTMLElement | JQuery | null;
    try {
      droll = new Roll(dam.Value);

      for (let die_ of droll.dice) {
        //@ts-ignore
        let die = die_ as DiceTerm;
        // @ts-ignore TS is having trouble finding DiceTerm for some reason...
        if (!die instanceof DiceTerm) continue;
        // set an original die count
        var die_count = die.number;
        // double the number of dice rolled on critical
        if (attack_roll.total >= 20) die.number *= 2;
        // add die explosion on 1 and keep the highest of the original number of die
        if (overkill) die.modifiers.push("x1");
        // for both sections above, we want to keep the highest of the die count
        if (attack_roll.total >= 20 || overkill) die.modifiers.push(`kh${die_count}`);
      }

      droll = droll.roll();
      tt = await droll.getTooltip();
    } catch {
      droll = null;
      tt = null;
    }
    if (overkill && droll) {
      // Count overkill heat
      // @ts-ignore
      droll.terms.forEach(p => {
        if (p.results && Array.isArray(p.results)) {
          p.results.forEach((r: any) => {
            if (r.exploded) {
              overkill_heat += 1;
            }
          });
        }
      });
    }
    if (droll && tt) {
      damage_results.push({
        roll: droll,
        tt: tt,
        d_type: dam.DamageType,
      });
    }
  }

  // Inflict overkill heat
  if (
    game.settings.get(LANCER.sys_name, LANCER.setting_automation) &&
    game.settings.get(LANCER.sys_name, LANCER.setting_overkill_heat)
  ) {
    let mech = await actor.data.data.derived.mmec_promise;
    if (mech.ent.Type == EntryType.NPC || mech.ent.Type == EntryType.MECH) {
      mech.ent.CurrentHeat += overkill_heat;
      await mech.ent.writeback();
    }
  }

  // Output
  const templateData = {
    title,
    attack: attack_roll,
    attack_tooltip: attack_tt,
    damages: damage_results,
    overkill_heat: overkill_heat,
    effects,
    tags,
  };
  const template = `systems/lancer/templates/chat/attack-card.html`;
  return await renderMacro(actor, template, templateData);
}

/**
 * Rolls an NPC reaction macro when given the proper data
 * @param actor {Actor} Actor to roll as. Assumes properly prepared item.
 * @param data {LancerReactionMacroData} Reaction macro data to render.
 */
function rollReactionMacro(actor: Actor, reaction: NpcFeature, tier: number) {
  const template = `systems/lancer/templates/chat/reaction-card.html`;
  return renderMacro(actor, template, {
    title: reaction.Name,
    effect: reaction.FormattedEffectByTier(tier),
    trigger: reaction.Trigger,
    tags: reaction.Tags,
  });
}

/**
 * Prepares a macro to present core active information for
 * @param a     String of the actor ID to roll the macro as, and who we're getting core info for
 */
export async function prepareFrameMacro(macro: FrameMacroCtx) {
  // Determine which Actor to speak as
  let actor = await get_macro_speaker(macro.actor);
  let actor_mm = await actor.data.data.derived.mmec_promise;
  let ent = actor_mm.ent;
  if (ent.Type != EntryType.MECH || !ent.Frame) {
    ui.notifications.warn("Can't do frame macros on non-mechs / mechs without frames");
    return;
  }
  // Quick access
  let core = ent.Frame.CoreSystem;
  let trait = ent.Frame.Traits[macro.trait_index ?? 0];

  let title: string;
  let body: string;

  if (macro.subtype == "passive") {
    title = core.PassiveName;
    body = core.PassiveEffect;
  } else if (macro.subtype == "active") {
    title = core.ActiveName;
    body = core.ActiveEffect;
  } else if (macro.subtype == "trait") {
    title = trait?.Name;
    body = trait?.Description;
  } else {
    ui.notifications.warn(`Invalid frame macro subtype "${macro.subtype}"`);
    return;
  }

  // Do what we gotta do
  return rollTextMacro(actor, title, body);
}

/**
 * Given basic information, prepares a generic text-only macro to display descriptions etc
 */
export async function prepareTextMacro(macro: TextMacroCtx) {
  // Determine which Actor to speak as
  let actor = await get_macro_speaker(macro.actor);
  rollTextMacro(actor, macro.title, macro.body, macro.tags).then();
}

/**
 * Given prepared data, handles rolling of a generic text-only macro to display descriptions etc.
 * @param actor {Actor} Actor rolling the macro.
 * @param data {LancerTextMacroData} Prepared macro data.
 */
async function rollTextMacro(
  actor: Actor,
  title: string,
  description: string,
  tags?: TagInstance[]
) {
  if (!actor) return Promise.resolve();

  const template = `systems/lancer/templates/chat/generic-card.html`;
  return renderMacro(actor, template, {
    title,
    description,
    tags,
  });
}

export async function prepareTechMacro(macro: TechMacroCtx) {
  // Split up args into sensible bits
  let raw_actor = await get_macro_speaker(macro.actor);
  let raw_item = (await get_macro_item(macro, true)) as LancerMechSystem | LancerNpcFeature;

  // Get as mm
  let item = (await raw_item.data.data.derived.mmec_promise).ent;
  let actor = (await raw_actor.data.data.derived.mmec_promise).ent;

  // Setup the basics
  let flat_bonuses = macro.flat_bonus ? [macro.flat_bonus] : [];
  let acc = macro.acc_diff ?? 0;
  let action: Action;

  // If it is an npc feature, we check for bonuses. If none given, then use sys
  if (item instanceof NpcFeature && item.FeatureType == NpcFeatureType.Tech) {
    let tier = item.TierOverride || (actor as Npc).Tier;
    let atk_b = item.AttackBonus[tier];
    if (atk_b) {
      flat_bonuses.push(atk_b.toString());
      acc += item.Accuracy[tier] ?? 0;
    } else {
      // use systems instead
      flat_bonuses.push((actor as Npc).Systems.toString());
    }

    // Create a pseudo action
    action = new Action({
      name: item.Name,
      activation: (item.TechType as unknown) as ActivationType, // Close enough
      detail: item.FormattedEffectByTier(tier),
      frequency: "1 / round",
    });
  } else {
    let mech = actor as Mech;
    let sys = item as MechSystem;

    // Use its tech attack
    flat_bonuses.push(mech.TechAttack.toString());

    // Lookup the action on the item
    action =
      sys.Actions.find((a, i) => a.ID == macro.action_id || i == macro.action_id) ?? // Try to find by id/index
      BaseActionsMap.get(macro.action_id?.toString() ?? "") ?? // Try to find in default actions
      sys.Actions[0]; // Try just using the first one

    // Verify that we got an action
    if (!action) {
      ui.notifications.warn(`Failed to resolve tech action ${macro.action_id}`);
      console.error("Couldn't resolve. Actor, Item, Macro:", raw_actor, raw_item, macro);
      return;
    }
  }

  // Make an effect out of the tech option
  let effects = [
    {
      title: action.Name,
      body: action.Detail,
    },
  ];

  // Got all o' the ingredients
  await rollTechMacro(raw_actor, item.Name, acc, flat_bonuses.join("+"), effects, item.Tags);
}

async function rollTechMacro(
  actor: Actor,
  title: string,
  acc: number,
  flat_bonus: string,
  effects: Effect[],
  tags: TagInstance[]
) {
  let atk_str = await buildAttackRollString(title, acc, flat_bonus);
  if (!atk_str) return;
  let attack_roll = new Roll(atk_str).roll();
  const attack_tt = await attack_roll.getTooltip();

  // Output
  const templateData = {
    title,
    attack: attack_roll,
    attack_tooltip: attack_tt,
    effects,
    tags,
  };

  const template = `systems/lancer/templates/chat/tech-attack-card.html`;
  return await renderMacro(actor, template, templateData);
}

// asks for accuracy and difficulty. Returns the result. The supplied accuracy is used as a default value
export async function promptAccDiffModifier(acc?: number, title?: string): Promise<number> {
  if (!acc) acc = 0;
  let diff = 0;
  if (acc < 0) {
    diff = -acc;
    acc = 0;
  }

  let template = await renderTemplate(
    `systems/lancer/templates/window/promptAccDiffModifier.html`,
    { acc: acc, diff: diff }
  );
  return new Promise<number>((resolve, reject) => {
    new Dialog({
      title: title ? `${title} - Accuracy and Difficulty` : "Accuracy and Difficulty",
      content: template,
      buttons: {
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: "Submit",
          callback: async dlg => {
            let accuracy = <string>$(dlg).find(".accuracy").first().val();
            let difficulty = <string>$(dlg).find(".difficulty").first().val();
            let total = parseInt(accuracy) - parseInt(difficulty);
            console.log(
              `${lp} Dialog returned ${accuracy} accuracy and ${difficulty} difficulty resulting in a modifier of ${total}d6`
            );
            resolve(total);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: async () => {
            reject(true);
          },
        },
      },
      default: "submit",
      close: () => reject(true),
    }).render(true);
  });
}

export async function prepareOverchargeMacro(a: OverchargeMacroCtx) {
  // Determine which Actor to speak as
  let raw_actor = await get_macro_speaker(a.actor);
  let actor = (await raw_actor.data.data.derived.mmec_promise).ent;

  // Validate that we're overcharging a mech
  if (actor.Type !== EntryType.MECH) {
    ui.notifications.warn(`Only mechs can overcharge. Ensure you have selected the right token`);
    return null;
  } else {
    let rollText =
      OVERCHARGE_SEQUENCE[funcs.bound_int(actor.CurrentOvercharge, 0, OVERCHARGE_SEQUENCE.length)];
    if (!rollText) {
      ui.notifications.warn(`Error in getting overcharge roll...`);
      return null;
    }

    // Prep data
    let roll = new Roll(rollText).roll();
    let level = actor.CurrentOvercharge + 1;

    // Increment overcharge
    actor.CurrentOvercharge = funcs.bound_int(
      actor.CurrentOvercharge + 1,
      0,
      OVERCHARGE_SEQUENCE.length
    );

    // Only increase heat if we haven't disabled it
    if (
      game.settings.get(LANCER.sys_name, LANCER.setting_automation) &&
      game.settings.get(LANCER.sys_name, LANCER.setting_pilot_oc_heat)
    ) {
      actor.CurrentHeat += roll.total;
    }
    actor.writeback(); // Done modifying it

    const roll_tt = await roll.getTooltip();

    // Construct the template
    const templateData = {
      actorName: raw_actor.name,
      roll,
      level,
      roll_tooltip: roll_tt,
    };
    const template = `systems/lancer/templates/chat/overcharge-card.html`;
    return renderMacro(raw_actor, template, templateData);
  }
}

/**
 * Performs a roll on the overheat table for the given actor
 * @param macro ID of actor to overheat
 */
export async function prepareOverheatMacro(macro: StructStressMacroCtx) {
  // Determine which Actor to speak as
  let raw_actor = await get_macro_speaker(macro.actor);
  let actor = (await raw_actor.data.data.derived.mmec_promise).ent;

  // Verify type
  if (actor.Type == EntryType.NPC || actor.Type == EntryType.MECH) {
    // Hand it off to the actor to overheat
    await overheat_mech(actor);
  } else {
    ui.notifications.warn(
      `Only mechs and npcs can overcharge. Ensure you have selected the right token.`
    );
  }
}

/**
 * Performs a roll on the structure table for the given actor
 * @param a ID of actor to structure
 */
export async function prepareStructureMacro(macro: StructStressMacroCtx) {
  // Determine which Actor to speak as
  let raw_actor = await get_macro_speaker(macro.actor);
  let actor = (await raw_actor.data.data.derived.mmec_promise).ent;

  // Verify type
  if (actor.Type == EntryType.NPC || actor.Type == EntryType.MECH) {
    // Hand it off to the actor to overheat
    await structure_mech(actor);
  } else {
    ui.notifications.warn(
      `Only mechs and npcs can be structured. Ensure you have selected the right token.`
    );
  }
}

// Converts an ActionMacroCtx into the appropriate parameters
export function macro_elt_params(ctx: AnyMacroCtx): string {
  let encoded = btoa(JSON.stringify(ctx));
  return `data-macro-info=${encoded} `;
}

// Inverse of the above method
export function resolve_macro_ctx_from_element(elt: JQuery): ActionMacroCtx {
  let encoded = elt[0].dataset.dataMacroInfo;
  if (encoded) {
    let decoded = atob(encoded);
    return JSON.parse(decoded) as ActionMacroCtx;
  } else {
    throw Error("Couldn't find macro info on the specified element");
  }
}

// Disambiguators
function is_action(ctx: AnyMacroCtx): ctx is ActionMacroCtx {
  return ctx.type == "action";
}

function is_tech(ctx: AnyMacroCtx): ctx is TechMacroCtx {
  return ctx.type == "tech";
}

function is_weapon(ctx: AnyMacroCtx): ctx is WeaponMacroCtx {
  return ctx.type == "weapon";
}

function is_stat(ctx: AnyMacroCtx): ctx is StatMacroCtx {
  return ctx.type == "stat";
}

function is_frame(ctx: AnyMacroCtx): ctx is FrameMacroCtx {
  return ctx.type == "frame";
}

function is_item(ctx: AnyMacroCtx): ctx is ItemMacroCtx {
  return ctx.type == "item";
}

function is_text(ctx: AnyMacroCtx): ctx is TextMacroCtx {
  return ctx.type == "text";
}

interface Effect {
  // Effects, as we expect them when passed to cards
  title: string;
  body: string;
}
