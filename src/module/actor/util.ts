import * as mm from "machine-mind";
import { LancerActor, lancerActorInit } from "./lancer-actor";
import { CompendiumCategory, store, CompendiumItem } from "machine-mind";
import { LancerPilotData, LancerPilotActorData } from "../interfaces";
import { MachineMind_pilot_to_VTT_items_compendium_lookup } from "../item/util";

export async function import_pilot_by_code(code: string): Promise<mm.Pilot> {
  let data = await mm.loadPilot(code);
  let pilot = mm.Pilot.Deserialize(data);
  return pilot;
}

// oh no
export async function update_pilot(pilot: LancerActor, cc_pilot: mm.Pilot): Promise<void> {
  // Initialize a pilot
  // let pilot: LancerActor = await (LancerActor.create({
  // type: "pilot",
  // name: cc_pilot.Callsign,
  // }) as Promise<LancerActor>);
  if (pilot.data.type !== "pilot") {
    throw TypeError("Cannot operate on non-pilot actors");
  }

  // Get data aliases
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
  pd.pilot.stats.armor = cc_pilot.Armor;
  pd.pilot.stats.edef = cc_pilot.EDefense;
  pd.pilot.stats.evasion = cc_pilot.Evasion;
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
  }

  pilot.update(pad);

  // Wipe old items
  for (let item of pilot.items.values()) {
    pilot.deleteOwnedItem(item._id);
  }

  // Get those items
  let items = await MachineMind_pilot_to_VTT_items_compendium_lookup(cc_pilot);
  for (let i of items) {
    await pilot.createOwnedItem(duplicate(i));
  }

  // Deal with mounts eventually

  // Fixup actor name -- this might not work
  // pilot.token.update({name: cc_pilot.Name});
}

export async function give_pilot_compendium_item(
  cat: CompendiumCategory,
  id: string,
  pilot: LancerActor
) {
  // Validate
  if (pilot.data.type != "pilot") {
    console.error("For now, cannot give items to npcs/deployables this way");
    return;
  }

  // Try getting the item. We assume an initialized store
  console.log(store.compendium.getItemCollection(cat));
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
