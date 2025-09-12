import {
  DataValidationResult,
  LPData,
  ValidationError,
} from "../types/data.js";
import { subscripts } from "../types/table.js";
import { DataService } from "./DataService.js";
import { DATA_FILE_PATH } from "../utils/constants.js";

export let currentData: LPData = {
  resursCount: 1,
  productsCount: 1,
  resources: [{ requirements: [0], available: 0 }],
  prices: [0],
};

export class InteractiveTableManager {
  private dataService: DataService;
  private loadButton!: HTMLButtonElement;
  private statusElement!: HTMLElement;
  private tableContainer!: HTMLElement;
  private dataTable!: HTMLTableElement;
  private addRowButton!: HTMLButtonElement;
  private removeRowButton!: HTMLButtonElement;
  private addColumnButton!: HTMLButtonElement;
  private removeColumnButton!: HTMLButtonElement;
  private objectiveFunctionElement!: HTMLElement;

  constructor() {
    this.dataService = DataService.getInstance();
    this.initializeElements();
    this.setupEventListeners();
    this.createInitialTable();
  }

  private initializeElements(): void {
    this.loadButton = document.getElementById(
      "loadDataBtn"
    ) as HTMLButtonElement;
    this.statusElement = document.getElementById("status") as HTMLElement;
    this.tableContainer = document.getElementById(
      "tableContainer"
    ) as HTMLElement;
    this.dataTable = document.getElementById("dataTable") as HTMLTableElement;
    this.addRowButton = document.getElementById(
      "addRowBtn"
    ) as HTMLButtonElement;
    this.removeRowButton = document.getElementById(
      "removeRowBtn"
    ) as HTMLButtonElement;
    this.addColumnButton = document.getElementById(
      "addColumnBtn"
    ) as HTMLButtonElement;
    this.removeColumnButton = document.getElementById(
      "removeColumnBtn"
    ) as HTMLButtonElement;
    this.objectiveFunctionElement = document.getElementById(
      "objectiveFunction"
    ) as HTMLElement;
  }

  private setupEventListeners(): void {
    this.loadButton.addEventListener("click", () => this.loadAndDisplayData());
    this.addRowButton.addEventListener("click", () => this.addRow());
    this.removeRowButton.addEventListener("click", () => this.removeRow());
    this.addColumnButton.addEventListener("click", () => this.addColumn());
    this.removeColumnButton.addEventListener("click", () =>
      this.removeColumn()
    );
  }

  private createInitialTable(): void {
    this.displayTable(currentData);
    this.updateButtonStates();
    this.updateObjectiveFunction();
  }

