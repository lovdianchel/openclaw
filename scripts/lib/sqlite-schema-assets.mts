import fs from "node:fs";
import path from "node:path";
import type { TsdownPlugin } from "tsdown";

/** Keep diagnostic catalogs out of executable chunks while preserving relocated asset URLs. */
export function createSqliteSchemaAssetsPlugin(
  rootDir = process.cwd(),
  recordInput?: (file: string) => void,
): TsdownPlugin {
  const directory = fs.realpathSync(path.resolve(rootDir, "src/state/postgres-schema.generated"));
  return {
    name: "openclaw:sqlite-schema-assets",
    transform(code, id) {
      if (
        path.dirname(path.normalize(id)) !== directory ||
        !/^sqlite-[a-z-]+-catalogs\.ts$/u.test(path.basename(id))
      ) {
        return undefined;
      }
      const transformed = code.replace(
        /new URL\(\s*["']\.\/(sqlite-[\w-]+-catalogs\.json)["']\s*,\s*import\.meta\.url\s*\)/gu,
        (_reference, name: string) => {
          const source = path.join(directory, name);
          recordInput?.(source);
          this.addWatchFile(source);
          const asset = this.emitFile({
            type: "asset",
            fileName: `assets/sqlite-schema/${name}`,
            source: fs.readFileSync(source),
          });
          return `new URL(import.meta.ROLLUP_FILE_URL_${asset})`;
        },
      );
      return { code: transformed, map: null };
    },
  };
}
