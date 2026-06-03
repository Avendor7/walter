import { Token, Modifier, DieRollResult, TableResult, TableEntry, RollResult } from './types.js';

export interface ParserOptions {
  maxDiceCount?: number;      // Maximum dice to roll (default: 100)
  maxSides?: number;          // Maximum sides per die (default: 10000)
  maxStackDepth?: number;     // Max recursion depth (default: 50)
  aliases?: Record<string, string>; // Custom aliases (e.g., { "d": "d6" })
}

export class DiceParser {
  private tokens: Token[];
  private pos: number;
  private input: string;
  private dieRolls: DieRollResult[] = [];
  private mathOps: { op: string; value: number }[] = [];
  private tables: TableResult[] = [];
  private inlineRolls: RollResult[] = [];
  private stackDepth: number = 0;
  private totalDiceRolled: number = 0;
  private options: Required<ParserOptions>;

  constructor(input: string, options: ParserOptions = {}) {
    this.options = {
      maxDiceCount: options.maxDiceCount ?? 100,
      maxSides: options.maxSides ?? 10000,
      maxStackDepth: options.maxStackDepth ?? 50,
      aliases: options.aliases ?? {},
    };
    // Resolve aliases before tokenization
    this.input = this.resolveAliases(input, this.options.aliases);
    this.tokens = this.tokenize(this.input);
    this.pos = 0;
  }

  /** Resolve custom aliases in the input string */
  private resolveAliases(input: string, aliases: Record<string, string>): string {
    // Sort aliases by length (longest first) to avoid partial matches
    const sortedAliases = Object.entries(aliases).sort((a, b) => b[0].length - a[0].length);

    let result = input;
    for (const [alias, replacement] of sortedAliases) {
      // Escape special regex characters in alias
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match alias: preceded by start/non-alpha or digit, followed by non-alpha or end
      const regex = new RegExp(`(^|[^a-z])(?:${escapedAlias})([^a-z]|$)`, 'gi');
      result = result.replace(regex, (match, p1, p2) => `${p1}${replacement}${p2}`);
    }

    return result;
  }

  public roll(): RollResult {
    try {
      // Check for overflow before parsing
      if (this.input.length > 500) {
        return {
          expression: this.input,
          total: 0,
          dieRolls: [],
          math: [],
          tables: [],
          inlineRolls: [],
          error: 'Expression too long (max 500 characters)',
          breakdown: 'Error: Expression too long (max 500 characters)',
        };
      }

      const total = this.parseExpression();
      this.expectToken('EOF');

      const breakdown = this.buildBreakdown();

      // Check if output was truncated due to size limits
      const isTruncated = this.dieRolls.some(r => r.explodedRolls.length > 100);

      return {
        expression: this.input,
        total,
        dieRolls: this.dieRolls,
        math: this.mathOps,
        tables: this.tables,
        inlineRolls: this.inlineRolls,
        breakdown,
        truncated: isTruncated,
      };
    } catch (error) {
      return {
        expression: this.input,
        total: 0,
        dieRolls: [],
        math: [],
        tables: [],
        inlineRolls: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        breakdown: `Error: ${error}`,
      };
    }
  }

  // ─── Tokenizer ──────────────────────────────────────────────

  private tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let pos = 0;

