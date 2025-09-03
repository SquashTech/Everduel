# Debug Card Generator - Testing Guide

## Overview
The Debug Card Generator allows you to instantly generate any card in your hand for testing purposes without disrupting the game flow.

## How to Use

### Quick Access Methods

1. **Debug Overlay (Recommended)**
   - Press `` ` `` (backtick key) to toggle the debug overlay
   - A green-bordered panel will appear in the top-right corner
   - Type card names or IDs to search
   - Click suggestions or press "Generate Card" button

2. **Quick Generate Shortcut**
   - Press `Ctrl + Shift + G`
   - Enter the card name or ID in the prompt
   - Card will be added instantly to your hand

### Debug Overlay Features

- **Search Bar**: Type partial names to find cards quickly
- **Suggestions**: Shows matching cards with stats and abilities
- **Generate Card**: Adds selected card to your hand
- **Fill Hand (Random)**: Adds 5 random cards to your hand
- **Clear Hand**: Removes all cards from your hand

## Available Cards by Tier

### Tier 1 Examples
- `squire` - 3/3 vanilla
- `soldier` - 2/4 vanilla  
- `fighter` - 1/1 with growth ability
- `villager` - 1/1 with Unleash buff
- `fire_whelp` - 2/1 Dragon Flame generator

### Tier 2 Examples
- `knight` - 4/5 vanilla
- `berserker` - 5/2 with combat buffs
- `enchanter` - 2/3 spell synergy
- `guardian` - 3/6 defensive unit

### Tier 3 Examples
- `paladin` - 5/6 with protection
- `dragon_rider` - 4/4 Dragon synergy
- `archmage` - 3/5 powerful spells
- `champion` - 6/5 combat master

### Tier 4+ (Higher tier cards for testing)
Check the card database for complete list

## Usage Tips

1. **Testing Specific Interactions**
   - Generate specific cards to test ability interactions
   - Use "Fill Hand" to quickly test hand size limits
   - Clear and regenerate hands to test different combinations

2. **Card ID vs Name**
   - Both work: `fire_whelp` or `Fire Whelp`
   - Search is case-insensitive
   - Partial matches show suggestions

3. **Hand Limit**
   - Maximum 8 cards in hand
   - Generator will warn if hand is full
   - Use "Clear Hand" to make space

## Visual Indicators

- **Success** (Green): Card generated successfully
- **Warning** (Yellow): Hand full or other limitation
- **Error** (Red): Card not found or generation failed
- **Info** (Blue): General information messages

## Important Notes

- This is a DEBUG/TESTING feature only
- Does not affect game balance or AI
- Cards generated this way behave exactly like normally drawn cards
- All abilities and stats work as intended
- Perfect for testing higher-tier cards and complex interactions

## Troubleshooting

- If overlay doesn't appear, check browser console for errors
- If cards aren't generating, ensure hand isn't full (max 8)
- If search isn't working, try more specific terms
- Press `` ` `` again to close the overlay

## Developer Notes

The system integrates with:
- `GameState`: Uses proper reducers for state management
- `EventBus`: Triggers UI updates after card generation
- `UnitFactory`: Creates proper unit instances with all abilities
- No disruption to existing game systems