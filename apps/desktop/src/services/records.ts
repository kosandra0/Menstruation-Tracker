import type { StorageStatus } from "@mt/shared-types";
import { emptyRecords, parseRecords, type RecordsData } from "@mt/domain";
import { invokeNative, isNative } from "./native";

/**
 * Port to the encrypted record vault. Health records are persisted ONLY through the native vault
 * (DPAPI-encrypted file). In a plain browser there is no vault, so nothing is persisted and the UI says so:
 * health data is never written to localStorage.
 */
export interface RecordsService {
  /** True when records can be saved durably. */
  readonly persistent: boolean;
  status(): Promise<StorageStatus>;
  load(): Promise<RecordsData>;
  save(data: RecordsData): Promise<void>;
  deleteAll(): Promise<void>;
}

export const nativeRecords: RecordsService = {
  persistent: true,
  status: () => invokeNative<StorageStatus>("storage_status"),
  async load() {
    const json = await invokeNative<string | null>("records_load");
    if (!json) return emptyRecords();
    return parseRecords(JSON.parse(json));
  },
  async save(data) {
    await invokeNative("records_save", { json: JSON.stringify(data) });
  },
  async deleteAll() {
    await invokeNative("records_delete_all");
  },
};

export const memoryRecords: RecordsService = {
  persistent: false,
  status: async () => ({ state: "locked", encrypted: false, schemaVersion: null }),
  load: async () => emptyRecords(),
  save: async () => {},
  deleteAll: async () => {},
};

export const recordsService: RecordsService = isNative() ? nativeRecords : memoryRecords;
