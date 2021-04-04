import { HelperOptions } from "handlebars";
import {
  RegEntry,
  Range,
  Damage,
  RegRef,
  funcs,
  MountType,
  RangeType,
  DamageType,
  SystemMount,
  WeaponMount,
  MechWeaponProfile,
  FrameTrait,
  Bonus,
  SerUtil,
  Action,
  ActivationType,
  EntryType,
} from "machine-mind";
import { AnyMMActor } from "../actor/lancer-actor";
import { HTMLEditDialog } from "../apps/text-editor";
import { LancerActorSheetData, LancerItemSheetData } from "../interfaces";
import { AnyMMItem } from "../item/lancer-item";
import { MMEntityContext } from "../mm-util/helpers";

export type AnySheetData = LancerActorSheetData<any> | LancerItemSheetData<any>;

// A shorthand for only including the first string if the second value is truthy
export function inc_if(val: string, test: any) {
  return test ? val : "";
}

// Simple helper to simplify mapping truthy values to "checked"
export function checked(truthytest: any): string {
  return truthytest ? "checked" : "";
}

// Simple helper to simplify mapping truthy values to "selected"
export function selected(truthytest: any): string {
  return truthytest ? "selected" : "";
}

/** Performs a similar behavior to the foundry inplace mergeObject, but is more forgiving for arrays, is universally non-destructive, and doesn't create new fields (but will create new indices).
 * Expects flattened data. Does not go recursive
 */
export function gentle_merge(dest: any, flat_data: any) {
  // Make sure either both objects or both arrays
  if (!(dest instanceof Object || dest instanceof Array) || !(flat_data instanceof Object)) {
    throw new Error("One of original or other are not Objects or Arrays!");
  }

  // Try to apply each
  for (let [k, v] of Object.entries(flat_data)) {
    let curr = dest;
    let leading = k.split(".");
    let tail = leading.splice(leading.length - 1)[0];

    // Drill down to reach tail, if we can
    for (let p of leading) {
      let next = curr[p];

      curr = next;
      if (!curr) break;
    }

    // If curr still exists and is an array or object, attempt the assignment
    if (curr instanceof Object && curr[tail] !== undefined) {
      // Implicitly hits array as well
      curr[tail] = v;
    }
  }
}

/** Insert an array item specified by a dot pathspec, in place
 * Inserted BEFORE that element. If specified index is beyond the length of the array, will simply be appended.
 * If "delete" specified, deletes (splices) instead. Value is unused
 * Has no effect if target is not an array.
 */
export function array_path_edit(
  target: any,
  flat_path: string,
  value: any,
  mode: "insert" | "delete"
) {
  // Break it up
  flat_path = format_dotpath(flat_path);
  let split = flat_path.split(".");
  let tail = split.splice(split.length - 1)[0];
  let lead = split.join(".");

  let index = parseInt(tail);
  let array = resolve_dotpath(target, lead);
  if (Array.isArray(array) && !Number.isNaN(index)) {
    // Bound our index
    if (index > array.length) {
      index = array.length;
    }
    if (index < 0) {
      // For negative indexes, count back from end, python style.
      // With the caveat that this also shifts behavior to insert AFTER. So, -1 to append to end, -2 to 1 before end, etc.
      index = array.length + index + 1;

      // If still negative, then we've gone backwards past start of list, and so we bound to zero
      if (index < 0) {
        index = 0;
      }
    }

    // Different behavior depending on mode
    if (mode == "delete") {
      array.splice(index, 1);
    } else if (mode == "insert") {
      array.splice(index, 0, value);
    }
  } else {
    console.error(
      `Unable to insert/delete array item "${flat_path}[${tail}]": not an array (or not a valid index)`
    );
  }
}

/** Common to many feature/weapon/system previews. Auto-omits on empty body
 * @argument `outer-classes` to augment the entire effect box
 * @argument `inner-classes` to augment the inner effect box contents
 */
export function effect_box(title: string, text: string, helper: HelperData): string {
  let outer_classes: string = helper.hash["outer-classes"] ?? "";
  let inner_classes: string = helper.hash["inner-classes"] ?? "";

  if (text) {
    return `
      <div class="effect-box ${outer_classes}">
        <span class="effect-title">${title}</span>
        <div class="effect-text ${inner_classes}" style="padding: 0 5px">
          ${text}
        </div>
      </div>
      `;
    // <span class="effect-text" style="padding: 0 5px ">${text}</span>
  } else {
    return "";
  }
}

