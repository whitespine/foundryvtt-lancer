import * as mm from "machine-mind";
import { LancerActor, lancerActorInit } from "./lancer-actor";
import { CompendiumCategory, store, CompendiumItem } from "machine-mind";
import { LancerPilotData, LancerPilotActorData } from "../interfaces";
import { MachineMind_pilot_to_VTT_items_compendium_lookup, ItemManifest, ItemDataManifest } from "../item/util";
import { LancerItem, LancerItemData } from "../item/lancer-item";

export async function import_pilot_by_code(code: string): Promise<mm.Pilot> {
  let data = await mm.loadPilot(code);
  let pilot = mm.Pilot.Deserialize(data);
  return pilot;
}

// Make the specified actor be the specified pilot
export async function update_pilot(pilot: LancerActor, cc_pilot: mm.Pilot): Promise<void> {
  // Initialize a pilot
  // let pilot: LancerActor = await (LancerActor.create({
  // type: "pilot",
  // name: cc_pilot.Callsign,
  // }) as Promise<LancerActor>);
  if (pilot.data.type !== "pilot") {
    throw TypeError("Cannot operate on non-pilot actors");
  }

  // Wipe old items
  for (let item of pilot.items.values()) {
    pilot.deleteOwnedItem(item._id);
  }

  // Get those items
  let items = await MachineMind_pilot_to_VTT_items_compendium_lookup(cc_pilot);

  if (items.errors.length) {
    for (let e of items.errors) {
      ui.notifications.warn(e);
    }
    // Escape
    return;
  }

  // Do some pre-editing before owning
  let item_data = items.items.map(i => duplicate(i.data));
  let item_data_sorted = new ItemDataManifest().add_items(item_data);

  for(let talent of item_data_sorted.talents) {
    let corr_talent_rank = cc_pilot.getTalentRank(talent.data.id);
    talent.data.rank = corr_talent_rank;
  }

  for(let skill of item_data_sorted.talents) {
    let corr_skill_rank = cc_pilot.getTalentRank(skill.data.id);
    skill.data.rank = corr_skill_rank;
  }
  
  // Copy them all
  for (let i of item_data) {
    await pilot.createOwnedItem(i);
  }

  // Get actor data for modification. pd is just a shorthand
  let pad = duplicate(pilot.data) as LancerPilotActorData;
  let pd = pad.data;

  // Basics
  pd.pilot.background = cc_pilot.Background;
  pd.pilot.callsign = cc_pilot.Callsign;
  pd.pilot.grit = cc_pilot.Grit;
  pd.pilot.history = cc_pilot.History;
  pd.pilot.level = cc_pilot.Level;
  pd.pilot.name = cc_pilot.Name;
  pd.pilot.notes = cc_pilot.Notes;
  pd.pilot.quirk = cc_pilot.Quirk;
  pd.pilot.status = cc_pilot.Status;
  pd.pilot.cloud_code = cc_pilot.CloudID;
  pd.pilot.cloud_owner_code = cc_pilot.CloudOwnerID;

  // Stats
  console.log("EVADE BEFORE" + pd.pilot.stats.evasion);
  pd.pilot.stats.armor = cc_pilot.Armor;
  pd.pilot.stats.edef = cc_pilot.EDefense;
  pd.pilot.stats.evasion = cc_pilot.Evasion;
  console.log("EVADE AFTER" + pd.pilot.stats.evasion);
  console.log(cc_pilot);
  pd.pilot.stats.hp.max = cc_pilot.MaxHP;
  pd.pilot.stats.hp.value = cc_pilot.CurrentHP;
  pd.pilot.stats.size = 0.5;
  pd.pilot.stats.speed = cc_pilot.Speed;

  // Now handle mech (ugh)
  let am = cc_pilot.ActiveMech;
  pd.mech.hull = cc_pilot.MechSkills.Hull;
  pd.mech.agility = cc_pilot.MechSkills.Agi;
  pd.mech.systems = cc_pilot.MechSkills.Sys;
  pd.mech.engineering = cc_pilot.MechSkills.Eng;

  if (am) {
    // All dem stats
    pd.mech.armor = am.Armor;
    pd.mech.edef = am.EDefense;
    pd.mech.evasion = am.Evasion;
    pd.mech.heat.max = am.HeatCapacity;
    pd.mech.heat.value = am.CurrentHeat;
    pd.mech.name = am.Name;
    pd.mech.save = am.SaveTarget;
    pd.mech.sp = am.CurrentSP;
    pd.mech.stress.value = am.CurrentStress;
    pd.mech.stress.max = am.MaxStress;
    pd.mech.structure.value = am.CurrentStructure;
    pd.mech.structure.max = am.MaxStructure;
    pd.mech.tech_attack = am.TechAttack;
    pd.mech.repairs.max = am.CurrentRepairs;
    pd.mech.repairs.value = am.RepairCapacity;
    pd.mech.sensors = am.SensorRange;
    pd.mech.size = am.Size;
    pd.mech.speed = am.Speed;
    pd.mech.hp.value = am.CurrentHP;
    pd.mech.hp.max = am.MaxHP;
  }

  pilot.update(pad);

  // Deal with mounts eventually

  // Fixup actor name -- this might not work
  // pilot.token.update({name: cc_pilot.Name});
}

export async function give_pilot_compendium_item(
  cat: CompendiumCategory,
  id: string,
  pilot: LancerActor
): Promise<void> {
  // Validate
  if (pilot.data.type != "pilot") {
    console.error("For now, cannot give items to npcs/deployables this way");
    return;
  }

  // Try getting the item. We assume an initialized store
  let item = store.compendium.getReferenceByIDCareful(cat, id);
  if (!item) {
    console.error(`Unable to find item ${id} of type ${cat}`);
    return;
  }

  if (!(item instanceof CompendiumItem)) {
    console.error(`Cannot currently handle non-compendium items of type ${cat}`);
    return;
  }

  // We have it. Now, matter of appropriately converting it

  // Item.createOwned(, pilot);
}
