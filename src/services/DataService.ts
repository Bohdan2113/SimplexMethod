import {
  LPData,
  ValidationError,
  DataValidationResult,
} from "../types/data.js";

export class DataService {
  private static instance: DataService;

  private constructor() {}

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  public async loadData(filePath: string): Promise<LPData> {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data as LPData;
    } catch (error) {
      throw new Error(
        `Failed to load data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  public validateData(data: LPData): DataValidationResult {
    const errors: ValidationError[] = [];

    const expectedKeys = [
      "resursCount",
      "productsCount",
      "resources",
      "prices",
    ];
    const actualKeys = Object.keys(data);

    expectedKeys.forEach((key) => {
      if (!actualKeys.includes(key)) {
        errors.push({
          field: key,
          message: `Missing required key '${key}'`,
        });
      }
    });

    actualKeys.forEach((key) => {
      if (!expectedKeys.includes(key)) {
        errors.push({
          field: key,
          message: `Unknown key '${key}' in JSON`,
        });
      }
    });

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    const toNumber = (value: any, fieldName: string): number => {
      if (typeof value === "string" && !isNaN(Number(value))) {
        return Number(value);
      }
      if (typeof value === "number") return value;
      errors.push({
        field: fieldName,
        message: `Field '${fieldName}' should be a number`,
      });
      return NaN;
    };

    data.resursCount = toNumber(data.resursCount, "resursCount");
    if (data.resursCount <= 0) {
      errors.push({
        field: "resursCount",
        message: "Field 'resursCount' should be > 0",
      });
    }

    data.productsCount = toNumber(data.productsCount, "productsCount");
    if (data.productsCount <= 0) {
      errors.push({
        field: "productsCount",
        message: "Field 'productsCount' should be > 0",
      });
    }

    if (!Array.isArray(data.resources)) {
      errors.push({
        field: "resources",
        message: "'resources' should be an array",
      });
    } else if (data.resources.length !== data.resursCount) {
      errors.push({
        field: "resources",
        message: `'resources' should contain exactly ${data.resursCount} elements (currently ${data.resources.length})`,
      });
    } else {
      data.resources.forEach((res: any, idx: number) => {
        if (typeof res !== "object" || res === null) {
          errors.push({
            field: `resources[${idx}]`,
            message: `Resource #${idx + 1} should be an object`,
          });
          return;
        }

        const resKeys = Object.keys(res);
        const expectedResKeys = ["requirements", "available"];

        expectedResKeys.forEach((key) => {
          if (!resKeys.includes(key)) {
            errors.push({
              field: `resources[${idx}].${key}`,
              message: `Resource #${idx + 1} missing key '${key}'`,
            });
          }
        });

        resKeys.forEach((key) => {
          if (!expectedResKeys.includes(key)) {
            errors.push({
              field: `resources[${idx}].${key}`,
              message: `Resource #${idx + 1} has extra key '${key}'`,
            });
          }
        });

        if (!Array.isArray(res.requirements)) {
          errors.push({
            field: `resources[${idx}].requirements`,
            message: `Resource #${idx + 1}: 'requirements' should be an array`,
          });
        } else if (res.requirements.length !== data.productsCount) {
          errors.push({
            field: `resources[${idx}].requirements`,
            message: `Resource #${
              idx + 1
            }: 'requirements' should contain exactly ${
              data.productsCount
            } numbers`,
          });
        } else {
          res.requirements = res.requirements.map((val: any, i: number) => {
            const num = toNumber(val, `resources[${idx}].requirements[${i}]`);
            return num;
          });
        }

        res.available = toNumber(res.available, `resources[${idx}].available`);
        if (res.available < 0) {
          errors.push({
            field: `resources[${idx}].available`,
            message: `Resource #${idx + 1}: 'available' should be ≥ 0`,
          });
        }
      });
    }

    if (!Array.isArray(data.prices)) {
      errors.push({
        field: "prices",
        message: "'prices' should be an array",
      });
    } else if (data.prices.length !== data.productsCount) {
      errors.push({
        field: "prices",
        message: `'prices' should contain exactly ${data.productsCount} numbers (currently ${data.prices.length})`,
      });
    } else {
      data.prices = data.prices.map((val: any, i: number) => {
        const num = toNumber(val, `prices[${i}]`);
        return num;
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? (data as LPData) : undefined,
    };
  }
}
