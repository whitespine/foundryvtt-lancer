import * as mm from 'machine-mind';
import { LancerActor, lancerActorInit } from './lancer-actor';
import { CompendiumCategory, store, CompendiumItem } from 'machine-mind';


export async function import_pilot_by_code(code: string): Promise<mm.Pilot> {
    let data = await mm.loadPilot(code);
    let pilot = mm.Pilot.Deserialize(data);
    return pilot;
}

// oh no
export async function ingest_pilot(data: mm.Pilot): Promise<void> {
    // Initialize a pilot
    let pilot: LancerActor = await (LancerActor.create({type: "pilot"}) as Promise<LancerActor>);
    lancerActorInit(pilot);

    // Load their mech


}


export async function give_pilot_compendium_item(cat: CompendiumCategory, id: string, pilot: LancerActor) {
    // Validate
    if(pilot.data.type != "pilot") {
        console.error("For now, cannot give items to npcs/deployables this way");
        return;
    }

    // Try getting the item. We assume an initialized store
    let item = store.compendium.getReferenceByIDCareful(cat, id);
    if(!item) {
        console.error(`Unable to find item ${id} of type ${cat}`);
        return;
    }

    if(!(item instanceof CompendiumItem)) {
        console.error(`Cannot currently handle non-compendium items of type ${cat}`);
        return;
    }

    // We have it. Now, matter of appropriately converting it

    
    Item.createOwned(, pilot);

}