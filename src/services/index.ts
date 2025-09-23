import { ClearTableContainer } from "./SimplexTable.js";
import { solveBySimplexMethod } from "./SimplexMethod.js";
import { InteractiveTableManager } from "./displayLogic.js";

const solveBtn = document.getElementById("solveBtn") as HTMLButtonElement;
solveBtn.addEventListener("click", () => {
  ClearTableContainer("symplexTables");
  solveBySimplexMethod();
  console.log("added listener to solveBtn");
});

export const displayLogic = new InteractiveTableManager();