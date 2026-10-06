import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { LandingHeader } from "../LandingHeader";

describe("LandingHeader", () => {
  it("should display the correct brand string without duplication", () => {
    const { container } = render(
      <MemoryRouter>
        <LandingHeader />
      </MemoryRouter>
    );

    expect(screen.getByText(/powered by Talent Group/i)).toBeInTheDocument();
    
    const textContent = container.textContent || "";
    expect(textContent).not.toContain("powered by NR-1Comprova");
  });
});