// JSON parses a string, returning null instead of an exception on a failed parse
export function safe_json_parse(str: string): any | null {
  try {
    let result = JSON.parse(str);
    return result;
  } catch {
    return null;
  }
}

// Check that a parsed result is probably a ref
export function is_ref(v: any): v is RegRef<any> {
  return (v as RegRef<any> | null)?.reg_name !== undefined;
}

// Check that a parsed result is probably an item
// export function is_item(v: any): v is RegRef<any> {
// let vt = v as AnyLancerItem | null; // Better type
// return vt?._id !== undefined && vt?.type !== undefined && LancerItemTypes
// }
// Helper function to format a dotpath to not have any square brackets, instead using pure dot notation
export function format_dotpath(path: string): string {
  return path.replace(/\[/g, ".").replace(/]/g, "");
}

// Helper function to get arbitrarily deep array references
export function resolve_dotpath(object: any, path: string, default_: any = null) {
  return (
    format_dotpath(path)
      .split(".")
      .reduce((o, k) => o?.[k], object) ?? default_
  );
}

/** Oftentimes we don't need a full helper - just its hash/data
 * in cases such as these, we use this type
 * to allow calls to it to be made more easily
 */
export type HelperData = Pick<HelperOptions, "hash" | "data">;

// Helper function to get arbitrarily deep array references, specifically in a HelperData, and with better types for that matter
export function resolve_helper_dotpath<T>(helper: HelperData, path: string): T;
export function resolve_helper_dotpath<T>(helper: HelperData, path: string, default_: T): T;
export function resolve_helper_dotpath(
  helper: HelperData,
  path: string,
  default_: any = null
): any {
  // We're gonna look until we've checked everywhere (including parents) and haven't found
  const false_fail = "MaybeWecanTryagian"; // A temporary default value. Distinguish this from like, a "real" null/default/whatever
  let data = helper.data;

  // Loop until no _parent
  while (data) {
    let resolved = resolve_dotpath(data?.root, path, false_fail);
    if (resolved != false_fail) {
      // Looks like we found something!
      return resolved;
    }
    data = data._parent;
  }

  // We've found nothing even after checking parents. Sad
  return default_;
}
/**
 * Use this when invoking a helper from another helper, and you want to augment the hash args in some way
 * @argument defaults These properties will be inserted iff the hash doesn't already have that value.
 * @argument overrides These properties will be inserted regardless of pre-existing value
 */
export function ext_helper_hash<T extends HelperData>(
  orig_helper: T,
  overrides: T["hash"],
  defaults: T["hash"] = {}
): T {
  return {
    ...orig_helper,
    hash: {
      ...defaults,
      ...orig_helper.hash,
      ...overrides,
    },
    data: orig_helper.data,
  };
}

/** Enables controls designated by the `gen-control` class that can perform any of the following `action`s:
 * - "delete": delete() the item located at data-path
 * - "null": set as null the value at the specified path
 * - "splice": remove the array item at the specified path
 * - "set": set as `data-action-value` the item at the specified path.
 *    - if prefixed with (string), will use rest of val as plain string
 *    - if prefixed with (int), will parse as int
 *    - if prefixed with (float), will parse as float
 *    - if prefixed with (bool), will parse as boolean
 *    - if prefixed with (struct), will refer to the LANCER.control_structs above, generating whatever value matches the key
 * - "append": append the item to array at the specified path, using same semantics as data-action-value
 * - "insert": insert the item to array at the specified path, using same semantics as data-action-value. Resolves path in same way as "splice". Inserts before.
 * all using a similar api: a `data-path` to the item, and an `data-action` to perform on that item. In some cases, a `data-action-value` will be used
 *
 * The data getter and commit func are used to retrieve the target data, and to save it back (respectively).
 *
 * If "data-commit-item" path is set, then we will attempt to call the "writeback()" function of the object specified by that path, instead of (or should it be as well as?) our commit func
 * If "data-control-confirm" is set, then we will show a dialog before proceeding
 * If using `gen-context-control`, it will instead by activated by double right clicking
 */
export function HANDLER_activate_general_controls<
  T extends LancerActorSheetData<any> | LancerItemSheetData<any>
