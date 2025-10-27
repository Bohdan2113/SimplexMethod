// services/GomoryMethod.ts

import { GomoryData, GomoryResult, GomoryCut, LPData } from "../types/data.js";
import { SimplexTableData, subscripts } from "../types/table.js";
import { displayLogic } from "./index.js";
import { solvePrimalSimplex, solveDualSimplex } from "./GomoryHelper.js";
import { MAX_GOMORY_ITERATIONS, EPSILON } from "../utils/constants.js";

/**
 * Розв'язує задачу цілочислового лінійного програмування методом Гомори
 */
export function solveByGomoryMethod(): void {
  const primalData: LPData = displayLogic.getCurrentData();

  // Для демо припускаємо, що всі основні змінні (x1, x2, ..., xN) повинні бути цілими
  const integerIndices = Array.from(
    { length: primalData.productsCount },
    (_, i) => i
  );
  console.log("integerIndices", integerIndices);

  const gomoryData: GomoryData = {
    ...primalData,
    integerVariableIndices: integerIndices,
  };

  setTimeout(() => {
    const result = solveGomoryIterative(gomoryData);
    displayGomoryResult(result);
  }, 10);
}

/**
 * Основний ітераційний алгоритм методу Гомори
 */
function solveGomoryIterative(data: GomoryData): GomoryResult {
  let iterations = 0;
  let currentTableData = convertLPDataToSimplexTable(data);
  let additionalSlackVarCount = 0;

  outputGomoryHeader(data);

  // Крок 1: Розв'язати як звичайну ЛП симплекс-методом
  outputStepComment(
    "Крок 1: Розв'язуємо релаксовану лінійну задачу симплекс-методом"
  );
  const simplexResult = solvePrimalSimplex(currentTableData, 1);

  if (simplexResult.status !== "OPTIMAL") {
    return {
      status: "NO_INTEGER_SOLUTION",
      iterations: 0,
      optimalValue: null,
      solution: null,
      message: "Лінійна релаксація не має оптимального розв'язку",
    };
  }

  currentTableData = simplexResult.table;
  let tableCounter = simplexResult.lastTableNumber;

  // Ітераційний процес додавання відтинань Гомори
  while (iterations < MAX_GOMORY_ITERATIONS) {
    iterations++;

    const solution = extractBasicSolution(currentTableData, data.productsCount);
    const nonIntegerVar = findMostFractionalIntegerVariable(
      currentTableData,
      data.integerVariableIndices
    );

    // Перевірка умови оптимальності (всі цілочислові змінні цілі)
    if (!nonIntegerVar) {
      return {
        status: "INTEGER_OPTIMAL",
        iterations,
        optimalValue: currentTableData.qRow[0],
        solution,
        message: `Оптимальний цілочисловий розв'язок знайдено за ${iterations} ітерацій`,
      };
    }

    // Діагностичне виведення всіх базисних змінних
    let diagnosticInfo = `Ітерація ${iterations}: Поточні базисні змінні: `;
    for (let i = 0; i < currentTableData.xValues.length; i++) {
      const varName = currentTableData.xValues[i];
      const varValue = currentTableData.p0Values[i];
      diagnosticInfo += `x${varName}=${varValue.toFixed(6)} `;
    }
    outputStepComment(diagnosticInfo);

    outputStepComment(
      `Обрано найбільш дробову цілочислову змінну: x${
        nonIntegerVar.variableName
      } = ${nonIntegerVar.value.toFixed(6)} (дробова частина: ${(
        nonIntegerVar.value - Math.floor(nonIntegerVar.value)
      ).toFixed(6)})`
    );

    // Генерація відтинання Гомори
    const gomoryCut = generateGomoryCut(
      currentTableData,
      nonIntegerVar.rowIndex,
      data.integerVariableIndices,
      additionalSlackVarCount
    );
    additionalSlackVarCount++;

    outputCutInfo(gomoryCut, nonIntegerVar.variableName);

    // Додавання відтинання до таблиці
    currentTableData = addGomoryCutToTable(currentTableData, gomoryCut);

    // Розв'язання двоїстим симплекс-методом
    outputStepComment(
      `Розв'язуємо задачу з новим обмеженням двоїстим симплекс-методом`
    );
    const dualResult = solveDualSimplex(currentTableData, ++tableCounter);

    if (dualResult.status !== "OPTIMAL") {
      return {
        status: "NO_INTEGER_SOLUTION",
        iterations,
        optimalValue: null,
        solution: null,
        message:
          "Цілочисловий розв'язок не існує (двоїстий симплекс-метод не знайшов розв'язку)",
      };
    }

    currentTableData = dualResult.table;
    tableCounter = dualResult.lastTableNumber;
  }

  return {
    status: "ITERATION_LIMIT",
    iterations,
    optimalValue: currentTableData.qRow[0],
    solution: extractBasicSolution(currentTableData, data.productsCount),
    message: `Досягнуто максимальну кількість ітерацій (${MAX_GOMORY_ITERATIONS})`,
  };
}

