# 🎲 Dice Roller

A full Roll20-style dice rolling system for Walter.

## Commands

### `/roll [expression] [plain]`
Roll dice using Roll20-style syntax.

**Options:**
- `expression` (required): Dice expression
- `plain` (optional): Use plain text instead of embed

**Examples:**
```
/roll 2d6+3
/roll 10d6kh3
/roll d20adv
/roll 2d6xe
/roll [[2d6]]+4
/roll 3w
/roll dd
/roll 1t[1:Hit|2:Miss|3:Crit]
/roll 2d6+3 --plain (for plain text output)
```

### `/percent [count]`
Roll a percentile (1-100).

**Options:**
- `count` (optional): Number of rolls (1-20)

**Examples:**
```
/percent
/percent 5
```

### `/table [entries] [count]`
Roll on a custom table.

**Options:**
- `entries` (required): Table entries in format "1:Result1|2:Result2|3:Result3"
- `count` (optional): Number of times to roll (1-10)

**Examples:**
```
/table 1:Hit|2:Miss|3:Crit
/table 1:Damage|2:Heal|3:Nothing|4:Critical 3
```

### `/rollhistory [user]`
View your recent dice rolls.

**Options:**
- `user` (optional): View another user's history

## Syntax Reference

### Basic Dice
- `NdM` - Roll N dice with M sides (e.g., `2d6`, `1d20`)
- `dM` - Roll 1 die with M sides (e.g., `d6`, `d20`)
- `0d6` - Roll zero dice (returns 0)

### Modifiers
- `+N` - Add N to the total
- `-N` - Subtract N from the total
- `*N` or `×N` - Multiply the total by N
- `/N` or `÷N` - Divide the total by N

### Drop / Keep
- `dlK` - Drop the K lowest dice (e.g., `4d6dl1`)
- `dhK` - Drop the K highest dice (e.g., `4d6dh1`)
- `klK` - Keep the K lowest dice (e.g., `4d6kl2`)
- `khK` - Keep the K highest dice (e.g., `4d6kh2`)
- `dl` / `dh` / `kl` / `kh` - Drop/keep all dice

### Explode / Reroll
- `xe` - Explode on max (re-roll and add on max)
- `re` - Reroll on max (replace max with new roll)
- `xo` - Explode on min (re-roll and add on min)
- `ro` - Reroll on min (replace min with new roll)
- `xeN` - Explode on rolling N
- `reN` - Reroll on rolling N
- `xeN-` - Explode on N or higher
- `xe-N` - Explode on N or lower
- `xeN-M` - Explode on N through M
- `xeN:K` - Explode on N, max K extra rolls

### Count
- `cN` - Count dice showing N and add to total (e.g., `2d6c6`)

### Custom Modifiers
- `!` - Double tens (each 10 counts as double, D100 style)
- `dd` - Percentile roll (2d10, tens and ones)
- `mN` - Minimum value per die (e.g., `d6m1`)
- `xN` - Maximum value per die (e.g., `d6x6`)
- `adv` - D&D Advantage (roll 2dN, keep highest)
- `dis` - D&D Disadvantage (roll 2dN, keep lowest)
- `w` - Healing dice (5=1 win, 6=2 wins)
- `pc` - Power Crit (on max roll, roll extra d20)
- `ff` - Fumble (on min roll, subtract d20)

### Tables
- `1t[1:Result1|2:Result2|3:Result3]` - Roll on a custom table

### Parentheses
- `(expression)dN` - Use the result of an expression as dice count (e.g., `(2d6+3)d4`)
- `[[expression]]` - Inline roll (e.g., `[[2d6]]+4`)

### Aliases
You can define custom aliases in the parser options:
```typescript
const parser = new DiceParser('2mydice+3', {
  aliases: { 'mydice': 'd6' }
});
```

## Overflow Protection
- Maximum dice count: 100 (configurable)
- Maximum sides per die: 10,000 (configurable)
- Maximum recursion depth: 50 (configurable)
- Maximum total dice rolled: 10,000
- Maximum expression length: 500 characters

## Output
The dice roller outputs:
- **Embed mode** (default): Rich embed with color coding, emoji indicators, and detailed breakdown
- **Plain mode**: Simple text output for quick rolls

### Color Coding
- 🟢 Green: Positive total
- 🔴 Red: Negative total
- 🟣 Purple: Zero total or table rolls

### Emoji Indicators
- 🗑️ Dropped dice
- ✅ Kept dice
- 🔢 Count matches
- ⭐ Healing dice wins
- 📋 Table rolls
- ⚠️ Truncated output

## Examples

### D&D 5e
```
d20+5          # Attack roll
4d6+2          # Healing dice
2d6+3          # Damage
d20adv+3       # Attack with advantage
d20dis-2       # Attack with disadvantage
```

### Pathfinder
```
2d6!           # Double tens damage
dd             # Percentile save
```

### General
```
10d6kh3        # Drop 3 lowest (4d6 style)
4d6dl1         # Drop 1 lowest (4d6 style)
2d6xe          # Exploding dice
1t[1:Yes|2:No] # Yes/No table
```
