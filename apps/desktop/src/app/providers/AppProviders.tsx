import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "./ThemeProvider";
import { ErrorBoundary } from "../../components/common/ErrorBoundary";
import { useAppearance } from "../../stores/appearance";
import { NativeSyncContext } from "./nativeSync";


export function AppProviders({ children, nativeSync = true }: { children: ReactNode; nativeSync?: boolean }) {
  const motion = useAppearance((s) => s.motion);
  return (
    <ErrorBoundary>
      <NativeSyncContext.Provider value={nativeSync}>
        <MotionConfig reducedMotion={motion === "reduced" ? "always" : motion === "full" ? "never" : "user"}>
          <ThemeProvider>{children}</ThemeProvider>
        </MotionConfig>
      </NativeSyncContext.Provider>
    </ErrorBoundary>
  );
}
