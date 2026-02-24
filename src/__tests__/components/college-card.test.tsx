import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { CollegeCard } from "@/components/college-card";
import { makeCollege, makeUser } from "../helpers/test-college";

// Mock the hooks that CollegeActions uses
vi.mock("@/hooks/use-folders", () => ({
  useFolders: () => ({ data: [] }),
  useFolderMemberships: () => ({ data: new Map() }),
  useToggleFolderItem: () => ({ mutate: vi.fn() }),
  useCreateFolder: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("CollegeCard", () => {
  const defaultProps = {
    college: makeCollege(),
    isFavorite: false,
    onToggleFavorite: vi.fn(),
    user: makeUser(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders college name as a link", () => {
    render(<CollegeCard {...defaultProps} />, { wrapper: Wrapper });
    const link = screen.getByText("Massachusetts Institute of Technology");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/college/c-1");
  });

  it("renders city and state", () => {
    render(<CollegeCard {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText("Cambridge, MA")).toBeInTheDocument();
  });

  it("renders formatted tuition", () => {
    render(<CollegeCard {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText("$57,590")).toBeInTheDocument();
  });

  it("renders formatted acceptance rate", () => {
    render(<CollegeCard {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText("4.0%")).toBeInTheDocument();
  });

  it("renders formatted enrollment", () => {
    render(<CollegeCard {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText("11,520")).toBeInTheDocument();
  });

  it("renders college type", () => {
    render(<CollegeCard {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("shows N/A for null tuition", () => {
    const college = makeCollege({ tuitionInState: null });
    render(
      <CollegeCard {...defaultProps} college={college} />,
      { wrapper: Wrapper },
    );
    // Multiple N/A might exist; check within the tuition section
    const tuitionLabels = screen.getAllByText("N/A");
    expect(tuitionLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Jesuit badge for Jesuit colleges", () => {
    const college = makeCollege({ jesuit: true });
    render(
      <CollegeCard {...defaultProps} college={college} />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText("Jesuit")).toBeInTheDocument();
  });

  it("does not show Jesuit badge for non-Jesuit colleges", () => {
    render(<CollegeCard {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.queryByText("Jesuit")).not.toBeInTheDocument();
  });

  it("shows N/A when type is null", () => {
    const college = makeCollege({ type: null });
    render(
      <CollegeCard {...defaultProps} college={college} />,
      { wrapper: Wrapper },
    );
    const nas = screen.getAllByText("N/A");
    expect(nas.length).toBeGreaterThanOrEqual(1);
  });
});
