import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { CollegeTable } from "@/components/college-table";
import { makeCollege, makeUser } from "../helpers/test-college";

// Mock hooks used by CollegeActions (nested inside table rows)
vi.mock("@/hooks/use-folders", () => ({
  useFolders: () => ({ data: [] }),
  useFolderMemberships: () => ({ data: new Map() }),
  useToggleFolderItem: () => ({ mutate: vi.fn() }),
  useCreateFolder: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useToggleFolderSharing: () => ({ mutate: vi.fn(), isPending: false }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const colleges = [
  makeCollege({ id: "c-1", name: "MIT", city: "Cambridge", state: "MA", tuitionInState: 57590, acceptanceRate: 3.96 }),
  makeCollege({ id: "c-2", name: "Stanford", city: "Stanford", state: "CA", tuitionInState: 56169, acceptanceRate: 3.68, website: "https://stanford.edu" }),
  makeCollege({ id: "c-3", name: "Community College", city: "Anytown", state: "TX", tuitionInState: 5000, acceptanceRate: null, website: null, size: null }),
];

describe("CollegeTable", () => {
  const onSort = vi.fn();
  const onToggleFavorite = vi.fn();
  const user = makeUser();

  const defaultProps = {
    colleges,
    sortBy: "name",
    sortOrder: "asc" as const,
    onSort,
    favoriteIds: new Set<string>(["c-1"]),
    onToggleFavorite,
    user,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders all college names as links", () => {
    render(<CollegeTable {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText("MIT")).toBeInTheDocument();
    expect(screen.getByText("Stanford")).toBeInTheDocument();
    expect(screen.getByText("Community College")).toBeInTheDocument();

    const mitLink = screen.getByText("MIT").closest("a");
    expect(mitLink).toHaveAttribute("href", "/college/c-1");
  });

  it("renders column headers", () => {
    render(<CollegeTable {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Tuition")).toBeInTheDocument();
    expect(screen.getByText("Acceptance")).toBeInTheDocument();
  });

  it("renders formatted tuition values", () => {
    render(<CollegeTable {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText("$57,590")).toBeInTheDocument();
    expect(screen.getByText("$56,169")).toBeInTheDocument();
    expect(screen.getByText("$5,000")).toBeInTheDocument();
  });

  it("renders formatted acceptance rates", () => {
    render(<CollegeTable {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText("4.0%")).toBeInTheDocument();
    expect(screen.getByText("3.7%")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("renders location as city, state", () => {
    render(<CollegeTable {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText("Cambridge, MA")).toBeInTheDocument();
    expect(screen.getByText("Stanford, CA")).toBeInTheDocument();
  });

  it("renders --- for null size", () => {
    render(<CollegeTable {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText("---")).toBeInTheDocument();
  });

  it("calls onSort when clicking a sortable header", () => {
    render(<CollegeTable {...defaultProps} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("Name"));
    // Clicking the currently sorted column toggles direction
    expect(onSort).toHaveBeenCalledWith("name", "desc");
  });

  it("toggles sort direction for already-sorted column", () => {
    render(<CollegeTable {...defaultProps} sortOrder="desc" />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("Name"));
    expect(onSort).toHaveBeenCalledWith("name", "asc");
  });

  it("defaults numeric columns to descending on first click", () => {
    render(<CollegeTable {...defaultProps} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("Tuition"));
    expect(onSort).toHaveBeenCalledWith("tuition", "desc");
  });

  it("defaults text columns to ascending on first click", () => {
    render(<CollegeTable {...defaultProps} sortBy="tuition" />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("Location"));
    expect(onSort).toHaveBeenCalledWith("location", "asc");
  });

  it("renders external website links when available", () => {
    render(<CollegeTable {...defaultProps} />, { wrapper: Wrapper });
    const externalLinks = screen.getAllByTitle("Visit website");
    expect(externalLinks.length).toBe(2); // MIT and Stanford have websites
    expect(externalLinks[0].closest("a")).toHaveAttribute("href", "https://mit.edu");
    expect(externalLinks[1].closest("a")).toHaveAttribute("href", "https://stanford.edu");
  });

  it("does not render website link when website is null", () => {
    // Community College has no website — should be only 2 links
    render(<CollegeTable {...defaultProps} />, { wrapper: Wrapper });
    const externalLinks = screen.getAllByTitle("Visit website");
    expect(externalLinks).toHaveLength(2);
  });

  it("sets aria-sort on the currently sorted column header", () => {
    render(<CollegeTable {...defaultProps} />, { wrapper: Wrapper });
    const nameHeader = screen.getByText("Name").closest("th");
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
  });

  it("sets aria-sort to descending when sort order is desc", () => {
    render(<CollegeTable {...defaultProps} sortOrder="desc" />, { wrapper: Wrapper });
    const nameHeader = screen.getByText("Name").closest("th");
    expect(nameHeader).toHaveAttribute("aria-sort", "descending");
  });

  it("has a column visibility toggle button", () => {
    render(<CollegeTable {...defaultProps} />, { wrapper: Wrapper });
    const gearBtn = screen.getByTitle("Toggle columns");
    expect(gearBtn).toBeInTheDocument();
  });

  it("opens column visibility dropdown when gear is clicked", () => {
    render(<CollegeTable {...defaultProps} />, { wrapper: Wrapper });
    const gearBtn = screen.getByTitle("Toggle columns");
    fireEvent.click(gearBtn);
    expect(screen.getByText("Show columns")).toBeInTheDocument();
  });
});
