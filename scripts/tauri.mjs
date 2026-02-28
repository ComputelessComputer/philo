import { spawn, } from "node:child_process";

const args = process.argv.slice(2,);
const [command, ...rest] = args;

const tauriArgs = command === "dev"
  ? ["dev", "--config", "src-tauri/tauri.dev.conf.json", ...rest,]
  : args;

const child = spawn("tauri", tauriArgs, {
  stdio: "inherit",
  shell: process.platform === "win32",
},);

child.on("exit", (code,) => {
  process.exit(code ?? 1,);
},);
