// services/DualSimplexMethod.ts

import { displayLogic } from "./index.js";
import { LPData, Resource } from "../types/data.js";
import { SimplexTableData, subscripts } from "../types/table.js";
import { SimplexTable } from "./SimplexTable.js";

export function solveByDualSimplexMethod() {
  let tableCounter = 1;
  const primalData: LPData = displayLogic.getCurrentData();

  const dualObjectiveType = "min";
  const dualTaskData = TransformToDualData(primalData);
  OutputDualTaskConditions(dualTaskData, dualObjectiveType);

  const constraintsForSolver = TransformToCanonicalForm(dualTaskData);
  let tableData = convertDualToTableData(
    constraintsForSolver,
    dualObjectiveType
  );

  if (tableData.qRow.slice(1).some((q) => q < 0)) {
    const solutionElement = document.getElementById("symplexSolution")!;
    solutionElement.innerHTML += `<h2>Error</h2><p>The initial dual table is not dually feasible. The dual simplex method cannot be applied.</p>`;
    return;
  }

  outputDualTable(tableData, tableCounter);
  while (tableData.p0Values.some((p) => p < 0)) {
    const pivotRow = findDualPivotRow(tableData);
    if (pivotRow === -1) break;

    const pivotColumn = findDualPivotColumn(tableData, pivotRow);
    if (pivotColumn === -1) {
      const solutionElement = document.getElementById("symplexSolution")!;
      solutionElement.innerHTML += `<h2>Result</h2><p>The dual problem has no feasible solution.</p>`;
      return;
    }

    SimplexTable.HighlightPivot(pivotRow, pivotColumn, tableCounter);

    recalculateDualTable(tableData, pivotRow, pivotColumn);

    tableCounter++;
    outputDualTable(tableData, tableCounter);
  }

  OutputSolution(tableData);
}

