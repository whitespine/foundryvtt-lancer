export const preloadTemplates = async function () {
  const templatePaths = [
    "systems/lancer/templates/actor/pilot.html",
    "systems/lancer/templates/actor/npc.html",
    "systems/lancer/templates/actor/deployable.html",
    "systems/lancer/templates/actor/mech.html",

    "systems/lancer/templates/chat/attack-card.html",
    "systems/lancer/templates/chat/generic-card.html",
    "systems/lancer/templates/chat/overcharge-card.html",
    "systems/lancer/templates/chat/overheat-card.html",
    "systems/lancer/templates/chat/reaction-card.html",
    "systems/lancer/templates/chat/stat-roll-card.html",
    "systems/lancer/templates/chat/structure-card.html",
    "systems/lancer/templates/chat/system-card.html",
    "systems/lancer/templates/chat/talent-card.html",
    "systems/lancer/templates/chat/tech-attack-card.html",

    "systems/lancer/templates/item/core_bonus.html",
    "systems/lancer/templates/item/frame.html",
    "systems/lancer/templates/item/license.html",
    "systems/lancer/templates/item/manufacturer.html",
    "systems/lancer/templates/item/mech_system.html",
    "systems/lancer/templates/item/mech_weapon.html",
    "systems/lancer/templates/item/npc_class.html",
    "systems/lancer/templates/item/npc_feature.html",
    "systems/lancer/templates/item/npc_template.html",
    "systems/lancer/templates/item/pilot_armor.html",
    "systems/lancer/templates/item/pilot_gear.html",
    "systems/lancer/templates/item/pilot_weapon.html",
    "systems/lancer/templates/item/reserve.html",
    "systems/lancer/templates/item/skill.html",
    "systems/lancer/templates/item/tag.html",
    "systems/lancer/templates/item/talent.html",
  ];

  return loadTemplates(templatePaths);
};
