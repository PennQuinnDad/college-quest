import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { CollegeResources } from "@/components/college-resources";

// Mock the toast module
vi.mock("@/components/ui/toaster", () => ({
  toast: vi.fn(),
}));

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const mockResources = [
  {
    id: "r-1",
    college_id: "c-1",
    type: "link",
    title: "Financial Aid Portal",
    description: "Apply for financial aid",
    category: "Financial Aid",
    url: "https://example.com/aid",
    storage_path: null,
    file_name: null,
    file_size: null,
    mime_type: null,
    position: 0,
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
  },
  {
    id: "r-2",
    college_id: "c-1",
    type: "link",
    title: "Admissions Page",
    description: null,
    category: "Admissions",
    url: "https://example.com/admissions",
    storage_path: null,
    file_name: null,
    file_size: null,
    mime_type: null,
    position: 1,
    created_at: "2025-01-02",
    updated_at: "2025-01-02",
  },
];

describe("CollegeResources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders resources list", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResources,
    });

    render(<CollegeResources collegeId="c-1" isAdmin={false} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Financial Aid Portal")).toBeInTheDocument();
    });
    expect(screen.getByText("Admissions Page")).toBeInTheDocument();
  });

  it("renders resource titles as links", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResources,
    });

    render(<CollegeResources collegeId="c-1" isAdmin={false} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      const link = screen.getByText("Financial Aid Portal").closest("a");
      expect(link).toHaveAttribute("href", "https://example.com/aid");
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  it("renders category badges", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResources,
    });

    render(<CollegeResources collegeId="c-1" isAdmin={false} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Financial Aid")).toBeInTheDocument();
      expect(screen.getByText("Admissions")).toBeInTheDocument();
    });
  });

  it("renders description when present", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResources,
    });

    render(<CollegeResources collegeId="c-1" isAdmin={false} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Apply for financial aid")).toBeInTheDocument();
    });
  });

  it("shows empty state when no resources", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<CollegeResources collegeId="c-1" isAdmin={false} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText(/No resources yet/i)).toBeInTheDocument();
    });
  });

  it("shows 'Add Link' button when isAdmin is true", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<CollegeResources collegeId="c-1" isAdmin={true} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Add Link")).toBeInTheDocument();
    });
  });

  it("does NOT show 'Add Link' button for non-admins", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<CollegeResources collegeId="c-1" isAdmin={false} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText(/No resources yet/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Add Link")).not.toBeInTheDocument();
  });

  it("shows edit and delete buttons for admin", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResources,
    });

    render(<CollegeResources collegeId="c-1" isAdmin={true} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Financial Aid Portal")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle("Edit resource");
    const deleteButtons = screen.getAllByTitle("Delete resource");
    expect(editButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);
  });

  it("does NOT show edit/delete buttons for non-admin", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResources,
    });

    render(<CollegeResources collegeId="c-1" isAdmin={false} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Financial Aid Portal")).toBeInTheDocument();
    });

    expect(screen.queryByTitle("Edit resource")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Delete resource")).not.toBeInTheDocument();
  });

  it("opens add dialog when 'Add Link' is clicked", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<CollegeResources collegeId="c-1" isAdmin={true} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Add Link")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Add Link"));

    await waitFor(() => {
      expect(screen.getByText("Add Link", { selector: "h2, [role='heading']" })).toBeInTheDocument();
      expect(screen.getByLabelText("Title *")).toBeInTheDocument();
      expect(screen.getByLabelText("URL *")).toBeInTheDocument();
    });
  });

  it("shows delete confirmation when delete is clicked", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResources,
    });

    render(<CollegeResources collegeId="c-1" isAdmin={true} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Financial Aid Portal")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle("Delete resource");
    fireEvent.click(deleteButtons[0]);

    // Should now show confirm and cancel buttons
    expect(screen.getByTitle("Confirm delete")).toBeInTheDocument();
    expect(screen.getByTitle("Cancel delete")).toBeInTheDocument();
  });

  it("cancels delete when cancel is clicked", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResources,
    });

    render(<CollegeResources collegeId="c-1" isAdmin={true} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Financial Aid Portal")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle("Delete resource");
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByTitle("Cancel delete"));

    // Should go back to the normal delete icon
    expect(screen.queryByTitle("Confirm delete")).not.toBeInTheDocument();
    expect(screen.getAllByTitle("Delete resource")).toHaveLength(2);
  });

  it("includes admin help text in empty state", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<CollegeResources collegeId="c-1" isAdmin={true} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText(/Add Link.*to get started/i)).toBeInTheDocument();
    });
  });

  it("opens edit dialog with pre-filled data when edit is clicked", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResources,
    });

    render(<CollegeResources collegeId="c-1" isAdmin={true} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByText("Financial Aid Portal")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle("Edit resource");
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Financial Aid Portal")).toBeInTheDocument();
      expect(screen.getByDisplayValue("https://example.com/aid")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Apply for financial aid")).toBeInTheDocument();
    });
  });
});