/**
 * Конвертує LPData в SimplexTableData для початкового розв'язання
 */
function convertLPDataToSimplexTable(data: LPData): SimplexTableData {
  const cValues = data.prices.concat(new Array(data.resursCount).fill(0));
  const xValues = new Array(data.resursCount)
    .fill("")
    .map((_, index) => `${index + data.productsCount + 1}`);
  const cbValues = new Array(data.resursCount).fill(0);
  const p0Values = data.resources.map((resource) => resource.available);
  const mainMatrix = data.resources.map((resource, rIndex) => [
    ...resource.requirements,
    ...new Array(data.resursCount)
      .fill(0)
      .map((_, cIndex) => (rIndex === cIndex ? 1 : 0)),
  ]);
  const qRow = [
    0,
    ...data.prices.map((price) => -price),
    ...new Array(data.resursCount).fill(0),
  ];

  return { cValues, xValues, cbValues, p0Values, mainMatrix, qRow };
}

/**
 * Знаходить найбільш дробову цілочислову змінну серед базисних змінних
 */
function findMostFractionalIntegerVariable(
  tableData: SimplexTableData,
  integerIndices: number[]
): { variableName: string; value: number; rowIndex: number } | null {
  let maxFraction = 0;
  let selectedVariable: {
    variableName: string;
    value: number;
    rowIndex: number;
  } | null = null;

  // Перевіряємо тільки базисні змінні
  for (let rowIndex = 0; rowIndex < tableData.xValues.length; rowIndex++) {
    const variableName = tableData.xValues[rowIndex];
    const variableValue = tableData.p0Values[rowIndex];

    // Перевіряємо чи це цілочислова змінна (x1, x2, ...)
    const varIndex = parseInt(variableName) - 1;

    if (integerIndices.includes(varIndex)) {
      const fractionalPart = variableValue - Math.floor(variableValue);

      // Перевіряємо чи дійсно дробова (з урахуванням точності)
      if (
        fractionalPart > EPSILON &&
        fractionalPart < 1 - EPSILON &&
        fractionalPart > maxFraction
      ) {
        maxFraction = fractionalPart;
        selectedVariable = {
          variableName: variableName,
          value: variableValue,
          rowIndex: rowIndex,
        };
      }
    }
  }

  return selectedVariable;
}

/**
 * Генерує відтинання Гомори за другим алгоритмом
 */