function TransformToDualData(primalData: LPData): LPData {
  // Коефіцієнти цільової функції двоїстої задачі = вільні члени прямої
  const dualObjectiveCoeffs = primalData.resources.map((r) => r.available);
  // Вільні члени двоїстої задачі = коефіцієнти цільової функції прямої
  const dualRhs = primalData.prices;
  // Матриця коефіцієнтів двоїстої задачі = транспонована матриця прямої
  const dualConstraintsMatrix: number[][] = [];
  for (let i = 0; i < primalData.productsCount; i++) {
    const newRow: number[] = [];
    for (let j = 0; j < primalData.resursCount; j++) {
      newRow.push(primalData.resources[j].requirements[i]);
    }
    dualConstraintsMatrix.push(newRow);
  }
  // Знаки нерівностей двоїстої задачі (для стандартної задачі max <=, двоїста min >=)
  const dualSign = ">=";
  const dualNumVars = primalData.resursCount; // Кількість 'y' змінних
  const dualNumConstraints = primalData.productsCount; // Кількість обмежень для 'y'

  let dualTaskData: LPData = {
    resursCount: dualNumConstraints,
    productsCount: dualNumVars,
    resources: dualConstraintsMatrix.map((row, i) => ({
      requirements: row,
      available: dualRhs[i],
      sign: dualSign,
    })),
    prices: dualObjectiveCoeffs,
  };

  return dualTaskData;
}
function OutputDualTaskConditions(
  dualTaskData: LPData,
  dualObjectiveType: string
) {
  const dualSimplexEquationElement = document.getElementById(
    "dualSimplexEquation"
  )!;

  let dualProblemHTML = "<h2>Formulated Dual Problem</h2>";
  const dualObjectiveString = formatEquation(
    dualTaskData.prices,
    "y",
    0,
    ""
  ).replace(" 0", "");
  dualProblemHTML += `<p><b>Objective Function:</b> F* = ${dualObjectiveString} → ${dualObjectiveType}</p>`;
  dualProblemHTML += "<p><b>Restrictions:</b></p><div>";
  for (let i = 0; i < dualTaskData.resursCount; i++) {
    dualProblemHTML += `<p>${formatEquation(
      dualTaskData.resources[i].requirements,
      "y",
      dualTaskData.resources[i].available,
      dualTaskData.resources[i].sign
    )}</p>`;
  }
  dualProblemHTML += "</div><hr/>";
  dualSimplexEquationElement.innerHTML = dualProblemHTML;
}
function TransformToCanonicalForm(dualTaskData: LPData): LPData {
  const constraintsForSolver = dualTaskData.resources.map((row) => {
    if (row.sign === ">=") {
      return {
        requirements: row.requirements.map((r) => -r),
        available: -row.available,
      };
    }
    return {
      requirements: row,
      available: row.available,
    };
  });

  dualTaskData.resources = [...constraintsForSolver] as Resource[];

  return dualTaskData;
}
function OutputSolution(finalTableData: SimplexTableData) {
  const solutionElement = document.getElementById("symplexSolution")!;

  const allVariablesSolution = new Array(finalTableData.cValues.length).fill(0);

  for (let i = 0; i < finalTableData.xValues.length; i++) {
    const varIndex = parseInt(finalTableData.xValues[i]) - 1;
    allVariablesSolution[varIndex] = SimplexTable.RoundValueOutput(
      finalTableData.p0Values[i]
    );
  }

  const mainVarsSolution = allVariablesSolution.slice(
    0,
    finalTableData.cValues.length
  );
  const mainVarsString = mainVarsSolution.join(", ");
  const finalValue = SimplexTable.RoundValueOutput(-finalTableData.qRow[0]);

  const varsString = `(${allVariablesSolution.join(", ")})`;
  let solutionHTML = `Y* = (${varsString})`;
  solutionHTML += `<br>Optimal value <strong>F* = ${finalValue}</strong> is achieved at <strong>(y${
    subscripts[1]
  }...y${
    subscripts[finalTableData.cValues.length]
  }) = (${mainVarsString})</strong>`;

  solutionElement.innerHTML = solutionHTML;
}
function convertDualToTableData(
  data: LPData,
  objectiveType: string
): SimplexTableData {
  const cValues = [...data.prices, ...new Array(data.resursCount).fill(0)];

  const mainMatrix = data.resources.map((res) => {
    const slackVars = new Array(data.resursCount).fill(0);
    const slackIndex = data.resources.indexOf(res);
    if (slackIndex !== -1) slackVars[slackIndex] = 1;
    return [...res.requirements, ...slackVars];
  });

  const p0Values = data.resources.map((c) => c.available);
  const cbValues = new Array(data.resursCount).fill(0);
  const xValues = Array.from(
    { length: data.resursCount },
    (_, i) => `${data.productsCount + i + 1}`
  );

  const qRow = [0, ...new Array(data.productsCount + data.resursCount).fill(0)];
  let qP0 = 0;
  for (let i = 0; i < cbValues.length; i++) {
    qP0 += cbValues[i] * p0Values[i];
  }
  qRow[0] = qP0;
  for (let j = 0; j < cValues.length; j++) {
    let sum = 0;
    for (let i = 0; i < cbValues.length; i++) {
      sum += cbValues[i] * mainMatrix[i][j];
    }
    qRow[j + 1] = cValues[j] - sum;
  }

  return { cValues, xValues, cbValues, p0Values, mainMatrix, qRow };
}
function outputDualTable(tableData: SimplexTableData, tableNum: number) {
  const numRestrictions = tableData.mainMatrix.length;
  const numTotalVars = tableData.mainMatrix[0].length;
  const table = new SimplexTable(numRestrictions, numTotalVars, tableNum);
  table.fillData(tableData, tableNum);
}
function formatEquation(
    coeffs: number[],
    vars: string,
    rhs: number,
    sign: string
  ): string {
    const terms = coeffs
      .map((c, i) =>
        c !== 0
          ? `${c > 0 ? (i > 0 ? "+ " : "") : "- "}${Math.abs(c)}${vars}${
              subscripts[i + 1]
            }`
          : ""
      )
      .filter(Boolean)
      .join(" ");
    return `${terms} ${sign.replace(">=", "≥").replace("<=", "≤")} ${rhs}`;
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
    if (row[j] < 0) {
      const ratio = Math.abs(tableData.qRow[j + 1] / row[j]);
      if (ratio < minRatio) {
        minRatio = ratio;
        pivotColumnIndex = j;
      }
    }
  }
  return pivotColumnIndex;
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
