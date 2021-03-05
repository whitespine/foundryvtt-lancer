/**
 * TypeScript entry file for Foundry VTT.
 * Registers custom settings, sheets, and constants using the Foundry API.
 *
 * Author: Eranziel
 * Content License: LANCER is copyright 2019, Massif Press Inc.
 * Software License: GNU GPLv3
 */

// Import TypeScript modules
import { LANCER, STATUSES, TypeIcon, WELCOME } from "./module/config";
import { LancerGame } from "./module/lancer-game";
import stringify  = require("json-stringify-pretty-compact");
import {
  AnyLancerActor,
  LancerActor,
  lancerActorInit,
} from "./module/actor/lancer-actor";
import { LancerItem, lancerItemInit } from "./module/item/lancer-item";

import {
  action_type_icon,
  action_type_selector,
} from "./module/helpers/npc";

// Import applications
import { LancerPilotSheet } from "./module/actor/pilot-sheet";
import { LancerDeployableSheet } from "./module/actor/deployable-sheet";
import { LancerMechSheet } from "./module/actor/mech-sheet";
import { LancerItemSheet } from "./module/item/item-sheet";
import { LancerFrameSheet } from "./module/item/frame-sheet";

// Import helpers
import { preloadTemplates } from "./module/preloadTemplates";
import { registerSettings } from "./module/settings";
import {
  compact_tag_list, tag_list_display
} from "./module/helpers/tags";
import * as migrations from "./module/migration";
import { addLCPManager } from "./module/apps/lcpManager";

// Import Machine Mind and helpers
import * as macros from "./module/macros";

// Import node modules
import compareVersions = require("compare-versions");
import { EntryType } from "machine-mind";
import {
  resolve_helper_dotpath,
  popout_editor_button,
  safe_html_helper,
  large_textbox_card,
  std_string_input,
  std_num_input,
  std_checkbox,
  HelperData,
  effect_box,
} from "./module/helpers/commons";
import {
  weapon_size_selector,
  weapon_type_selector,
  range_editor,
  npc_attack_bonus_preview,
  npc_accuracy_preview,
  mech_weapon_refview,
  system_type_selector,
  npc_feature_preview,
  damage_editor,
  pilot_armor_slot,
  pilot_weapon_refview,
  pilot_gear_refview,
  license_ref,
  manufacturer_ref,
  uses_control,
} from "./module/helpers/item";
import { clicker_num_input, clicker_stat_card, compact_stat_edit, compact_stat_view, deployer_slot, npc_clicker_stat_card, npc_tier_selector, overcharge_button, stat_edit_card, stat_edit_card_max, stat_view_card, } from "./module/helpers/actor";
import { editable_mm_ref_list_item, simple_mm_ref, mm_ref_portrait, mm_ref_list_append_slot, editable_mm_ref_list_item_native } from "./module/helpers/refs";
import { mech_loadout, pilot_slot } from "./module/helpers/loadout";
import { LancerNPCSheet } from "./module/actor/npc-sheet";
import { bonus_list_display } from "./module/helpers/bonuses";
import { action_list_display } from "./module/helpers/actions";
import { NativeDrop, resolve_native_drop } from "./module/helpers/dragdrop";
import { funcs } from "machine-mind";

const lp = LANCER.log_prefix;

// import 'material-design-iconic-font/dist/css/material-design-iconic-font.css';