  private async loadAndDisplayData(): Promise<void> {
    try {
      this.setLoadingState(true);
      this.showStatus("Loading data...", "loading");

      // Завантаження даних з data.json
      const data: LPData = await this.dataService.loadData(DATA_FILE_PATH as string);

      const validationResult: DataValidationResult =
        this.dataService.validateData(data);
      if (!validationResult.isValid) {
        this.showStatus("Data is invalid", "error");
        this.displayValidationErrors(validationResult.errors);
        return;
      }

      currentData = data;
      this.displayTable(data);
      this.updateButtonStates();
      this.updateObjectiveFunction();
      this.showStatus("Data loaded successfully!", "success");
    } catch (error) {
      console.error("Error loading data:", error);
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

  private addRow(): void {
    if (currentData.resursCount >= 10) {
      this.showStatus("Maximum 10 resources allowed", "error");
      return;
    }

    currentData.resursCount++;
    currentData.resources.push({
      requirements: new Array(currentData.productsCount).fill(0),
      available: 0,
    });

    this.displayTable(currentData);
    this.updateButtonStates();
    this.updateObjectiveFunction();
    this.showStatus("Resource added", "success");
  }

  private removeRow(): void {
    if (currentData.resursCount <= 1) {
      this.showStatus("Minimum 1 resource required", "error");
      return;
    }

    currentData.resursCount--;
    currentData.resources.pop();

    this.displayTable(currentData);
    this.updateButtonStates();
    this.updateObjectiveFunction();
    this.showStatus("Resource removed", "success");
  }

  private addColumn(): void {
    if (currentData.productsCount >= 10) {
      this.showStatus("Maximum 10 products allowed", "error");
      return;
    }

    currentData.productsCount++;
    currentData.prices.push(0);

    // Додаємо новий стовпець до всіх ресурсів
    currentData.resources.forEach((resource) => {
      resource.requirements.push(0);
    });

    this.displayTable(currentData);
    this.updateButtonStates();
    this.updateObjectiveFunction();
    this.showStatus("Product added", "success");
  }

  private removeColumn(): void {
    if (currentData.productsCount <= 1) {
      this.showStatus("Minimum 1 product required", "error");
      return;
    }

    currentData.productsCount--;
    currentData.prices.pop();

    // Видаляємо останній стовпець з усіх ресурсів
    currentData.resources.forEach((resource) => {
      resource.requirements.pop();
    });

    this.displayTable(currentData);
    this.updateButtonStates();
    this.updateObjectiveFunction();
    this.showStatus("Product removed", "success");
  }

  private updateButtonStates(): void {
    this.removeRowButton.disabled = currentData.resursCount <= 1;
    this.addRowButton.disabled = currentData.resursCount >= 10;
    this.removeColumnButton.disabled = currentData.productsCount <= 1;
    this.addColumnButton.disabled = currentData.productsCount >= 10;
  }

  private updateObjectiveFunction(): void {
    const isValid = this.isDataValid();

    if (!isValid) {
      this.objectiveFunctionElement.textContent = "Q(x₁,x₂,...) = ?";
      this.objectiveFunctionElement.className = "objective-function invalid";
      return;
    }

    // Створюємо цільову функцію
    const terms: string[] = [];
    const vars: string[] = [];

    for (let i = 0; i < currentData.productsCount; i++) {
      const price = currentData.prices[i];
      if (price > 0) {
        vars.push(`x${subscripts[i + 1]}`);
        terms.push(`${price}x${subscripts[i + 1]}`);
      }
    }

    if (terms.length === 0) {
      this.objectiveFunctionElement.textContent = "Q(..) = 0";
    } else {
      this.objectiveFunctionElement.textContent = `Q(${vars.join(
        ","
      )}) = ${terms.join("+")} → max`;
    }

    this.objectiveFunctionElement.className = "objective-function valid";
  }

  private isDataValid(): boolean {
    // Перевіряємо чи всі ціни є дійсними числами
    for (const price of currentData.prices) {
      if (isNaN(price) || price < 0) {
        return false;
      }
    }

    // Перевіряємо чи всі ресурси мають дійсні значення
    for (const resource of currentData.resources) {
      if (isNaN(resource.available) || resource.available < 0) {
        return false;
      }
    }

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
    this.statusElement.innerHTML +=
      "<br><br>" + errors.map((e) => e.message).join("<br>");
  }

  private displayTable(data: LPData): void {
    // Очищення попереднього вмісту
    this.dataTable.innerHTML = "";

    // Створення заголовка таблиці (thead)
    const thead = this.dataTable.createTHead();
    const headerRow = thead.insertRow();

    // Перший стовпець заголовка
    const thResource = document.createElement("th");
    thResource.textContent = "Resources";
    headerRow.appendChild(thResource);

    // Стовпці для продуктів
    for (let i = 0; i < data.productsCount; i++) {
      const th = document.createElement("th");
      const input = document.createElement("input");
      input.type = "text";
      input.value = `Product ${i + 1}`;
      input.className = "editable-cell product-name";
      input.addEventListener("blur", (e) => {
        // Тут можна додати логіку для збереження нової назви продукту
        console.log(
          `Product ${i + 1} renamed to: ${(e.target as HTMLInputElement).value}`
        );
      });
      th.appendChild(input);
      headerRow.appendChild(th);
    }

    // Останній стовпець заголовка
    const thAvailable = document.createElement("th");
    thAvailable.textContent = "Total available resources";
    thAvailable.className = "available-column";
    headerRow.appendChild(thAvailable);

    // Створення тіла таблиці (tbody)
    const tbody = this.dataTable.createTBody();

    // Рядки для кожного ресурсу
    data.resources.forEach((resource, index) => {
      const row = tbody.insertRow();

      // Назва ресурсу (редагується)
      const resourceNameCell = row.insertCell();
      const resourceNameInput = document.createElement("input");
      resourceNameInput.type = "text";
      resourceNameInput.value = `Resource ${index + 1}`;
      resourceNameInput.className = "editable-cell resource-name";
      resourceNameInput.addEventListener("blur", (e) => {
        console.log(
          `Resource ${index + 1} renamed to: ${
            (e.target as HTMLInputElement).value
          }`
        );
      });
      resourceNameCell.appendChild(resourceNameInput);

      // Вимоги ресурсів (редагуються)
      resource.requirements.forEach((value, productIndex) => {
        const cell = row.insertCell();
        const input = document.createElement("input");
        input.type = "number";
        input.value = value.toString();
        input.className = "editable-cell";
        // input.min = "0";
        input.addEventListener("input", (e) => {
          const newValue =
            parseFloat((e.target as HTMLInputElement).value) || 0;
          currentData.resources[index].requirements[productIndex] = newValue;
          this.updateObjectiveFunction();
        });
        cell.appendChild(input);
      });

      // Доступні ресурси (редагуються)
      const availableCell = row.insertCell();
      const availableInput = document.createElement("input");
      availableInput.type = "number";
      availableInput.value = resource.available.toString();
      availableInput.className = "editable-cell available-column";
      availableInput.min = "0";
      availableInput.addEventListener("input", (e) => {
        let newValue = parseFloat((e.target as HTMLInputElement).value) || 0;
        if (newValue < 0) {
          newValue = 0;
          availableInput.value = newValue.toString();
        }
        currentData.resources[index].available = newValue;
        this.updateObjectiveFunction();
      });
      availableCell.appendChild(availableInput);
    });

    // Додавання рядка прибутку
    const profitRow = tbody.insertRow();
    profitRow.className = "profit-row";
    const profitCell = profitRow.insertCell();
    profitCell.textContent = "Profit, $";

    data.prices.forEach((price, index) => {
      const cell = profitRow.insertCell();
      const input = document.createElement("input");
      input.type = "number";
      input.value = price.toString();
      input.className = "editable-cell";
      input.min = "0";
      input.addEventListener("input", (e) => {
        let newValue = parseFloat((e.target as HTMLInputElement).value) || 0;
        if (newValue < 0) {
          newValue = 0;
          input.value = newValue.toString();
        }
        currentData.prices[index] = newValue;
        this.updateObjectiveFunction();
      });
      cell.appendChild(input);
    });

    // Порожня клітинка в кінці рядка прибутку
    profitRow.insertCell().textContent = "-";
  }
}

// Initialize the interactive table manager when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new InteractiveTableManager();
});
