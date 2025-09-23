// services/DualSimplexMethod.ts

import { displayLogic } from "./index.js";
import { LPData } from "../types/data.js";
import { SimplexTableData } from "../types/table.js";
import { SimplexTable } from "./SimplexTable.js";

let tableCounter = 1;

export function solveByDualSimplexMethod() {
  tableCounter = 1;
  const initialData: LPData = displayLogic.getCurrentData();

  // 1. Приведення до канонічного вигляду для ДСМ
  // Цільова функція завжди max
  let objectiveCoeffs = [...initialData.prices];
  if (initialData.objective === "min") {
    objectiveCoeffs = objectiveCoeffs.map((c) => -c);
  }

  // Обмеження типу '≤'
  const constraints = initialData.resources.map((res) => {
    if (res.sign === ">=") {
      return {
        requirements: res.requirements.map((r) => -r),
        available: -res.available,
      };
    }
    return { ...res };
  });

  // 2. Створення початкової таблиці
  const numVariables = initialData.productsCount;
  const numRestrictions = initialData.resursCount;
  const numTotalVars = numVariables + numRestrictions;

  const cValues = [
    ...objectiveCoeffs,
    ...new Array(numRestrictions).fill(0),
  ];
  let mainMatrix: number[][] = [];
  for (let i = 0; i < numRestrictions; i++) {
    const row = [...constraints[i].requirements];
    const slackVars = new Array(numRestrictions).fill(0);
    slackVars[i] = 1;
    mainMatrix.push([...row, ...slackVars]);
  }

  let p0Values = constraints.map((c) => c.available);
  let cbValues = new Array(numRestrictions).fill(0);
  let xValues = Array.from(
    { length: numRestrictions },
    (_, i) => `${numVariables + i + 1}`
  );

  // 3. Обчислення Q-рядка
  const calculateQRow = () => {
    const qRow = [0, ...new Array(numTotalVars).fill(0)];
    for (let j = 0; j < numTotalVars; j++) {
      let sum = 0;
      for (let i = 0; i < numRestrictions; i++) {
        sum += cbValues[i] * mainMatrix[i][j];
      }
      qRow[j + 1] = cValues[j] - sum;
    }

    let qP0 = 0;
    for (let i = 0; i < numRestrictions; i++) {
      qP0 += cbValues[i] * p0Values[i];
    }
    qRow[0] = qP0;
    return qRow;
  };

  let qRow = calculateQRow();

  // Перевірка на двоїсту допустимість (усі елементи Q-рядка >= 0)
  if (qRow.slice(1).some((q) => q < 0)) {
    const solutionElement = document.getElementById("symplexSolution")!;
    solutionElement.innerHTML = `<h2>Error</h2><p>The initial table is not dually feasible (some Q-row values are negative). The dual simplex method cannot be applied.</p>`;
    return;
  }

  // 4. Ітераційний процес
  while (p0Values.some((p) => p < 0)) {
    const tableData: SimplexTableData = {
      cValues,
      xValues,
      cbValues,
      p0Values,
      mainMatrix,
      qRow,
    };
    const table = new SimplexTable(
      numRestrictions,
      numTotalVars,
      tableCounter
    );
    table.fillData(tableData, tableCounter);

    // a. Знайти напрямний рядок (pivot row)
    let pivotRowIndex = -1;
    let minP0 = 0;
    p0Values.forEach((p, i) => {
      if (p < minP0) {
        minP0 = p;
        pivotRowIndex = i;
      }
    });

    if (pivotRowIndex === -1) break; // Вихід, якщо немає від'ємних P0

    // b. Знайти напрямний стовпець (pivot column)
    const pivotRow = mainMatrix[pivotRowIndex];
    let minRatio = Infinity;
    let pivotColumnIndex = -1;

    for (let j = 0; j < numTotalVars; j++) {
      if (pivotRow[j] < 0) {
        // Умова для ДСМ: елемент в напрямному рядку має бути від'ємним
        const ratio = Math.abs(qRow[j + 1] / pivotRow[j]);
        if (ratio < minRatio) {
          minRatio = ratio;
          pivotColumnIndex = j;
        }
      }
    }

    if (pivotColumnIndex === -1) {
      const solutionElement = document.getElementById("symplexSolution")!;
      solutionElement.innerHTML = `<h2>Result</h2><p>The problem has no feasible solution.</p>`;
      return;
    }

    SimplexTable.HighlightPivot(pivotRowIndex, pivotColumnIndex, tableCounter);

    // c. Перерахунок таблиці
    const pivotElement = mainMatrix[pivotRowIndex][pivotColumnIndex];

    // Оновлення базису
    xValues[pivotRowIndex] = `${pivotColumnIndex + 1}`;
    cbValues[pivotRowIndex] = cValues[pivotColumnIndex];

    // Оновлення напрямного рядка
    const newPivotRow = mainMatrix[pivotRowIndex].map((val) => val / pivotElement);
    p0Values[pivotRowIndex] = p0Values[pivotRowIndex] / pivotElement;

    // Оновлення інших рядків
    const newMainMatrix = mainMatrix.map((row, i) => {
      if (i === pivotRowIndex) return newPivotRow;
      const factor = row[pivotColumnIndex];
      p0Values[i] -= factor * p0Values[pivotRowIndex];
      return row.map((val, j) => val - factor * newPivotRow[j]);
    });

    mainMatrix = newMainMatrix;
    qRow = calculateQRow();
    tableCounter++;
  }

  // 5. Виведення фінальної таблиці та результату
  const finalTableData: SimplexTableData = { cValues, xValues, cbValues, p0Values, mainMatrix, qRow };
  const finalTable = new SimplexTable(numRestrictions, numTotalVars, tableCounter);
  finalTable.fillData(finalTableData, tableCounter);

  const solutionElement = document.getElementById("symplexSolution")!;
  let solutionHTML = "<h2>Optimal Solution Found</h2>";
  const solution = new Array(numVariables).fill(0);
  for (let i = 0; i < xValues.length; i++) {
    const varIndex = parseInt(xValues[i]) - 1;
    if (varIndex < numVariables) {
      solution[varIndex] = SimplexTable.RoundValueOutput(p0Values[i]);
    }
  }

  solutionHTML += `<p>X* = (${solution.join(", ")})</p>`;
  let finalValue = qRow[0];
  if (initialData.objective === "min") {
    finalValue = -finalValue; // Повертаємо знак, якщо шукали мінімум
  }
  solutionHTML += `<p>F${initialData.objective === "min" ? "<sub>min</sub>" : "<sub>max</sub>"} = ${SimplexTable.RoundValueOutput(finalValue)}</p>`;
  solutionElement.innerHTML = solutionHTML;
}