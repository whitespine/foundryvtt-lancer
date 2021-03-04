import { Action, ActivationType, RegEntry, RegRef } from "machine-mind";
import { LancerActorType } from "../actor/lancer-actor";
import { GenericEditDialogue } from "../apps/generic-editor";
import { LancerItemType } from "../item/lancer-item";
import { ActionMacroCtx, macro_elt_params } from "../macros";
import { ext_helper_hash, HelperData, inc_if, resolve_helper_dotpath, std_checkbox, std_enum_select, std_num_input, std_string_input } from "./commons";

/** Full on editor. Pretty ugly. 
 */
export function single_action_editor(path: string, options: HelperData) {
    // Save ourselves from typing
    const qs = (key: string) => std_string_input(`${path}.${key}`, ext_helper_hash(options, {label: key}));
    const qn = (key: string) => std_num_input(`${path}.${key}`, ext_helper_hash(options, {label: key}));
    const qc = (key: string) => std_checkbox(`${path}.${key}`, ext_helper_hash(options, {label: key}));

    let inputs: string[] = [
        qs("ID"),
        qs("Name"),
        std_enum_select(`${path}.Activation`, ActivationType, ext_helper_hash(options, {default: ActivationType.None})),
        qn("Cost"),
        std_string_input(`${path}.RawFrequency`, ext_helper_hash(options, {label: "Frequency"})),
         // std_string_input(`${path}.Init`, ext_helper_hash(options, {label: "Init"})), // Doesn't seem to be implemented yet in CC data
        qs("Trigger"),
        qs("Terse"),
        qs("Detail"),
        qc("AvailableMounted"),
        qc("AvailableUnmounted"),
        qn("HeatCost")
    ];

    // Boil em, mash em, stick em in a card view
    return `
        <div class="card"> 
            <span class="lancer-header">EDIT ACTION</span>
            ${inputs.join("\n")} 
        </div>
    `; 
}




/** 
 * 
 * 
 * actor_path must always be provided. Item path may be "" if no item. Action path always provided
 * 
 */
/** Displays a single action, in its full glory. Collapsible, rollable, draggable. 
 * If specified as editable, will have a trash can to delete, and edit icon can be clicked to modify
 * 
 * The dice should be clickable to "roll" the action (more on that later - for now just print the description or something)
 * The rest of the banner should be clickable to 
 * 
 * At least one of actor or item path should be probably be specified.
 * However, there are itemless actor actions, or un-owned item actions
 * 
 * @param actor_path The path to the MM-wrapped actor entity. Can be left as "" if not applicable
 * @param item_path The path to the MM-wrapped item entity. Can be left as "" if not applicable
 * @param action_path The path to the particular action on the item
 * @argument "editable" If supplied in hash, this action will be editable
 */
export function single_action_preview(actor_path: string, item_path: string, action_path: string, options: HelperData): string {
    // Resolve the item/actor
    let item = resolve_helper_dotpath<RegEntry<LancerItemType> | null>(options, item_path, null);
    let actor = resolve_helper_dotpath<RegEntry<LancerActorType> | null>(options, actor_path, null);
    let action = resolve_helper_dotpath<Action | null>(options, action_path, null);
    let editable = options.hash.editable ?? false; // Decides if we should a delete button, and allow open edit dialogue

    // Override icon if needed
    let icon = options.hash.icon ?? undefined;

    // Make sure we have all of our requirements
    if(!action) {
        return `err: action missing when drawing action`;
    }

    // Generate a collapsible id for this action, and a delete button
    let collapsible_id = `${actor?.RegistryID || ""}-${item?.RegistryID || ""}-${action.ID || ""}`;
    let delete_button = `<a class="gen-control" data-action="splice" data-path="${action_path}"><i class="fas fa-trash"></i></a>`; // Relies on this being in an array
    let edit_button =  `<a class="fas fa-edit action-edit-button" data-path="${action_path}"> </a>`;

    // Make context if we are able
    let ctx: ActionMacroCtx | null = null;
    if(actor) {
        ctx = {
            type: "action",
            action_id: action.ID || MISSING_ACTION_ID,
            actor: actor?.as_ref(),
            item: item?.as_ref() ?? null,
            name: action.Name,
            icon
        }
    }
    let macro_button = ctx ? `<a class="i--m fas fa-dice-d20 roll-action" ${macro_elt_params(ctx)}> </a>` : "";

    return `
        <div class="action card ${inc_if("editable", editable)}" data-path="${action_path}">
            <div class="lancer-header">
                ${macro_button}
                <span>
                    ${action.Name}
                </span>
                ${inc_if(edit_button, editable)}
                ${inc_if(delete_button, editable)}
                <a class="i--m fas fa-caret-down collapse-ctrl" collapse-id="${collapsible_id}"> </a>
            </div>
            <div class="collapse-item" collapse-id="${collapsible_id}">
                ${action.Detail}
            </div>
        </div>`;
}

const MISSING_ACTION_ID = "Err: Missing ID";
   
/** Expected arguments:
 * - actions_path=<string path to the actions array>,  ex: ="ent.mm.Actiones"
 * Displays a list of actions, with buttons to add/delete (if edit true).
 */
export function action_list_display(actor_path: string, item_path: string, actions_path: string, options: HelperData): string {
  let items: string[] = [];
  let edit = options.hash.editable ?? false;
  let actions_array = resolve_helper_dotpath<Action[]>(options, actions_path);
  if(!actions_path) return "err";

  // Render each action
  for(let i=0; i<actions_array.length; i++) {
    items.push(single_action_preview(actor_path, item_path, `${actions_path}.${i}`, options)); 
  }

  return `
    <div class="card action-list">
      <div class="lancer-header">
        <span class="left">// Actions</span>
        ${inc_if(`<a class="gen-control fas fa-plus" data-action="append" data-path="${actions_path}" data-action-value="(struct)action"></a>`, edit)}
      </div>
      ${items.join("\n")}
    </div>
    `;
}



// Allows right clicking actions to edit them
export function HANDLER_activate_edit_action<T>(
  html: JQuery,
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  let actions = html.find(".action-edit-button");
  actions.on("click", async (event) => {
    // Find the action
    let action_path = event.currentTarget.dataset.path;
    if(!action_path) return;
    let sheet_data = await data_getter();
    return GenericEditDialogue.render_form(sheet_data, single_action_editor(action_path, {
        data: {
            root: sheet_data, 
        },
        hash: {}
    }))
                .then(data => commit_func(data))
                .catch(e => console.error("Action edit cancelled", e))
  });
}

/* For temporary reference: the properties of an action
    ID!: string | null;
    Name!: string;
    Activation!: ActivationType;
    Cost!: number | null;
    Frequency!: Frequency;
    Init!: string | null; // This describes the conditions under which this action becomes available (e.g. activate mimic mesh to get battlefield awareness
    Trigger!: string | null; // What sets this reaction off, if anything
    Terse!: string | null;
    Detail!: string;
    AvailableMounted!: boolean;
    AvailableUnmounted!: boolean;
    HeatCost!: number;
    */