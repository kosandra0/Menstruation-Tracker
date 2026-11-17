import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { emptyRecords, todayIso } from "@mt/domain";
import { AppProviders } from "../../app/providers/AppProviders";
import { DailyLogPage } from "./DailyLogPage";
import { useRecords } from "../../stores/records";

function renderPage() {
  const router = createMemoryRouter([{ path: "/log", element: <DailyLogPage /> }], { initialEntries: ["/log"] });
  return render(<AppProviders><RouterProvider router={router} /></AppProviders>);
}

beforeEach(() => {
  localStorage.clear();
  useRecords.setState({ data: emptyRecords(), loadStatus: "ready", saveStatus: "idle", error: null });
});

describe("Daily Log", () => {
  it("keeps every field the user filled in when saving (mood + symptom + notes)", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getAllByRole("button", { name: "Good" })[0]); // first row = mood
    await user.click(screen.getByRole("button", { name: /cramps/i }));
    await user.type(screen.getByLabelText("Notes for this day"), "mild");
    await user.click(screen.getByRole("button", { name: /Save entry/ }));
    const log = useRecords.getState().data.logs[todayIso()];
    expect(log).toMatchObject({ mood: 4, symptoms: ["cramps"], notes: "mild" });
  }, 20_000);

  it("saves the body signals: stress, temperature, weight, cervical fluid and intimacy", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Stressed" }));
    await user.type(screen.getByLabelText("Temperature"), "36.6");
    await user.type(screen.getByLabelText("Weight"), "58.5");
    await user.click(screen.getByRole("button", { name: /creamy/i }));
    await user.click(screen.getByRole("button", { name: "Yes" }));
    await user.click(screen.getByRole("button", { name: /Save entry/ }));
    expect(useRecords.getState().data.logs[todayIso()]).toMatchObject({ stress: 4, temperatureC: 36.6, weightKg: 58.5, discharge: "creamy", intimacy: true });
  }, 20_000);

  it("refuses an impossible temperature instead of saving it", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("Temperature"), "99");
    await user.click(screen.getByRole("button", { name: /Save entry/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(/between 34 and 42/);
    expect(useRecords.getState().data.logs).toEqual({});
  }, 20_000);

  it("does not save an empty entry and says so", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByRole("button", { name: /Save entry/ })).toBeDisabled();
    await user.click(screen.getAllByRole("button", { name: "Good" })[0]);
    await user.click(screen.getAllByRole("button", { name: "Good" })[0]); // toggle off again
    expect(useRecords.getState().data.logs).toEqual({});
  });
});
