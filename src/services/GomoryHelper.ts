import { SimplexTableData } from "../types/table.js";
import { SimplexTable } from "./SimplexTable.js";
import { EPSILON } from "../utils/constants.js";

/**
 * Розв'язує симплекс-методом (модифікована версія з існуючого коду)
 */
export function solvePrimalSimplex(
  tableData: SimplexTableData,
  startTableNumber: number
): {
  status: "OPTIMAL" | "UNBOUNDED" | "NO_SOLUTION";
  table: SimplexTableData;
  lastTableNumber: number;
} {
  let tableCounter = startTableNumber;
  outputSimplexTable(tableData, tableCounter, "Початкова симплекс-таблиця");

  while (tableData.qRow.slice(1).some((value) => value < -EPSILON)) {
    const pivotColumn = findPivotColumn(tableData);
    if (pivotColumn === -1) {
      return {
        status: "NO_SOLUTION",
        table: tableData,
        lastTableNumber: tableCounter,
      };
    }

    const pivotRow = findPivotRow(tableData, pivotColumn);
    if (pivotRow === -1) {
      return {
        status: "UNBOUNDED",
        table: tableData,
        lastTableNumber: tableCounter,
      };
    }

    const pivotElement = tableData.mainMatrix[pivotRow][pivotColumn];
    recalculateTableDataByRectangleRule(
      tableData,
      pivotRow,
      pivotColumn,
      pivotElement
    );

    SimplexTable.HighlightPivot(pivotRow, pivotColumn, tableCounter);
    tableCounter++;
    outputSimplexTable(
      tableData,
      tableCounter,
      `Симплекс-таблиця після ітерації ${tableCounter - startTableNumber}`
    );
  }

  return { status: "OPTIMAL", table: tableData, lastTableNumber: tableCounter };
}

/**
 * Розв'язує двоїстим симплекс-методом
 */
export function solveDualSimplex(
  tableData: SimplexTableData,
  startTableNumber: number
): {
  status: "OPTIMAL" | "NO_SOLUTION";
  table: SimplexTableData;
  lastTableNumber: number;
} {
  let tableCounter = startTableNumber;
  outputSimplexTable(
    tableData,
    tableCounter,
    "Таблиця з новим обмеженням (для двоїстого симплекс-методу)"
  );

  while (tableData.p0Values.some((p) => p < -EPSILON)) {
    const pivotRow = findDualPivotRow(tableData);
    if (pivotRow === -1) break;

    const pivotColumn = findDualPivotColumn(tableData, pivotRow);
    if (pivotColumn === -1) {
      return {
        status: "NO_SOLUTION",
        table: tableData,
        lastTableNumber: tableCounter,
      };
    }

    SimplexTable.HighlightPivot(pivotRow, pivotColumn, tableCounter);
    recalculateDualTable(tableData, pivotRow, pivotColumn);

    tableCounter++;
    outputSimplexTable(
      tableData,
      tableCounter,
      `Двоїстий симплекс-метод: ітерація ${tableCounter - startTableNumber}`
    );
  }

  return { status: "OPTIMAL", table: tableData, lastTableNumber: tableCounter };
}

// Допоміжні функції з існуючих модулів (адаптовані)
function findPivotColumn(tableData: SimplexTableData): number {
  let pivotCol = -1;
  let minValue = 0;

  for (let j = 1; j < tableData.qRow.length; j++) {
    if (tableData.qRow[j] < minValue) {
      minValue = tableData.qRow[j];
      pivotCol = j - 1;
    }
  }

  return pivotCol;
}

function findPivotRow(
  tableData: SimplexTableData,
  pivotColumn: number
): number {
  const result = tableData.mainMatrix.reduce(
    (min, row, index) => {
      const coeff = row[pivotColumn];
      if (coeff > EPSILON) {
        const ratio = tableData.p0Values[index] / coeff;
        if (ratio < min.minRatio) {
          return { minRatio: ratio, rowIndex: index };
        }
      }
      return min;
    },
    { minRatio: Infinity, rowIndex: -1 }
  );

  return result.rowIndex;
}

function findDualPivotRow(tableData: SimplexTableData): number {
  let minP0 = 0;
  let pivotRowIndex = -1;

  tableData.p0Values.forEach((p, i) => {
    if (p < minP0) {
      minP0 = p;
      pivotRowIndex = i;
    }
  });

  return pivotRowIndex;
}