>(
  html: JQuery,
  // Retrieves the data that we will operate on
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  // Shared behavior between left clickables and contextables
  const handle_control_elt = async (event: any) => {
    const elt = event.currentTarget;
    const path = elt.dataset.path;
    const action = elt.dataset.action;
    const data = await data_getter();
    const raw_val: string = elt.dataset.actionValue ?? "";
    const item_override: string = elt.dataset.commitItem ?? "";
    const confirm: boolean = $(elt).hasClass("action-confirm");
    return handle_gen_control(path, action, data, raw_val, item_override, commit_func, confirm);
  };

  // Enable standard left-click buttons
  html.find(".gen-control").on("click", async (event: any) => {
    // Get the id/action
    event.stopPropagation();
    return handle_control_elt(event);
  });

  // Enable right-click functionality
  html.find(".gen-context-control").on("contextmenu", async event => {
    let path = event.currentTarget.dataset.path;
    if(!path) return;

    /* First decide if we're going to do anything, based on if curr_path matches and time within bounds */
    if (check_double("right", path)) {
      event.preventDefault();
      event.stopPropagation();
      return handle_control_elt(event);
    }
  });
}

export type GenControlAction = "delete" | "null" | "splice" | "set" | "append" | "insert";
export async function handle_gen_control<T extends AnySheetData>(
  path: string,
  action: GenControlAction,
  data: T,
  raw_val: string,
  item_override: string,
  commit_func: (data: T) => void | Promise<void>,
  confirm: boolean = false
): Promise<void> {
  if (!path || !data) {
    console.error("Gen control failed: missing path");
  } else if (!action) {
    console.error("Gen control failed: missing action");
  } else if (!data) {
    console.error("Gen control failed: data could not be retrieved");
  }

  // Confirm if we want to do that
  if(confirm) {
    let phrase = "REMOVAL" ;
    if(action == "delete") {
      phrase = "DELETION";
    } else if(action == "append" || action == "insert") {
      phrase = "ADDITION";
    }

    let confirmation = await Dialog.confirm({
      title: "CONFIRMATION REQUIRED",
      content: `CONFIRM ${phrase}?`,
      defaultYes: true,
      yes: async () => true,
      no: () => null,
    }) as unknown as Promise<boolean | null>;
    if(!confirmation) {
      return;
    }
  }

  if (action == "delete") {
    // Find and delete the item at that path
    let item = resolve_dotpath(data, path) as RegEntry<any>;
    return item.destroy_entry();
  } else if (action == "splice") {
    // Splice out the value at path dest, then writeback
    array_path_edit(data, path, null, "delete");
  } else if (action == "null") {
    // Null out the target space
    gentle_merge(data, { [path]: null });
  } else if (["set", "append", "insert"].includes(action)) {
    let result = await parse_control_val(raw_val, data.mm);
    let success = result[0];
    let value = result[1];
    if (!success) {
      console.warn(`Bad data-action-value: ${value}`);
      return; // Bad arg - no effect
    }

    // Multiplex with our parsed actions
    switch (action) {
      case "set":
        gentle_merge(data, { [path]: value });
        break;
      case "append":
        array_path_edit(data, path + "[-1]", value, "insert");
        break;
      case "insert":
        array_path_edit(data, path, value, "insert");
        break;
    }
  } else {
    console.error("Unhandled action: " + action);
  }

  // Handle writing back our changes
  if (item_override) {
    let item = resolve_dotpath(data, item_override);
    try {
      await item.writeback();
    } catch (e) {
      console.error(`Failed to writeback item at path "${item_override}"`);
      return;
    }
  } else {
    await commit_func(data);
  }
}

// Used by above to figure out how to handle "set"/"append" args
// Returns [success: boolean, val: any]
async function parse_control_val(
  raw_val: string,
  ctx: MMEntityContext<any>
): Promise<[boolean, any]> {
  // Declare
  let real_val: string | number | boolean | any;

  // Determine what we're working with
  let match = raw_val.match(/\((.*?)\)(.*)/);
  if (match) {
    let type = match[1];
    let val = match[2];
    switch (type) {
      case "int":
        let parsed_int = parseInt(val);
        if (!Number.isNaN(parsed_int)) {
          return [true, parsed_int];
        }
        break;
      case "float":
        let parsed_float = parseFloat(val);
        if (!Number.isNaN(parsed_float)) {
          return [true, parsed_float];
        }
        break;
      case "bool":
        if (val == "true") {
          return [true, true];
        } else if (val == "false") {
          return [true, false];
        }
      case "struct":
        return control_structs(val, ctx);
    }
  }

  // No success
  return [false, null];
}