    while (pos < input.length) {
      const char = input[pos];

      // Skip whitespace
      if (/\s/.test(char)) {
        pos++;
        continue;
      }

      // Numbers
      if (/\d/.test(char)) {
        let num = '';
        while (pos < input.length && /\d/.test(input[pos])) {
          num += input[pos];
          pos++;
        }
        tokens.push({ type: 'NUMBER', value: parseInt(num), pos });
        continue;
      }



      // Operators
      if (char === '+' || char === '-') {
        tokens.push({ type: char === '+' ? 'ADD' : 'SUB', value: char, pos });
        pos++;
        continue;
      }

      if (char === '*' || char === '×') {
        tokens.push({ type: 'MUL', value: '*', pos });
        pos++;
        continue;
      }

      if (char === '/' || char === '÷') {
        tokens.push({ type: 'DIV', value: '/', pos });
        pos++;
        continue;
      }

      // Parentheses
      if (char === '(') {
        tokens.push({ type: 'LPAREN', value: '(', pos });
        pos++;
        continue;
      }

      if (char === ')') {
        tokens.push({ type: 'RPAREN', value: ')', pos });
        pos++;
        continue;
      }

      // Inline roll [[...]]
      if (char === '[' && pos + 1 < input.length && input[pos + 1] === '[') {
        pos += 2; // Skip [[
        let inner = '';
        let depth = 1;
        while (pos < input.length && depth > 0) {
          if (input[pos] === '[' && pos + 1 < input.length && input[pos + 1] === '[') {
            depth++;
            inner += '[[';
            pos += 2; // Skip [[
          } else if (input[pos] === ']' && pos + 1 < input.length && input[pos + 1] === ']') {
            depth--;
            pos += 2; // Always skip both ] characters
            if (depth > 0) {
              inner += ']]';
            }
          } else {
            inner += input[pos];
            pos++;
          }
        }
        const innerParser = new DiceParser(inner);
        const innerResult = innerParser.roll();
        tokens.push({ type: 'INLINE', value: innerResult, pos });
        continue;
      }

      // Modifier keywords (greedy match, longest first)
      if (/[a-zA-Z]/.test(char)) {
        let match = '';
        while (pos < input.length && /[a-zA-Z]/.test(input[pos])) {
          match += input[pos];
          pos++;
        }
        const upper = match.toUpperCase();

        switch (upper) {
          case 'DL':
            tokens.push({ type: 'DL', value: 'dl', pos });
            break;
          case 'DH':
            tokens.push({ type: 'DH', value: 'dh', pos });
            break;
          case 'KL':
            tokens.push({ type: 'KL', value: 'kl', pos });
            break;
          case 'KH':
            tokens.push({ type: 'KH', value: 'kh', pos });
            break;
          case 'XE':
            tokens.push({ type: 'XE', value: 'xe', pos });
            break;
          case 'RE':
            tokens.push({ type: 'RE', value: 're', pos });
            break;
          case 'XO':
            tokens.push({ type: 'XO', value: 'xo', pos });
            break;
          case 'RO':
            tokens.push({ type: 'RO', value: 'ro', pos });
            break;
          case 'C':
            tokens.push({ type: 'C', value: 'c', pos });
            break;
          case 'M':
            tokens.push({ type: 'M', value: 'm', pos });
            break;
          case 'ADV':
            tokens.push({ type: 'ADV', value: 'adv', pos });
            break;
          case 'DIS':
            tokens.push({ type: 'DIS', value: 'dis', pos });
            break;
          case 'W':
            tokens.push({ type: 'W', value: 'w', pos });
            break;
          case 'PC':
            tokens.push({ type: 'PC', value: 'pc', pos });
            break;
          case 'FF':
            tokens.push({ type: 'FF', value: 'ff', pos });
            break;
          case 'T':
            tokens.push({ type: 'T', value: 't', pos });
            break;
          case 'DD':
            tokens.push({ type: 'DD', value: 'dd', pos });
            break;
          case 'X':
            tokens.push({ type: 'X', value: 'x', pos });
            break;
          case 'D':
            tokens.push({ type: 'D', value: 'd', pos });
            break;
          default:
            // Unknown keyword — skip it
            break;
        }
        continue;
      }

      // Special single-char tokens
      if (char === '!') {
        tokens.push({ type: 'EXCL', value: '!', pos });
        pos++;
        continue;
      }

      if (char === 'x') {
        tokens.push({ type: 'X', value: 'x', pos });
        pos++;
        continue;
      }

      if (char === '[') {
        tokens.push({ type: 'LBRACKET', value: '[', pos });
        pos++;
        continue;
      }

      if (char === ']') {
        tokens.push({ type: 'RBRACKET', value: ']', pos });
        pos++;
        continue;
      }

      if (char === ':') {
        tokens.push({ type: 'COLON', value: ':', pos });
        pos++;
        continue;
      }

      if (char === '|') {
        tokens.push({ type: 'PIPE', value: '|', pos });
        pos++;
        continue;
      }

      // Unknown character — skip
      pos++;
    }

