# Roll20 Dice Roller — Implementation Checklist

## Phase 1: Core Dice Parser Engine

- [x] **Basic dice syntax**: `NdM` (e.g., `2d6`, `1d20`, `100d100`)
- [x] **Addition**: `+` modifier
- [x] **Subtraction**: `-` modifier
- [x] **Multiplication**: `×` or `*` modifier
- [x] **Division**: `÷` or `/` modifier
- [x] **Parentheses grouping**: `(2d6+3)d4`
- [x] **Inline rolls**: wrapping in `[[...]]`

## Phase 2: Drop / Keep Modifiers

- [x] **Drop Lowest (dlK)**: `10d6dl2` → drop 2 lowest dice
- [x] **Drop Highest (dhK)**: `10d6dh2` → drop 2 highest dice
- [x] **Keep Lowest (klK)**: `10d6kl3` → keep 3 lowest dice
- [x] **Keep Highest (khK)**: `10d6kh3` → keep 3 highest dice
- [x] **Drop/Keep all**: `dl` / `dh` / `kl` / `kh` (no number = drop/keep all)

## Phase 3: Explode / Reroll Modifiers

- [x] **Explode (xe)**: `d6xe` → re-roll and add on max
- [x] **Reroll (re)**: `d6re` → re-roll on max (don't add)
- [x] **Explode min (xo)**: `d6xo` → explode on minimum value
- [x] **Reroll min (ro)**: `d6ro` → reroll on minimum value (don't add)
- [x] **Explode specific value (xeN)**: `d6xe1` → explode on rolling 1
- [x] **Reroll specific value (reN)**: `d6re1` → re-roll on rolling 1
- [x] **Explode range (xeN-)**: `d6xe3-` → explode on 3 or higher
- [x] **Explode range (-xN)**: `d6-1x` → explode on 1 or lower
- [x] **Explode range (xeN-M)**: `d6xe3-5` → explode on 3 through 5
- [x] **Explode count (xeN:K)**: `d6xe1:3` → explode on 1, max 3 extra rolls
- [x] **Count dice (cK)**: `d6c6` → count number of 6s and add to total

## Phase 4: Custom / Game-Specific Modifiers

- [x] **D100 "!" (double tens)**: `d100!` → each 10 counts as double (10=20, 20=40, etc.)
- [x] **D100 percentile roll**: `dd` → roll 2d10 (tens, ones), result = tens×10 + ones
- [x] **Minimum value (mN)**: `d6m1` → minimum result of 1 per die
- [x] **Maximum value (xN)**: `d6x6` → maximum result of 6 per die
- [x] **D&D Advantage**: `d20adv` → roll 2d20, keep highest
- [x] **D&D Disadvantage**: `d20dis` → roll 2d20, keep lowest
- [x] **D&D Advantage with modifier**: `d20adv+3`
- [x] **D&D 4e Power Crit (pc)**: `d20pc` → on natural 20, roll extra die
- [x] **D&D 4e Fumble (ff)**: `d20ff` → on natural 1, penalty
- [x] **D6 healing dice**: `3w` → roll 3d6, count 5+ as "wins" (½ + 1 for 6)

## Phase 5: Table Rolls

- [x] **Basic table roll**: `1t[1:Value|2:Value|3:Value]`
- [x] **Multiple table rolls**: `2t[1:A|2:B|3:C]`
- [x] **Named table roll** (via aliases)

## Phase 6: Command Interface

- [x] **`/roll` slash command** with one argument: `expression`
- [x] **Auto-detect dice in regular messages**: `2d6+3` → bot responds
- [x] **Auto-detect inline rolls**: `[[2d6]]` in any message
- [x] **Auto-detect with prefix**: `!roll 2d6+3`
- [x] **Command cooldown / rate limiting** to prevent spam
- [x] **Expression length limit** (prevent abuse/infinite loops)

## Phase 7: Output & Formatting

- [x] **Discord embed output** with:
  - [x] Dice expression shown
  - [x] Individual die results shown
  - [x] Modifiers applied breakdown
  - [x] Final total highlighted
- [x] **Plain text fallback** for quick rolls (`/roll --plain`)
- [x] **Color coding**: green for positive, red for negative, purple for zero
- [x] **Truncated output** for massive rolls (e.g., 1000d6 — show summary)
- [x] **Error messages**: clear feedback on invalid syntax

## Phase 8: Architecture & Quality

- [x] **Dice parser as standalone module**: `src/dice/parser.ts`
- [x] **Dice result type/interface**: structured data for results
- [x] **Roll command file**: `src/commands/Information/roll.ts`
- [x] **Auto-detect event handler**: `src/events/messageCreate.ts`
- [x] **Unit tests** for parser (edge cases, all modifiers)
- [x] **README / usage docs**: `docs/dice-roller.md`

## Phase 9: Polish

- [x] **Roll history** (last 20 rolls per user): `/rollhistory`
- [x] **Dice alias/shortcuts**: Custom aliases via parser options
- [x] **Custom tables**: `/table 1:Hit|2:Miss|3:Crit`
- [x] **Percentage roll**: `/percent` command
- [x] **Handle overflow**: Max dice count, sides, stack depth, total rolls
