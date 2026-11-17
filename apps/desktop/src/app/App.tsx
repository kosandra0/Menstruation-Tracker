import { useState } from "react";
import { RouterProvider } from "react-router";
import { AppProviders } from "./providers/AppProviders";
import { createAppRouter } from "./router";
import { Lifecycle } from "../components/layout/Lifecycle";
import { TrayMenu } from "../components/layout/TrayMenu";
import { ToastWindow } from "../features/notifications/ToastWindow";

/** `?window=tray` loads the themed tray-menu window instead of the main application. */
const isTrayWindow = () => new URLSearchParams(window.location.search).get("window") === "tray";

/** `?window=toast` loads the themed notification popup window. */
const isToastWindow = () => new URLSearchParams(window.location.search).get("window") === "toast";

function MainApp() {
  const [router] = useState(createAppRouter);
  return (
    <AppProviders>
      <Lifecycle>
        <RouterProvider router={router} />
      </Lifecycle>
    </AppProviders>
  );
}

export default function App() {
  if (isToastWindow()) {
    return (
      <AppProviders nativeSync={false}>
        <ToastWindow />
      </AppProviders>
    );
  }
  if (isTrayWindow()) {
    return (
      <AppProviders nativeSync={false}>
        <TrayMenu />
      </AppProviders>
    );
  }
  return <MainApp />;
}