// Used by above to insert/set more advanced items. Expand as needed
// Returns [success: boolean, val: any]
async function control_structs(key: string, ctx: MMEntityContext<any>): Promise<[boolean, any]> {
  // Look for a matching result
  switch (key) {
    case "empty_array":
      return [true, []];
    case "npc_stat_array":
      return [true, [0, 0, 0]];
    case "frame_trait":
      let trait = new FrameTrait(ctx.reg, ctx.ctx, funcs.defaults.FRAME_TRAIT());
      return [true, await trait.ready()];
    case "bonus":
      return [true, new Bonus(funcs.defaults.BONUS())];
    case "action":
      return [
        true,
        new Action({
          // TODO: use funcs.defaults.ACTION()
          activation: ActivationType.None,
          detail: "",
          name: "new Action",
        }),
      ];
    case "mount_type":
      return [true, MountType.Main];
    case "range":
      return [
        true,
        new Range({
          type: RangeType.Range,
          val: "5",
        }),
      ];
    case "damage":
      return [
        true,
        new Damage({
          type: DamageType.Kinetic,
          val: "1d6",
        }),
      ];
    case "sys_mount":
      let sys_mount = new SystemMount(ctx.reg, ctx.ctx, { system: null });
      return [true, await sys_mount.ready()];
    case "wep_mount":
      let wep_mount = new WeaponMount(ctx.reg, ctx.ctx, funcs.defaults.WEAPON_MOUNT_DATA());
      return [true, await wep_mount.ready()];
    case "weapon_profile":
      let profile = new MechWeaponProfile(ctx.reg, ctx.ctx, funcs.defaults.WEAPON_PROFILE());
      return [true, await profile.ready()];
  }

  // Didn't find a match
  return [false, null];
}

