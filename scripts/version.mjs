import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(resolve(rootDir, "package.json"), "utf8"));

function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

const commit = git(["rev-parse", "--short", "HEAD"]);
const branch = git(["branch", "--show-current"]);
const status = git(["status", "--short"]);

console.log(`Aurora OS ${packageJson.version}`);
console.log(`branch: ${branch || "unknown"}`);
console.log(`commit: ${commit}`);
console.log(`workingTree: ${status ? "dirty" : "clean"}`);
