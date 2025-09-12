import { SimplexTableData } from "../types/table.js";

export class SimplexTable {
  private table: HTMLTableElement;
  private tbody: HTMLTableSectionElement;
  private rows: number;
  private cols: number;
  private tableNumber: number;

  constructor(rows: number, cols: number, tableNumber: number) {
    this.rows = rows;
    this.cols = cols;
    this.table = document.createElement("table");
    this.table.className = "simplex-table";
    this.tbody = this.table.createTBody();
    this.tableNumber = tableNumber;
    this.createStructure();
    this.render("symplexTables");
  }

  private createStructure(): void {
    const tableName = document.createElement("h2");
    tableName.className = "simplex-table-name";
    tableName.innerHTML = `ST-${this.tableNumber}`;
    this.tbody.appendChild(tableName);

    // --- Створення верхнього рядка заголовків (c_i) ---
    const headerTopRow = document.createElement("tr");
    const xbHeaderTop = document.createElement("th");
    xbHeaderTop.classList.add("header-not-bottom");
    headerTopRow.appendChild(xbHeaderTop); // Пуста клітинка над x_b
    const cbHeaderTop = document.createElement("th");
    cbHeaderTop.classList.add("header-not-bottom");
    headerTopRow.appendChild(cbHeaderTop); // Пуста клітинка над c_b
    const p0HeaderTop = document.createElement("th");
    p0HeaderTop.classList.add("header-not-bottom");
    headerTopRow.appendChild(p0HeaderTop); // Пуста клітинка над P0

    for (let j = 0; j < this.cols; j++) {
      const th = document.createElement("th");
      th.id = `t-${this.tableNumber}-c-header-${j}`; // ID для легкого доступу
      headerTopRow.appendChild(th);
    }
    this.tbody.appendChild(headerTopRow);

    // --- Створення нижнього рядка заголовків (P_i) ---
    const headerBottomRow = document.createElement("tr");
    const xbHeader = document.createElement("th");
    xbHeader.classList.add("header-bottom-p");
    xbHeader.innerHTML = "x<sub>b</sub>";
    headerBottomRow.appendChild(xbHeader);

    const cbHeader = document.createElement("th");
    cbHeader.innerHTML = "c<sub>b</sub>";
    cbHeader.classList.add("header-bottom-p");
    headerBottomRow.appendChild(cbHeader);

    const p0Header = document.createElement("th");
    p0Header.innerHTML = "P<sub>0</sub>";
    p0Header.classList.add("header-bottom-p");
    headerBottomRow.appendChild(p0Header);

    for (let j = 0; j < this.cols; j++) {
      const th = document.createElement("th");
      th.innerHTML = `P<sub>${j + 1}</sub>`;
      headerBottomRow.appendChild(th);
    }
    this.tbody.appendChild(headerBottomRow);

    // --- Створення рядків для даних (x_i) ---
    for (let i = 0; i < this.rows; i++) {
      const tr = document.createElement("tr");
      tr.id = `t-${this.tableNumber}-data-row-${i}`;
      // Стовпець x_b
      const xTd = document.createElement("td");
      xTd.id = `t-${this.tableNumber}-x-val-${i}`;
      tr.appendChild(xTd);
      // Стовпець c_b
      const cbTd = document.createElement("td");
      cbTd.id = `t-${this.tableNumber}-cb-val-${i}`;
      tr.appendChild(cbTd);
      // Стовпець P_0
      const p0Td = document.createElement("td");
      p0Td.id = `t-${this.tableNumber}-p0-val-${i}`;
      tr.appendChild(p0Td);

      for (let j = 0; j < this.cols; j++) {
        const td = document.createElement("td");
        td.id = `t-${this.tableNumber}-cell-${i}-${j}`; // ID для доступу
        tr.appendChild(td);
      }
      this.tbody.appendChild(tr);
    }

    // --- Створення останнього рядка (Q) ---
    const qRow = document.createElement("tr");
    const qLabelTd = document.createElement("td");
    qLabelTd.className = "q-row-label";
    qLabelTd.textContent = "Q";
    qRow.appendChild(qLabelTd);

    const qEqualsTd = document.createElement("td");
    qEqualsTd.textContent = "=";
    qRow.appendChild(qEqualsTd);

    // Клітинка під P0 в рядку Q
    const qP0Td = document.createElement("td");
    qP0Td.id = `t-${this.tableNumber}-q-row-p0`;
    qRow.appendChild(qP0Td);

    for (let j = 0; j < this.cols; j++) {
      const td = document.createElement("td");
      td.id = `t-${this.tableNumber}-q-row-${j}`;
      qRow.appendChild(td);
    }

    this.tbody.appendChild(qRow);
  }

