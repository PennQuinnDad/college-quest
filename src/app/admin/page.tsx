"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface College {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  region: string | null;
  website: string | null;
  type: string | null;
  size: string | null;
  tuition_in_state: number | null;
  tuition_out_of_state: number | null;
  acceptance_rate: number | null;
  enrollment: number | null;
  description: string | null;
  [key: string]: unknown;
}

interface School {
  id: string;
  name: string;
  college_id: string;
  college_name: string | null;
  college_city: string | null;
  college_state: string | null;
  category: string | null;
  cip_code: string | null;
  website: string | null;
  description: string | null;
  [key: string]: unknown;
}

interface AllowedEmail {
  id: string;
  email: string;
  created_at: string;
}

interface CollegeFormData {
  name: string;
  city: string;
  state: string;
  region: string;
  website: string;
  type: string;
  size: string;
  tuitionInState: string;
  tuitionOutOfState: string;
  acceptanceRate: string;
  enrollment: string;
  description: string;
}

interface SchoolFormData {
  name: string;
  collegeId: string;
  collegeName: string;
  category: string;
  cipCode: string;
  website: string;
  description: string;
}

const EMPTY_COLLEGE_FORM: CollegeFormData = {
  name: "",
  city: "",
  state: "",
  region: "",
  website: "",
  type: "",
  size: "",
  tuitionInState: "",
  tuitionOutOfState: "",
  acceptanceRate: "",
  enrollment: "",
  description: "",
};

const EMPTY_SCHOOL_FORM: SchoolFormData = {
  name: "",
  collegeId: "",
  collegeName: "",
  category: "",
  cipCode: "",
  website: "",
  description: "",
};

const REGIONS = [
  "Northeast",
  "Southeast",
  "Midwest",
  "Southwest",
  "West",
  "Mid-Atlantic",
  "New England",
  "Pacific",
  "Mountain",
  "South",
];

const COLLEGE_TYPES = ["Public", "Private", "Community College"];
const COLLEGE_SIZES = ["Small", "Medium", "Large"];

