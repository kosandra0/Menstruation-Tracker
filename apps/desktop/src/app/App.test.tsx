import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { emptyRecords } from "@mt/domain";
import { AppProviders } from "./providers/AppProviders";
import { routes } from "./router";
import { DEFAULT_APPEARANCE, useAppearance } from "../stores/appearance";
import { useRecords } from "../stores/records";

function renderApp(path = "/") {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<AppProviders><RouterProvider router={router} /></AppProviders>);
}

beforeEach(() => {
  localStorage.clear();
  useAppearance.getState().replaceAll({ ...structuredClone(DEFAULT_APPEARANCE), onboarded: true });
  useRecords.setState({ data: emptyRecords(), loadStatus: "idle", saveStatus: "idle", error: null });
});

describe("application shell", () => {
  it("renders the dashboard with real empty states (no demo data)", async () => {
    renderApp();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(await screen.findByText(/Your cycle starts here/i)).toBeInTheDocument();
    expect(screen.queryByText(/demo/i)).not.toBeInTheDocument();
  });

  it("shows a skippable welcome on first launch", async () => {
    useAppearance.setState({ onboarded: false });
    const user = userEvent.setup();
    renderApp();
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Welcome to Menstruation Tracker/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Skip for now" }));
    expect(useAppearance.getState().onboarded).toBe(true);
  });

  it("navigates to every screen from the sidebar", async () => {
    const user = userEvent.setup();
    renderApp();
    const screens: [string, string][] = [
      ["Cycle Calendar", "Cycle Calendar"], ["Daily Log", "Daily Log"], ["Insights", "Insights"],
      ["Health Journal", "Health Journal"], ["Reminders", "Reminders"], ["Settings", "Settings"], ["Dashboard", ""],
    ];
    for (const [link, heading] of screens) {
      await user.click(screen.getByRole("link", { name: link }));
      if (heading) expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
    }
  }, 30000);

  it("switches theme and mode from Settings and applies them to the document", async () => {
    const user = userEvent.setup();
    renderApp("/settings");
    await user.click(screen.getByRole("radio", { name: /Warm Sand/ }));
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(useAppearance.getState().themeId).toBe("sand");
    expect(document.documentElement.dataset.theme).toBe("sand");
    expect(document.documentElement.dataset.mode).toBe("dark");
  }, 20000);

  it("lets the user choose the app logo", async () => {
    const user = userEvent.setup();
    renderApp("/settings#personalization");
    expect(await screen.findByRole("radiogroup", { name: "App logo" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Heartleaf/ }));
    expect(useAppearance.getState().logoId).toBe("heartleaf");
    await user.click(screen.getByRole("radio", { name: /Lunar Cycle/ }));
    expect(useAppearance.getState().logoId).toBe("lunar-cycle");
  }, 20000);

  it("applies custom colours as CSS variables and shows contrast warnings", async () => {
    const user = userEvent.setup();
    renderApp("/settings#colors");
    const hex = await screen.findByLabelText("Primary accent", { selector: "input[type=text]" });
    await user.clear(hex);
    await user.type(hex, "#aa2244");
    expect(useAppearance.getState().overrides.accent).toBe("#aa2244");
    expect(document.documentElement.style.getPropertyValue("--c-accent")).toBeTruthy();
    expect(screen.getByRole("list", { name: "Contrast report" })).toBeInTheDocument();
  }, 20000);

  it("filters settings with the search box", async () => {
    const user = userEvent.setup();
    renderApp("/settings");
    await user.type(screen.getByRole("searchbox", { name: "Search settings" }), "tray");
    const nav = screen.getByRole("navigation", { name: "Settings" });
    expect(within(nav).getByRole("button", { name: /Window & tray/ })).toBeInTheDocument();
    expect(within(nav).queryByRole("button", { name: /Colours/ })).not.toBeInTheDocument();
  }, 20000);
});
