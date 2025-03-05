import { Debugger } from "debug";
import { DatabaseSync } from "node:sqlite";

export function makeDbCache<K, V>(
  scriptFilename: string,
  tableName = `cache`,
  parentDebug?: Debugger,
) {
  const debug = parentDebug?.extend(`makeDbCache`);
  const dbLocation = scriptFilename.replace(/\.[^.]+$/, `.db`);
  debug?.(`using db: ${dbLocation}`);
  const db = new DatabaseSync(dbLocation);

  db.exec(`
  CREATE TABLE IF NOT EXISTS ${tableName}(
    request TEXT PRIMARY KEY,
    response TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  ) STRICT
  `);

  return {
    get(key: K): V | undefined {
      const keyText = JSON.stringify(key);
      debug?.(`getting cache for key: %O`, keyText);

      const result = db
        .prepare(`SELECT * FROM ${tableName} WHERE request = ?`)
        .get(keyText) as
        | { request: string; response: string; created_at: string }
        | undefined;

      return result != null ? (JSON.parse(result.response) as V) : undefined;
    },
    set(key: K, value: V): void {
      const keyText = JSON.stringify(key);
      const valueText = JSON.stringify(value);
      debug?.(`inserting cache for key: %O, value: %O`, keyText, valueText);

      db.prepare(
        `INSERT INTO ${tableName} (request, response) VALUES (?, ?)`,
      ).run(keyText, valueText);
    },
  };
}

export type DbCache = ReturnType<typeof makeDbCache>;
