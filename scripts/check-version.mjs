import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const cargoToml = await readFile(new URL("../src-tauri/Cargo.toml", import.meta.url), "utf8");
const tauriConfig = JSON.parse(await readFile(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"));
const cargoVersion = /^version\s*=\s*"([^"]+)"/mu.exec(cargoToml)?.[1];

if (!cargoVersion) throw new Error("Version introuvable dans src-tauri/Cargo.toml.");
if (packageJson.version !== cargoVersion) {
  throw new Error(`Versions incohérentes : Cargo=${cargoVersion}, package.json=${packageJson.version}.`);
}
if (Object.hasOwn(tauriConfig, "version")) {
  throw new Error("tauri.conf.json ne doit pas dupliquer la version canonique de Cargo.toml.");
}

console.log(`Version Plum3 cohérente : ${cargoVersion}`);
