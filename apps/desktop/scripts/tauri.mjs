import { spawn, } from "node:child_process";
import { dirname, resolve, } from "node:path";
import { fileURLToPath, } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url,),);
const appDir = resolve(scriptDir, "..",);

const args = process.argv.slice(2,);
const [command, ...rest] = args;

const tauriArgs = command === "dev"
  ? ["dev", "--config", resolve(appDir, "src-tauri", "tauri.dev.conf.json",), ...rest,]
  : args;

const child = spawn("tauri", tauriArgs, {
  cwd: appDir,
  stdio: "inherit",
  shell: process.platform === "win32",
},);

child.on("exit", (code,) => {
  process.exit(code ?? 1,);
},);