// Basically just the same as gen-control, except hooks on right clicks
// Uses same getter/commit func scheme as other callbacks
// Assumes that clearing means setting as null
// Must supply a "type" that is either "null" | "splice" | "delete", depending on what clearing means in this context
export function HANDLER_context_gen_controls<T extends AnySheetData>(
  html: JQuery,
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {

}

// Our standardized functions for making simple key-value input pair
// Todo - these could on the whole be a bit fancier, yeah?

/**
 * Our standardized string/number inputs.
 * By default, just invoked with a path expression which is resolved into a value.
 * However, can supply the following
 * - `label`: Prefix the input with a label
 * - `value`: Override the initial value with one resolved from elsewhere. Useful if get/set don't go to same place
 * - `classes`: Additional classes to put on the input.
 * - `label_classes`: Additional classes to put on the label, if one exists.
 * - `default`: If resolved value is undefined, use this
 */
function std_input(path: string, type: string, helper: HelperData) {
  // Get other info
  let input_classes: string = helper.hash["classes"] || "";
  let label: string = helper.hash["label"] || "";
  let label_classes: string = helper.hash["label_classes"] || "";
  let default_val: string = "" + (helper.hash["default"] ?? ""); // May sometimes get zero. Handle that

  let value: string | undefined = helper.hash["value"];
  if (value == undefined) {
    // Resolve
    value = resolve_helper_dotpath(helper, path) ?? default_val;
  }

  let input = `<input class="grow ${input_classes}" name="${path}" value="${value}" type="${type.toLowerCase()}" data-dtype="${type}" />`;

  if (label) {
    return `
    <label class="flexrow no-wrap ${label_classes}">
      <span class="no-grow" style="padding: 2px 5px;">${label}</span> 
      ${input}
    </label>`;
  } else {
    return input;
  }
}

export function std_string_input(path: string, helper: HelperData) {
  return std_input(path, "String", helper);
}

export function std_num_input(path: string, helper: HelperData) {
  return std_input(path, "Number", helper);
}

// Shows a [X] / Y display, where X is an editable value and Y is some total (e.x. max hp)
export function std_x_of_y(x_path: string, x: number, y: number, add_classes: string = "") {
  return ` <div class="flexrow flexcenter no-wrap ${add_classes}">
              <input class="lancer-stat lancer-invisible-input" type="number" name="${x_path}" value="${x}" data-dtype="Number" style="justify-content: left"/>
              <span>/</span>
              <span class="lancer-stat" style="justify-content: left"> ${y}</span>
            </div>`;
}

/**
 * Our standardized checkbox
 * By default, just invoked with a path expression which is resolved into a value, which is used as the initial selection true/false
 * However, can supply the following
 * - `value`: Override the initial value with one resolved from elsewhere. Useful if get/set don't go to same place
 * - `label`: Label to use, if any
 * - `classes`: Additional classes to put on the checkbox itself.
 * - `label_classes`: Additional classes to put on the label, if it exists
 * - `default`: Change the default value if resolution fails. Otherwise, we just use the first one in the enum.
 */
export function std_checkbox(path: string, helper: HelperData) {
  // Get hash args
  let input_classes: string = helper.hash["classes"] || "";
  let label: string = helper.hash["label"] || "";
  let label_classes: string = helper.hash["label_classes"] || "";
  let default_val: boolean = !!helper.hash["default"];

  // Get the value, either by supplied arg, path resolution, or default
  let value: boolean | undefined = helper.hash["value"];
  if (value == undefined) {
    // Resolve
    value = resolve_helper_dotpath(helper, path) ?? default_val;
  }

  let input = `<input class="${input_classes}" name="${path}" ${inc_if(
    "checked",
    value
  )} type="checkbox" />`;
  if (label) {
    return `
    <label class="flexrow flexcenter ${label_classes}">
      <span class="no-grow" style="padding: 2px 5px;">${label}</span>
      ${input}
    </label>`;
  } else {
    return input; // Nothing else needed
  }
}

/**
 * Our standardized select, which allows picking of a choice from an enum of options
 * By default, just invoked with a path expression which is resolved into a value, which is used as the initial selection
 * However, can supply the following
 * - `value`: Override the initial value with one resolved from elsewhere. Useful if get/set don't go to same place
 * - `classes`: Additional classes to put on the select.
 * - `default`: Change the default value if resolution fails. Otherwise, we just use the first one in the enum.
 */
export function std_enum_select<T extends string>(
  path: string,
  enum_: { [key: string]: T },
  helper: HelperData
) {
  // Get the classes to add
  let select_classes: string = helper.hash["classes"] || "";

  // Get the default. If undefined, use first found.
  let default_val: T | undefined = helper.hash["default"];
  if (default_val == undefined) {
    default_val = Object.values(enum_)[0];
  }

  // Get the value
  let value: T | undefined = helper.hash["value"];
  if (value == undefined) {
    // Resolve
    value = resolve_helper_dotpath(helper, path, default_val);
  }

  // Restrict value to the enum
  let selected = SerUtil.restrict_enum(enum_, default_val, value!);

  let choices: string[] = [];
  for (let choice of Object.values(enum_)) {
    choices.push(
      `<option value="${choice}" ${inc_if(
        "selected",
        choice === selected
      )}>${choice.toUpperCase()}</option>`
    );
  }

  let select = `
      <select name="${path}" class="${select_classes}" data-dtype="String" style="height: 2em; align-self: center;" >
        ${choices.join("")}
      </select>`;
  return select;
}

// A button to open a popout editor targeting the specified path
export function popout_editor_button(path: string) {
  return `<a class="fas fa-edit popout-text-edit-button" data-path="${path}"> </a>`;
}

export function HANDLER_activate_popout_text_editor<
  T extends LancerActorSheetData<any> | LancerItemSheetData<any>
>(
  html: JQuery,
  // Retrieves the data that we will operate on
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  html.find(".popout-text-edit-button").on("click", async evt => {
    let cd = await data_getter();
    evt.stopPropagation();
    const elt = evt.currentTarget;
    const path = elt.dataset.path;
    if (path) {
      HTMLEditDialog.edit_text(cd, path, commit_func);
    }
  });
}

// A handlebars helper that makes the provided html safe by closing tags and eliminating all on<eventname> attributes
export function safe_html_helper(orig: string) {
  // Do simple html correction
  let doc = document.createElement("div");
  doc.innerHTML = orig;
  orig = doc.innerHTML; // Will have had all tags etc closed

  // then kill all on<event>. Technically this will hit attrs, we don't really care
  let bad = /on[a-zA-Z\-]+=".*?"/g;
  orig = orig.replace(bad, "");
  return orig;
}

// These typically are the exact same so we made a helper for 'em
export function large_textbox_card(title: string, text_path: string, helper: HelperData) {
  let resolved = resolve_helper_dotpath(helper, text_path, "");
  return `
  <div class="card full clipped">
    <div class="lancer-header">
      <span>${title}</span>
      ${popout_editor_button(text_path)}
    </div>
    <div class="desc-text">
      ${safe_html_helper(resolved.trim() || "// MISSING ENTRY //")}
    </div>
  </div>
  `;
}

// Reads the specified form to a JSON object, including unchecked inputs
// Wraps the build in foundry method
export function read_form(
  form_element: HTMLFormElement
): { [key: string]: string | number | boolean } {
  // @ts-ignore The typings don't yet include this utility class
  let form_data = new FormDataExtended(form_element);
  return form_data.toObject();
}

/**
 * Use this for previews of items. Will prevent change/submit events from propagating all the way up, and instead call writeback() on the
 * appropriate entity instead.
 * Control in same way as generic action handler: with the "data-commit-item" property pointing at the MM item
 */
export function HANDLER_intercept_form_changes<T>(
  html: JQuery,
  // Retrieves the data that we will operate on
  data_getter: () => Promise<T> | T
  // commit_func: (data: T) => void | Promise<void> -- not necessary
) {
  // Capture anywhere with a data-commit-item path specified
  let capturers = html.find("[data-commit-item]");
  capturers.on("change", async evt => {
    // Don't let it reach root form
    evt.stopPropagation();

    // Get our form data. We're kinda just replicating what would happen in onUpdate, but minus all of the fancier processing that is needed there
    let form = $(evt.target).parents("form")[0];
    let form_data = read_form(form);

    // Get our target data
    let sheet_data = await data_getter();
    let path = evt.currentTarget.dataset.commitItem;
    if (path) {
      let item_data = resolve_dotpath(sheet_data, path) as AnyMMItem | AnyMMActor;
      if (item_data) {
        // Apply and writeback
        gentle_merge(sheet_data, form_data); // Will apply any modifications to the item
        await item_data.writeback();
      }
    }
  });
}

// Used for tracking double clicks, where applicable. `double_timer` is updated to reflect the most recent click. If we get another event and it matches, then it's a double click!
// Note: doesn't handle nesteds (yet), but it could!
const DOUBLE_INTERVAL = 300;
const double_timer = {
  last_key: null as string | null,
  last_time: 0,
  last_type: "left" as "left" | "right",
};

// Returns true if this matches a double click, false otherwise. Regardless, updates double click
export function check_double(type: "left" | "right", key: string): boolean {
  let curr_time = Date.now();
  let time_since = curr_time - double_timer.last_time;

  if (
    time_since < DOUBLE_INTERVAL && // Was it recent enough?
    double_timer.last_key == key && // Was it at the same element?
    double_timer.last_type == type // Was it the same button?
  ) {
    // If it is true, we reset last_time back to zero so triple clicks don't do a double double click
    double_timer.last_time = 0;

    // But yeah, it was a double, so return true
    return true;
  } else {
    // Setup for the next right click
    double_timer.last_time = curr_time;
    double_timer.last_key = key ?? null;
    double_timer.last_type = type;
    return false;
  }
}

// Briefly applies a class to an element, e.g. to indicate success of some action. Promise resolves when cleared
export function temp_apply_class(to: JQuery, classname: string, time: number): Promise<void> {
  return new Promise((succ, rej) => {
    to.addClass(classname);
    setTimeout(() => {
      to.removeClass(classname);
      succ();
    }, time);
  });
}

// Converts a CSS icon specifier to an icon resource path. Ex: cci-status-exposed -> /systems/lancer/assets/icons/status_exposed
export function icon_class_to_path(icon: string): string {
  icon = icon.replace(/(cci )?cci-/, ""); // Get rid of cci junkh
  return `/systems/lancer/assets/icons/${icon.replace(/-/g, "_")}.svg`;
}


// Helper object for building up dom tags that have a lot of conditional classes etc.
export class DOMTag {
  classes: string[] = []; 
  properties: {[key: string]: string} = {};
  constructor(readonly tag: string) {}

  // Add one ore more classes
  with_class(...class_name: Array<string | null | undefined>): this {
    for(let c of class_name) {
      if(c) {
        this.classes.push(c);
      }
    }
    return this;
  }

  // Add a class iff second arg truthy
  with_class_if(class_name: string, predicate: any): this {
    if(predicate) {
      this.classes.push(class_name);
    }
    return this;
  }

  // Add a prop. Omitted if provided value is null or undefined
  with_prop(prop_name: string, prop_val: string | number | boolean | null | undefined): this {
    if(prop_val == null || prop_val == "") return this;

    this.properties[prop_name] = prop_val.toString();
    return this;
  }

  /** Add ref params - this makes the entire thing function as a valid ref.
   */
 ref(opts: {
    ref?: RegRef<any> | null, // The current ref'd item, if it exists.  Will be used to set data-type, data-reg-name, and data-id, and add the "valid" class as well as the entry type as a class.
    allow_type?: EntryType | Array<EntryType>, // What type(s) are allowed here. Will be used to set data-allowed-type. Will also be added to the classes on the ref as "allow-${type}"
    path?: string | null, // The path to where this item exists/would exist. Used for dropping, deleting, etc. Will be used for data-path
    double_click?: boolean, // If set to true, will set the "double-click-ref" class, which as the name suggests requires a double click to open the ref. Otherwise it is a single click.
    allow_drop?: boolean, // If set to true, will allow dropping to replace this ref.
    native_drag?: boolean, // If set to true, when dragged will produce a foundry native payload. Useful for actors so they can be dragged to canvas
    native_drop?: boolean, // If set to true, then will attempt to process dropped items as native items (in addition to normal processing). Only use this if you're ok with cross references and stuff!
    draggable?: boolean // If set to true, then this ref can be dragged
 }): this {
    let flat_types = "";
    let allowed_type_classes: string[] = [];
    if(opts.allow_type) {
      let as_array = Array.isArray(opts.allow_type) ? opts.allow_type : [opts.allow_type];
      flat_types = as_array.join(" ");
      allowed_type_classes = as_array.map(s => "allow-" + s);
    }
    return this
        .with_class("ref")

        // Allowed type classes for hoverdrop styling + data for actual event resolution
        .with_class(...allowed_type_classes)
        .with_prop("data-allowed-types", flat_types)

        // Ref info
        .with_class_if("valid", opts.ref)
        .with_prop("data-id", opts.ref?.id)
        .with_prop("data-type", opts.ref?.type)
        .with_prop("data-reg-name", opts.ref?.reg_name)
        .with_class(opts.ref?.type)

        // Drag info
        .with_class_if("native-drag", opts.native_drag)
        .with_class_if("native-drop", opts.native_drop)
        .with_class_if("drop", opts.allow_drop)
        .with_class_if("drag", opts.draggable)

        // Other stuff
        .with_prop("data-path", opts.path)
        .with_class_if("double-click-ref", opts.double_click);
}

  /** Configures this to act as a gen_control 
   * Automatically adds the "gen-control"
  */
  control(opts: {
    action: GenControlAction, 
    path: string,
    value?: string,
    confirm?: boolean, // If true, will prompt to confirm
    commit_override?: string, // If provided, is a path to a regentry that will be writeback()'d instead of whatever commit func is provided. Useful for previews
    context?: boolean // If set, will instead by a "gen-context-control"
  }): this {
    // Add basics
    if(opts.context) {
      this.with_class("gen-context-control");
    } else {
      this.with_class("gen-control");
    }

    // Add values
    return this .with_prop("data-path", opts.path)
                .with_prop("data-action", opts.action)
                .with_prop("data-action-value", opts.value)
                .with_prop("data-commit-item", opts.commit_override)
                .with_class_if("action-confirm", opts.confirm);
  }

  render(content: string) {
    let classes = "";
    if(this.classes.length) {
      classes = ` class="${this.classes.join(' ')}"`;
    }
    let props = "";
    for(let key in this.properties) {
      props += ` ${key}="${this.properties[key]}"`;
    }
    return `<${this.tag}${classes}${props}>${content}</${this.tag}>`;
  }
}