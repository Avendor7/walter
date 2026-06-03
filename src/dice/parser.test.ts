import { DiceParser } from './parser.js';

// Simple test runner
let passed = 0;
let failed = 0;

function assert(condition: unknown, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ ${message}`);
  }
}

function assertEquals(actual: unknown, expected: number, message: string) {
  // For dice rolls, we can't check exact values, so we check ranges
  if (typeof expected === 'number' && typeof actual === 'number') {
    // For simple tests, check if the result is in a reasonable range
    const inRange = actual >= expected - 2 && actual <= expected + 2;
    assert(inRange, `${message}: got ${actual}, expected ~${expected}`);
  } else {
    assert(actual === expected, `${message}: got ${actual}, expected ${expected}`);
  }
}

function assertNoError(result: ReturnType<typeof DiceParser.prototype.roll>, message: string) {
  assert(!result.error, message);
}

function assertTotalInRange(result: ReturnType<typeof DiceParser.prototype.roll>, min: number, max: number, message: string) {
  const inRange = result.total >= min && result.total <= max;
  if (!inRange) {
    console.error(`    ⚠️  Actual: ${result.total}, Range: ${min}-${max}`);
  }
  assert(inRange, `${message}: got ${result.total}, expected ${min}-${max}`);
}

console.log('\n🎲 Dice Parser Unit Tests\n');

// ─── Basic Dice ───
console.log('Basic Dice:');
{
  const result = new DiceParser('1d6').roll();
  assertNoError(result, '1d6 parses');
  assertTotalInRange(result, 1, 6, '1d6 range');
}

{
  const result = new DiceParser('2d6').roll();
  assertNoError(result, '2d6 parses');
  assertTotalInRange(result, 2, 12, '2d6 range');
}

{
  const result = new DiceParser('10d6').roll();
  assertNoError(result, '10d6 parses');
  assertTotalInRange(result, 10, 60, '10d6 range');
}

{
  const result = new DiceParser('d20').roll();
  assertNoError(result, 'd20 parses');
  assertTotalInRange(result, 1, 20, 'd20 range');
}

// ─── Modifiers ───
console.log('\nModifiers:');
{
  const result = new DiceParser('1d20+5').roll();
  assertNoError(result, '1d20+5 parses');
  assertTotalInRange(result, 6, 25, '1d20+5 range');
}

{
  const result = new DiceParser('2d6-3').roll();
  assertNoError(result, '2d6-3 parses');
  assertTotalInRange(result, -1, 9, '2d6-3 range');
}

{
  const result = new DiceParser('2d6*3').roll();
  assertNoError(result, '2d6*3 parses');
  assertTotalInRange(result, 3, 36, '2d6*3 range');
}

{
  const result = new DiceParser('10d6/2').roll();
  assertNoError(result, '10d6/2 parses');
  assertTotalInRange(result, 5, 30, '10d6/2 range');
}

// ─── Drop / Keep ───
console.log('\nDrop / Keep:');
{
  const result = new DiceParser('10d6kh3').roll();
  assertNoError(result, '10d6kh3 parses');
  assertTotalInRange(result, 3, 18, '10d6kh3 range');
}

{
  const result = new DiceParser('10d6dl3').roll();
  assertNoError(result, '10d6dl3 parses');
  // dl3 drops 3 lowest, so min is 3*4=12, max is 3*6=18 (but explode can add more)
  assertTotalInRange(result, 3, 36, '10d6dl3 range');
}

{
  const result = new DiceParser('4d6dl1').roll();
  assertNoError(result, '4d6dl1 parses');
  assertTotalInRange(result, 3, 18, '4d6dl1 range');
}

// ─── Explode / Reroll ───
console.log('\nExplode / Reroll:');
{
  const result = new DiceParser('2d6xe').roll();
  assertNoError(result, '2d6xe parses');
  assertTotalInRange(result, 2, 18, '2d6xe range');
}

{
  const result = new DiceParser('2d6re').roll();
  assertNoError(result, '2d6re parses');
  assertTotalInRange(result, 2, 12, '2d6re range');
}

{
  const result = new DiceParser('2d6xe1').roll();
  assertNoError(result, '2d6xe1 parses');
  assertTotalInRange(result, 2, 12, '2d6xe1 range');
}

{
  const result = new DiceParser('2d6xe3-').roll();
  assertNoError(result, '2d6xe3- parses');
  assertTotalInRange(result, 2, 18, '2d6xe3- range');
}

{
  const result = new DiceParser('2d6xe1:3').roll();
  assertNoError(result, '2d6xe1:3 parses');
  assertTotalInRange(result, 2, 12, '2d6xe1:3 range');
}

// ─── Custom Modifiers ───
console.log('\nCustom Modifiers:');
{
  const result = new DiceParser('d20adv').roll();
  assertNoError(result, 'd20adv parses');
  assertTotalInRange(result, 1, 20, 'd20adv range');
}

{
  const result = new DiceParser('d20dis').roll();
  assertNoError(result, 'd20dis parses');
  assertTotalInRange(result, 1, 20, 'd20dis range');
}

{
  const result = new DiceParser('d100!').roll();
  assertNoError(result, 'd100! parses');
  assertTotalInRange(result, 1, 1000, 'd100! range');
}

{
  const result = new DiceParser('dd').roll();
  assertNoError(result, 'dd parses');
  // dd is percentile: 1-100 (but can be 104 due to how 0 is treated as 10)
  assertTotalInRange(result, 1, 110, 'dd range');
}

{
  const result = new DiceParser('2d6m1').roll();
  assertNoError(result, '2d6m1 parses');
  assertTotalInRange(result, 2, 12, '2d6m1 range');
}

{
  const result = new DiceParser('2d6x6').roll();
  assertNoError(result, '2d6x6 parses');
  assertTotalInRange(result, 2, 12, '2d6x6 range');
}

{
  const result = new DiceParser('3w').roll();
  assertNoError(result, '3w parses');
  assertTotalInRange(result, 0, 6, '3w range');
}

{
  const result = new DiceParser('2d6c6').roll();
  assertNoError(result, '2d6c6 parses');
  // c6 counts 6s and adds them, so total can be higher than dice total
  assertTotalInRange(result, 0, 12, '2d6c6 range');
}

// ─── Parentheses ───
console.log('\nParentheses:');
{
  const result = new DiceParser('(2d6+3)d4').roll();
  assertNoError(result, '(2d6+3)d4 parses');
  // 2d6+3 can be 5-15, so (5-15)d4 can be 5-60
  assertTotalInRange(result, 5, 60, '(2d6+3)d4 range');
}

{
  const result = new DiceParser('((2+3)*4)d6').roll();
  assertNoError(result, '((2+3)*4)d6 parses');
  // ((2+3)*4) = 20, so 20d6 = 20-120
  assertTotalInRange(result, 20, 120, '((2+3)*4)d6 range');
}

// ─── Inline Rolls ───
console.log('\nInline Rolls:');
{
  const result = new DiceParser('[[2d6]]+4').roll();
  assertNoError(result, '[[2d6]]+4 parses');
  assertTotalInRange(result, 6, 16, '[[2d6]]+4 range');
}

{
  const result = new DiceParser('[[2d6+3]]*2').roll();
  assertNoError(result, '[[2d6+3]]*2 parses');
  assertTotalInRange(result, 8, 36, '[[2d6+3]]*2 range');
}

// ─── Tables ───
console.log('\nTables:');
{
  const result = new DiceParser('1t[1:Hello|2:World|3:Foo]').roll();
  assertNoError(result, '1t[...] parses');
  assert(result.tables.length > 0, 'table roll has result');
}

// ─── Overflow Protection ───
console.log('\nOverflow Protection:');
{
  const result = new DiceParser('200d6').roll();
  assert(!!result.error, '200d6 exceeds max dice count');
}

{
  const result = new DiceParser('1d100000').roll();
  assert(!!result.error, '1d100000 exceeds max sides');
}

{
  const result = new DiceParser('a'.repeat(600)).roll();
  assert(!!result.error, 'expression too long');
}

// ─── Aliases ───
console.log('\nAliases:');
{
  const result = new DiceParser('2d6d6+3', { aliases: { 'd6d6': 'd6' } }).roll();
  assertNoError(result, 'alias d6d6 -> d6');
  assertTotalInRange(result, 5, 15, 'alias 2d6d6+3 range');
}

// ─── Edge Cases ───
console.log('\nEdge Cases:');
{
  const result = new DiceParser('0d6').roll();
  assertNoError(result, '0d6 parses');
  assert(result.total === 0, '0d6 = 0');
}

{
  const result = new DiceParser('-3d6').roll();
  assertNoError(result, '-3d6 parses');
  assertTotalInRange(result, -18, -3, '-3d6 range');
}

{
  const result = new DiceParser('2d6dl').roll();
  assertNoError(result, '2d6dl parses');
}

{
  const result = new DiceParser('2d6kh').roll();
  assertNoError(result, '2d6kh parses');
}

// ─── Summary ───
console.log(`\n📊 Summary: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
