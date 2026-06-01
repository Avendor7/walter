export interface Token {
  type: string;
  value: string | number | RollResult | null;
  pos: number;
}

export interface Modifier {
  type: string;
  count?: number;
  value?: number;
  value2?: number;
  tableResult?: TableResult;
}

export interface DieRollResult {
  count: number;
  sides: number;
  rawRolls: number[];
  explodedRolls: number[];
  modifiedRolls: number[];
  droppedRolls: number[];
  keptRolls: number[];
  countMatches: number;
  wins: number;
  total: number;
  modifiers: Modifier[];
  breakdown: string;
}

export interface TableEntry {
  value: number;
  result: string;
}

export interface TableResult {
  sides: number;
  selectedValue: number;
  selectedResult: string;
  entries: TableEntry[];
  breakdown: string;
}

export interface RollResult {
  expression: string;
  total: number;
  dieRolls: DieRollResult[];
  math: { op: string; value: number }[];
  tables: TableResult[];
  inlineRolls: RollResult[];
  error?: string;
  breakdown: string;
  truncated?: boolean;
}