    tokens.push({ type: 'EOF', value: null, pos });
    return tokens;
  }

  // ─── Parser (recursive descent) ─────────────────────────────

  /** expression = term (('+' | '-') term)* */
  private parseExpression(): number {
    let left = this.parseTerm();

    while (this.peekToken().type === 'ADD' || this.peekToken().type === 'SUB') {
      const op = this.consumeToken();
      const right = this.parseTerm();

      if (op.type === 'ADD') {
        left = left + right;
      } else {
        left = left - right;
      }

      this.mathOps.push({
        op: op.type === 'ADD' ? '+' : '-',
        value: right,
      });
    }

    return left;
  }

  /** term = factor (('*' | '/') factor)* */
  private parseTerm(): number {
    let left = this.parseFactor();

    while (this.peekToken().type === 'MUL' || this.peekToken().type === 'DIV') {
      const op = this.consumeToken();
      const right = this.parseFactor();

      if (op.type === 'MUL') {
        left = left * right;
      } else {
        if (right === 0) throw new Error('Division by zero');
        left = left / right;
      }

      this.mathOps.push({
        op: op.type === 'MUL' ? '×' : '÷',
        value: right,
      });
    }

    return left;
  }

  /** factor = unary | '(' expression ')' | dice | '[[...]]' */
  private parseFactor(): number {
    // Unary + / -
    if (this.peekToken().type === 'ADD') {
      this.consumeToken();
      return this.parseFactor();
    }

    if (this.peekToken().type === 'SUB') {
      this.consumeToken();
      return -this.parseFactor();
    }

    // Parenthesized expression — may be followed by dN for dice count
    if (this.peekToken().type === 'LPAREN') {
      this.consumeToken();
      const innerResult = this.parseExpression();
      this.expectToken('RPAREN');
      // Check if followed by dN (e.g., (2d6+3)d4)
      if (this.peekToken().type === 'D') {
        const roll = this.parseDiceRollWithCount(innerResult);
        this.dieRolls.push(roll);
        return roll.total;
      }
      return innerResult;
    }

    // Inline roll [[...]]
    if (this.peekToken().type === 'INLINE') {
      const result = this.consumeToken().value as RollResult;
      this.inlineRolls.push(result);
      return result.total;
    }

    // dd (percentile) — standalone: roll 2d10 (tens and ones)
    if (this.peekToken().type === 'DD') {
      this.consumeToken();
      const tens = this.rollDice(1, 10);
      const ones = this.rollDice(1, 10);
      const tensVal = tens[0] === 0 ? 10 : tens[0];
      const onesVal = ones[0] === 0 ? 10 : ones[0];
      const percentile = tensVal * 10 + onesVal;
      this.dieRolls.push({
        count: 2,
        sides: 10,
        rawRolls: [tens[0], ones[0]],
        explodedRolls: [percentile],
        modifiedRolls: [percentile],
        droppedRolls: [],
        keptRolls: [],
        countMatches: 0,
        wins: 0,
        total: percentile,
        modifiers: [{ type: 'dd' }],
        breakdown: `dd: [${tens[0]}, ${ones[0]}] = ${percentile}`,
      });
      return percentile;
    }

    // 1t[...] — table roll (standalone)
    if (
      this.peekToken().type === 'NUMBER' &&
      this.peekToken(1) && this.peekToken(1).type === 'T'
    ) {
      const count = this.consumeToken().value as number;
      this.consumeToken(); // consume T
      const tableResult = this.parseTable();
      this.tables.push(tableResult);
      const entryValue = parseInt(tableResult.selectedResult);
      const total = isNaN(entryValue) ? 0 : entryValue;
      this.dieRolls.push({
        count,
        sides: tableResult.sides,
        rawRolls: [tableResult.selectedValue],
        explodedRolls: [entryValue],
        modifiedRolls: [entryValue],
        droppedRolls: [],
        keptRolls: [],
        countMatches: 0,
        wins: 0,
        total,
        modifiers: [{ type: 't', tableResult }],
        breakdown: tableResult.breakdown,
      });
      return total;
    }

    // Nw — healing dice implies d6
    if (
      this.peekToken().type === 'NUMBER' &&
      this.peekToken(1) && this.peekToken(1).type === 'W'
    ) {
      const count = this.consumeToken().value as number;
      this.consumeToken(); // consume W
      const sides = 6;
      const rawRolls = this.rollDice(count, sides);
      const wins = rawRolls.reduce((sum, r) => {
        if (r === 5) return sum + 1;
        if (r === 6) return sum + 2;
        return sum;
      }, 0);
      this.dieRolls.push({
        count,
        sides,
        rawRolls,
        explodedRolls: rawRolls,
        modifiedRolls: rawRolls,
        droppedRolls: [],
        keptRolls: [],
        countMatches: 0,
        wins,
        total: wins,
        modifiers: [{ type: 'w' }],
        breakdown: `${count}w (3d6): [${rawRolls.join(', ')}] = ${wins} win${wins !== 1 ? 's' : ''}`,
      });
      return wins;
    }

    // Nadv / Ndis — advantage/disadvantage implies dN
    if (
      this.peekToken().type === 'NUMBER' &&
      this.peekToken(1) && this.peekToken(1).type === 'D'
    ) {
      const roll = this.parseDiceRoll();
      this.dieRolls.push(roll);
      return roll.total;
    }

    // D alone — bare dN (count = 1)
    if (this.peekToken().type === 'D') {
      const roll = this.parseDiceRoll();
      this.dieRolls.push(roll);
      return roll.total;
    }

    // Bare number (not followed by D)
    if (this.peekToken().type === 'NUMBER') {
      return this.consumeToken().value as number;
    }

    throw new Error(`Unexpected token: ${this.peekToken().type} (expected dice, number, or '(')`);
  }

  /** Parse a dice expression: [count] d sides (modifier)* */
  private parseDiceRoll(): DieRollResult {
    let count = 1;

    if (this.peekToken().type === 'NUMBER') {
      count = this.consumeToken().value as number;
    }

    this.expectToken('D');

    if (this.peekToken().type !== 'NUMBER') {
      throw new Error('Expected number of sides after d');
    }

    const sides = this.consumeToken().value as number;

    if (sides < 1) throw new Error('Dice must have at least 1 side');
    if (count < 0) throw new Error('Dice count cannot be negative');

    // Parse modifiers
    const modifiers: Modifier[] = [];
    while (true) {
      const modifier = this.parseModifier();
      if (!modifier) break;
      modifiers.push(modifier);
    }

    // Roll the dice
    let rawRolls = this.rollDice(count, sides);

    // Apply modifiers
    let modifiedRolls = [...rawRolls];
    const droppedRolls: number[] = [];
    const keptRolls: number[] = [];
    let countMatches = 0;
    let wins = 0;
    let lastTableResult: TableResult | undefined;

    for (const mod of modifiers) {
      switch (mod.type) {
        // ── Drop / Keep ──
        case 'dl': {
          const dropCount = mod.count || 1;
          const sorted = [...modifiedRolls].sort((a, b) => a - b);
          const dropped = sorted.slice(0, dropCount);
          modifiedRolls = modifiedRolls.filter(r => !dropped.includes(r));
          droppedRolls.push(...dropped);
          break;
        }
        case 'dh': {
          const dropCount = mod.count || 1;
          const sorted = [...modifiedRolls].sort((a, b) => b - a);
          const dropped = sorted.slice(0, dropCount);
          modifiedRolls = modifiedRolls.filter(r => !dropped.includes(r));
          droppedRolls.push(...dropped);
          break;
        }
        case 'kl': {
          const keepCount = mod.count || 1;
          const sorted = [...modifiedRolls].sort((a, b) => a - b);
          const kept = sorted.slice(0, keepCount);
          droppedRolls.push(...modifiedRolls.filter(r => !kept.includes(r)));
          modifiedRolls = kept;
          keptRolls.push(...modifiedRolls);
          break;
        }
        case 'kh': {
          const keepCount = mod.count || 1;
          const sorted = [...modifiedRolls].sort((a, b) => b - a);
          const kept = sorted.slice(0, keepCount);
          droppedRolls.push(...modifiedRolls.filter(r => !kept.includes(r)));
          modifiedRolls = kept;
          keptRolls.push(...modifiedRolls);
          break;
        }

        // ── Explode / Reroll ──
        case 'xe': {
          modifiedRolls = this.applyExplode(modifiedRolls, sides, mod, 'max');
          break;
        }
        case 're': {
          modifiedRolls = this.applyReroll(modifiedRolls, sides, mod, 'max');
          break;
        }
        case 'xo': {
          modifiedRolls = this.applyExplode(modifiedRolls, sides, mod, 'min');
          break;
        }
        case 'ro': {
          modifiedRolls = this.applyReroll(modifiedRolls, sides, mod, 'min');
          break;
        }

        // ── Count ──
        case 'c': {
          countMatches = modifiedRolls.filter(r => r === mod.value).length;
          break;
        }

        // ── Custom modifiers ──
        case '!': {
          // Double tens: each 10 counts as double
          modifiedRolls = modifiedRolls.map(r => r + Math.floor(r / 10) * 10);
          break;
        }
        case 'm': {
          // Minimum value per die
          modifiedRolls = modifiedRolls.map(r => Math.max(r, mod.value!));
          break;
        }
        case 'x': {
          // Maximum value per die
          modifiedRolls = modifiedRolls.map(r => Math.min(r, mod.value!));
          break;
        }
        case 'adv': {
          // Advantage: roll 2dN, keep highest
          const extraRolls = this.rollDice(count, sides);
          modifiedRolls = [...modifiedRolls, ...extraRolls];
          modifiedRolls = modifiedRolls.sort((a, b) => b - a).slice(0, count);
          break;
        }
        case 'dis': {
          // Disadvantage: roll 2dN, keep lowest
          const extraRolls = this.rollDice(count, sides);
          modifiedRolls = [...modifiedRolls, ...extraRolls];
          modifiedRolls = modifiedRolls.sort((a, b) => a - b).slice(0, count);
          break;
        }
        case 'w': {
          // Healing dice: 5=1 win, 6=2 wins
          wins = modifiedRolls.reduce((sum, r) => {
            if (r === 5) return sum + 1;
            if (r === 6) return sum + 2;
            return sum;
          }, 0);
          modifiedRolls = modifiedRolls.map(() => 0);
          break;
        }
        case 'dd': {
          // Percentile: 2d10, first=tens, second=ones (0=10)
          const tens = this.rollDice(1, 10);
          const ones = this.rollDice(1, 10);
          const tensVal = tens[0] === 0 ? 10 : tens[0];
          const onesVal = ones[0] === 0 ? 10 : ones[0];
          const percentile = tensVal * 10 + onesVal;
          modifiedRolls = [percentile];
          break;
        }
        case 'pc': {
          // Power crit: on max roll, roll extra d20
          const maxRoll = sides;
          const crits = modifiedRolls.filter(r => r === maxRoll);
          const extraRolls = this.rollDice(crits.length, 20);
          for (let i = 0; i < modifiedRolls.length; i++) {
            if (modifiedRolls[i] === maxRoll && extraRolls.length > 0) {
              modifiedRolls[i] += extraRolls.shift()!;
            }
          }
          break;
        }
        case 'ff': {
          // Fumble: on min roll (1), subtract d20
          const minRoll = 1;
          const fumbles = modifiedRolls.filter(r => r === minRoll);
          const penaltyRolls = this.rollDice(fumbles.length, 20);
          for (let i = 0; i < modifiedRolls.length; i++) {
            if (modifiedRolls[i] === minRoll && penaltyRolls.length > 0) {
              modifiedRolls[i] -= penaltyRolls.shift()!;
            }
          }
          break;
        }
        case 't': {
          // Table roll
          const tr = mod.tableResult as TableResult;
          this.tables.push(tr);
          lastTableResult = tr;
          const entryValue = parseInt(tr.selectedResult);
          modifiedRolls = [isNaN(entryValue) ? 0 : entryValue];
          break;
        }
      }
    }

    // Calculate total
    const total = wins > 0 ? wins : modifiedRolls.reduce((a, b) => a + b, 0);

    // Build breakdown
    const parts: string[] = [];
    parts.push(`${count}d${sides}: [${rawRolls.join(', ')}]`);

    for (const mod of modifiers) {
      switch (mod.type) {
        case 'dl':
        case 'dh':
          parts.push(`  → ${mod.type}${mod.count || ''}: dropped [${droppedRolls.join(', ')}]`);
          break;
        case 'kl':
        case 'kh':
          parts.push(`  → ${mod.type}${mod.count || ''}: kept [${keptRolls.join(', ')}]`);
          break;
        case 'xe':
        case 'xo':
          parts.push(`  → ${mod.type}: exploded`);
          break;
        case 're':
        case 'ro':
          parts.push(`  → ${mod.type}: rerolled`);
          break;
        case 'c':
          parts.push(`  → c${mod.value}: ${countMatches} match${countMatches !== 1 ? 'es' : ''}`);
          break;
        case '!':
          parts.push(`  → !: double tens`);
          break;
        case 'm':
          parts.push(`  → m${mod.value}: min ${mod.value}`);
          break;
        case 'x':
          parts.push(`  → x${mod.value}: max ${mod.value}`);
          break;
        case 'adv':
          parts.push(`  → adv: advantage`);
          break;
        case 'dis':
          parts.push(`  → dis: disadvantage`);
          break;
        case 'w':
          parts.push(`  → w: ${wins} win${wins !== 1 ? 's' : ''}`);
          break;
        case 'dd':
          parts.push(`  → dd: percentile`);
          break;
        case 'pc':
          parts.push(`  → pc: power crit`);
          break;
        case 'ff':
          parts.push(`  → ff: fumble`);
          break;
        case 't':
          parts.push(`  → table: ${lastTableResult?.selectedResult ?? '?'}`);
          break;
      }
    }

    parts.push(`= ${total}`);

    return {
      count,
      sides,
      rawRolls,
      explodedRolls: [...modifiedRolls],
      modifiedRolls,
      droppedRolls,
      keptRolls,
      countMatches,
      wins,
      total,
      modifiers,
      breakdown: parts.join('\n'),
    };
  }

  /**
   * Apply explode: if a die matches the trigger, roll another die and add it.
   * Supports cascading explodes.
   */
  private applyExplode(rolls: number[], sides: number, mod: Modifier, direction: 'max' | 'min'): number[] {
    const explodeValue = mod.value ?? (direction === 'max' ? sides : 1);
    const maxExplodes = mod.count ?? Infinity;
    let explodeCount = 0;
    const allRolls: number[] = [...rolls];

    let i = 0;
    while (i < allRolls.length) {
      const roll = allRolls[i];
      let matches = false;

      if (mod.value2 !== undefined) {
        // Range: explode on value2 <= roll <= explodeValue (or similar)
        const low = Math.min(explodeValue, mod.value2);
        const high = Math.max(explodeValue, mod.value2);
        matches = roll >= low && roll <= high;
      } else if (mod.value !== undefined) {
        // Specific value
        matches = roll === explodeValue;
      } else {
        // Default: max or min
        matches = direction === 'max' ? roll === sides : roll === 1;
      }

      if (matches && explodeCount < maxExplodes) {
        const extra = this.rollDice(1, sides);
        allRolls.push(...extra);
        explodeCount += extra.length;
      }
      i++;
    }

    return allRolls;
  }

  /**
   * Apply reroll: if a die matches the trigger, replace it with a new roll.
   */
  private applyReroll(rolls: number[], sides: number, mod: Modifier, direction: 'max' | 'min'): number[] {
    const rerollValue = mod.value ?? (direction === 'max' ? sides : 1);
    const result = [...rolls];

    for (let i = 0; i < result.length; i++) {
      let matches = false;

      if (mod.value2 !== undefined) {
        const low = Math.min(rerollValue, mod.value2);
        const high = Math.max(rerollValue, mod.value2);
        matches = result[i] >= low && result[i] <= high;
      } else {
        matches = result[i] === rerollValue;
      }

      if (matches) {
        result[i] = this.rollDice(1, sides)[0];
      }
    }

    return result;
  }

  /** Parse a dice roll with an explicit count (for parenthesized expressions) */
  private parseDiceRollWithCount(count: number): DieRollResult {
    this.expectToken('D');

    if (this.peekToken().type !== 'NUMBER') {
      throw new Error('Expected number of sides after d');
    }

    const sides = this.consumeToken().value as number;

    if (sides < 1) throw new Error('Dice must have at least 1 side');

    // Parse modifiers
    const modifiers: Modifier[] = [];
    while (true) {
      const modifier = this.parseModifier();
      if (!modifier) break;
      modifiers.push(modifier);
    }

    // Roll the dice
    let rawRolls = this.rollDice(count, sides);

    // Apply modifiers (simplified — no drop/keep/explode for parenthesized counts)
    let modifiedRolls = [...rawRolls];
    const droppedRolls: number[] = [];
    const keptRolls: number[] = [];
    let countMatches = 0;
    let wins = 0;

    for (const mod of modifiers) {
      switch (mod.type) {
        case 'xe':
        case 'xo':
          modifiedRolls = this.applyExplode(modifiedRolls, sides, mod, mod.type === 'xo' ? 'min' : 'max');
          break;
        case 're':
        case 'ro':
          modifiedRolls = this.applyReroll(modifiedRolls, sides, mod, mod.type === 'ro' ? 'min' : 'max');
          break;
        case 'm':
          modifiedRolls = modifiedRolls.map(r => Math.max(r, mod.value!));
          break;
        case 'x':
          modifiedRolls = modifiedRolls.map(r => Math.min(r, mod.value!));
          break;
        case '!':
          modifiedRolls = modifiedRolls.map(r => r + Math.floor(r / 10) * 10);
          break;
        case 'c':
          countMatches = modifiedRolls.filter(r => r === mod.value).length;
          break;
      }
    }

    const total = wins > 0 ? wins : modifiedRolls.reduce((a, b) => a + b, 0);

    return {
      count,
      sides,
      rawRolls,
      explodedRolls: [...modifiedRolls],
      modifiedRolls,
      droppedRolls,
      keptRolls,
      countMatches,
      wins,
      total,
      modifiers,
      breakdown: `${count}d${sides}: [${rawRolls.join(', ')}] → ${modifiedRolls.join(', ')} = ${total}`,
    };
  }

  /** Parse a modifier after a dice expression */
  private parseModifier(): Modifier | null {
    const token = this.peekToken();

    switch (token.type) {
      // Drop / Keep
      case 'DL':
      case 'DH':
      case 'KL':
      case 'KH': {
        this.consumeToken();
        let count = 1;
        if (this.peekToken().type === 'NUMBER') {
          count = this.consumeToken().value as number;
        }
        return { type: token.type.toLowerCase(), count };
      }

      // Explode / Reroll
      case 'XE':
      case 'RE':
      case 'XO':
      case 'RO': {
        this.consumeToken();
        const mod: Modifier = { type: token.type.toLowerCase() };

        // Parse optional value
        if (this.peekToken().type === 'NUMBER') {
          mod.value = this.consumeToken().value as number;

          // Check for range (e.g., xe3-5)
          if (this.peekToken().type === 'SUB') {
            this.consumeToken(); // consume -
            if (this.peekToken().type === 'NUMBER') {
              mod.value2 = this.consumeToken().value as number;
            }
          }
        }

        // Parse optional count (max explode rolls, e.g., xe1:3)
        if (this.peekToken().type === 'COLON') {
          this.consumeToken(); // consume :
          if (this.peekToken().type === 'NUMBER') {
            mod.count = this.consumeToken().value as number;
          }
        }

        return mod;
      }

      // Count
      case 'C': {
        this.consumeToken();
        if (this.peekToken().type !== 'NUMBER') {
          throw new Error('Expected number after c');
        }
        return { type: 'c', value: this.consumeToken().value as number };
      }

      // Special modifiers
      case 'EXCL': {
        this.consumeToken();
        return { type: '!' };
      }

      case 'M': {
        this.consumeToken();
        if (this.peekToken().type !== 'NUMBER') {
          throw new Error('Expected number after m');
        }
        return { type: 'm', value: this.consumeToken().value as number };
      }

      case 'X': {
        this.consumeToken();
        if (this.peekToken().type !== 'NUMBER') {
          throw new Error('Expected number after x');
        }
        return { type: 'x', value: this.consumeToken().value as number };
      }

      case 'ADV': {
        this.consumeToken();
        return { type: 'adv' };
      }

      case 'DIS': {
        this.consumeToken();
        return { type: 'dis' };
      }

      case 'W': {
        this.consumeToken();
        return { type: 'w' };
      }

      case 'DD': {
        this.consumeToken();
        return { type: 'dd' };
      }

      case 'PC': {
        this.consumeToken();
        return { type: 'pc' };
      }

      case 'FF': {
        this.consumeToken();
        return { type: 'ff' };
      }

      // Table
      case 'T': {
        this.consumeToken();
        const tableResult = this.parseTable();
        return { type: 't', tableResult };
      }

      default:
        return null;
    }
  }

  /** Parse a table: [1:Value|2:Value|...] */
  private parseTable(): TableResult {
    this.expectToken('LBRACKET');

    const entries: TableEntry[] = [];

    while (this.peekToken().type !== 'RBRACKET') {
      if (this.peekToken().type !== 'NUMBER') {
        throw new Error('Expected number in table entry');
      }
      const value = this.consumeToken().value as number;

      this.expectToken('COLON');

      // Parse the result text (everything until | or ])
      let result = '';
      while (this.peekToken().type !== 'PIPE' && this.peekToken().type !== 'RBRACKET') {
        const tok = this.consumeToken();
        result += typeof tok.value === 'string' ? tok.value : String(tok.value);
      }

      entries.push({ value, result });

      if (this.peekToken().type === 'PIPE') {
        this.consumeToken(); // consume |
      }
    }

    this.expectToken('RBRACKET');

    if (entries.length === 0) {
      throw new Error('Table must have at least one entry');
    }

    // Roll on the table
    const sides = entries.length;
    const roll = Math.floor(Math.random() * sides) + 1;
    const selectedEntry = entries[roll - 1];

    return {
      sides,
      selectedValue: roll,
      selectedResult: selectedEntry.result,
      entries,
      breakdown: `1d${sides} = ${roll} → ${selectedEntry.result}`,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────

  private expectToken(type: string): Token {
    const token = this.peekToken();
    if (token.type !== type) {
      throw new Error(`Expected ${type} but got ${token.type}`);
    }
    this.pos++;
    return token;
  }

  private peekToken(offset: number = 0): Token {
    return this.tokens[this.pos + offset] ?? { type: 'EOF', value: null, pos: 0 };
  }

  private consumeToken(expectedType?: string): Token {
    const token = this.peekToken();
    if (expectedType && token.type !== expectedType) {
      throw new Error(`Expected ${expectedType} but got ${token.type}`);
    }
    this.pos++;
    return token;
  }

  private rollDice(count: number, sides: number): number[] {
    // Overflow protection
    if (count > this.options.maxDiceCount) {
      throw new Error(`Too many dice: ${count} > ${this.options.maxDiceCount} max`);
    }
    if (sides > this.options.maxSides) {
      throw new Error(`Too many sides: ${sides} > ${this.options.maxSides} max`);
    }
    if (this.stackDepth >= this.options.maxStackDepth) {
      throw new Error('Maximum recursion depth exceeded');
    }

    this.totalDiceRolled += count;
    if (this.totalDiceRolled > 10000) {
      throw new Error('Too many total dice rolled (max 10,000)');
    }

    const results: number[] = [];
    for (let i = 0; i < count; i++) {
      results.push(Math.floor(Math.random() * sides) + 1);
    }
    return results;
  }

  // ─── Breakdown builder ──────────────────────────────────────

  private buildBreakdown(): string {
    const lines: string[] = [];

    if (this.dieRolls.length > 0) {
      lines.push(...this.dieRolls.map(r => r.breakdown));
    }

    for (const math of this.mathOps) {
      lines.push(`${math.op} ${math.value}`);
    }

    for (const table of this.tables) {
      lines.push(table.breakdown);
    }

    for (const inline of this.inlineRolls) {
      lines.push(inline.breakdown);
    }

    return lines.join('\n');
  }
}
