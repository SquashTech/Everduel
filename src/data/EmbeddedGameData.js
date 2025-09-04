/**
 * Embedded game data to avoid server requirements
 * Contains all card data and configuration inline
 */

export const CARD_DATABASE = {
  "1": [
    {
      "id": "squire",
      "name": "Squire",
      "attack": 3,
      "health": 3,
      "ability": "",
      "tags": ["Human"],
      "color": "red"
    },
    {
      "id": "soldier",
      "name": "Soldier",
      "attack": 2,
      "health": 4,
      "ability": "",
      "tags": ["Human"],
      "color": "red"
    },
    {
      "id": "fighter",
      "name": "Fighter",
      "attack": 1,
      "health": 1,
      "ability": "At the end of your turn, if this is in the front row, gain +1/+1",
      "tags": ["Dwarf"],
      "color": "red"
    },
    {
      "id": "villager",
      "name": "Villager",
      "attack": 1,
      "health": 1,
      "ability": "Unleash: Give the other slot in this column +1/+1",
      "tags": ["Human"],
      "color": "red"
    },
    {
      "id": "fire_whelp",
      "name": "Fire Whelp",
      "attack": 2,
      "health": 1,
      "ability": "Unleash: Gain 1 Dragon Flame",
      "tags": ["Dragon"],
      "color": "red"
    },
    {
      "id": "worker",
      "name": "Worker",
      "attack": 1,
      "health": 1,
      "ability": "At the start of your turn, give this slot +1/+0.",
      "tags": ["Dwarf"],
      "color": "red"
    },
    {
      "id": "hawk",
      "name": "Hawk",
      "attack": 2,
      "health": 2,
      "ability": "Flying",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "bear_cub",
      "name": "Bear Cub",
      "attack": 3,
      "health": 2,
      "ability": "Trample",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "wolf_pup",
      "name": "Wolf Pup",
      "attack": 2,
      "health": 2,
      "ability": "Sneaky",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "piglet",
      "name": "Piglet",
      "attack": 2,
      "health": 3,
      "ability": "Your Beasts have +1 Attack",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "bee_swarm",
      "name": "Bee Swarm",
      "attack": 1,
      "health": 3,
      "ability": "Rush, Flying",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "cow",
      "name": "Cow",
      "attack": 2,
      "health": 2,
      "ability": "Kindred: Heal your player 1",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "archer",
      "name": "Archer",
      "attack": 2,
      "health": 2,
      "ability": "Ranged",
      "tags": ["Elf"],
      "color": "green"
    },
    {
      "id": "scout",
      "name": "Scout",
      "attack": 2,
      "health": 1,
      "ability": "Unleash: Give a random back row slot +1/+1",
      "tags": ["Elf"],
      "color": "green"
    },
    {
      "id": "forager",
      "name": "Forager",
      "attack": 1,
      "health": 1,
      "ability": "Can't attack. At the start of your turn, draw 1",
      "tags": ["Elf"],
      "color": "green"
    },
    {
      "id": "knife_goblin",
      "name": "Knife Goblin",
      "attack": 1,
      "health": 1,
      "ability": "Rush, Kindred: Gain +1/+1",
      "tags": ["Goblin"],
      "color": "green"
    },
    {
      "id": "spear_goblin",
      "name": "Spear Goblin",
      "attack": 1,
      "health": 1,
      "ability": "Ranged, Kindred: Gain +1/+1",
      "tags": ["Goblin"],
      "color": "green"
    },
    {
      "id": "muscle_goblin",
      "name": "Muscle Goblin",
      "attack": 1,
      "health": 1,
      "ability": "Trample, Kindred: Gain +1/+1",
      "tags": ["Goblin"],
      "color": "green"
    },
    {
      "id": "wisp",
      "name": "Wisp",
      "attack": 2,
      "health": 3,
      "ability": "Manacharge: Gain +1/+1",
      "tags": ["Mystic"],
      "color": "blue"
    },
    {
      "id": "fae",
      "name": "Fae",
      "attack": 2,
      "health": 2,
      "ability": "Manacharge: Deal 1 damage in this column",
      "tags": ["Mystic"],
      "color": "blue"
    },
    {
      "id": "fairy",
      "name": "Fairy",
      "attack": 1,
      "health": 2,
      "ability": "Unleash: Give a random slot +0/+2",
      "tags": ["Mystic"],
      "color": "blue"
    },
    {
      "id": "apprentice",
      "name": "Apprentice",
      "attack": 1,
      "health": 2,
      "ability": "Unleash: Deal 1 damage to a random enemy unit",
      "tags": ["Human"],
      "color": "blue"
    },
    {
      "id": "conduit",
      "name": "Conduit",
      "attack": 2,
      "health": 2,
      "ability": "Last Gasp: Add a Mana Surge to your hand",
      "tags": ["Mystic"],
      "color": "blue"
    },
    {
      "id": "novice",
      "name": "Novice",
      "attack": 3,
      "health": 2,
      "ability": "Unleash: Deal 1 damage to both players",
      "tags": ["Human"],
      "color": "blue"
    },
    {
      "id": "rat",
      "name": "Rat",
      "attack": 1,
      "health": 3,
      "ability": "+3/+0 while it's your turn",
      "tags": ["Beast"],
      "color": "purple"
    },
    {
      "id": "spider",
      "name": "Spider",
      "attack": 5,
      "health": 1,
      "ability": "",
      "tags": ["Beast"],
      "color": "purple"
    },
    {
      "id": "zombie",
      "name": "Zombie",
      "attack": 2,
      "health": 2,
      "ability": "Last Gasp: Banish this",
      "tags": ["Undead"],
      "color": "purple"
    },
    {
      "id": "gravedigger",
      "name": "Gravedigger",
      "attack": 1,
      "health": 2,
      "ability": "Unleash: Add a Skeleton to your hand",
      "tags": ["Human"],
      "color": "purple"
    },
    {
      "id": "reanimated",
      "name": "Reanimated",
      "attack": 3,
      "health": 1,
      "ability": "Last Gasp: Add a Skeleton to your hand",
      "tags": ["Undead"],
      "color": "purple"
    },
    {
      "id": "cultist",
      "name": "Cultist",
      "attack": 2,
      "health": 1,
      "ability": "Last Gasp: Give a random friendly Undead +2/+2",
      "tags": ["Human"],
      "color": "purple"
    }
  ],
  "2": [
    {
      "id": "knight",
      "name": "Knight",
      "attack": 5,
      "health": 5,
      "ability": "",
      "tags": ["Human"],
      "color": "red"
    },
    {
      "id": "berserker",
      "name": "Berserker",
      "attack": 1,
      "health": 8,
      "ability": "When this survives damage, gain +4 Attack",
      "tags": ["Human"],
      "color": "red"
    },
    {
      "id": "general",
      "name": "General",
      "attack": 2,
      "health": 4,
      "ability": "Unleash: Give your other Humans +1/+2",
      "tags": ["Human"],
      "color": "red"
    },
    {
      "id": "blacksmith",
      "name": "Blacksmith",
      "attack": 3,
      "health": 2,
      "ability": "Unleash: Give a slot with another Human or Dwarf +2/+2",
      "tags": ["Dwarf"],
      "color": "red"
    },
    {
      "id": "young_dragon",
      "name": "Young Dragon",
      "attack": 3,
      "health": 3,
      "ability": "Flying, Unleash: Gain 1 Dragon Flame",
      "tags": ["Dragon"],
      "color": "red"
    },
    {
      "id": "eagle",
      "name": "Eagle",
      "attack": 4,
      "health": 3,
      "ability": "Flying. Unleash: Give another Flying unit +1/+1",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "wolf",
      "name": "Wolf",
      "attack": 3,
      "health": 3,
      "ability": "Sneaky. After this attacks the other player, give this slot +1/+1",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "wild_boar",
      "name": "Wild Boar",
      "attack": 2,
      "health": 2,
      "ability": "Rush, Kindred: Gain +2 Attack",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "pack_leader",
      "name": "Pack Leader",
      "attack": 2,
      "health": 4,
      "ability": "Your Beasts have +2 Attack",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "brown_bear",
      "name": "Brown Bear",
      "attack": 3,
      "health": 5,
      "ability": "Trample",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "ranger",
      "name": "Ranger",
      "attack": 4,
      "health": 4,
      "ability": "Ranged",
      "tags": ["Elf"],
      "color": "green"
    },
    {
      "id": "marksman",
      "name": "Marksman",
      "attack": 2,
      "health": 2,
      "ability": "Ranged. Unleash: Deal 2 damage to the back row enemy here",
      "tags": ["Elf"],
      "color": "green"
    },
    {
      "id": "tracker",
      "name": "Tracker",
      "attack": 3,
      "health": 1,
      "ability": "Unleash: Give your other Elves and Beasts +3 Attack",
      "tags": ["Elf"],
      "color": "green"
    },
    {
      "id": "sword_goblin",
      "name": "Sword Goblin",
      "attack": 5,
      "health": 2,
      "ability": "Sneaky, Kindred: Gain +1/+1",
      "tags": ["Goblin"],
      "color": "green"
    },
    {
      "id": "axe_goblin",
      "name": "Axe Goblin",
      "attack": 3,
      "health": 4,
      "ability": "Kindred: Deal 2 damage in this column",
      "tags": ["Goblin"],
      "color": "green"
    },
    {
      "id": "fire_mage",
      "name": "Fire Mage",
      "attack": 5,
      "health": 1,
      "ability": "Unleash: Deal 2 damage to the enemy's front row",
      "tags": ["Human"],
      "color": "blue"
    },
    {
      "id": "ice_mage",
      "name": "Ice Mage",
      "attack": 1,
      "health": 3,
      "ability": "Unleash: Give the other slots in this row +1/+1",
      "tags": ["Human"],
      "color": "blue"
    },
    {
      "id": "thunder_mage",
      "name": "Thunder Mage",
      "attack": 3,
      "health": 2,
      "ability": "Unleash: Deal 4 damage to a random enemy unit",
      "tags": ["Human"],
      "color": "blue"
    },
    {
      "id": "fire_spirit",
      "name": "Fire Spirit",
      "attack": 3,
      "health": 3,
      "ability": "Manacharge: Gain +3/+2",
      "tags": ["Mystic"],
      "color": "blue"
    },
    {
      "id": "ice_spirit",
      "name": "Ice Spirit",
      "attack": 4,
      "health": 1,
      "ability": "Manacharge: Give this slot +0/+2",
      "tags": ["Mystic"],
      "color": "blue"
    },
    {
      "id": "wraith",
      "name": "Wraith",
      "attack": 4,
      "health": 3,
      "ability": "Sneaky. When you gain a Soul, gain +1/+1",
      "tags": ["Mystic"],
      "color": "purple"
    },
    {
      "id": "vampire_bat",
      "name": "Vampire Bat",
      "attack": 6,
      "health": 1,
      "ability": "Flying",
      "tags": ["Beast"],
      "color": "purple"
    },
    {
      "id": "plague_rat",
      "name": "Plague Rat",
      "attack": 2,
      "health": 4,
      "ability": "+4/+0 while it's your turn",
      "tags": ["Beast"],
      "color": "purple"
    },
    {
      "id": "bone_giant",
      "name": "Bone Giant",
      "attack": 2,
      "health": 6,
      "ability": "Last Gasp: Add two Skeletons to your hand",
      "tags": ["Undead"],
      "color": "purple"
    },
    {
      "id": "swamp_ooze",
      "name": "Swamp Ooze",
      "attack": 7,
      "health": 7,
      "ability": "Last Gasp: Deal 5 damage to your player",
      "tags": ["Mystic"],
      "color": "purple"
    }
  ],
  "3": [
    {
      "id": "warlord",
      "name": "Warlord",
      "attack": 8,
      "health": 6,
      "ability": "",
      "tags": ["Human"],
      "color": "red"
    },
    {
      "id": "paladin",
      "name": "Paladin",
      "attack": 3,
      "health": 3,
      "ability": "Unleash: Your front slots gain +2/+2",
      "tags": ["Human"],
      "color": "red"
    },
    {
      "id": "captain",
      "name": "Captain",
      "attack": 3,
      "health": 4,
      "ability": "Unleash: Gain +1/+1 for each other unit you have in play",
      "tags": ["Human"],
      "color": "red"
    },
    {
      "id": "dwarf_knight",
      "name": "Dwarf Knight",
      "attack": 4,
      "health": 4,
      "ability": "At the start of your turn, give this slot +2/+2",
      "tags": ["Dwarf"],
      "color": "red"
    },
    {
      "id": "flame_drake",
      "name": "Flame Drake",
      "attack": 5,
      "health": 4,
      "ability": "Flying, Unleash: Gain 2 Dragon Flame",
      "tags": ["Dragon"],
      "color": "red"
    },
    {
      "id": "dire_wolf",
      "name": "Dire Wolf",
      "attack": 6,
      "health": 5,
      "ability": "Sneaky. When this attacks the opposing player, draw 1",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "giant_toad",
      "name": "Giant Toad",
      "attack": 3,
      "health": 6,
      "ability": "At the start of your turn, give your other Beasts +2/+2",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "elder_stag",
      "name": "Elder Stag",
      "attack": 5,
      "health": 4,
      "ability": "Rush, Trample",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "storm_falcon",
      "name": "Storm Falcon",
      "attack": 6,
      "health": 3,
      "ability": "Flying, Unleash: Deal 2 damage in a random column",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "grizzly_bear",
      "name": "Grizzly Bear",
      "attack": 7,
      "health": 5,
      "ability": "Trample",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "sniper",
      "name": "Sniper",
      "attack": 10,
      "health": 3,
      "ability": "Ranged",
      "tags": ["Elf"],
      "color": "green"
    },
    {
      "id": "elven_minstrel",
      "name": "Elven Minstrel",
      "attack": 4,
      "health": 4,
      "ability": "Kindred: Give a random slot +2/+2",
      "tags": ["Elf"],
      "color": "green"
    },
    {
      "id": "forest_spirit",
      "name": "Forest Spirit",
      "attack": 3,
      "health": 3,
      "ability": "Unleash: For the rest of the game, Mystics have +1/+1",
      "tags": ["Mystic"],
      "color": "green"
    },
    {
      "id": "goblin_mage",
      "name": "Goblin Mage",
      "attack": 2,
      "health": 2,
      "ability": "Kindred and Manacharge: Deal 3 damage in this column",
      "tags": ["Goblin"],
      "color": "green"
    },
    {
      "id": "goblin_warcaller",
      "name": "Goblin Warcaller",
      "attack": 5,
      "health": 4,
      "ability": "Kindred: Draw from your deck",
      "tags": ["Goblin"],
      "color": "green"
    },
    {
      "id": "tomemaster",
      "name": "Tomemaster",
      "attack": 6,
      "health": 2,
      "ability": "Ranged, Unleash: Draw 1",
      "tags": ["Human"],
      "color": "blue"
    },
    {
      "id": "wizard",
      "name": "Wizard",
      "attack": 2,
      "health": 6,
      "ability": "Unleash: Deal 3 damage to the opponent's back row",
      "tags": ["Human"],
      "color": "blue"
    },
    {
      "id": "fire_elemental",
      "name": "Fire Elemental",
      "attack": 3,
      "health": 4,
      "ability": "Manacharge: Summon a Fire Spirit in a random slot",
      "tags": ["Mystic"],
      "color": "blue"
    },
    {
      "id": "ice_elemental",
      "name": "Ice Elemental",
      "attack": 2,
      "health": 5,
      "ability": "Manacharge: Give all of your units +2 Health",
      "tags": ["Mystic"],
      "color": "blue"
    },
    {
      "id": "storm_elemental",
      "name": "Storm Elemental",
      "attack": 5,
      "health": 4,
      "ability": "Manacharge: Deal 5 damage to a random enemy unit",
      "tags": ["Mystic"],
      "color": "blue"
    },
    {
      "id": "spider_queen",
      "name": "Spider Queen",
      "attack": 5,
      "health": 1,
      "ability": "Unleash: Fill your front row with 5/1 Spiders",
      "tags": ["Beast"],
      "color": "purple"
    },
    {
      "id": "bone_drake",
      "name": "Bone Drake",
      "attack": 4,
      "health": 5,
      "ability": "Last Gasp: Gain 1 Dragon Flame and summon a Skeleton here",
      "tags": ["Undead"],
      "color": "purple"
    },
    {
      "id": "blood_imp",
      "name": "Blood Imp",
      "attack": 4,
      "health": 3,
      "ability": "Flying, Last Gasp: Deal 3 damage to the opponent",
      "tags": ["Mystic"],
      "color": "purple"
    },
    {
      "id": "bone_colossus",
      "name": "Bone Colossus",
      "attack": 1,
      "health": 10,
      "ability": "Unleash: Gain +1 Attack for each of your Souls",
      "tags": ["Undead"],
      "color": "purple"
    },
    {
      "id": "necromancer",
      "name": "Necromancer",
      "attack": 4,
      "health": 4,
      "ability": "When a friendly Last Gasp activates, gain +3/+3",
      "tags": ["Undead"],
      "color": "purple"
    }
  ],
  "4": [
    {
      "id": "royal_guard",
      "name": "Royal Guard",
      "attack": 4,
      "health": 10,
      "ability": "When you buff a slot, give it an additional +2/+2",
      "tags": ["Human"],
      "color": "red"
    },
    {
      "id": "champion",
      "name": "Champion",
      "attack": 12,
      "health": 10,
      "ability": "",
      "tags": ["Human"],
      "color": "red"
    },
    {
      "id": "tavernmaster",
      "name": "Tavernmaster",
      "attack": 5,
      "health": 5,
      "ability": "Unleash: Give your other Dwarves +5/+5",
      "tags": ["Dwarf"],
      "color": "red"
    },
    {
      "id": "dragon",
      "name": "Dragon",
      "attack": 4,
      "health": 4,
      "ability": "Flying. Unleash: Gain +3/+3 for each Dragon Flame",
      "tags": ["Dragon"],
      "color": "red"
    },
    {
      "id": "mammoth",
      "name": "Mammoth",
      "attack": 9,
      "health": 9,
      "ability": "Trample",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "alpha_wolf",
      "name": "Alpha Wolf",
      "attack": 5,
      "health": 4,
      "ability": "Sneaky. Kindred: Gain +2 Attack",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "ancient_tortoise",
      "name": "Ancient Tortoise",
      "attack": 2,
      "health": 16,
      "ability": "",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "lion_king",
      "name": "Lion King",
      "attack": 6,
      "health": 7,
      "ability": "Kindred: Give a random slot +2/+2",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "goblin_chief_t4",
      "name": "Goblin Chief",
      "attack": 8,
      "health": 4,
      "ability": "Kindred: Summon a Knife, Spear, or Muscle Goblin to a random slot",
      "tags": ["Goblin"],
      "color": "green"
    },
    {
      "id": "arrowmaster",
      "name": "Arrowmaster",
      "attack": 6,
      "health": 4,
      "ability": "Ranged. At the start of your turn, give all slots with an Elf +3/+0",
      "tags": ["Elf"],
      "color": "green"
    },
    {
      "id": "elder_elf",
      "name": "Elder Elf",
      "attack": 7,
      "health": 6,
      "ability": "Ranged. Unleash: Give a Mystic +3/+3",
      "tags": ["Elf"],
      "color": "green"
    },
    {
      "id": "forest_guardian",
      "name": "Forest Guardian",
      "attack": 5,
      "health": 5,
      "ability": "Unleash: Heal your player 5",
      "tags": ["Mystic"],
      "color": "green"
    },
    {
      "id": "archmage",
      "name": "Archmage",
      "attack": 2,
      "health": 2,
      "ability": "Unleash: Deal 6 damage to enemies in this column",
      "tags": ["Human"],
      "color": "blue"
    },
    {
      "id": "living_mana",
      "name": "Living Mana",
      "attack": 8,
      "health": 4,
      "ability": "Kindred: Add a Mana Surge to your hand",
      "tags": ["Mystic"],
      "color": "blue"
    },
    {
      "id": "void_element",
      "name": "Void Element",
      "attack": 1,
      "health": 10,
      "ability": "Manacharge: Double this unit's attack",
      "tags": ["Mystic"],
      "color": "blue"
    },
    {
      "id": "fire_giant",
      "name": "Fire Giant",
      "attack": 15,
      "health": 5,
      "ability": "Manacharge: Deal 3 damage to the enemy's Front Row",
      "tags": ["Mystic"],
      "color": "blue"
    },
    {
      "id": "abomination",
      "name": "Abomination",
      "attack": 5,
      "health": 3,
      "ability": "Last Gasp: Return this to your hand",
      "tags": ["Undead"],
      "color": "purple"
    },
    {
      "id": "lich",
      "name": "Lich",
      "attack": 3,
      "health": 6,
      "ability": "Kindred: Deal 3 damage to a random enemy. Heal your player 3",
      "tags": ["Undead"],
      "color": "purple"
    },
    {
      "id": "death_knight",
      "name": "Death Knight",
      "attack": 2,
      "health": 2,
      "ability": "Unleash: Gain +2/+2 for each of your Souls",
      "tags": ["Undead"],
      "color": "purple"
    },
    {
      "id": "phantom",
      "name": "Phantom",
      "attack": 7,
      "health": 5,
      "ability": "Unleash: Consume up to 3 souls. Draw that many cards",
      "tags": ["Mystic"],
      "color": "purple"
    }
  ],
  "5": [
    {
      "id": "dwarf_king",
      "name": "Dwarf King",
      "attack": 10,
      "health": 10,
      "ability": "Unleash: Double the buff on all your slots.",
      "tags": ["Dwarf"],
      "color": "red"
    },
    {
      "id": "skyterror",
      "name": "Skyterror",
      "attack": 9,
      "health": 6,
      "ability": "Flying. Unleash: Deal damage equal to your 🔥 to all enemies.",
      "tags": ["Dragon"],
      "color": "red"
    },
    {
      "id": "hero",
      "name": "Hero",
      "attack": 15,
      "health": 15,
      "ability": "",
      "tags": ["Human"],
      "color": "red"
    },
    {
      "id": "king_kong",
      "name": "King Kong",
      "attack": 20,
      "health": 8,
      "ability": "Trample",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "primal_alpha",
      "name": "Primal Alpha",
      "attack": 8,
      "health": 4,
      "ability": "Kindred: Give your Beasts +4/+4.",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "tempest_lord",
      "name": "Tempest Lord",
      "attack": 12,
      "health": 4,
      "ability": "Flying. Unleash: Draw up to 3 Flying units from your deck.",
      "tags": ["Beast"],
      "color": "yellow"
    },
    {
      "id": "forest_keeper",
      "name": "Forest Keeper",
      "attack": 10,
      "health": 7,
      "ability": "Ranged. Unleash: Give all your slots with a Ranged unit +5/+0.",
      "tags": ["Elf"],
      "color": "green"
    },
    {
      "id": "goblin_machine",
      "name": "Goblin Machine",
      "attack": 25,
      "health": 25,
      "ability": "Can only attack if you have a Goblin in each column.",
      "tags": ["Goblin"],
      "color": "green"
    },
    {
      "id": "treant",
      "name": "Treant",
      "attack": 5,
      "health": 15,
      "ability": "At the start of your turn, fully heal this.",
      "tags": ["Mystic"],
      "color": "green"
    },
    {
      "id": "fairy_queen",
      "name": "Fairy Queen",
      "attack": 4,
      "health": 6,
      "ability": "Unleash: Give all of your slots +0/+2.",
      "tags": ["Mystic"],
      "color": "blue"
    },
    {
      "id": "grand_magus",
      "name": "Grand Magus",
      "attack": 5,
      "health": 5,
      "ability": "Ranged. Unleash: Deal 5 damage in each column.",
      "tags": ["Human"],
      "color": "blue"
    },
    {
      "id": "mana_vortex",
      "name": "Mana Vortex",
      "attack": 8,
      "health": 8,
      "ability": "Manacharge: Deal 1 damage to all enemies.",
      "tags": ["Mystic"],
      "color": "blue"
    },
    {
      "id": "soul_eater",
      "name": "Soul Eater",
      "attack": 1,
      "health": 1,
      "ability": "Unleash: Destroy the frontmost enemy here.",
      "tags": ["Mystic"],
      "color": "purple"
    },
    {
      "id": "skeleton_king",
      "name": "Skeleton King",
      "attack": 7,
      "health": 7,
      "ability": "Unleash: Fill your battlefield with Skeletons.",
      "tags": ["Undead"],
      "color": "purple"
    },
    {
      "id": "death",
      "name": "Death",
      "attack": 6,
      "health": 6,
      "ability": "Last Gasp: Deal 6 damage in this column for each of your Souls.",
      "tags": ["Undead"],
      "color": "purple"
    }
  ],
  "tokens": [
    {
      "id": "spider",
      "name": "Spider",
      "attack": 5,
      "health": 1,
      "ability": "",
      "tags": ["Beast"],
      "color": "purple",
      "isToken": true
    }
  ]
};

export const GAME_CONFIG = {
  "goldProgression": [2, 4, 6, 8, 10, 10, 10, 10, 10],
  "tierCosts": {
    "1": 2,
    "2": 4,
    "3": 6,
    "4": 8,
    "5": 10
  },
  "battlefield": {
    "rows": 2,
    "columns": 3,
    "totalSlots": 6
  },
  "player": {
    "startingHealth": 20,
    "handLimit": 3,
    "startingGold": 2
  },
  "draft": {
    "optionsPerTier": 3,
    "maxCardsPerType": 2
  }
};