function generateGomoryCut(
  tableData: SimplexTableData,
  rowIndex: number,
  integerIndices: number[],
  slackVarCount: number
): GomoryCut {
  const b_l = tableData.p0Values[rowIndex]; // Вільний член b_l з вибраного рядка
  const beta_l = b_l - Math.floor(b_l); // Дробова частина {b_l}

  if (Math.abs(beta_l) < EPSILON) {
    throw new Error("Спроба створити відтинання для цілого числа");
  }

  const oneMinusBeta = 1 - beta_l;

  // Перевіряємо ділення на нуль
  if (Math.abs(oneMinusBeta) < EPSILON) {
    throw new Error("Ділення на нуль при генерації відтинання Гомори");
  }

  const betaOverOneMinusBeta = beta_l / oneMinusBeta; // Розрахунок коефіцієнта β/(1-β)

  const a_lRow = tableData.mainMatrix[rowIndex];
  const coefficients: number[] = new Array(tableData.cValues.length).fill(0);

  for (let j = 0; j < a_lRow.length; j++) {
    const a_lj = a_lRow[j];
    const varIndex = j; // Індекс в таблиці відповідає індексу змінної

    let gamma_lj = 0;

    if (varIndex < integerIndices.length && integerIndices.includes(varIndex)) {
      // Цілочислова змінна
      const alpha_lj = a_lj - Math.floor(a_lj); // Дробова частина {a_lj}

      if (alpha_lj <= beta_l) {
        gamma_lj = alpha_lj;
      } else {
        gamma_lj = betaOverOneMinusBeta * (1 - alpha_lj);
      }
    } else {
      // Нецілочислова змінна (включаючи додаткові змінні)
      if (a_lj >= 0) {
        gamma_lj = a_lj;
      } else {
        gamma_lj = betaOverOneMinusBeta * Math.abs(a_lj);
      }
    }

    coefficients[j] = -gamma_lj; // Знак мінус для формування обмеження вигляду ≤
  }

  const slackVariableName = `x${subscripts[tableData.cValues.length]}`;

  return {
    coefficients,
    rhs: -beta_l,
    slackVariableName,
  };
}

/**
 * Додає відтинання Гомори до існуючої таблиці
 */
function addGomoryCutToTable(
  tableData: SimplexTableData,
  cut: GomoryCut
): SimplexTableData {
  // Розширюємо cValues новою slack змінною
  const newCValues = [...tableData.cValues, 0];

  // Додаємо новий рядок до mainMatrix
  const newRow = [...cut.coefficients, 1]; // Додаємо 1 для нової slack змінної
  const newMainMatrix = [...tableData.mainMatrix, newRow];

  // Розширюємо існуючі рядки mainMatrix нулем для нової slack змінної
  for (let i = 0; i < tableData.mainMatrix.length; i++) {
    newMainMatrix[i] = [...tableData.mainMatrix[i], 0];
  }

  // Додаємо нову базисну змінну
  const newXValues = [...tableData.xValues, cut.slackVariableName];
  const newCbValues = [...tableData.cbValues, 0];
  const newP0Values = [...tableData.p0Values, cut.rhs];

  // Розширюємо qRow
  const newQRow = [...tableData.qRow, 0];

  return {
    cValues: newCValues,
    xValues: newXValues,
    cbValues: newCbValues,
    p0Values: newP0Values,
    mainMatrix: newMainMatrix,
    qRow: newQRow,
  };
}

/**
 * Витягує розв'язок базисних змінних
 */
function extractBasicSolution(
  tableData: SimplexTableData,
  originalVarCount: number
): { name: string; value: number }[] {
  const solution: { name: string; value: number }[] = [];

  for (let i = 0; i < originalVarCount; i++) {
    const varName = `${i + 1}`;
    const rowIndex = tableData.xValues.findIndex((x) => x === varName);

    if (rowIndex !== -1) {
      solution.push({
        name: varName,
        value: tableData.p0Values[rowIndex],
      });
    } else {
      solution.push({
        name: varName,
        value: 0,
      });
    }
  }

  return solution;
}

// Функції виводу результатів
function outputGomoryHeader(data: GomoryData) {
  const gomoryEquationElement = document.getElementById("dualSimplexEquation")!;

  let headerHTML =
    "<h2>Метод Гоморі для розв'язання задачі цілочислового лінійного програмування</h2>";
  headerHTML += `<p><strong>Цілочислові змінні:</strong> ${data.integerVariableIndices
    .map((i) => `x${subscripts[i + 1]}`)
    .join(", ")}</p>`;
  headerHTML += "<hr/>";

  gomoryEquationElement.innerHTML = headerHTML;
}

