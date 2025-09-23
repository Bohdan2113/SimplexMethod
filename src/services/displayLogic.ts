import {
  DataValidationResult,
  LPData,
  ValidationError,
} from "../types/data.js";
import { subscripts } from "../types/table.js";
import { DataService } from "./DataService.js";
import { DATA_FILE_PATH } from "../utils/constants.js";

export class InteractiveTableManager {
  private dataService: DataService;

  private currentData: LPData = {
    resursCount: 1,
    productsCount: 1,
    resources: [{ requirements: [0], available: 0 }],
    prices: [0],
  };

  private loadButton!: HTMLButtonElement;
  private statusElement!: HTMLElement;
  private numVariablesInput!: HTMLInputElement;
  private numRestrictionsInput!: HTMLInputElement;
  private restrictionsContainer!: HTMLElement;
  private objectiveFunctionContainer!: HTMLElement;
  private objectiveFunctionElement!: HTMLElement;
  private nonNegativityConstraint!: HTMLElement;

  constructor() {
    this.dataService = DataService.getInstance();
    this.initializeElements();
    this.setupEventListeners();
    this.createInitialForm();
  }

  private initializeElements(): void {
    this.loadButton = document.getElementById(
      "loadDataBtn"
    ) as HTMLButtonElement;
    this.statusElement = document.getElementById("status") as HTMLElement;
    this.numVariablesInput = document.getElementById(
      "numVariables"
    ) as HTMLInputElement;
    this.numRestrictionsInput = document.getElementById(
      "numRestrictions"
    ) as HTMLInputElement;
    this.restrictionsContainer = document.getElementById(
      "restrictionsContainer"
    ) as HTMLElement;
    this.objectiveFunctionContainer = document.getElementById(
      "objectiveFunctionContainer"
    ) as HTMLElement;
    this.objectiveFunctionElement = document.getElementById(
      "objectiveFunction"
    ) as HTMLElement;
    this.nonNegativityConstraint = document.getElementById(
      "nonNegativityConstraint"
    ) as HTMLElement;
  }

  private setupEventListeners(): void {
    this.loadButton.addEventListener("click", () => this.loadAndDisplayData());
    this.numVariablesInput.addEventListener("input", () =>
      this.onVariablesCountChange()
    );
    this.numRestrictionsInput.addEventListener("input", () =>
      this.onRestrictionsCountChange()
    );
  }

  private createInitialForm(): void {
    this.syncControlsWithData();
    this.renderForm(this.currentData);
    this.updateObjectiveFunction();
  }

  private syncControlsWithData(): void {
    this.numVariablesInput.value = this.currentData.productsCount.toString();
    this.numRestrictionsInput.value = this.currentData.resursCount.toString();
  }

  private onVariablesCountChange(): void {
    const newCount = parseInt(this.numVariablesInput.value) || 1;
    if (newCount < 1 || newCount > 10) {
      this.showStatus("Number of variables must be between 1 and 10", "error");
      this.numVariablesInput.value = this.currentData.productsCount.toString();
      return;
    }

    this.updateDataStructure(newCount, this.currentData.resursCount);
    this.renderForm(this.currentData);
    this.updateObjectiveFunction();
    this.showStatus(`Updated to ${newCount} variables`, "success");
  }

  private onRestrictionsCountChange(): void {
    const newCount = parseInt(this.numRestrictionsInput.value) || 1;
    if (newCount < 1 || newCount > 10) {
      this.showStatus(
        "Number of restrictions must be between 1 and 10",
        "error"
      );
      this.numRestrictionsInput.value = this.currentData.resursCount.toString();
      return;
    }

    this.updateDataStructure(this.currentData.productsCount, newCount);
    this.renderForm(this.currentData);
    this.updateObjectiveFunction();
    this.showStatus(`Updated to ${newCount} restrictions`, "success");
  }

  private updateDataStructure(
    newVariablesCount: number,
    newRestrictionsCount: number
  ): void {
    this.currentData.productsCount = newVariablesCount;

    if (newVariablesCount > this.currentData.prices.length) {
      for (let i = this.currentData.prices.length; i < newVariablesCount; i++) {
        this.currentData.prices.push(0);
      }
    } else if (newVariablesCount < this.currentData.prices.length) {
      this.currentData.prices = this.currentData.prices.slice(
        0,
        newVariablesCount
      );
    }

    this.currentData.resursCount = newRestrictionsCount;

    if (newRestrictionsCount > this.currentData.resources.length) {
      for (
        let i = this.currentData.resources.length;
        i < newRestrictionsCount;
        i++
      ) {
        const newResource = {
          requirements: new Array(newVariablesCount).fill(0),
          available: 0,
        };
        this.currentData.resources.push(newResource);
      }
    } else if (newRestrictionsCount < this.currentData.resources.length) {
      this.currentData.resources = this.currentData.resources.slice(
        0,
        newRestrictionsCount
      );
    }

    this.currentData.resources.forEach((resource) => {
      if (resource.requirements.length < newVariablesCount) {
        for (let i = resource.requirements.length; i < newVariablesCount; i++) {
          resource.requirements.push(0);
        }
      } else if (resource.requirements.length > newVariablesCount) {
        resource.requirements = resource.requirements.slice(
          0,
          newVariablesCount
        );
      }
    });
  }

