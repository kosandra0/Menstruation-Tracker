import { createContext, useContext } from "react";

export const NativeSyncContext = createContext(true);
/** False in secondary windows (tray menu) that must not push window behaviour/logo to the native shell. */
export const useNativeSync = () => useContext(NativeSyncContext);
