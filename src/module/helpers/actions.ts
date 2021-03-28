import { Action, ActivationType, RegEntry, RegRef } from "machine-mind";
import { AnyMMActor } from "../actor/lancer-actor";
import { GenericEditDialogue } from "../apps/generic-editor";
import { AnyMMItem, LancerItemType } from "../item/lancer-item";
import { ActionMacroCtx, macro_elt_params } from "../macros";
import { ext_helper_hash, HelperData, inc_if, resolve_dotpath, resolve_helper_dotpath, std_checkbox, std_enum_select, std_num_input, std_string_input } from "./commons";

/** Full on editor. Pretty ugly. 
 */
export function single_action_editor(path: string, helper: HelperData) {
    // Save ourselves from typing
    const qs = (key: string) => std_string_input(`${path}.${key}`, ext_helper_hash(helper, {label: key}));
    const qn = (key: string) => std_num_input(`${path}.${key}`, ext_helper_hash(helper, {label: key}));
    const qc = (key: string) => std_checkbox(`${path}.${key}`, ext_helper_hash(helper, {label: key}));

    let inputs: string[] = [
        qs("ID"),
        qs("Name"),
        std_enum_select(`${path}.Activation`, ActivationType, ext_helper_hash(helper, {default: ActivationType.None})),
        qn("Cost"),
        std_string_input(`${path}.RawFrequency`, ext_helper_hash(helper, {label: "Frequency"})),
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


/** Displays a single action, in its full glory. Collapsible, rollable, draggable. 
 * If specified as editable, will have a trash can to delete, and edit icon can be clicked to modify
 * 
 * The dice should be clickable to "roll" the action (more on that later - for now just print the description or something)
 * The rest of the banner should be clickable to 
 * 
 * At least one of actor or item path should be probably be specified.
 * However, there are itemless actor actions, or un-owned item actions
 * 
 * @param item_path The path to the MM-wrapped item entity. Can be left as "" if not applicable
 * @param action_path The path to the particular action on the item, FROM THE ITEM. Ex: "Actions.2"
 * 
 * @argument "macro-actor" If supplied in hash, this MM actor entry will be used as the macro's actor
 * @argument "editable" If supplied in hash, this action will be editable
 * @argument "collapse" Whether to wrap in a collapsible card. Default true.
 */
export function single_action_preview(item_path: string, action_path: string, helper: HelperData): string {
    // Resolve the item
    let item = resolve_helper_dotpath<RegEntry<LancerItemType> | null>(helper, item_path, null);
    let action = resolve_dotpath(item, action_path) as Action | null;
    let editable = helper.hash.editable ?? false; // Decides if we should a delete button, and allow open edit dialogue
    let collapse = helper.hash.collapse ?? true; 

    // Override icon if needed
    let icon = helper.hash.icon ?? undefined;

    // Make sure we have all of our requirements
    if(!action) {
        return `err: action missing when drawing action`;
    }

    // Generate a collapsible id for this action, and a delete button
    let collapsible_id = `${item?.RegistryID || ""}-${action_path}`;
    let delete_button = `<a class="gen-control fas fa-trash" data-action="splice" data-path="${action_path}"></a>`; // Relies on this being in an array
    let edit_button =  `<a class="fas fa-edit action-edit-button" data-path="${action_path}"> </a>`;

    // Make context if we are able
    let macro = "";
    if(helper.hash["macro-actor"]) {
        // Decide the icon using activation info
        let icon_spec = "";
        switch(action.Activation) {
            case ActivationType.FullTech:
                icon_spec = "tech-full";
                break;
            case ActivationType.QuickTech:
                icon_spec = "tech-quick";
                break;
            case ActivationType.Full:
                icon_spec = "activation-full";
                break;
            case ActivationType.Quick:
                icon_spec = "activation-quick";
                break;
            case ActivationType.Protocol:
                icon_spec = "protocol";
                break;
            case ActivationType.Free:
                icon_spec = "free-action";
                break;
            case ActivationType.Reaction:
                icon_spec = "reaction";
                break;
        }

        // Decide a name
        let name = (item as any).Name;
        if(!name || action.Name != "New Action") {
            name = action.Name;
        }

        let macro_ctx: ActionMacroCtx = {
            type: "action",
            action_path: action_path,
            actor: (helper.hash["macro-actor"] as AnyMMActor).as_ref(),
            item: item?.as_ref() ?? null,
            name,
            icon: icon_spec ? `/systems/lancer/assets/icons/${icon_spec.replace(/-/g, "_")}.svg` : undefined
        }
        let action_class = icon_spec ? `cci cci-${icon_spec}` : "fa-dice-d20";
        macro = `<a class="lancer-macro i--m ${action_class}" ${macro_elt_params(macro_ctx)}> </a>`;
    }

    if(collapse) {
        return `
            <div class="action card ${inc_if("editable", editable)}" data-path="${action_path}">
                <div class="lancer-header collapse-ctrl" collapse-id="${collapsible_id}">
                    <span>
                        ${action.Name}
                    </span>
                    ${inc_if(edit_button, editable)}
                    ${inc_if(delete_button, editable)}
                </div>
                <div class="collapse-item flexrow flex-center" collapse-id="${collapsible_id}">
                    ${macro}
                    <span>${action.Detail}</span>
                </div>
            </div>`;
    } else {
        return `<div class="flexrow flex-center compact-action-box">
                    ${macro}
                    <span>${action.Detail}</span>
                </div>`
    }
}

/** Expected arguments:
 * @param item_path String path to the item mm RegEntry object. "mm.ent"
 * @param actions_path =<string path to the actions array, FROM THE ITEM>,  ex: ="Profiles.2.Actions". This differs from standard conventions, but is needed for macros
 * @argument "card" Whether to wrap in a card. Default true. If not in a card, no actions will exist
 * Displays a list of actions, with buttons to add/delete (if edit true).
 */
export function action_list_display(item_path: string, actions_path: string, helper: HelperData): string {
  let items: string[] = [];
  let edit = helper.hash.editable ?? false;
  let card = helper.hash.card ?? true;

  let item = resolve_helper_dotpath<AnyMMItem>(helper, item_path);

  let actions_array = resolve_dotpath(item, actions_path) as Action[];
  if(!actions_path) return "err";

  // Render each action
  for(let i=0; i<actions_array.length; i++) {
    items.push(single_action_preview(item_path, `${actions_path}.${i}`, helper)); 
  }

  let body = items.join("\n");

  if(card) {
    return `
        <div class="card action-list">
            <div class="lancer-header">
                <span class="left">// Actions</span>
                ${inc_if(`<a class="gen-control fas fa-plus" data-action="append" data-path="${item_path}.${actions_path}" data-action-value="(struct)action"></a>`, edit)}
            </div>
            ${body}
        </div>
        `;
  } else {
      return body;
  }
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