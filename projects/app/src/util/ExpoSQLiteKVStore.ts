import { deepFreeze } from "@react-native-replicache/deep-freeze";
import * as SQLite from "expo-sqlite";
import type { KVRead, KVStore, KVWrite, ReadonlyJSONValue } from "replicache";

const log: typeof console.log | undefined = undefined;

export class ExpoSQLiteKVStore implements KVStore {
  private _busyDbs: SQLite.SQLiteDatabase[] = [];
  private _idleDbs: SQLite.SQLiteDatabase[] = [];
  private _closed = false;
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  async truncate() {
    const db = await this.open();
    await db.execAsync(`DELETE FROM entry`);
    this.release(db);
  }

  async delete() {
    await SQLite.deleteDatabaseAsync(this.name);
  }

  async read(): Promise<KVRead> {
    log?.(`ExpoSQLiteKVStore#read()`);
    const db = await this.open();

    await db.execAsync(`BEGIN`);
    return new ExpoSQLiteKVStoreReadImpl(db, () => {
      this.release(db);
    });
  }

  async write(): Promise<KVWrite> {
    log?.(`ExpoSQLiteKVStore#write()`);
    const db = await this.open();
    await db.execAsync(`BEGIN`);
    return new ExpoSQLiteKVStoreWriteImpl(db, () => {
      this.release(db);
    });
  }

  async close(): Promise<void> {
    log?.(`ExpoSQLiteKVStore#close()`);
    const dbs = [...this._busyDbs, ...this._idleDbs];
    this._busyDbs.length = 0;
    this._idleDbs.length = 0;
    this._closed = true;

    await Promise.all(dbs.map((x) => x.closeAsync()));
  }

  get closed(): boolean {
    return this._closed;
  }

  private async open() {
    log?.(`ExpoSQLiteKVStore#open()`);
    log?.(`this._idleDbs.length=`, this._idleDbs.length);
    // Try and pull an idle one.
    {
      const db = this._idleDbs.pop();
      if (db) {
        this._busyDbs.push(db);
        return db;
      }
    }

    // Open a new connection
    const db = await SQLite.openDatabaseAsync(this.name, {
      useNewConnection: true,
    });
    this._busyDbs.push(db);
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS entry (key TEXT PRIMARY KEY, value TEXT)`,
    );
    return db;
  }

  private release(db: SQLite.SQLiteDatabase) {
    log?.(`ExpoSQLiteKVStore#release()`);
    const index = this._busyDbs.indexOf(db);
    log?.(`index =`, index);
    if (index !== -1) {
      log?.(`this._idleDbs.length =`, this._idleDbs.length);
      log?.(`this._busyDbs.length =`, this._busyDbs.length);
      log?.(`shift`);
      this._idleDbs.push(...this._busyDbs.splice(index, 1));
      log?.(`this._idleDbs.length =`, this._idleDbs.length);
      log?.(`this._busyDbs.length =`, this._busyDbs.length);
    }
  }
}

// For debugging purposes, a sequentially incrementing transaction number (not
// connection specific).
const txIds: Record<string, number> = {};

export class ExpoSQLiteKVStoreReadImpl implements KVRead {
  protected _db: SQLite.SQLiteDatabase | null;
  protected _txId: number;
  public readonly onRelease: () => void;

  constructor(db: SQLite.SQLiteDatabase, onRelease: () => void) {
    this.onRelease = onRelease;
    this._txId = txIds[db.databasePath] = (txIds[db.databasePath] ?? 0) + 1;
    log?.(`KV[${this._txId.toString()}]#constructor()`);
    this._db = db;
  }

  async has(key: string): ReturnType<KVRead[`has`]> {
    log?.(`KV[${this._txId.toString()}]#has()`);
    const row = await this.txOrThrow().getFirstAsync<object>(
      `SELECT 1 FROM entry WHERE key = ?`,
      [key],
    );
    return row !== null;
  }

  async get(key: string): ReturnType<KVRead[`get`]> {
    log?.(`KV[${this._txId.toString()}]#get()`);
    const row = await this.txOrThrow().getFirstAsync<{ value: string }>(
      `SELECT value FROM entry WHERE key = ?`,
      [key],
    );

    if (row === null) {
      return undefined;
    }

    const decoded = JSON.parse(row.value) as ReadonlyJSONValue;
    deepFreeze(decoded as unknown as undefined);
    return decoded;
  }

  release(): void {
    log?.(`KV[${this._txId.toString()}]#release()`);
    if (this._db) {
      this._db.execSync(`ROLLBACK`);
      this._db = null;
    }
    this.onRelease();
  }

  get closed(): boolean {
    return this._db === null;
  }

  protected txOrThrow() {
    if (this._db === null) {
      throw new Error(`transaction already closed`);
    }
    return this._db;
  }
}

export class ExpoSQLiteKVStoreWriteImpl
  extends ExpoSQLiteKVStoreReadImpl
  implements KVWrite
{
  async put(key: string, value: ReadonlyJSONValue) {
    log?.(`KV[${this._txId.toString()}]#put()`);
    const jsonValueString = JSON.stringify(value);
    await this.txOrThrow().runAsync(
      `INSERT OR REPLACE INTO entry (key, value) VALUES (?, ?)`,
      [key, jsonValueString],
    );
  }

  async del(key: string) {
    log?.(`KV[${this._txId.toString()}]#del()`);
    await this.txOrThrow().runAsync(`DELETE FROM entry WHERE key = ?`, [key]);
  }

  async commit() {
    log?.(`KV[${this._txId.toString()}]#commit()`);
    await this.txOrThrow().execAsync(`COMMIT`);
    // Not sure if this is exactly part of the spec, but by making `commit` only
    // allowed once, it simplifies some other logic.
    this._db = null;
  }
}
