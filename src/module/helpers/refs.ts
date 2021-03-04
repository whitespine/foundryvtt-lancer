import {
  EntryType,
  OpCtx,
  RegEntry,
  RegRef,
  Manufacturer,
  LiveEntryTypes,
  License,
} from "machine-mind";
import { is_actor_type, LancerActor } from "../actor/lancer-actor";
import { GENERIC_ITEM_ICON, LANCER, TypeIcon } from "../config";
import { is_item_type, LancerItem, LancerItemType } from "../item/lancer-item";
import { FlagData, FoundryReg } from "../mm-util/foundry-reg";
import { gentle_merge, HelperData, resolve_dotpath, resolve_helper_dotpath } from "./commons";
import { convert_ref_to_native, enable_dragging, enable_simple_ref_dragging, enable_simple_ref_dropping } from "./dragdrop";

// We use these for virtually every ref function
export function ref_commons<T extends EntryType>(
  item: RegEntry<T> | null
): null | {
  img: string;
  name: string;
  ref: RegRef<T>;
} {
  // Nulls beget nulls
  if (!item) {
    return null;
  }

  // Grab flags to retrieve original entity
  let flags = item.flags as FlagData<T>;

  // Declare our results
  let ref = item.as_ref();
  let img: string;
  let name: string;

  // best to know what we are working with
  if (is_actor_type(item.Type)) {
    // 'tis an actor, sire
    let actor = flags.orig_entity as LancerActor<any>;
    img = actor.img;
    name = actor.name;
  } else if (is_item_type(item.Type)) {
    // 'tis an item, m'lord
    let item = flags.orig_entity as LancerItem<any>;
    img = item.img;
    name = item.name;
  } else {
    console.warn("Error making item/actor ref", item);
    return null;
  }

  // Combine and return
  return {
    img,
    name,
    ref,
  };
}

// Creates the params common to all refs, essentially just the html-ified version of a RegRef
export function ref_params(ref: RegRef<any>, path?: string) {
  if (path) {
    return ` data-id="${ref.id}" data-type="${ref.type}" data-reg-name="${ref.reg_name}" data-path="${path}" `;
  } else {
    return ` data-id="${ref.id}" data-type="${ref.type}" data-reg-name="${ref.reg_name}" `;
  }
}

// A multiplexer-helper on machine-mind objects, to create actor/item ref items
// If a slot_path is provided, then this will additionally be a valid drop-settable location for items of this type
export function simple_mm_ref<T extends EntryType>(
  types: T | T[],
  item: RegEntry<T> | null,
  fallback: string = "Empty",
  slot_path: string = "",
  native: boolean = false
) {
  // Flatten types
  if(!Array.isArray(types)) {
    types = [types];
  }
  let flat_types = types.join(" ");

  // Generate commons
  let cd = ref_commons(item);

  // Generate path snippet
  let settable_snippet = "";
  if (slot_path) {
    settable_snippet = ` drop-settable `;
  }

  // Generate native drop snippet if we want one
  let native_drop_snippet = native ? " native-refdrop " : "";

  if (!cd) {
    // Show an icon for each potential type
    let icons = types.map(t => `<img class="ref-icon" src="${TypeIcon(t)}"></img>`);

    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return `<div class="ref list-card ${native_drop_snippet} ${settable_snippet} ${flat_types}" 
                        data-path="${slot_path}" 
                        data-type="${flat_types}">
          ${icons.join(" ")}
          <span class="submajor">${fallback}</span>
      </div>`;
  }

  // The data-type
  return `<div class="valid ${cd.ref.type} ref list-card ${native_drop_snippet} ${settable_snippet}" 
                ${ref_params(cd.ref)}
                data-path="${slot_path}" >
         <img class="ref-icon" src="${cd.img}"></img>
         <span class="submajor">${cd.name}</span>
     </div>`;
}

