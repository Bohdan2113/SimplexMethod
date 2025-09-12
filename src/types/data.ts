export interface Resource {
  requirements: number[];
  available: number;
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