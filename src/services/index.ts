// services/index.ts
import { ClearContainer } from "./SimplexTable.js";
import { solveBySimplexMethod } from "./SimplexMethod.js";
import { InteractiveTableManager } from "./displayLogic.js";
import { solveByDualSimplexMethod } from "./DualSimplexMethod.js";

const solveBtn = document.getElementById("solveBtn") as HTMLButtonElement;
const solveMethodSelect = document.getElementById(
  "solveMethod"
) as HTMLSelectElement;

solveBtn.addEventListener("click", () => {
  ClearContainer("dualSimplexEquation");
  ClearContainer("symplexTables");
  ClearContainer("symplexSolution");

  const selectedMethod = solveMethodSelect.value;

  if (selectedMethod === "simplex") {
    solveBySimplexMethod();
  } else if (selectedMethod === "dual-simplex") {
    solveByDualSimplexMethod();
  }
});

export const displayLogic = new InteractiveTableManager();