// The hook to handle clicks on refs. Opens/focuses the clicked item's window
// $(html).find(".ref.valid").on("click", HANDLER_onClickRef);
export async function HANDLER_openRefOnClick<T extends EntryType>(event: any) {
  event.preventDefault();
  event.stopPropagation();
  const element = event.currentTarget;

  const found_entity = await resolve_ref_element(element);
  if (!found_entity) return;

  // We didn't really need the fully resolved class but, hwatever
  // open that link
  let sheet = (found_entity.flags as FlagData<T>).orig_entity.sheet;

  // If the sheet is already rendered:
  if (sheet.rendered) {
    //@ts-ignore foundry-pc-types has a spelling error here
    sheet.maximize(); // typings say "maximise", are incorrect
    //@ts-ignore and it is entirely missing this function
    sheet.bringToTop();
  }

  // Otherwise render the sheet
  else sheet.render(true);
}

// Given a ref element (as created by simple_mm_ref or similar function), reconstruct a RegRef to the item it is referencing
export function recreate_ref_from_element<T extends EntryType>(
  element: HTMLElement
): RegRef<T> | null {
  let id = element.dataset.id;
  let type = element.dataset.type as T | undefined;
  let reg_name = element.dataset.regName;
  let fallback_mmid = "";

  // Check existence
  if (!id) {
    console.error("Could not drag ref: missing data-id");
    return null;
  } else if (!type) {
    console.error("Could not drag ref: missing data-type");
    return null;
  } else if (!reg_name) {
    console.error("Could not drag ref: missing data-reg-name");
    return null;
  }

  let ref: RegRef<T> = {
    id,
    type,
    reg_name,
    fallback_mmid,
  };

  return ref;
}

// Given a ref element (as created by simple_mm_ref or similar function), find the item it is currently referencing
export async function resolve_ref_element<T extends EntryType>(
  element: HTMLElement
): Promise<LiveEntryTypes<T> | null> {
  // We reconstruct the ref
  let ref = recreate_ref_from_element(element) as RegRef<T>;

  // Then we resolve it
  let ctx = new OpCtx();
  let found_entity = await new FoundryReg().resolve(ctx, ref);

  if (found_entity) {
    return found_entity;
  } else {
    console.warn("Failed to resolve ref element");
    return null;
  }
}

//
/**
 * Creates an img that is also a draggable ref. Expects guaranteed data! Use this to display the primary image in item/actor sheets,
 * so that they can be used as a sort of "self" ref
 *
 * @param img_path The path to read/edit said image
 * @param item The reffable MM item/actor itself
 */
export function mm_ref_portrait<T extends EntryType>(
  img: string,
  img_path: string,
  item: RegEntry<T>,
  helper: HelperData
) {
  // Fetch the image
  return `<img class="profile-img ref valid ${item.Type}" src="${img}" data-edit="${img_path}" ${ref_params(item.as_ref())} width="100" height="100"></img>`;
}

// Use this slot callback to add items of certain kind(s) to a list.

// A helper suitable for showing lists of refs that can be deleted/spliced out, or slots that can be nulled
// trash_actions controls what happens when the trashcan is clicked. Delete destroys an item, splice removes it from the array it is found in, and null replaces with null
export function editable_mm_ref_list_item<T extends LancerItemType>(
  item_path: string,
  trash_action: "delete" | "splice" | "null",
  helper: HelperData
) {
  // Fetch the item
  let item_: RegEntry<T> | null = resolve_helper_dotpath(helper, item_path);

  // Generate commons
  let cd = ref_commons(item_);

  if (!cd) {
    // This probably shouldn't be happening
    console.error(`Unable to resolve ${item_path}`);
    return "ERR: Devs, don't try and show null things in a list. this ain't a slot (but it could be if you did some magic)";
  }

  let item = item_!; // cd truthiness implies item truthiness

  // Basically the same as the simple ref card, but with control assed
  return `
    <div class="valid ${cd.ref.type} ref list-card" 
            ${ref_params(cd.ref)}>
      <img class="ref-icon" src="${cd.img}"></img>
      <span>${cd.name}</span>
      <hr class="vsep"> 
      <div class="ref-list-controls">
        <a class="gen-control i--dark" data-action="${trash_action}" data-path="${item_path}"><i class="fas fa-trash"></i></a>
      </div>
    </div>`;
}

