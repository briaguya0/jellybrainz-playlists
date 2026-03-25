import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThemeSection } from "@src/components/settings/ThemeSection";

const { mockSetAndApply, mockUseThemeMode } = vi.hoisted(() => {
  const mockSetAndApply = vi.fn();
  const mockUseThemeMode = vi.fn().mockReturnValue({ mode: "auto", setAndApply: mockSetAndApply });
  return { mockSetAndApply, mockUseThemeMode };
});

vi.mock("@src/hooks/useThemeMode", () => ({
  useThemeMode: mockUseThemeMode,
  getStoredMode: vi.fn().mockReturnValue("auto"),
  applyThemeMode: vi.fn(),
}));

describe("ThemeSection", () => {
  it("renders three toggle buttons (Light, Dark, Auto)", () => {
    render(<ThemeSection />);
    expect(screen.getByRole("button", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dark" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Auto" })).toBeInTheDocument();
  });

  it("active button reflects current mode from useThemeMode", () => {
    mockUseThemeMode.mockReturnValue({ mode: "dark", setAndApply: mockSetAndApply });
    render(<ThemeSection />);
    const darkBtn = screen.getByRole("button", { name: "Dark" });
    expect(darkBtn.className).toContain("bg-[var(--accent)]");
  });

  it("clicking a button calls setAndApply with correct mode", async () => {
    const user = userEvent.setup();
    mockSetAndApply.mockClear();
    mockUseThemeMode.mockReturnValue({ mode: "auto", setAndApply: mockSetAndApply });
    render(<ThemeSection />);
    await user.click(screen.getByRole("button", { name: "Light" }));
    expect(mockSetAndApply).toHaveBeenCalledWith("light");
    await user.click(screen.getByRole("button", { name: "Dark" }));
    expect(mockSetAndApply).toHaveBeenCalledWith("dark");
    await user.click(screen.getByRole("button", { name: "Auto" }));
    expect(mockSetAndApply).toHaveBeenCalledWith("auto");
  });
});
