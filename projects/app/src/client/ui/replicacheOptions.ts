import { ExpoSQLiteKVStore } from "@/util/ExpoSQLiteKVStore";
import * as SQLite from "expo-sqlite";
import { ReplicacheOptions } from "replicache";

export const kvStore: ReplicacheOptions<never>[`kvStore`] = {
  create: (name: string) => new ExpoSQLiteKVStore(`replicache-${name}.sqlite`),
  drop: async (name: string) => {
    await SQLite.deleteDatabaseAsync(`replicache-${name}.sqlite`);
  },
};