// Exactly as above, but drags as a native when appropriate handlers called
export function editable_mm_ref_list_item_native<T extends LancerItemType>(item_path: string, trash_action: "delete" | "splice" | "null", helper: HelperData) {
  return editable_mm_ref_list_item(item_path, trash_action, helper).replace("ref list-card", "ref list-card native-drag");
}

// Put this at the end of ref lists to have a place to drop things. Supports both native and non-native drops
// Allowed types is a list of space-separated allowed types. "mech pilot mech_weapon", for instance
export function mm_ref_list_append_slot(
  item_array_path: string,
  allowed_types: string,
  helper: HelperData
) {
  return `
    <div class="ref list-card ref-list-append ${allowed_types}" 
            data-path="${item_array_path}" 
            data-type="${allowed_types}">
      <span class="major">Add an item</span>
    </div>`;
}

// Enables dropping of items into open slots at the end of lists generated by mm_ref_list_append_slot
// This doesn't handle natives. Requires two callbacks: One to get the item that will actually have its list appended,
// and one to commit any changes to aforementioned object
export function HANDLER_add_ref_to_list_on_drop<T>(
  html: JQuery,
  // Retrieves the data that we will operate on
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  // Use our handy dandy helper
  enable_simple_ref_dropping(html.find(".ref.ref-list-append"), async (entry, evt) => {
    let data = await data_getter();
    let path = evt[0].dataset.path;
    if (path) {
      let array = resolve_dotpath(data, path) as Array<RegEntry<any>>;
      if (Array.isArray(array)) {
        array.push(entry);
        console.log("Success", entry, array);
        await commit_func(data);
      }
    }
  });
}

// Enables dragging of ref cards (or anything with .ref.valid and the appropriate fields)
// Highlights anything labeled with classes "ref drop-settable ${type}" where ${type} is the type of the dragged item
// This doesn't handle natives
export function HANDLER_activate_ref_dragging(html: JQuery) {
  // Allow refs to be dragged arbitrarily
  enable_simple_ref_dragging(html.find(".ref.valid:not(.native-drag)"), (start_stop, src, evt) => {
    // Highlight valid drop points
    let drop_set_target_selector = `.ref.drop-settable.${src[0].dataset.type}`;
    let drop_append_target_selector = `.ref.ref-list-append.${src[0].dataset.type}`;
    let target_selector = `${drop_set_target_selector}, ${drop_append_target_selector}`;

    if (start_stop == "start") {
      $(target_selector).addClass("highlight-can-drop");
    } else {
      $(target_selector).removeClass("highlight-can-drop");
    }
  });
}

// Enables dragging of ref cards (or anything with .ref.valid and the appropriate fields) marked with ".native-drag", converting the dragged item to a native foundry ref
export function HANDLER_activate_native_ref_dragging(html: JQuery) {
  // Allow refs to be dragged arbitrarily
  enable_dragging(html.find(".ref.valid.native-drag"), drag_src => {
      // Drag a JSON ref
      let ref = recreate_ref_from_element(drag_src[0]);
      let native = ref ? convert_ref_to_native(ref) : null;
      if(native) {
        return JSON.stringify(native);
      } else {
        return "";
      }
    });
}

// Allow every ".ref.drop-settable" spot to be dropped onto, with a payload of a JSON RegRef
// Uses same getter/commit func scheme as other callbacks
export function HANDLER_activate_ref_drop_setting<T>(
  html: JQuery,
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  enable_simple_ref_dropping(html.find(".ref.drop-settable"), async (entry, evt) => {
    let data = await data_getter();
    let path = evt[0].dataset.path;
    if (path) {
      // Set the item at the data path
      gentle_merge(data, { [path]: entry });
      await commit_func(data);
    }
  });
}
// Allow every ".ref.drop-settable" spot to be right-click cleared
// Uses same getter/commit func scheme as other callbacks
export function HANDLER_activate_ref_drop_clearing<T>(
  html: JQuery,
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  html.find(".ref.drop-settable").on("contextmenu", async (event) => {
    let data = await data_getter();
    let path = event.currentTarget.dataset.path;
    if(path) {
      // Check there's anything there before doing anything
      if(!resolve_dotpath(data, path)) return;
      gentle_merge(data, { [path]: null });
      await commit_func(data);
    }
  });
}

