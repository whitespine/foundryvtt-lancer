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
import { TypeIcon } from "../config";
import { is_item_type, LancerItem, LancerItemType } from "../item/lancer-item";
import { FoundryFlagData, FoundryReg } from "../mm-util/foundry-reg";
import {
  check_double as check_double_click,
  DOMTag,
  gentle_merge,
  HelperData,
  inc_if,
  resolve_dotpath,
  resolve_helper_dotpath,
  temp_apply_class,
} from "./commons";
import {
  convert_ref_to_native,
  enable_dragging,
  enable_simple_ref_dragging,
  enable_simple_ref_dropping,
} from "./dragdrop";

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
  let flags = item.Flags as FoundryFlagData<T>;

  // Declare our results
  let ref = item.as_ref();
  let img: string;
  let name: string;

  // best to know what we are working with
  if (is_actor_type(item.Type)) {
    // 'tis an actor, sire
    let actor = flags.orig_doc as LancerActor<any>;
    img = actor.img;
    name = actor.name;
  } else if (is_item_type(item.Type)) {
    // 'tis an item, m'lord
    let item = flags.orig_doc as LancerItem<any>;
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


/* A multiplexer-helper on machine-mind objects, to create actor/item ref items
 * @argument `slot-path` If a slot_path is provided, then this will additionally be a valid drop location for items of this type
 * @argument `native-drop` If native-drop is true, will have the native-drop class, and will support dropping of native items (e.x. from sidebar, from compendium). Default false
 * @argument `native-drag` If native-drag is true, will produce foundry-native drag/drop data when dragged. Default false.
 * @argument `fallback` If fallback is provided, it will be used in place of the default "Empty" text
 * @argument `readonly` If set, cannot be dropped to
 * @argument `no-img` If set, no icon will be added
 */
export function simple_mm_ref<T extends EntryType>(
  types: T | T[],
  item: RegEntry<T> | null,
  helper: HelperData
) {
  // Get helper data
  let fallback = helper.hash.fallback ?? "Empty";
  let slot_path = helper.hash["slot-path"] || null;
  let native_drop = helper.hash["native-drop"] ?? false;
  let native_drag = helper.hash["native-drag"] ?? false;
  let readonly = helper.hash["readonly"] || false;
  let no_img = helper.hash["no-img"] || false;

  // Flatten types
  if (!Array.isArray(types)) {
    types = [types];
  }

  // Generate commons
  let cd = ref_commons(item);

  // Generate path snippet
  let card = new DOMTag("div").with_class("list-card").ref({
    ref: cd?.ref,
    allow_type: types,
    allow_drop: !readonly && !!slot_path,
    path: slot_path,
    native_drag: !!native_drag,
    native_drop: !!native_drop,
    draggable: true
  }).control({
    // Double-right-click clearing
    context: true,
    action: "null",
    path: slot_path,
  });

  
  // Body depends on what we were given
  if (!cd) {
    // Show an icon for each potential type
    let icons = no_img ? [] : types.map(t => `<img class="ref-icon" src="${TypeIcon(t)}"></img>`);

    // Make an empty ref. Note that it still has path stuff if we are going to be dropping things here
    return card.render(`${icons.join(" ")} <span class="submajor">${fallback}</span>`);
  } else {
    // Show the item icon and its name
    return card.render(`
         ${inc_if(`<img class="ref-icon" src="${cd.img}"></img>`, !no_img)}
         <span class="submajor">${cd.name}</span>
         `);
  }
}

// The hook to handle clicks on refs. Opens/focuses the clicked item's window
// $(html).find(".ref.valid").on("click", HANDLER_onClickRef);
// The .double-click-ref class will require double click to open
export async function HANDLER_activate_click_open_ref<T extends EntryType>(html: JQuery) {
  html.find(".ref.valid").on("click", async event => {
    event.preventDefault();
    event.stopPropagation();
    const element = event.currentTarget;

    if ($(element).hasClass("double-click-ref")) {
      if (!check_double_click("left", element.dataset.id ?? "hmm")) {
        return; // If check fails, but we needed it to be a double click, we just bail. The check will have update appropriate flags
      }
    }

    const found_entity = await resolve_ref_element(element);
    if (!found_entity) return;

    // We didn't really need the fully resolved class but, hwatever
    // open that link
    let sheet = (found_entity.Flags as FoundryFlagData<T>).orig_doc.sheet;

    temp_apply_class($(element), "double-click-success", 1000);

    // If the sheet is already rendered:
    if (sheet.rendered) {
      //@ts-ignore foundry-pc-types has a spelling error here
      sheet.maximize(); // typings say "maximise", are incorrect
      //@ts-ignore and it is entirely missing this function
      sheet.bringToTop();
    } else {
      // Otherwise render the sheet
      sheet.render(true);
    }
  });
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
): string {
  return new DOMTag("img")
  .ref({
    ref: item.as_ref(),
    draggable: true
  })
  .with_prop("src", img)
  .with_prop("data-edit", img_path)
  .with_class("profile-img")
  .with_prop("width", 100)
  .with_prop("height", 100).render("");
}

// Use this slot callback to add items of certain kind(s) to a list.

/** A helper suitable for showing lists of refs that can be deleted/spliced out, or slots that can be nulled
 * trash_actions controls what happens when the trashcan is clicked. Delete destroys an item, splice removes it from the array it is found in, and null replaces with null
 * @argument `native-drag` If set, will be draggable as native items instead
 */
export function editable_mm_ref_list_item<T extends LancerItemType>(
  item_path: string,
  trash_action: "delete" | "splice" | "null",
  helper: HelperData
): string {
  // Fetch the item
  let item_: RegEntry<T> | null = resolve_helper_dotpath(helper, item_path);

  // Generate commons
  let cd = ref_commons(item_);

  if (!cd) {
    // This probably shouldn't be happening
    console.error(`Unable to resolve ${item_path}`);
    return "ERR: Devs, don't try and show null things in a list. this ain't a slot";
  }

  let item = item_!; // cd truthiness implies item truthiness

  // Basically the same as the simple ref card, but with control added
  let card = new DOMTag("div").with_class("list-card").ref({
    ref: cd.ref,
    path: item_path,
    draggable: true,
    native_drag: !!helper.hash["native-drag"]
  });
  return card.render(`
      <img class="ref-icon" src="${cd.img}"></img>
      <span>${cd.name}</span>
      <div class="ref-list-controls">
        <hr class="vsep--m"> 
        <a class="gen-control fas fa-trash" data-action="${trash_action}" data-path="${item_path}"></a>
      </div>`);
}

// Exactly as above, but drags as a native when appropriate handlers called
export function editable_mm_ref_list_item_native<T extends LancerItemType>(
  item_path: string,
  trash_action: "delete" | "splice" | "null",
  helper: HelperData
): string {
  return editable_mm_ref_list_item(item_path, trash_action, helper).replace(
    "ref list-card",
    "ref list-card native-drag"
  );
}

// Put this at the end of ref lists to have a place to drop things. Supports both native and non-native drops
// Allowed types is a list of space-separated allowed types. "mech pilot mech_weapon", for instance
export function mm_ref_list_append_slot(
  item_array_path: string,
  allowed_types: string,
  helper: HelperData
) {
  // Fix up allowed types
  let allowed_types_classes = allowed_types.split(" ").map(t => t.trim()).filter(x => x).map(s => "allow-" + s).join(" ");
  return `
    <div class="ref list-card ref-list-append ${allowed_types_classes}" 
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
        await commit_func(data);
      }
    }
  });
}

// Enables dragging of ref cards (or anything with .ref.valid and the appropriate fields)
// Highlights anything labeled with classes "ref drop ${type}" where ${type} is the type of the dragged item
// This doesn't handle natives
export function HANDLER_activate_ref_dragging(html: JQuery) {
  // Allow refs to be dragged arbitrarily
  enable_simple_ref_dragging(html.find(".ref.valid.drag:not(.native-drag)"), (start_stop, src, evt) => {
    // Highlight valid drop points
    let drop_set_target_selector = `.ref.drop.allow-${src[0].dataset.type}`;
    let drop_append_target_selector = `.ref.ref-list-append.allow-${src[0].dataset.type}`;
    let target_selector = `${drop_set_target_selector}, ${drop_append_target_selector}`;
    console.log(target_selector);

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
  enable_dragging(html.find(".ref.valid.drag.native-drag"), drag_src => {
    // Drag a JSON ref
    let ref = recreate_ref_from_element(drag_src[0]);
    let native = ref ? convert_ref_to_native(ref) : null;
    if (native) {
      return JSON.stringify(native);
    } else {
      return "";
    }
  });
}

// Allow every ".ref.drop" spot to be dropped onto, with a payload of a JSON RegRef
// Uses same getter/commit func scheme as other callbacks
// Note that we don't have to worry about natives here - we can handle both
export function HANDLER_activate_ref_drop_setting<T>(
  html: JQuery,
  data_getter: () => Promise<T> | T,
  commit_func: (data: T) => void | Promise<void>
) {
  enable_simple_ref_dropping(html.find(".ref.drop"), async (entry, evt) => {
    let data = await data_getter();
    let path = evt[0].dataset.path;
    if (path) {
      // Set the item at the data path
      gentle_merge(data, { [path]: entry });
      await commit_func(data);
    }
  });
}

