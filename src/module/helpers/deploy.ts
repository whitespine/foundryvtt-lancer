import { Deployable, EntryType, RegEntry } from "machine-mind";
import { AnyMMActor, LancerDeployable } from "../actor/lancer-actor";
import { AnyMMItem, LancerItemType } from "../item/lancer-item";
import { DeployableMacroCtx, macro_elt_params } from "../macros";
import { HelperData, inc_if, resolve_dotpath, resolve_helper_dotpath } from "./commons";
import { mm_ref_list_append_slot } from "./refs";

/** Displays a single deployable, in its full glory. Collapsible, button-instantiatable, draggable. 
 * If specified as editable, will have a trash can to delete - this will just delete the deployable reference
 * 
 * @param item_path The path to the MM-wrapped item entity
 * @param deployable_path The path to the particular deployable on the item, FROM THE ITEM. Ex: "Deployables.2"
 * 
 * @argument "macro-actor" If supplied in hash, this MM actor entry will be used as the macro's actor (deployable will be spawned there)
 * @argument "editable" If supplied in hash, this action will be editable
 */
export function single_owned_deployable_preview(item_path: string, deployable_path: string, helper: HelperData): string {
    // Resolve the item
    let item = resolve_helper_dotpath<RegEntry<LancerItemType>>(helper, item_path);
    let deployable = resolve_dotpath(item, deployable_path) as Deployable;
    let editable = helper.hash.editable ?? false; // Decides if we should a delete button, and allow open edit dialogue

    // Make sure we have all of our requirements
    if(!deployable) {
        return `err: deployable/item missing when drawing deployable preview`;
    }

    // Generate a collapsible id for this action, and a delete button
    let collapsible_id = `${item_path}-${deployable_path}`;
    let delete_button = `<a class="gen-control fas fa-trash" data-action="splice" data-path="${item_path}.${deployable_path}"></a>`; // Relies on this being in an array

    // Make context if we are able
    let macro = "";
    if(helper.hash["macro-actor"]) {
        let macro_ctx: DeployableMacroCtx = {
            type: "deployable",
            deployable_path: deployable_path,
            actor: (helper.hash["macro-actor"] as AnyMMActor).as_ref(),
            item: item.as_ref(),
            name: deployable.Name,
            icon: (deployable?.flags as LancerDeployable | undefined)?.img
        }
        macro = `<a class="lancer-macro i--m fas fa-dice-d20" ${macro_elt_params(macro_ctx)}> </a>`;
    }

    return `
        <div class="action card ${inc_if("editable", editable)}" data-path="${deployable_path}">
            <div class="lancer-header">
                <span>
                    ${deployable.Name}
                </span>
                ${inc_if(delete_button, editable)}
                <a class="i--m fas fa-caret-down collapse-ctrl" collapse-id="${collapsible_id}"> </a>
            </div>
            <div class="collapse-item flexrow flex-center" collapse-id="${collapsible_id}">
                ${macro}
                <span>${deployable.Detail}</span>
            </div>
        </div>`;
}

/** Expected arguments:
 * @param item_path String path to the item mm RegEntry object. "mm.ent"
 * @param deployables_path =<string path to the deployables array, FROM THE ITEM>,  ex: ="Deployoables". This differs from standard conventions, but is needed for macros
 * Displays a list of deployables, with buttons to delete. Adding new is done by dragdrop.
 */
export function deployable_list_display(item_path: string, deployables_path: string, helper: HelperData): string {
  let items: string[] = [];
  let edit = helper.hash.editable ?? false;
  let item = resolve_helper_dotpath<AnyMMItem>(helper, item_path);

  let deployables_array = resolve_dotpath(item, deployables_path) as Deployable[];
  if(!deployables_path) return "err";

  // Render each action
  for(let i=0; i<deployables_array.length; i++) {
    items.push(single_owned_deployable_preview(item_path, `${deployables_path}.${i}`, helper)); 
  }

  return `
    <div class="card deployable-list">
      <div class="lancer-header">
        <span class="left">// Deployables</span>
        ${inc_if(mm_ref_list_append_slot(`${item_path}.${deployables_path}`, EntryType.DEPLOYABLE, helper), edit)}
      </div>
      ${items.join("\n")}
    </div>
    `;
}

