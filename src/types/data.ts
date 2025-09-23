// types/data.ts

export type RestrictionSign = "<=" | ">=" | "=";
export type ObjectiveType = "max" | "min";

export interface Resource {
  requirements: number[];
  available: number;
  sign: RestrictionSign; // Додано
}

export interface LPData {
  resursCount: number;
  productsCount: number;
  resources: Resource[];
  prices: number[];
  objective?: ObjectiveType; // Додано
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