// ────────────────────────────────────────────────────────────
// Admin Page
// ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: user, isLoading: userLoading } = useQuery<UserProfile | null>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me");
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  const isAdmin = user?.role === "admin";

  // ── Loading ──
  if (userLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#fbfbf8" }}>
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <FaIcon icon="spinner" style="solid" className="text-xl fa-spin" />
            <span className="text-lg">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Access Denied ──
  if (!isAdmin) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#fbfbf8" }}>
        <div className="flex min-h-screen items-center justify-center px-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="items-center space-y-4 pb-2 pt-8">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 shadow-md"
              >
                <FaIcon icon="shield-xmark" style="solid" className="text-2xl text-destructive" />
              </div>
              <div className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Access Denied
                </CardTitle>
                <CardDescription>
                  {user
                    ? "Your account does not have admin privileges."
                    : "You must be logged in with an admin account."}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-8 pt-4 text-center">
              <Link
                href="/"
                className="text-sm text-primary hover:underline"
              >
                Back to Home
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Authenticated Dashboard ──
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fbfbf8" }}>
      {/* Header */}
      <header className="border-b bg-primary">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              <FaIcon icon="arrow-left" style="solid" className="text-sm" />
              Home
            </Link>
            <Separator orientation="vertical" className="h-6 bg-white/20" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <FaIcon icon="shield-halved" style="solid" className="text-lg text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-white/70">
                  Manage colleges, programs, and users
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Tabs defaultValue="colleges">
          <TabsList className="mb-6 grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="colleges" className="gap-1.5">
              <FaIcon icon="building" style="solid" className="text-sm" />
              Colleges
            </TabsTrigger>
            <TabsTrigger value="schools" className="gap-1.5">
              <FaIcon icon="graduation-cap" style="solid" className="text-sm" />
              Schools
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <FaIcon icon="users" style="solid" className="text-sm" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="colleges">
            <CollegesTab />
          </TabsContent>
          <TabsContent value="schools">
            <SchoolsTab />
          </TabsContent>
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Colleges Tab
// ────────────────────────────────────────────────────────────

function CollegesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState<College | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<College | null>(null);
  const [form, setForm] = useState<CollegeFormData>(EMPTY_COLLEGE_FORM);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const jsonHeaders = { "Content-Type": "application/json" };

  const { data, isLoading } = useQuery<{ colleges: College[]; total: number }>({
    queryKey: ["admin-colleges", debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        query: debouncedSearch,
      });
      const res = await fetch(`/api/admin/colleges?${params}`);
      if (!res.ok) throw new Error("Failed to fetch colleges");
      return res.json();
    },
  });

  const colleges = data?.colleges || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: string; data: CollegeFormData }) => {
      const body = {
        name: payload.data.name,
        city: payload.data.city || null,
        state: payload.data.state || null,
        region: payload.data.region || null,
        website: payload.data.website || null,
        type: payload.data.type || null,
        size: payload.data.size || null,
        tuitionInState: payload.data.tuitionInState ? Number(payload.data.tuitionInState) : null,
        tuitionOutOfState: payload.data.tuitionOutOfState ? Number(payload.data.tuitionOutOfState) : null,
        acceptanceRate: payload.data.acceptanceRate ? Number(payload.data.acceptanceRate) : null,
        enrollment: payload.data.enrollment ? Number(payload.data.enrollment) : null,
        description: payload.data.description || null,
      };

      const url = payload.id
        ? `/api/admin/colleges/${payload.id}`
        : "/api/admin/colleges";
      const res = await fetch(url, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save college");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-colleges"] });
      setDialogOpen(false);
      setEditingCollege(null);
      setForm(EMPTY_COLLEGE_FORM);
      toast({ title: editingCollege ? "College updated" : "College created" });
    },
    onError: () => {
      toast({ title: "Error saving college", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/colleges/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete college");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-colleges"] });
      setDeleteConfirm(null);
      toast({ title: "College deleted" });
    },
    onError: () => {
      toast({ title: "Error deleting college", variant: "destructive" });
    },
  });

  function openAdd() {
    setEditingCollege(null);
    setForm(EMPTY_COLLEGE_FORM);
    setDialogOpen(true);
  }

  function openEdit(college: College) {
    setEditingCollege(college);
    setForm({
      name: college.name || "",
      city: college.city || "",
      state: college.state || "",
      region: college.region || "",
      website: college.website || "",
      type: college.type || "",
      size: college.size || "",
      tuitionInState: college.tuition_in_state != null ? String(college.tuition_in_state) : "",
      tuitionOutOfState: college.tuition_out_of_state != null ? String(college.tuition_out_of_state) : "",
      acceptanceRate: college.acceptance_rate != null ? String(college.acceptance_rate) : "",
      enrollment: college.enrollment != null ? String(college.enrollment) : "",
      description: college.description || "",
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ id: editingCollege?.id, data: form });
  }

  function updateForm(key: keyof CollegeFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <FaIcon icon="magnifying-glass" style="solid" className="absolute left-3 top-1/2 text-sm -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search colleges..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="bg-primary" onClick={openAdd}>
          <FaIcon icon="plus" style="solid" className="mr-2 text-sm" />
          Add College
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <FaIcon icon="spinner" style="solid" className="text-xl fa-spin text-muted-foreground" />
          </div>
        ) : colleges.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No colleges found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/80">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Size</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Enrollment</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {colleges.map((c) => (
                  <tr key={c.id} className="border-b last:border-b-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.city && c.state ? `${c.city}, ${c.state}` : c.state || "--"}
                    </td>
                    <td className="px-4 py-3">
                      {c.type ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          {c.type}
                        </Badge>
                      ) : (
                        "--"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.size || "--"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.enrollment != null ? c.enrollment.toLocaleString() : "--"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Edit">
                          <FaIcon icon="pen" style="solid" className="text-sm" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(c)}
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <FaIcon icon="trash-can" style="solid" className="text-sm" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCollege ? "Edit College" : "Add College"}
            </DialogTitle>
            <DialogDescription>
              {editingCollege
                ? "Update the college information below."
                : "Fill in the details to add a new college."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="c-name">Name *</Label>
                <Input
                  id="c-name"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="College name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-website">Website</Label>
                <Input
                  id="c-website"
                  value={form.website}
                  onChange={(e) => updateForm("website", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="c-city">City</Label>
                <Input
                  id="c-city"
                  value={form.city}
                  onChange={(e) => updateForm("city", e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-state">State</Label>
                <Input
                  id="c-state"
                  value={form.state}
                  onChange={(e) => updateForm("state", e.target.value)}
                  placeholder="e.g. CA"
                />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={form.region || undefined} onValueChange={(v) => updateForm("region", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type || undefined} onValueChange={(v) => updateForm("type", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLEGE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Size</Label>
                <Select value={form.size || undefined} onValueChange={(v) => updateForm("size", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLEGE_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-enrollment">Enrollment</Label>
                <Input
                  id="c-enrollment"
                  type="number"
                  value={form.enrollment}
                  onChange={(e) => updateForm("enrollment", e.target.value)}
                  placeholder="e.g. 15000"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="c-tuition-in">Tuition (In-State)</Label>
                <Input
                  id="c-tuition-in"
                  type="number"
                  value={form.tuitionInState}
                  onChange={(e) => updateForm("tuitionInState", e.target.value)}
                  placeholder="e.g. 12000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-tuition-out">Tuition (Out-of-State)</Label>
                <Input
                  id="c-tuition-out"
                  type="number"
                  value={form.tuitionOutOfState}
                  onChange={(e) => updateForm("tuitionOutOfState", e.target.value)}
                  placeholder="e.g. 35000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-acceptance">Acceptance Rate</Label>
                <Input
                  id="c-acceptance"
                  type="number"
                  step="0.01"
                  value={form.acceptanceRate}
                  onChange={(e) => updateForm("acceptanceRate", e.target.value)}
                  placeholder="e.g. 0.45"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-desc">Description</Label>
              <textarea
                id="c-desc"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                placeholder="Brief description of the college"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <FaIcon icon="spinner" style="solid" className="mr-2 text-sm fa-spin" />
              )}
              {editingCollege ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete College</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteConfirm?.name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <FaIcon icon="spinner" style="solid" className="mr-2 text-sm fa-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Schools Tab
// ────────────────────────────────────────────────────────────

function SchoolsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<School | null>(null);
  const [form, setForm] = useState<SchoolFormData>(EMPTY_SCHOOL_FORM);
  const [collegeSearch, setCollegeSearch] = useState("");

  const jsonHeaders = { "Content-Type": "application/json" };

  const { data: schools = [], isLoading } = useQuery<School[]>({
    queryKey: ["admin-schools"],
    queryFn: async () => {
      const res = await fetch("/api/admin/schools");
      if (!res.ok) throw new Error("Failed to fetch schools");
      return res.json();
    },
  });

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ["schools-categories"],
    queryFn: async () => {
      const res = await fetch("/api/schools/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const { data: collegeAutocomplete = [] } = useQuery<College[]>({
    queryKey: ["admin-colleges-autocomplete", collegeSearch],
    queryFn: async () => {
      if (!collegeSearch.trim()) return [];
      const params = new URLSearchParams({ query: collegeSearch, limit: "10" });
      const res = await fetch(`/api/admin/colleges?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.colleges || [];
    },
    enabled: collegeSearch.trim().length > 0,
  });

  const filteredSchools = search.trim()
    ? schools.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          (s.college_name && s.college_name.toLowerCase().includes(search.toLowerCase())) ||
          (s.category && s.category.toLowerCase().includes(search.toLowerCase()))
      )
    : schools;

  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: string; data: SchoolFormData }) => {
      const body = {
        name: payload.data.name,
        collegeId: payload.data.collegeId || null,
        collegeName: payload.data.collegeName || null,
        category: payload.data.category || null,
        cipCode: payload.data.cipCode || null,
        website: payload.data.website || null,
        description: payload.data.description || null,
      };

      const url = payload.id
        ? `/api/admin/schools/${payload.id}`
        : "/api/admin/schools";
      const res = await fetch(url, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save school");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-schools"] });
      setDialogOpen(false);
      setEditingSchool(null);
      setForm(EMPTY_SCHOOL_FORM);
      toast({ title: editingSchool ? "School updated" : "School created" });
    },
    onError: () => {
      toast({ title: "Error saving school", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/schools/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete school");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-schools"] });
      setDeleteConfirm(null);
      toast({ title: "School deleted" });
    },
    onError: () => {
      toast({ title: "Error deleting school", variant: "destructive" });
    },
  });

  function openAdd() {
    setEditingSchool(null);
    setForm(EMPTY_SCHOOL_FORM);
    setCollegeSearch("");
    setDialogOpen(true);
  }

  function openEdit(school: School) {
    setEditingSchool(school);
    setForm({
      name: school.name || "",
      collegeId: school.college_id || "",
      collegeName: school.college_name || "",
      category: school.category || "",
      cipCode: school.cip_code || "",
      website: school.website || "",
      description: school.description || "",
    });
    setCollegeSearch(school.college_name || "");
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ id: editingSchool?.id, data: form });
  }

  function updateForm(key: keyof SchoolFormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectCollege(college: College) {
    updateForm("collegeId", college.id);
    updateForm("collegeName", college.name);
    setCollegeSearch(college.name);
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <FaIcon icon="magnifying-glass" style="solid" className="absolute left-3 top-1/2 text-sm -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search schools/programs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="bg-primary" onClick={openAdd}>
          <FaIcon icon="plus" style="solid" className="mr-2 text-sm" />
          Add School
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <FaIcon icon="spinner" style="solid" className="text-xl fa-spin text-muted-foreground" />
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No schools found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/80">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Program Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">College</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">CIP Code</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Website</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map((s) => (
                  <tr key={s.id} className="border-b last:border-b-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.college_name || "--"}
                    </td>
                    <td className="px-4 py-3">
                      {s.category ? (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          {s.category}
                        </Badge>
                      ) : (
                        "--"
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {s.cip_code || "--"}
                    </td>
                    <td className="px-4 py-3">
                      {s.website ? (
                        <a
                          href={s.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Visit <FaIcon icon="arrow-up-right-from-square" style="solid" className="text-[10px]" />
                        </a>
                      ) : (
                        "--"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="Edit">
                          <FaIcon icon="pen" style="solid" className="text-sm" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(s)}
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <FaIcon icon="trash-can" style="solid" className="text-sm" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {filteredSchools.length} school{filteredSchools.length !== 1 ? "s" : ""}
        {search.trim() ? " matching your search" : " total"}
      </p>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSchool ? "Edit School/Program" : "Add School/Program"}
            </DialogTitle>
            <DialogDescription>
              {editingSchool
                ? "Update the program information below."
                : "Fill in the details to add a new program."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="s-name">Program Name *</Label>
                <Input
                  id="s-name"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="e.g. Computer Science"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category || undefined}
                  onValueChange={(v) => updateForm("category", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>College (search)</Label>
              <div className="relative">
                <FaIcon icon="magnifying-glass" style="solid" className="absolute left-3 top-1/2 text-sm -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={collegeSearch}
                  onChange={(e) => {
                    setCollegeSearch(e.target.value);
                    if (!e.target.value.trim()) {
                      updateForm("collegeId", "");
                      updateForm("collegeName", "");
                    }
                  }}
                  placeholder="Type to search colleges..."
                  className="pl-10"
                />
              </div>
              {collegeSearch.trim() && collegeAutocomplete.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-md border bg-white shadow-sm">
                  {collegeAutocomplete.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm hover:bg-gray-50",
                        form.collegeId === c.id && "bg-amber-50 font-medium"
                      )}
                      onClick={() => selectCollege(c)}
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.city && c.state && (
                        <span className="ml-2 text-muted-foreground">
                          - {c.city}, {c.state}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {form.collegeId && (
                <p className="text-xs text-muted-foreground">
                  Selected: <strong>{form.collegeName}</strong>
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="s-cip">CIP Code</Label>
                <Input
                  id="s-cip"
                  value={form.cipCode}
                  onChange={(e) => updateForm("cipCode", e.target.value)}
                  placeholder="e.g. 11.0701"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-website">Website</Label>
                <Input
                  id="s-website"
                  value={form.website}
                  onChange={(e) => updateForm("website", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-desc">Description</Label>
              <textarea
                id="s-desc"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                placeholder="Brief description of the program"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <FaIcon icon="spinner" style="solid" className="mr-2 text-sm fa-spin" />
              )}
              {editingSchool ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete School</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteConfirm?.name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <FaIcon icon="spinner" style="solid" className="mr-2 text-sm fa-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Users Tab
// ────────────────────────────────────────────────────────────

function UsersTab() {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<AllowedEmail | null>(null);

  const { data: emails = [], isLoading } = useQuery<AllowedEmail[]>({
    queryKey: ["admin-allowed-emails"],
    queryFn: async () => {
      const res = await fetch("/api/admin/allowed-emails");
      if (!res.ok) throw new Error("Failed to fetch allowed emails");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/admin/allowed-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add email");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-allowed-emails"] });
      setNewEmail("");
      toast({ title: "Email added" });
    },
    onError: (err: Error) => {
      toast({ title: err.message || "Error adding email", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/allowed-emails?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove email");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-allowed-emails"] });
      setDeleteConfirm(null);
      toast({ title: "Email removed" });
    },
    onError: () => {
      toast({ title: "Error removing email", variant: "destructive" });
    },
  });

  function handleAddEmail() {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }
    addMutation.mutate(email);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaIcon icon="envelope" style="solid" className="text-lg text-primary" />
            Allowed Emails
          </CardTitle>
          <CardDescription>
            Manage which email addresses are authorized to use the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add email */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FaIcon icon="envelope" style="solid" className="absolute left-3 top-1/2 text-sm -translate-y-1/2 text-muted-foreground" />
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
                placeholder="Enter email address"
                className="pl-10"
              />
            </div>
            <Button
              className="bg-primary"
              onClick={handleAddEmail}
              disabled={addMutation.isPending || !newEmail.trim()}
            >
              {addMutation.isPending ? (
                <FaIcon icon="spinner" style="solid" className="mr-2 text-sm fa-spin" />
              ) : (
                <FaIcon icon="plus" style="solid" className="mr-2 text-sm" />
              )}
              Add
            </Button>
          </div>

          <Separator />

          {/* Emails list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <FaIcon icon="spinner" style="solid" className="text-xl fa-spin text-muted-foreground" />
            </div>
          ) : emails.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No allowed emails yet. Add one above.
            </div>
          ) : (
            <div className="space-y-2">
              {emails.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-gray-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                      <FaIcon icon="envelope" style="solid" className="text-xs text-amber-800" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{entry.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(entry.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirm(entry)}
                    className="text-destructive hover:text-destructive"
                    title="Remove email"
                  >
                    <FaIcon icon="trash-can" style="solid" className="text-sm" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {emails.length} email{emails.length !== 1 ? "s" : ""} authorized
          </p>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Email</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>{deleteConfirm?.email}</strong> from the allowed list?
              They will no longer be able to access the application.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <FaIcon icon="spinner" style="solid" className="mr-2 text-sm fa-spin" />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