function outputStepComment(comment: string) {
  const tablesContainer = document.getElementById("symplexTables")!;
  const commentDiv = document.createElement("div");
  commentDiv.className = "step-comment";
  commentDiv.innerHTML = `<h3 style="color: #2563eb; margin: 20px 0 10px 0;">${comment}</h3>`;
  tablesContainer.appendChild(commentDiv);
}

function outputCutInfo(cut: GomoryCut, variableName: string) {
  const tablesContainer = document.getElementById("symplexTables")!;
  const cutDiv = document.createElement("div");
  cutDiv.className = "cut-info";

  let cutHTML = `<div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 10px 0; border-radius: 5px;">`;
  cutHTML += `<strong>Відтинання Гомори для змінної x${
    subscripts[parseInt(variableName)]
  }:</strong><br>`;

  // Формуємо рівняння відтинання
  const terms = cut.coefficients
    .map((coef, idx) => {
      if (Math.abs(coef) < EPSILON) return "";
      const sign = coef > 0 ? (idx === 0 ? "" : "+ ") : "- ";
      const absCoef = Math.abs(coef);
      const varName =
        idx < cut.coefficients.length - 1
          ? `x${subscripts[idx + 1]}`
          : cut.slackVariableName;
      return `${sign}${absCoef.toFixed(4)}${varName}`;
    })
    .filter((term) => term !== "")
    .join(" ");

  cutHTML += `${terms} ≤ ${cut.rhs.toFixed(4)}</div>`;

  cutDiv.innerHTML = cutHTML;
  tablesContainer.appendChild(cutDiv);
}

function displayGomoryResult(result: GomoryResult) {
  const solutionElement = document.getElementById("symplexSolution")!;

  let resultHTML = "<h2>Результат методу Гомори</h2>";

  switch (result.status) {
    case "INTEGER_OPTIMAL":
      resultHTML += `<div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px;">`;
      resultHTML += `<h3 style="color: #155724;">✓ Знайдено оптимальний цілочисловий розв'язок!</h3>`;
      resultHTML += `<p><strong>Кількість ітерацій:</strong> ${result.iterations}</p>`;
      resultHTML += `<p><strong>Оптимальне значення цільової функції:</strong> Q* = ${result.optimalValue?.toFixed(
        6
      )}</p>`;

      if (result.solution) {
        const solutionStr = result.solution
          .map(
            (s) => `x${subscripts[parseInt(s.name)]} = ${s.value.toFixed(6)}`
          )
          .join(", ");
        resultHTML += `<p><strong>Оптимальний розв'язок:</strong> ${solutionStr}</p>`;
      }

      resultHTML += `</div>`;
      break;

    case "NO_INTEGER_SOLUTION":
      resultHTML += `<div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px;">`;
      resultHTML += `<h3 style="color: #721c24;">✗ Цілочисловий розв'язок не існує</h3>`;
      resultHTML += `<p>${result.message}</p>`;
      resultHTML += `</div>`;
      break;

    case "ITERATION_LIMIT":
      resultHTML += `<div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px;">`;
      resultHTML += `<h3 style="color: #856404;">⚠ Досягнуто ліміт ітерацій</h3>`;
      resultHTML += `<p>${result.message}</p>`;
      if (result.solution) {
        const solutionStr = result.solution
          .map(
            (s) => `x${subscripts[parseInt(s.name)]} = ${s.value.toFixed(6)}`
          )
          .join(", ");
        resultHTML += `<p><strong>Поточний розв'язок:</strong> ${solutionStr}</p>`;
        resultHTML += `<p><strong>Значення цільової функції:</strong> Q = ${result.optimalValue?.toFixed(
          6
        )}</p>`;
      }
      resultHTML += `</div>`;
      break;

    default:
      resultHTML += `<div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px;">`;
      resultHTML += `<h3 style="color: #721c24;">✗ Помилка</h3>`;
      resultHTML += `<p>${result.message || "Невідома помилка"}</p>`;
      resultHTML += `</div>`;
  }

  solutionElement.innerHTML = resultHTML;
}
