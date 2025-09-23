import { ClearTableContainer, SimplexTable } from "./SimplexTable.js";
import { SimplexTableData, subscripts } from "../types/table.js";
import { currentData } from "./displayLogic.js";
import { LPData } from "../types/data.js";
import { SIMPLEX_TABLE_CONSTRAINT } from "../utils/constants.js";

const solveBtn = document.getElementById("solveBtn") as HTMLButtonElement;
let TableCount: number;
solveBtn.addEventListener("click", () => {
  TableCount = 1;
  ClearTableContainer("symplexTables");
  solveBySimplexMethod();
});

function solveBySimplexMethod() {
  let tableData: SimplexTableData = convertToTableData(currentData);
  outputTable(tableData, TableCount);

  do {
    if (
      !tableData.qRow.slice(1).some((value) => value < 0) ||
      TableCount > SIMPLEX_TABLE_CONSTRAINT
    )
      break;

    const pivotColumn = findPivotColumn(tableData);
    const pivotRow = findPivotRow(tableData, pivotColumn);
    const pivotElement = tableData.mainMatrix[pivotRow][pivotColumn];

    RecalculateTableDataByRectangleRule(
      tableData,
      pivotRow,
      pivotColumn,
      pivotElement
    );

    SimplexTable.HighlightPivot(pivotRow, pivotColumn, TableCount++);
    outputTable(tableData, TableCount);
  } while (true);

  outputSolution(tableData);

  function convertToTableData(currentData: LPData): SimplexTableData {
    const cValues = currentData.prices.concat(
      new Array(currentData.resursCount).fill(0)
    );
    const xValues = new Array(currentData.resursCount)
      .fill("")
      .map((_, index) => {
        return `${index + currentData.productsCount + 1}`;
      });
    const cbValues = new Array(currentData.resursCount).fill(0);
    const p0Values = currentData.resources.map(
      (resource) => resource.available
    );
    const mainMatrix = currentData.resources.map((resource, rIndex) => [
      ...resource.requirements,
      ...new Array(currentData.resursCount)
        .fill(0)
        .map((_, cIndex) => (rIndex === cIndex ? 1 : 0)),
    ]);
    const qRow = [
      0,
      ...currentData.prices.map((price) => -price),
      ...new Array(currentData.resursCount).fill(0),
    ];

    return {
      cValues,
      xValues,
      cbValues,
      p0Values,
      mainMatrix,
      qRow,
    };
  }
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
    return tableData.mainMatrix.reduce(
      (min, row, index) => {
        const coeff = row[pivotColumn];
        if (coeff > 0) {
          const ratio = tableData.p0Values[index] / coeff;
          if (ratio < min.minRatio) {
            return { minRatio: ratio, rowIndex: index };
          }
        }
        return min;
      },
      { minRatio: Infinity, rowIndex: -1 }
    ).rowIndex;
  }
  function RecalculateTableDataByRectangleRule(
    tableData: SimplexTableData,
    pivotRow: number,
    pivotColumn: number,
    pivotElement: number
  ) {
    tableData.mainMatrix[pivotRow] = tableData.mainMatrix[pivotRow].map(
      (value) => value / pivotElement
    );
    tableData.p0Values[pivotRow] = tableData.p0Values[pivotRow] / pivotElement;

    for (let r = 0; r < tableData.mainMatrix.length; r++) {
      if (r === pivotRow) continue;

      const factor = tableData.mainMatrix[r][pivotColumn]; 

      tableData.mainMatrix[r] = tableData.mainMatrix[r].map(
        (value, cIndex) =>
          value - factor * tableData.mainMatrix[pivotRow][cIndex]
      );
      tableData.p0Values[r] =
        tableData.p0Values[r] - factor * tableData.p0Values[pivotRow];
    }

    const factorZ = tableData.qRow[pivotColumn + 1];
    tableData.qRow = tableData.qRow.map(
      (value, cIndex) =>
        value -
        factorZ *
          (cIndex === 0
            ? tableData.p0Values[pivotRow]
            : tableData.mainMatrix[pivotRow][cIndex - 1])
    );

    tableData.xValues[pivotRow] = `${pivotColumn + 1}`;
    tableData.cbValues[pivotRow] = tableData.cValues[pivotColumn];
  }
  function outputTable(tableData: SimplexTableData, TableCount: number) {
    const myTable = new SimplexTable(
      currentData.resursCount,
      currentData.productsCount + currentData.resursCount,
      TableCount
    );
    myTable.fillData(tableData, TableCount);
  }
}

function outputSolution(tableData: SimplexTableData) {
  const solution = document.getElementById("symplexSolution") as HTMLDivElement;

  const solutionVector: number[] = new Array(
    currentData.productsCount + currentData.resursCount
  ).fill(0);

  const vars: string[] = [];
  for (let i = 0; i < currentData.productsCount; i++) {
    vars.push(`x${subscripts[i + 1]}`);
  }

  for (let i = 0; i < currentData.resursCount; i++) {
    const variableIndex = parseInt(tableData.xValues[i]) - 1;
    if (variableIndex >= 0 && variableIndex < solutionVector.length) {
      solutionVector[variableIndex] = SimplexTable.RoundValueOutput(
        tableData.p0Values[i]
      );
    }
  }

  const varsString = `(${vars.join(", ")})`;
  const vectorString = `(${solutionVector
    .slice(0, currentData.productsCount)
    .join(", ")})`;
  const maxValue = SimplexTable.RoundValueOutput(tableData.qRow[0]);

  solution.innerHTML = `X* = (${solutionVector.join(
    ", "
  )})<br><strong>Q = ${maxValue}</strong> is achived at <strong>${varsString} = ${vectorString}</strong>`;
}
