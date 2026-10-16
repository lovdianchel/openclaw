import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { build } from "tsdown";
import { expect, it } from "vitest";
import { createSqliteSchemaAssetsPlugin } from "../../scripts/lib/sqlite-schema-assets.mts";
import { createStateSchemaInlinePlugin } from "../../scripts/lib/state-schema-inline-plugin.mts";
import { createScriptTestHarness } from "./test-helpers.js";

const { createTempDir } = createScriptTestHarness();

it("loads diagnostic catalogs lazily from relocated installed assets", async () => {
  const root = fs.realpathSync(createTempDir("sqlite-schema-assets-"));
  const entry = path.join(root, "entry.ts");
  fs.writeFileSync(
    entry,
    `import { readGeneratedSqliteFingerprint, readGeneratedSqliteCatalog } from ${JSON.stringify(path.resolve("src/state/postgres-schema.generated/sqlite-catalogs.ts"))};
import { OPENCLAW_STATE_SCHEMA_SQL } from ${JSON.stringify(path.resolve("src/state/openclaw-state-schema.ts"))};
import { OPENCLAW_AGENT_SCHEMA_SQL } from ${JSON.stringify(path.resolve("src/state/openclaw-agent-schema.ts"))};
export const fingerprints = () => [OPENCLAW_STATE_SCHEMA_SQL, OPENCLAW_AGENT_SCHEMA_SQL].map(readGeneratedSqliteFingerprint);
export const catalogs = () => [OPENCLAW_STATE_SCHEMA_SQL, OPENCLAW_AGENT_SCHEMA_SQL].map(readGeneratedSqliteCatalog);
`,
  );
  const outDir = path.join(root, "build");
  const { bundles } = await build({
    config: false,
    entry,
    outDir,
    platform: "node",
    format: "esm",
    dts: false,
    outExtensions: () => ({ js: ".mjs" }),
    plugins: [createStateSchemaInlinePlugin(), createSqliteSchemaAssetsPlugin()],
    logLevel: "silent",
  });
  try {
    const installed = path.join(root, "relocated");
    fs.renameSync(outDir, installed);
    const result = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import fs from 'node:fs';
const assets = new URL('./assets/', import.meta.url);
fs.renameSync(assets, new URL('./held-assets/', import.meta.url));
const owner = await import('./entry.mjs');
const fingerprints = owner.fingerprints();
fs.renameSync(new URL('./held-assets/', import.meta.url), assets);
const catalogs = owner.catalogs();
console.log(JSON.stringify(fingerprints.map((fingerprint, index) => ({
  fingerprint: fingerprint.fingerprint,
  tables: catalogs[index].tables.map(table => table.name),
  expected: fingerprint.tableNames,
}))));`,
      ],
      { cwd: installed, encoding: "utf8" },
    );
    const observed = JSON.parse(result) as {
      fingerprint: string;
      tables: string[];
      expected: string[];
    }[];
    expect(observed).toHaveLength(2);
    for (const store of observed) {
      expect(store.fingerprint).toMatch(/^[a-f0-9]{64}$/u);
      expect(store.tables).toEqual(store.expected);
      expect(store.tables.length).toBeGreaterThan(0);
    }
  } finally {
    for (const bundle of bundles) {
      await bundle[Symbol.asyncDispose]();
    }
  }
});
