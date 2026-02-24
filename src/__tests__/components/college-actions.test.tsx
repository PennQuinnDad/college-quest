import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { CollegeActions } from "@/components/college-actions";
import { makeUser } from "../helpers/test-college";
import type { Folder } from "@/lib/types";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockToggleMutate = vi.fn();
const mockCreateMutateAsync = vi.fn();
let mockFolders: Folder[] = [];
let mockMemberships = new Map<string, Set<string>>();

vi.mock("@/hooks/use-folders", () => ({
  useFolders: () => ({ data: mockFolders }),
  useFolderMemberships: () => ({ data: mockMemberships }),
  useToggleFolderItem: () => ({ mutate: mockToggleMutate }),
  useCreateFolder: () => ({
    mutate: vi.fn(),
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useToggleFolderSharing: () => ({ mutate: vi.fn(), isPending: false }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("CollegeActions", () => {
  const onToggleFavorite = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFolders = [
      { id: "f-1", name: "Reach", color: null, position: 0, createdAt: "", updatedAt: "" },
      { id: "f-2", name: "Safety", color: null, position: 1, createdAt: "", updatedAt: "" },
    ];
    mockMemberships = new Map([
      ["c-1", new Set(["f-1"])],
    ]);
  });

  it("returns null when user is not authenticated", () => {
    const { container } = render(
      <CollegeActions
        collegeId="c-1"
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
        user={null}
        variant="table"
      />,
      { wrapper: Wrapper },
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders favorite button with correct title (not favorited)", () => {
    render(
      <CollegeActions
        collegeId="c-1"
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
        user={makeUser()}
        variant="table"
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByTitle("Add to favorites")).toBeInTheDocument();
  });

  it("renders favorite button with correct title (favorited)", () => {
    render(
      <CollegeActions
        collegeId="c-1"
        isFavorite={true}
        onToggleFavorite={onToggleFavorite}
        user={makeUser()}
        variant="table"
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByTitle("Remove from favorites")).toBeInTheDocument();
  });

  it("calls onToggleFavorite when heart is clicked (table variant)", () => {
    render(
      <CollegeActions
        collegeId="c-1"
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
        user={makeUser()}
        variant="table"
      />,
      { wrapper: Wrapper },
    );
    fireEvent.click(screen.getByTitle("Add to favorites"));
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
  });

  it("opens dropdown with folder options when ellipsis is clicked", () => {
    render(
      <CollegeActions
        collegeId="c-1"
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
        user={makeUser()}
        variant="table"
      />,
      { wrapper: Wrapper },
    );
    fireEvent.click(screen.getByTitle("Folder options"));
    expect(screen.getByText("Reach")).toBeInTheDocument();
    expect(screen.getByText("Safety")).toBeInTheDocument();
  });

  it("shows 'Add to favorites' in dropdown menu", () => {
    render(
      <CollegeActions
        collegeId="c-1"
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
        user={makeUser()}
        variant="table"
      />,
      { wrapper: Wrapper },
    );
    fireEvent.click(screen.getByTitle("Folder options"));
    expect(screen.getByText("Add to favorites")).toBeInTheDocument();
  });

  it("shows 'Remove from favorites' in dropdown when already favorited", () => {
    render(
      <CollegeActions
        collegeId="c-1"
        isFavorite={true}
        onToggleFavorite={onToggleFavorite}
        user={makeUser()}
        variant="table"
      />,
      { wrapper: Wrapper },
    );
    fireEvent.click(screen.getByTitle("Folder options"));
    expect(screen.getByText("Remove from favorites")).toBeInTheDocument();
  });

  it("calls toggle folder mutation when folder is clicked", () => {
    render(
      <CollegeActions
        collegeId="c-1"
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
        user={makeUser()}
        variant="table"
      />,
      { wrapper: Wrapper },
    );
    fireEvent.click(screen.getByTitle("Folder options"));
    // c-1 is in f-1, so clicking "Reach" should remove
    fireEvent.click(screen.getByText("Reach"));
    expect(mockToggleMutate).toHaveBeenCalledWith({
      folderId: "f-1",
      collegeId: "c-1",
      action: "remove",
    });
  });

  it("calls add when toggling a folder the college is NOT in", () => {
    render(
      <CollegeActions
        collegeId="c-1"
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
        user={makeUser()}
        variant="table"
      />,
      { wrapper: Wrapper },
    );
    fireEvent.click(screen.getByTitle("Folder options"));
    // c-1 is NOT in f-2 (Safety), so clicking should add
    fireEvent.click(screen.getByText("Safety"));
    expect(mockToggleMutate).toHaveBeenCalledWith({
      folderId: "f-2",
      collegeId: "c-1",
      action: "add",
    });
  });

  it("shows 'New Folder...' button in dropdown", () => {
    render(
      <CollegeActions
        collegeId="c-1"
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
        user={makeUser()}
        variant="table"
      />,
      { wrapper: Wrapper },
    );
    fireEvent.click(screen.getByTitle("Folder options"));
    expect(screen.getByText("New Folder...")).toBeInTheDocument();
  });

  it("shows create folder input when 'New Folder...' is clicked", () => {
    render(
      <CollegeActions
        collegeId="c-1"
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
        user={makeUser()}
        variant="table"
      />,
      { wrapper: Wrapper },
    );
    fireEvent.click(screen.getByTitle("Folder options"));
    fireEvent.click(screen.getByText("New Folder..."));
    expect(screen.getByPlaceholderText("Folder name...")).toBeInTheDocument();
  });

  // ── Grid variant ──

  it("renders grid variant with absolute-positioned buttons", () => {
    render(
      <CollegeActions
        collegeId="c-1"
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
        user={makeUser()}
        variant="grid"
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByTitle("Add to favorites")).toBeInTheDocument();
    expect(screen.getByTitle("Folder options")).toBeInTheDocument();
  });

  // ── Detail variant ──

  it("renders detail variant with only ellipsis button", () => {
    render(
      <CollegeActions
        collegeId="c-1"
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
        user={makeUser()}
        variant="detail"
      />,
      { wrapper: Wrapper },
    );
    // Detail variant only shows the ellipsis dropdown, not the heart button
    expect(screen.getByTitle("Folder options")).toBeInTheDocument();
    expect(screen.queryByTitle("Add to favorites")).not.toBeInTheDocument();
  });
});