  private async loadAndDisplayData(): Promise<void> {
    try {
      this.setLoadingState(true);
      this.showStatus("Loading data...", "loading");

      const data: LPData = await this.dataService.loadData(
        DATA_FILE_PATH || "../data/Bogdan.json"
      );
      const validationResult: DataValidationResult =
        this.dataService.validateData(data);

      if (!validationResult.isValid) {
        this.showStatus("Data from file is invalid", "error");
        this.displayValidationErrors(validationResult.errors);
        return;
      }

      this.currentData = data;
      this.syncControlsWithData();
      this.renderForm(this.currentData);
      this.updateObjectiveFunction();
      this.showStatus("Data loaded successfully!", "success");
    } catch (error) {
      this.showStatus(
        `Error loading data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error"
      );
    } finally {
      this.setLoadingState(false);
    }
  }

  private updateObjectiveFunction(): void {
    if (!this.isDataValid()) {
      this.objectiveFunctionElement.textContent = "Q(...) = ?";
      this.objectiveFunctionElement.className = "objective-function invalid";
      return;
    }
    const terms: string[] = [],
      vars: string[] = [];
    this.currentData.prices.forEach((price, i) => {
      if (price !== 0) {
        vars.push(`x${subscripts[i + 1]}`);
        terms.push(`${price}x${subscripts[i + 1]}`);
      }
    });
    this.objectiveFunctionElement.textContent =
      terms.length === 0
        ? "Q(...) = 0 → max"
        : `Q(${vars.join(",")}) = ${terms.join(" + ")} → max`;
    this.objectiveFunctionElement.className = "objective-function valid";
    this.nonNegativityConstraint.innerHTML = `X<sub>i</sub> &ge; 0, where i = 1,...,${this.currentData.productsCount}`;
  }

  private isDataValid(): boolean {
    for (const p of this.currentData.prices) if (isNaN(p)) return false;
    for (const r of this.currentData.resources)
      if (isNaN(r.available) || r.available < 0) return false;
    return true;
  }

  private setLoadingState(isLoading: boolean): void {
    this.loadButton.disabled = isLoading;
    this.loadButton.textContent = isLoading
      ? "Loading..."
      : "Load Data from File";
  }

  private showStatus(
    message: string,
    type: "success" | "error" | "loading"
  ): void {
    this.statusElement.textContent = message;
    this.statusElement.className = `status ${type}`;
  }

  private displayValidationErrors(errors: ValidationError[]): void {
    this.statusElement.innerHTML =
      "Validation Errors:<br>" + errors.map((e) => e.message).join("<br>");
  }

  private renderForm(data: LPData): void {
    this.restrictionsContainer.innerHTML = "";
    this.objectiveFunctionContainer.innerHTML = "";

    data.resources.forEach((resource, i) => {
      const row = document.createElement("div");
      row.className = "equation-row";

      const label = document.createElement("span");
      label.className = "row-label";
      label.textContent = `${i + 1})`;
      row.appendChild(label);

      for (let j = 0; j < data.productsCount; j++) {
        const input = this.createInput(resource.requirements[j], (val) => {
          this.currentData.resources[i].requirements[j] = val;
          console.log("this.currentData", this.currentData);
        });
        row.appendChild(input);

        const xSpan = document.createElement("span");
        xSpan.innerHTML = `&bull;X<sub>${j + 1}</sub>`;
        row.appendChild(xSpan);

        if (j < data.productsCount - 1) {
          const plusSpan = document.createElement("span");
          plusSpan.textContent = " + ";
          row.appendChild(plusSpan);
        }
      }

      const leSpan = document.createElement("span");
      leSpan.innerHTML = " &le; ";
      row.appendChild(leSpan);

      const rhsInput = this.createInput(resource.available, (val) => {
        this.currentData.resources[i].available = val;
      });
      rhsInput.min = "0";
      row.appendChild(rhsInput);
      this.restrictionsContainer.appendChild(row);
    });

    const objRow = document.createElement("div");
    objRow.className = "objective-function-row";

    const maxZSpan = document.createElement("span");
    maxZSpan.textContent = "max Z = ";
    objRow.appendChild(maxZSpan);

    data.prices.forEach((price, j) => {
      const input = this.createInput(price, (val) => {
        this.currentData.prices[j] = val;
        this.updateObjectiveFunction();
      });
      objRow.appendChild(input);

      const xSpan = document.createElement("span");
      xSpan.innerHTML = `&bull;X<sub>${j + 1}</sub>`;
      objRow.appendChild(xSpan);

      if (j < data.productsCount - 1) {
        const plusSpan = document.createElement("span");
        plusSpan.textContent = " + ";
        objRow.appendChild(plusSpan);
      }
    });

    const zeroSpan = document.createElement("span");
    zeroSpan.textContent = " + 0";
    objRow.appendChild(zeroSpan);

    this.objectiveFunctionContainer.appendChild(objRow);
  }

  private createInput(
    value: number,
    onChange: (newValue: number) => void
  ): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "number";
    input.value = value.toString();
    input.step = "1";

    input.addEventListener("input", () => {
      const newValue = parseFloat(input.value) || 0;

      if (input.min === "0" && newValue < 0) {
        input.value = "0";
        this.showStatus("Values cannot be negative", "error");
        return;
      }

      onChange(newValue);

      this.showStatus("Data updated", "success");
    });

    return input;
  }

  public getCurrentData(): LPData {
    return this.currentData;
  }
}
