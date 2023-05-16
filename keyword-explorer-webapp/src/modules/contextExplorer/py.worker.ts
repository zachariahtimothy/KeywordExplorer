// const pyodideWorkerTest = new Worker(
//   new URL("./pyodide.worker", import.meta.url)
// );
// const pyodideWorker = new ComlinkWorker<typeof import("./pyodide.worker")>(
//   new URL("./pyodide.worker.ts", import.meta.url)
// );

export async function loadPythonScript(
  filename: string,
  pyodideWorker: typeof import("./pyodide.worker")
) {
  await pyodideWorker.loadPyodideAndPackages();
  const worker = await pyodideWorker.loadScript(filename);
  console.log("getPythonScript", filename, worker);
}

export async function executeScript(
  pyodideWorker: typeof import("./pyodide.worker"),
  filename: string,
  functionName: string,
  ...scriptArguments: unknown[]
) {
  await pyodideWorker.loadPyodideAndPackages();
  await pyodideWorker.loadScript(filename);
  return pyodideWorker.executeScript(filename, functionName, scriptArguments);
}
