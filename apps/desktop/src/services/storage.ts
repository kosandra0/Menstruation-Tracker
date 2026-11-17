import type { AppInfo, StorageStatus } from "@mt/shared-types";
import { APP_NAME, APP_VERSION } from "@mt/config";
import { invokeNative, isNative } from "./native";

/**
 * Application-layer storage port. The frontend never touches the database;
 * a native (Rust) implementation will back this once SQLCipher storage exists.
 * Domain repositories (periods, symptoms, journal) will be added here later.
 */
export interface StorageService {
  getStatus(): Promise<StorageStatus>;
}

export const storageService: StorageService = {
  async getStatus() {
    if (!isNative()) return { state: "not_initialized", encrypted: false, schemaVersion: null };
    return invokeNative<StorageStatus>("storage_status");
  },
};

export async function getAppInfo(): Promise<AppInfo> {
  if (!isNative()) return { name: APP_NAME, version: APP_VERSION, platform: "web-preview" };
  return invokeNative<AppInfo>("app_info");
}
