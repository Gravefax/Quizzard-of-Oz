import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "@/app/not-found";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("NotFound – 404-Seite", () => {
  it("zeigt die 404-Überschrift an", () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("zeigt die Fehlermeldung an", () => {
    render(<NotFound />);
    expect(screen.getByText("Diese Seite existiert nicht")).toBeInTheDocument();
  });

  it("zeigt den erklärenden Subtext an", () => {
    render(<NotFound />);
    expect(
      screen.getByText(/Die aufgerufene URL wurde nicht gefunden/)
    ).toBeInTheDocument();
  });

  it("enthält einen Link zurück zur Hauptseite", () => {
    render(<NotFound />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/");
  });

  it("zeigt den Zurück-Text im Link an", () => {
    render(<NotFound />);
    expect(screen.getByRole("link")).toHaveTextContent(/Zurück zur Hauptseite/i);
  });
});