/* ------------------------------------ */
/* Initialize system                    */
/* ------------------------------------ */
Hooks.once("init", async function () {
  console.log(`Initializing LANCER RPG System ${LANCER.ASCII}`);

  // Assign custom classes and constants here
  // Create a Lancer namespace within the game global
  (game as LancerGame).lancer = {
    applications: {
      LancerPilotSheet,
      LancerDeployableSheet,
      LancerItemSheet,
    },
    entities: {
      LancerActor,
      LancerItem,
    },
    prepareMacro: macros.prepareMacro,
    prepareTechMacro: macros.prepareTechMacro,
    prepareStructureMacro: macros.prepareStructureMacro,
    prepareOverchargeMacro: macros.prepareOverchargeMacro,
    prepareOverheatMacro: macros.prepareOverheatMacro,
    prepareItemMacro: macros.prepareMacro,
    prepareStatMacro: macros.prepareStatMacro,
    prepareTextMacro: macros.prepareTextMacro,
    prepareFrameMacro: macros.prepareFrameMacro,
    migrations: migrations,

    // For whitespines testing /('o')/
    tmp: {},
  };

  // Record Configuration Values
  CONFIG.Actor.entityClass = LancerActor;
  CONFIG.Item.entityClass = LancerItem;

  // Register custom system settings
  registerSettings();

  // Set up system status icons
  const keepStock = game.settings.get(LANCER.sys_name, LANCER.setting_stock_icons);
  let statuses: { id: string; label: string; icon: string }[] = [];
  // @ts-ignore The type for statusEffects is wrong. Currently string[], should be the above type
  if (keepStock) statuses = statuses.concat(CONFIG.statusEffects);
  statuses = statuses.concat(STATUSES);
  //@ts-ignore See previous ignore
  CONFIG.statusEffects = statuses;

  // Register Web Components
  customElements.define("card-clipped", class LancerClippedCard extends HTMLDivElement {}, {
    extends: "div",
  });

  // Preload Handlebars templates
  await preloadTemplates();

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("lancer", LancerPilotSheet, { types: [EntryType.PILOT], makeDefault: true });
  Actors.registerSheet("lancer", LancerMechSheet, { types: [EntryType.MECH], makeDefault: true });
  Actors.registerSheet("lancer", LancerNPCSheet, { types: [EntryType.NPC], makeDefault: true });
  Actors.registerSheet("lancer", LancerDeployableSheet, {
    types: [EntryType.DEPLOYABLE],
    makeDefault: true,
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("lancer", LancerItemSheet, {
    types: [
      EntryType.SKILL,
      EntryType.TALENT,
      EntryType.LICENSE,
      EntryType.CORE_BONUS,
      EntryType.RESERVE,
      EntryType.STATUS,
      EntryType.TAG,
      EntryType.PILOT_ARMOR,
      EntryType.PILOT_WEAPON,
      EntryType.PILOT_GEAR,
      EntryType.MECH_SYSTEM,
      EntryType.MECH_WEAPON,
      EntryType.WEAPON_MOD,
      EntryType.NPC_FEATURE,
      EntryType.MANUFACTURER,
      EntryType.QUIRK
    ],
    makeDefault: true,
  });
  Items.registerSheet("lancer", LancerFrameSheet, { types: [EntryType.FRAME], makeDefault: true });
  // Items.registerSheet("lancer", LancerNPCClassSheet, {
  Items.registerSheet("lancer", LancerItemSheet, {
    types: [EntryType.NPC_CLASS, EntryType.NPC_TEMPLATE],
    makeDefault: true,
  });

  // *******************************************************************
  // Register handlebars helpers

  // inc, for those off-by-one errors
  Handlebars.registerHelper("inc", function (value) {
    return parseInt(value) + 1;
  });

  // dec, for those off-by-one errors
  Handlebars.registerHelper("dec", function (value) {
    return parseInt(value) - 1;
  });

  // cons, to concatenate strs. Can take any number of args. Last is omitted (as it is just a handlebars ref object)
  Handlebars.registerHelper("concat", function (...values) {
    return values.slice(0, values.length - 1).join("");
  });

  // rp, to resolve path values strs. Helps use effectively half as many arguments for many helpers/partials
  // Using this, {{{rp path}}} {{path}} would show the value at path, and path, respectively. No need to pass both!
  Handlebars.registerHelper("rp", function(path: string, options: HelperData) {
    return resolve_helper_dotpath(options, path);
  });

  // get-set, to resolve situations wherein we read and write to the same path via "value" and "name" element properties
  Handlebars.registerHelper("getset", function(path: string, options: HelperData) {
    let value = resolve_helper_dotpath(options, path);
    return ` name="${path}" value="${value}" `;
  });

  // get an index from an array
  Handlebars.registerHelper("idx", function (array, index) {
    return array[index];
  });

  // invert the input
  Handlebars.registerHelper("neg", function (value) {
    return parseInt(value) * -1;
  });

  // double the input
  Handlebars.registerHelper("double", function (value) {
    return parseInt(value) * 2;
  });

  // Equal-to evaluation
  Handlebars.registerHelper("eq", function (val1, val2) {
    return val1 === val2;
  });

  // Equal-to evaluation
  Handlebars.registerHelper("neq", function (val1, val2) {
    return val1 !== val2;
  });

  // Logical "or" evaluation
  Handlebars.registerHelper("or", function (val1, val2) {
    return val1 || val2;
  });

  // Greater-than evaluation
  Handlebars.registerHelper("gt", function (val1, val2) {
    return val1 > val2;
  });

  // Greater-than evaluation after applying parseInt to both values
  Handlebars.registerHelper("gtpi", function (val1, val2) {
    val1 = parseInt(val1);
    val2 = parseInt(val2);
    return val1 > val2;
  });

  // Less-than evaluation
  Handlebars.registerHelper("lt", function (val1, val2) {
    return val1 < val2;
  });

  // Greater-than evaluation after applying parseInt to both values
  Handlebars.registerHelper("ltpi", function (val1, val2) {
    val1 = parseInt(val1);
    val2 = parseInt(val2);
    return val1 < val2;
  });

  Handlebars.registerHelper("lower-case", function (str: string) {
    return str.toLowerCase();
  });

  Handlebars.registerHelper("upper-case", function (str: string) {
    return str.toUpperCase();
  });

  Handlebars.registerHelper("safe-html", safe_html_helper);


  // ------------------------------------------------------------------------
  // Generic components
  Handlebars.registerHelper("l-num-input", clicker_num_input);

  // For debugging
  Handlebars.registerHelper("debug_each", function (it, block) {
    // if(typeof a == 'function')
    // a = a.call(this);
    console.log(it);
    var s = "";
    for (let x of it) s += block(x);
    return s;
  });

  Handlebars.registerHelper("textarea-card", large_textbox_card);
  Handlebars.registerHelper("popout-editor-button", popout_editor_button);


  // ------------------------------------------------------------------------
  // Stat helpers
  Handlebars.registerHelper("compact-stat-edit", compact_stat_edit);
  Handlebars.registerHelper("compact-stat-view", compact_stat_view);
  Handlebars.registerHelper("stat-view-card", stat_view_card);
  Handlebars.registerHelper("stat-edit-card", stat_edit_card);
  Handlebars.registerHelper("stat-edit-max-card", stat_edit_card_max);
  Handlebars.registerHelper("clicker-stat-card", clicker_stat_card);
  Handlebars.registerHelper("npc-clicker-stat-card", npc_clicker_stat_card);
  Handlebars.registerHelper("std-string-input", std_string_input);
  Handlebars.registerHelper("std-num-input", std_num_input);
  Handlebars.registerHelper("std-checkbox", std_checkbox);
  

  // ------------------------------------------------------------------------
  // Refs
  Handlebars.registerHelper("simple-ref", simple_mm_ref);
  Handlebars.registerHelper("ref-mm-controllable-item", editable_mm_ref_list_item);
  Handlebars.registerHelper("ref-mm-controllable-item-native", editable_mm_ref_list_item_native);
  Handlebars.registerHelper("ref-mm-list-item-append", mm_ref_list_append_slot);
  Handlebars.registerHelper("pilot-slot", pilot_slot);
  Handlebars.registerHelper("deployer-slot", deployer_slot); // Can be pilot, npc, or mech. Preferably mech, lol
  Handlebars.registerHelper("ref-portrait-img", mm_ref_portrait);

  // ------------------------------------------------------------------------
  // Pilot stuff
  Handlebars.registerHelper("pilot-armor-slot", pilot_armor_slot);
  Handlebars.registerHelper("pilot-weapon-slot", pilot_weapon_refview);
  Handlebars.registerHelper("pilot-gear-slot", pilot_gear_refview);

  // ------------------------------------------------------------------------
  // Tags
  Handlebars.registerHelper("mm-tag-list", compact_tag_list);
  Handlebars.registerHelper("tags-view", tag_list_display);

  // ------------------------------------------------------------------------
  // License data
  Handlebars.registerHelper("ref-manufacturer", manufacturer_ref);
  Handlebars.registerHelper("ref-license", license_ref);

  // ------------------------------------------------------------------------
  // Actions
  Handlebars.registerHelper("actions-view", action_list_display);
  Handlebars.registerHelper("effect-box", effect_box);

  // ------------------------------------------------------------------------
  // Bonuses
  Handlebars.registerHelper("bonuses-view", bonus_list_display);

  // ------------------------------------------------------------------------
  // Weapons
  Handlebars.registerHelper("is-loading", funcs.tag_util.is_loading);
  Handlebars.registerHelper("wpn-size-sel", weapon_size_selector);
  Handlebars.registerHelper("wpn-type-sel", weapon_type_selector);
  Handlebars.registerHelper("wpn-range-sel", range_editor);
  Handlebars.registerHelper("wpn-damage-sel", damage_editor);
  Handlebars.registerHelper("npcf-atk", npc_attack_bonus_preview);
  Handlebars.registerHelper("npcf-acc", npc_accuracy_preview);
  Handlebars.registerHelper("mech-weapon-preview", mech_weapon_refview);

  // ------------------------------------------------------------------------
  // Systems
  Handlebars.registerHelper("sys-type-sel", system_type_selector);
  Handlebars.registerHelper("uses-ctrl", uses_control);
  Handlebars.registerHelper("act-icon", action_type_icon);
  Handlebars.registerHelper("act-type-sel", action_type_selector);

  // ------------------------------------------------------------------------
  // Effects
  /*
  Handlebars.registerHelper("eff-preview", effect_preview);
  Handlebars.registerPartial("generic-eff-preview", generic_effect_preview);
  Handlebars.registerHelper("basic-eff-preview", basic_effect_preview);
  Handlebars.registerHelper("ai-eff-preview", ai_effect_preview);
  Handlebars.registerHelper("bonus-eff-preview", bonus_effect_preview);
  Handlebars.registerHelper("chg-eff-preview", charge_effect_preview);
  Handlebars.registerHelper("dep-eff-preview", deployable_effect_preview);
  Handlebars.registerHelper("drn-eff-preview", drone_effect_preview);
  Handlebars.registerHelper("off-eff-preview", offensive_effect_preview);
  Handlebars.registerHelper("prf-eff-preview", profile_effect_preview);
  Handlebars.registerHelper("prot-eff-preview", protocol_effect_preview);
  Handlebars.registerHelper("rct-eff-preview", reaction_effect_preview);
  Handlebars.registerHelper("inv-eff-preview", invade_option_preview);
  Handlebars.registerHelper("tech-eff-preview", tech_effect_preview);

  // ------------------------------------------------------------------------
  // NPC Effects
  Handlebars.registerHelper("npc-feat-preview", npc_feature_preview);
  Handlebars.registerHelper("npc-rct-preview", npc_reaction_effect_preview);
  Handlebars.registerHelper("npc-sys-preview", npc_system_effect_preview);
  Handlebars.registerHelper("npc-trait-preview", npc_trait_effect_preview);
  Handlebars.registerHelper("npc-tech-preview", npc_tech_effect_preview);
  Handlebars.registerHelper("npc-wpn-preview", npc_weapon_effect_preview);
  */

  // ------------------------------------------------------------------------
  // Frames
  // Handlebars.registerPartial("core-system", core_system_preview);

  // ------------------------------------------------------------------------
  // Pilot components
  Handlebars.registerHelper("overcharge-button", overcharge_button);

  // ------------------------------------------------------------------------
  // Mech components
  Handlebars.registerHelper("mech-loadout", mech_loadout);

  // ------------------------------------------------------------------------
  // NPC components
  Handlebars.registerHelper("tier-selector", npc_tier_selector);
  Handlebars.registerHelper("npc-feat-preview", npc_feature_preview);
});

/* ------------------------------------ */
/* When ready                           */
/* ------------------------------------ */
// Make an awaitable for when this shit is done
export const system_ready: Promise<void> = new Promise((success) => {
  Hooks.once("ready", async function () {
    // Determine whether a system migration is required and feasible
    const currentVersion = game.settings.get(LANCER.sys_name, LANCER.setting_migration);
    // Modify these constants to set which Lancer version numbers need and permit migration.
    const NEEDS_MIGRATION_VERSION = "0.1.7";
    const COMPATIBLE_MIGRATION_VERSION = "0.1.6";
    let needMigration = currentVersion ? compareVersions(currentVersion, NEEDS_MIGRATION_VERSION) : 1;

    // Check whether system has been updated since last run.
    if (compareVersions(currentVersion, game.system.data.version) != 0 && game.user.isGM) {
      // Un-hide the welcome message
      await game.settings.set(LANCER.sys_name, LANCER.setting_welcome, false);

      if (needMigration <= 0) {
        if (currentVersion && compareVersions(currentVersion, COMPATIBLE_MIGRATION_VERSION) < 0) {
          // System version is too old for migration
          ui.notifications.error(
            `Your LANCER system data is from too old a version and cannot be reliably migrated to the latest version. The process will be attempted, but errors may occur.`,
            { permanent: true }
          );
        }
        // Perform the migration
        await migrations.migrateWorld();
      }
      // Set the version for future migration and welcome message checking
      await game.settings.set(LANCER.sys_name, LANCER.setting_migration, game.system.data.version);
    }

    // Show welcome message if not hidden.
    if (!game.settings.get(LANCER.sys_name, LANCER.setting_welcome)) {
      new Dialog({
        title: `Welcome to LANCER v${game.system.data.version}`,
        content: WELCOME,
        buttons: {
          dont_show: {
            label: "Do Not Show Again",
            callback: async () => {
              await game.settings.set(LANCER.sys_name, LANCER.setting_welcome, true);
            },
          },
          close: {
            label: "Close",
          },
        },
        default: "Close",
      }).render(true);
    }

    // We're ready, freddy
    success();
  });
});

// Add any additional hooks if necessary
Hooks.on("preCreateActor", lancerActorInit);
Hooks.on("preCreateItem", lancerItemInit);

// Create sidebar button to import LCP
Hooks.on("renderSidebarTab", async (app: Application, html: HTMLElement) => {
  addLCPManager(app, html);
});

// Attack function to overkill reroll button
Hooks.on("renderChatMessage", async (cm: ChatMessage, html: any, data: any) => {
  const overkill = html[0].getElementsByClassName("overkill-reroll");
  for (let i = 0; i < overkill.length; i++) {
    if (cm.isAuthor) {
      overkill[i].addEventListener("click", async function () {
        // console.log(data);
        const roll = new Roll("1d6").roll();
        const templateData = {
          roll: roll,
          roll_tooltip: await roll.getTooltip(),
        };
        const html = await renderTemplate(
          "systems/lancer/templates/chat/overkill-reroll.html",
          templateData
        );
        let chat_data = {
          user: game.user,
          type: CONST.CHAT_MESSAGE_TYPES.ROLL,
          roll: templateData.roll,
          speaker: data.message.speaker,
          content: html,
        };
        let cm = await ChatMessage.create(chat_data);
        cm.render();
        return Promise.resolve();
      });
    }
  }
});

Hooks.on("hotbarDrop", async (_bar: any, data: macros.DraggedMacro, slot: number) => {
  let macro: macros.AnyMacroCtx = data.macro;
  console.log(`${lp} Data dropped on hotbar:`, data);
  if(data.shibboleth != "yep") {
    // Ah shoot - it's a world item, probably. Coerce into an item macro
    let messy_drop = (data as unknown as NativeDrop)!;

    // Attempt to resolve it
    let resolved = await resolve_native_drop(messy_drop);

    // No dice
    if(!resolved) {
      console.error("Couldn't make macro for data: ", data);
      return;
    }

    // Ok, we can make this.
    if(resolved.type == "Item" && resolved.entity.isOwned) {
      let as_mm = await resolved.entity.data.data.derived.mmec_promise;
      let ala = resolved.entity.actor as AnyLancerActor;
      let actor_as_mm = await ala.data.data.derived.mmec_promise;
      let new_macro: macros.ItemMacroCtx = {
        name: as_mm.ent.Name,
        type: "generic_item",
        icon: TypeIcon(as_mm.ent.Type),
        item: as_mm.ent.as_ref(),
        actor: actor_as_mm.ent.as_ref()
      }
      macro = new_macro
    } else {
      // No idea what do do here - it's an actor or something weird, lol. Just ignore
      return;
    }
  }

  //@ts-ignore Typescript doesn't like this stringify function all that much, for some reason
  let command = `game.lancer.prepareMacro(${stringify(data.macro)});`;
  let img = macro.icon ?? `systems/lancer/assets/icons/macro-icons/d20-framed.svg`;

  // Attempt to not reproduce the exact same macro
  // @ts-ignore
  // let macro = game.macros.entities.find(
    // (m: Macro) => m.name === title && (m.data as any).command === command
  // );
  // if (!macro) {
  Macro.create(
    {
      command,
      name: macro.name,
      type: "script",
      img: img,
    },
    { displaySheet: false }
  ).then(macro => game.user.assignHotbarMacro(macro as Macro, slot));
  // }  else {
   //  game.user.assignHotbarMacro(macro, slot).then();
  // }
});

// Make derived fields properly update their intended origin target
Hooks.on("modifyTokenAttribute", (_: any, data: any) => {
  for(let key of Object.keys(data)) {
    // If starts with "data.derived", replace with just "data"
    if(key.includes("data.derived.")) {
      // Cut the .derived, and also remove any trailing .value to resolve pseudo-bars
      let new_key = key.replace(/^data\.derived\./, "data.");
      new_key = new_key.replace(/\.value$/, "");
      data[new_key] = data[key];

      console.log(`Overrode assignment from ${key} to ${new_key}`);
    }
  }
})