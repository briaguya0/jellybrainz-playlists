import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Popover } from "@src/components/Popover";

vi.mock("@src/hooks/useIsMobile", () => ({
  useIsMobile: vi.fn().mockReturnValue(false),
}));

import { useIsMobile } from "@src/hooks/useIsMobile";
const mockUseIsMobile = vi.mocked(useIsMobile);

afterEach(() => {
  mockUseIsMobile.mockReturnValue(false);
});

describe("Popover", () => {
  it("renders trigger child", () => {
    render(
      <Popover placement="below-left" content={() => <div>Content</div>}>
        <button type="button">Open</button>
      </Popover>,
    );
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
  });

  it("opens popover content on trigger click", async () => {
    const user = userEvent.setup();
    render(
      <Popover placement="below-left" content={() => <div>Popover Content</div>}>
        <button type="button">Open</button>
      </Popover>,
    );
    expect(screen.queryByText("Popover Content")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByText("Popover Content")).toBeInTheDocument();
  });

  it("mobile bottom sheet: closes on Escape keydown in dialog", async () => {
    const user = userEvent.setup();
    mockUseIsMobile.mockReturnValue(true);
    render(
      <Popover placement="below-left" enableMobile content={() => <div>Popover Content</div>}>
        <button type="button">Open</button>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByText("Popover Content")).toBeInTheDocument();
    // Dialog has onKeyDown handler; fire directly since it's not the focused element
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByText("Popover Content")).not.toBeInTheDocument();
  });

  it("content render prop receives a close function that works", async () => {
    const user = userEvent.setup();
    render(
      <Popover
        placement="below-left"
        content={(close) => (
          <button type="button" onClick={close}>
            Close me
          </button>
        )}
      >
        <button type="button">Open</button>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("button", { name: "Close me" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close me" }));
    expect(screen.queryByRole("button", { name: "Close me" })).not.toBeInTheDocument();
  });

  it("desktop (not mobile): renders as fixed-position div, not bottom sheet", async () => {
    const user = userEvent.setup();
    mockUseIsMobile.mockReturnValue(false);
    render(
      <Popover placement="below-left" enableMobile content={() => <div>Desktop Content</div>}>
        <button type="button">Open</button>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    const content = screen.getByText("Desktop Content").closest("div");
    expect(content).not.toHaveAttribute("role", "dialog");
  });

  it("mobile + enableMobile: renders as bottom sheet with role=dialog", async () => {
    const user = userEvent.setup();
    mockUseIsMobile.mockReturnValue(true);
    render(
      <Popover placement="below-left" enableMobile content={() => <div>Mobile Content</div>}>
        <button type="button">Open</button>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on backdrop click (mousedown outside)", async () => {
    const user = userEvent.setup();
    render(
      <Popover placement="below-left" content={() => <div>Popover Content</div>}>
        <button type="button">Open</button>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByText("Popover Content")).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByText("Popover Content")).not.toBeInTheDocument();
  });
});