  // Метод для заповнення всієї таблиці даними
  public fillData(data: SimplexTableData, tableNumber: number): void {
    this.fillCValues(data.cValues, tableNumber);
    this.fillXValues(data.xValues, tableNumber);
    this.fillCbValues(data.cbValues, tableNumber);
    this.fillP0Values(data.p0Values, tableNumber);
    this.fillMainMatrix(data.mainMatrix, tableNumber);
    this.fillQRow(data.qRow, tableNumber);
  }

  // Заповнення значень c_i
  public fillCValues(values: (string | number)[], tableNumber: number): void {
    values.forEach((value, index) => {
      const cell = document.getElementById(
        `t-${tableNumber}-c-header-${index}`
      );
      if (cell) {
        cell.innerHTML = `c<sub>${index + 1}</sub>=${SimplexTable.RoundValueOutput(
          value
        )}`;
      }
    });
  }

  // Заповнення стовпця x_b
  public fillXValues(values: string[], tableNumber: number): void {
    values.forEach((value, index) => {
      const cell = document.getElementById(`t-${tableNumber}-x-val-${index}`);
      if (cell) {
        cell.innerHTML = `x<sub>${SimplexTable.RoundValueOutput(value)}</sub>`;
      }
    });
  }

  // Заповнення стовпця c_b
  public fillCbValues(values: (string | number)[], tableNumber: number): void {
    values.forEach((value, index) => {
      const cell = document.getElementById(`t-${tableNumber}-cb-val-${index}`);
      if (cell) {
        cell.textContent = String(SimplexTable.RoundValueOutput(value));
      }
    });
  }

  // Заповнення стовпця P_0
  public fillP0Values(values: (string | number)[], tableNumber: number): void {
    values.forEach((value, index) => {
      const cell = document.getElementById(`t-${tableNumber}-p0-val-${index}`);
      if (cell) {
        cell.textContent = String(SimplexTable.RoundValueOutput(value));
      }
    });
  }

  // Заповнення основної матриці
  public fillMainMatrix(
    matrix: (string | number)[][],
    tableNumber: number
  ): void {
    matrix.forEach((row, i) => {
      row.forEach((value, j) => {
        const cell = document.getElementById(`t-${tableNumber}-cell-${i}-${j}`);
        if (cell) {
          cell.textContent = String(SimplexTable.RoundValueOutput(value));
        }
      });
    });
  }

  // Заповнення рядка Q
  public fillQRow(values: (string | number)[], tableNumber: number): void {
    const p0Cell = document.getElementById(`t-${tableNumber}-q-row-p0`);
    if (p0Cell && values.length > 0) {
      p0Cell.textContent = String(SimplexTable.RoundValueOutput(values[0]));
    }
    values.slice(1).forEach((value, index) => {
      const cell = document.getElementById(`t-${tableNumber}-q-row-${index}`);
      if (cell) {
        cell.textContent = String(SimplexTable.RoundValueOutput(value));
      }
    });
  }

  // Метод для вставки таблиці в DOM
  public render(containerId: string): void {
    const container = document.getElementById(containerId);
    if (container) {
      container.appendChild(this.table);
    } else {
      console.error(`Container with id "${containerId}" not found.`);
    }
  }

  public static RoundValueOutput(value: string | number): number {
    return Math.round(Number(value) * 100) / 100;
  }

  public static HighlightPivot(
    row: number,
    column: number,
    tableNumber: number
  ): void {
    const cell = document.getElementById(
      `t-${tableNumber}-cell-${row}-${column}`
    );
    if (cell) {
      cell.classList.add("pivot");
    }
  }
}

export function ClearTableContainer(containerId: string): void {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = "";
  } else {
    console.error(`Container with id "${containerId}" not found.`);
  }
}
