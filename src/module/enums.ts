import { NpcFeatureType } from "machine-mind"

// TODO: Just use machine mind, where possible


enum PilotEquipType {
  PilotArmor = 'armor',
  PilotWeapon = 'weapon',
  PilotGear = 'gear',
}
enum RangeType {
  Range = 'Range',
  Threat = 'Threat',
  Thrown = 'Thrown',
  Line = 'Line',
  Cone = 'Cone',
  Blast = 'Blast',
  Burst = 'Burst',
}

enum EffectType {
  Generic = 'Generic', // Covers old/fallback/simple
  Basic = 'Basic',
  Charge = 'Charge',
  Deployable = 'Deployable',
  AI = 'AI',
  Protocol = 'Protocol',
  Reaction = 'Reaction',
  Tech = 'Tech',
  Drone = 'Drone',
  Bonus = 'Bonus',
  Offensive = 'Offensive',
  Profile = 'Profile',
}

enum ActivationType {
  None = 'None',
  Passive = 'Passive',
  Quick = 'Quick',
  Full = 'Full',
  Other = 'Other',
  Reaction = 'Reaction',
  Protocol = 'Protocol',
}

enum ChargeType {
  Grenade = 'Grenade',
  Mine = 'Mine'
}

enum MechType {
  Balanced = 'Balanced',
  Artillery = 'Artillery',
  Striker = 'Striker',
  Controller = 'Controller',
  Support = 'Support',
  Defender = 'Defender',
}

enum NPCTag{
  Mech = 'Mech',
  Vehicle = 'Vehicle',
  Ship = 'Ship',
  Biological = 'Biological',
  Squad = 'Squad'
}


export {

  PilotEquipType,
  RangeType,
  EffectType,
  ActivationType,
  ChargeType,
  MechType,
  NPCTag
}