function findDualPivotColumn(
  tableData: SimplexTableData,
  pivotRow: number
): number {
  let minRatio = Infinity;
  let pivotColumnIndex = -1;
  const row = tableData.mainMatrix[pivotRow];

  for (let j = 0; j < row.length; j++) {
    if (row[j] < -EPSILON) {
      const ratio = Math.abs(tableData.qRow[j + 1] / row[j]);
      if (ratio < minRatio) {
        minRatio = ratio;
        pivotColumnIndex = j;
      }
    }
  }

  return pivotColumnIndex;
}

function recalculateTableDataByRectangleRule(
  tableData: SimplexTableData,
  pivotRow: number,
  pivotColumn: number,
  pivotElement: number
) {
  // Нормалізація опорного рядка
  tableData.mainMatrix[pivotRow] = tableData.mainMatrix[pivotRow].map(
    (value) => value / pivotElement
  );
  tableData.p0Values[pivotRow] = tableData.p0Values[pivotRow] / pivotElement;

  // Обнулення опорного стовпця
  for (let r = 0; r < tableData.mainMatrix.length; r++) {
    if (r === pivotRow) continue;

    const factor = tableData.mainMatrix[r][pivotColumn];
    tableData.mainMatrix[r] = tableData.mainMatrix[r].map(
      (value, cIndex) => value - factor * tableData.mainMatrix[pivotRow][cIndex]
    );
    tableData.p0Values[r] =
      tableData.p0Values[r] - factor * tableData.p0Values[pivotRow];
  }

  // Оновлення qRow
  const factorZ = tableData.qRow[pivotColumn + 1];
  tableData.qRow = tableData.qRow.map(
    (value, cIndex) =>
      value -
      factorZ *
        (cIndex === 0
          ? tableData.p0Values[pivotRow]
          : tableData.mainMatrix[pivotRow][cIndex - 1])
  );

  // Оновлення базисних змінних
  tableData.xValues[pivotRow] = `${pivotColumn + 1}`;
  tableData.cbValues[pivotRow] = tableData.cValues[pivotColumn];
}

function recalculateDualTable(
  tableData: SimplexTableData,
  pivotRow: number,
  pivotColumn: number
) {
  const pivotElement = tableData.mainMatrix[pivotRow][pivotColumn];

  tableData.xValues[pivotRow] = `${pivotColumn + 1}`;
  tableData.cbValues[pivotRow] = tableData.cValues[pivotColumn];

  const newPivotRowP0 = tableData.p0Values[pivotRow] / pivotElement;
  const newPivotRow = tableData.mainMatrix[pivotRow].map(
    (val) => val / pivotElement
  );

  for (let i = 0; i < tableData.mainMatrix.length; i++) {
    if (i !== pivotRow) {
      const factor = tableData.mainMatrix[i][pivotColumn];
      tableData.p0Values[i] -= factor * newPivotRowP0;
      for (let j = 0; j < tableData.mainMatrix[i].length; j++) {
        tableData.mainMatrix[i][j] -= factor * newPivotRow[j];
      }
    }
  }

  tableData.mainMatrix[pivotRow] = newPivotRow;
  tableData.p0Values[pivotRow] = newPivotRowP0;

  const qFactor = tableData.qRow[pivotColumn + 1];
  tableData.qRow[0] -= qFactor * newPivotRowP0;
  for (let j = 0; j < tableData.mainMatrix[0].length; j++) {
    tableData.qRow[j + 1] -= qFactor * newPivotRow[j];
  }
}

export function outputSimplexTable(
  tableData: SimplexTableData,
  tableNumber: number,
  title: string
) {
  const numRestrictions = tableData.mainMatrix.length;
  const numTotalVars = tableData.mainMatrix[0].length;
  const table = new SimplexTable(numRestrictions, numTotalVars, tableNumber);

  // Додаємо заголовок до таблиці
  const tablesContainer = document.getElementById("symplexTables")!;
  const titleDiv = document.createElement("div");
  titleDiv.innerHTML = `<h4 style="margin: 15px 0 5px 0;">${title}</h4>`;
  tablesContainer.appendChild(titleDiv);

  table.fillData(tableData, tableNumber);
}
