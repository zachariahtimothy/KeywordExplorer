import { PyodideInterface, loadPyodide, version } from "pyodide";
import type { PyProxy } from "pyodide/ffi";

let pyodide: PyodideInterface;

export async function loadPyodideAndPackages() {
  pyodide = await loadPyodide({
    indexURL: `https://cdn.jsdelivr.net/pyodide/v${version}/full`,
  });
  await pyodide.loadPackage(["numpy", "scipy"]);
  console.log("done loading");

  // self.postMessage([{ message: "loaded!", thisIsFrom: "pyodide.worker" }]);
  // return pyodide;
}

const scriptMap = new Map<string, PyProxy>();
export async function loadScript(filename: string) {
  if (!pyodide) {
    await loadPyodideAndPackages();
  }
  await pyodide.runPythonAsync(`
    from pyodide.http import pyfetch
    response = await pyfetch("${self.location.origin}/${filename}.py")
    with open("${filename}.py", "wb") as f:
        f.write(await response.bytes())
  `);
  const result = pyodide.pyimport(filename);
  console.log("await", result, result.toString());
  scriptMap.set(filename, result);
}

export function executeScript(
  name: string,
  functionName: string,
  functionArguments: unknown[]
): unknown | undefined {
  console.info(
    "pyodide.worker",
    "Executing script",
    `${name}.${functionName}(${functionArguments})`
  );
  const script = scriptMap.get(name);
  if (script) {
    const result = script[functionName]([functionArguments[0]]);
    return result;
  } else {
    throw new Error(`Script ${name} not found in map`);
  }
}
