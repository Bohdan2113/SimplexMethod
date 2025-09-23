// services/index.ts
import { ClearTableContainer } from "./SimplexTable.js";
import { solveBySimplexMethod } from "./SimplexMethod.js";
import { InteractiveTableManager } from "./displayLogic.js";
import { solveByDualSimplexMethod } from "./DualSimplexMethod.js";

const solveBtn = document.getElementById("solveBtn") as HTMLButtonElement;
const solveMethodSelect = document.getElementById(
  "solveMethod"
) as HTMLSelectElement;

solveBtn.addEventListener("click", () => {
  ClearTableContainer("symplexTables");
  ClearTableContainer("symplexSolution");

  const selectedMethod = solveMethodSelect.value;

  if (selectedMethod === "simplex") {
    solveBySimplexMethod();
  } else if (selectedMethod === "dual-simplex") {
    solveByDualSimplexMethod(); 
  }

  console.log(`Solving with ${selectedMethod} method`);
});

export const displayLogic = new InteractiveTableManager();