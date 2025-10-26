// types/data.ts

export type RestrictionSign = "<=" | ">=" | "=";

export interface Resource {
  requirements: number[];
  available: number;
  sign: RestrictionSign;
}

export interface LPData {
  resursCount: number;
  productsCount: number;
  resources: Resource[];
  prices: number[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface DataValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data?: LPData;
}

// Інтерфейси для методу Гомори
export interface GomoryData extends LPData {
  integerVariableIndices: number[]; // Індекси змінних (0-based), які мають бути цілими
}

export interface GomoryResult {
  status:
    | "INTEGER_OPTIMAL"
    | "NO_INTEGER_SOLUTION"
    | "ITERATION_LIMIT"
    | "ERROR";
  iterations: number;
  optimalValue: number | null;
  solution: { name: string; value: number }[] | null;
  message?: string;
}

export interface GomoryCut {
  coefficients: number[]; // Коефіцієнти для додаткового обмеження
  rhs: number; // Права частина додаткового обмеження
  slackVariableName: string; // Ім'я нової slack змінної
}
