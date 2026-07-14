import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const output = join(tmpdir(), "plum3-performance-fixtures");
await mkdir(output, { recursive: true });

const baseLine = "Texte de performance Plum3 — café, Unicode 東京 et emoji ✨. **Gras** et *italique*.\n";
for (const [name, targetBytes] of [["100-ko.md", 100 * 1024], ["500-ko.md", 500 * 1024], ["1-mo.md", 1024 * 1024]]) {
  let content = `# Fixture ${name}\n\n`;
  while (Buffer.byteLength(content, "utf8") < targetBytes) content += baseLine;
  await writeFile(join(output, name), content.slice(0, targetBytes), "utf8");
}

const manyLines = Array.from({ length: 10_000 }, (_, index) => `${index + 1}. Ligne ${index + 1} — Plum3 🌙`).join("\n");
await writeFile(join(output, "10000-lignes.md"), `# Dix mille lignes\n\n${manyLines}\n`, "utf8");
console.log(output);
