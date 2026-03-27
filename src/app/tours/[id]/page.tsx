"use client";

import { useState, useMemo, useCallback, memo, Fragment } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import {
  useTour,
  useUpdateTour,
  useDeleteTour,
  useUpdateDay,
  useAddDay,
  useDeleteDay,
  useAddStop,
  useUpdateStops,
  useRemoveStop,
} from "@/hooks/use-tours";
import { FaIcon } from "@/components/ui/fa-icon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn, formatPercent } from "@/lib/utils";
import { LocationPicker } from "@/components/location-picker";
import type { College, TourDayWithStops, TourStopWithCollege } from "@/lib/types";
import dynamic from "next/dynamic";

const TourMap = dynamic(() => import("@/components/tour-map"), { ssr: false });

// ---------------------------------------------------------------------------
// Travel time helpers
// ---------------------------------------------------------------------------
function haversineDistance(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateDriveMinutes(miles: number): number {
  return Math.round((miles / 45) * 60);
}

function estimateDriveTime(miles: number): string {
  const totalMin = estimateDriveMinutes(miles);
  if (totalMin < 60) return `~${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `~${h} hr`;
  return `~${h} hr ${m} min`;
}

function formatTotalTime(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

// ---------------------------------------------------------------------------
// Selectivity helpers
// ---------------------------------------------------------------------------
function selectivityLabel(rate: number | null): string {
  if (rate == null) return "Unknown";
  if (rate < 30) return "Reach";
  if (rate < 50) return "Target";
  if (rate < 75) return "Match";
  return "Safety";
}

function selectivityColor(rate: number | null): string {
  if (rate == null) return "bg-gray-100 text-gray-600";
  if (rate < 30) return "bg-red-100 text-red-700";
  if (rate < 50) return "bg-amber-100 text-amber-700";
  if (rate < 75) return "bg-blue-100 text-blue-700";
  return "bg-green-100 text-green-700";
}

// ---------------------------------------------------------------------------
// Editable text field
// ---------------------------------------------------------------------------
function EditableField({
  value,
  onSave,
  placeholder,
  multiline = false,
  className,
  suffix,
}: {
  value: string | null;
  onSave: (val: string | null) => void;
  placeholder: string;
  multiline?: boolean;
  className?: string;
  suffix?: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  function startEdit() {
    setDraft(value ?? "");
    setEditing(true);
  }

  function save() {
    const trimmed = draft.trim();
    onSave(trimmed || null);
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  if (editing) {
    if (multiline) {
      return (
        <div className={className}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y min-h-[80px]"
            placeholder={placeholder}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
            }}
          />
          <div className="mt-1 flex gap-1">
            <Button size="sm" variant="outline" onClick={cancel} className="text-xs h-7">
              Cancel
            </Button>
            <Button size="sm" onClick={save} className="text-xs h-7">
              Save
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          className="h-8 text-sm"
        />
        <Button size="sm" variant="outline" onClick={cancel} className="h-8 px-2">
          <FaIcon icon="xmark" className="text-xs" />
        </Button>
        <Button size="sm" onClick={save} className="h-8 px-2">
          <FaIcon icon="check" className="text-xs" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      className={cn(
        "block w-full text-left hover:bg-muted/50 rounded px-1 -mx-1 transition-colors cursor-pointer",
        !value && "text-muted-foreground italic",
        className,
      )}
    >
      {value || placeholder}
      {suffix && (
        <span className="font-normal text-muted-foreground"> — {suffix}</span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Day card component
// ---------------------------------------------------------------------------
const DayCard = memo(function DayCard({
  day,
  dayNumber,
  tourId,
  dateString,
  onRemoveStop,
  onAddStop,
  onDeleteDay,
}: {
  day: TourDayWithStops;
  dayNumber: number;
  tourId: string;
  dateString: string | null;
  onRemoveStop: (stopId: string) => void;
  onAddStop: (dayId: string) => void;
  onDeleteDay: (dayId: string) => void;
}) {
  const updateDay = useUpdateDay();
  const updateStops = useUpdateStops();

  const formattedDate = dateString
    ? new Date(dateString + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null;

  // Calculate estimated total day time
  const { estimatedDayMinutes, estimatedEndTime } = useMemo(() => {
    let totalMinutes = 0;
    const firstStop = day.stops[0];
    const lastStop = day.stops[day.stops.length - 1];

    // Drive from starting location to first stop
    if (
      day.startLatitude != null && day.startLongitude != null &&
      firstStop?.college?.latitude != null && firstStop?.college?.longitude != null
    ) {
      totalMinutes += estimateDriveMinutes(
        haversineDistance(day.startLatitude, day.startLongitude, firstStop.college.latitude, firstStop.college.longitude)
      );
    }

    for (let i = 0; i < day.stops.length; i++) {
      const stop = day.stops[i];
      const visitHours = parseInt(stop.visitTime || "0", 10);
      if (visitHours > 0) totalMinutes += visitHours * 60;

      if (i > 0) {
        const prev = day.stops[i - 1];
        if (
          prev.college?.latitude != null && prev.college?.longitude != null &&
          stop.college?.latitude != null && stop.college?.longitude != null
        ) {
          totalMinutes += estimateDriveMinutes(
            haversineDistance(prev.college.latitude, prev.college.longitude, stop.college.latitude, stop.college.longitude)
          );
        }
      }
    }

    // Drive from last stop to ending location
    if (
      day.endLatitude != null && day.endLongitude != null &&
      lastStop?.college?.latitude != null && lastStop?.college?.longitude != null
    ) {
      totalMinutes += estimateDriveMinutes(
        haversineDistance(lastStop.college.latitude, lastStop.college.longitude, day.endLatitude, day.endLongitude)
      );
    }

    // Calculate estimated end time if departure time is set
    let endTime: string | null = null;
    if (day.departureTime != null && totalMinutes > 0) {
      const endMinutes = day.departureTime + totalMinutes;
      const endH = Math.floor(endMinutes / 60) % 24;
      const endM = endMinutes % 60;
      const ampm = endH >= 12 ? "PM" : "AM";
      const h12 = endH === 0 ? 12 : endH > 12 ? endH - 12 : endH;
      endTime = `${h12}:${String(endM).padStart(2, "0")} ${ampm}`;
    }

    return { estimatedDayMinutes: totalMinutes, estimatedEndTime: endTime };
  }, [day.stops, day.startLatitude, day.startLongitude, day.endLatitude, day.endLongitude, day.departureTime]);

  return (
    <Card className="print:shadow-none print:border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0">
                {dayNumber}
              </span>
              <EditableField
                value={day.title}
                onSave={(title) =>
                  updateDay.mutate({ tourId, dayId: day.id, title })
                }
                placeholder="Day title..."
                className="text-sm font-semibold"
              />
            </div>
            <EditableField
              value={day.notes}
              onSave={(notes) =>
                updateDay.mutate({ tourId, dayId: day.id, notes })
              }
              placeholder="Add day notes..."
              multiline
              className="ml-9 mt-1 text-xs text-muted-foreground"
            />
          </div>
          <div className="shrink-0 text-right">
            {formattedDate && (
              <p className="text-sm text-muted-foreground">{formattedDate}</p>
            )}
            {day.departureTime != null && (
              <div className="flex items-center justify-end gap-1.5 text-sm font-semibold text-foreground">
                <span>
                  {(() => {
                    const h = Math.floor(day.departureTime / 60);
                    const m = day.departureTime % 60;
                    const ampm = h >= 12 ? "PM" : "AM";
                    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
                  })()}
                </span>
                {estimatedEndTime && (
                  <>
                    <span className="text-muted-foreground font-normal">→</span>
                    <span>~{estimatedEndTime}</span>
                  </>
                )}
              </div>
            )}
            {estimatedDayMinutes > 0 && (
              <p className="text-sm text-muted-foreground">
                {formatTotalTime(estimatedDayMinutes)}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Starting Location */}
        <div className="rounded-t border border-border bg-blue-50/40 py-2 px-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0">
              <FaIcon icon="location-dot" style="solid" className="text-sm text-blue-500" />
              Starting Location
            </div>
            <LocationPicker
              value={day.startLocation}
              latitude={day.startLatitude}
              longitude={day.startLongitude}
              onChange={(loc, lat, lng) => {
                updateDay.mutate({
                  tourId,
                  dayId: day.id,
                  startLocation: loc,
                  startLatitude: lat,
                  startLongitude: lng,
                });
              }}
              placeholder="Search hotel, airport, address..."
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <FaIcon icon="clock" style="duotone" className="text-xs text-muted-foreground" />
              <select
                value={day.departureTime ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : null;
                  updateDay.mutate({ tourId, dayId: day.id, departureTime: val });
                }}
                className="rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Depart</option>
                <option value="360">6:00 AM</option>
                <option value="390">6:30 AM</option>
                <option value="420">7:00 AM</option>
                <option value="450">7:30 AM</option>
                <option value="480">8:00 AM</option>
                <option value="510">8:30 AM</option>
                <option value="540">9:00 AM</option>
                <option value="570">9:30 AM</option>
                <option value="600">10:00 AM</option>
                <option value="630">10:30 AM</option>
                <option value="660">11:00 AM</option>
                <option value="690">11:30 AM</option>
                <option value="720">12:00 PM</option>
              </select>
            </div>
          </div>
        </div>

        {day.stops.length > 0 ? (
          <div className="overflow-x-auto border-x border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 pr-2 pl-3 text-left font-medium">Visit</th>
                  <th className="py-2 px-2 text-left font-medium">School</th>
                  <th className="py-2 px-2 text-left font-medium hidden sm:table-cell">Type</th>
                  <th className="py-2 px-2 text-center font-medium hidden md:table-cell">Acc. Rate</th>
                  <th className="py-2 px-2 text-left font-medium hidden lg:table-cell">Programs</th>
                  <th className="py-2 pl-2 pr-3 text-right font-medium print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Travel from start to first stop */}
                {(() => {
                  const firstStop = day.stops[0];
                  if (
                    day.startLatitude != null && day.startLongitude != null &&
                    firstStop?.college?.latitude != null && firstStop?.college?.longitude != null
                  ) {
                    const miles = haversineDistance(
                      day.startLatitude, day.startLongitude,
                      firstStop.college.latitude, firstStop.college.longitude,
                    );
                    return (
                      <tr className="border-b border-dashed border-border/60 bg-muted/20">
                        <td colSpan={6} className="py-2 px-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FaIcon icon="car" style="duotone" className="text-sm" />
                            <span className="font-medium">Drive to First Stop</span>
                            <span className="text-foreground font-semibold">{estimateDriveTime(miles)}</span>
                            <span>({Math.round(miles)} mi)</span>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return null;
                })()}

                {day.stops.map((stop, i) => {
                  const prev = i > 0 ? day.stops[i - 1] : null;
                  let travelRow = null;
                  if (
                    prev?.college?.latitude != null &&
                    prev?.college?.longitude != null &&
                    stop.college?.latitude != null &&
                    stop.college?.longitude != null
                  ) {
                    const miles = haversineDistance(
                      prev.college.latitude, prev.college.longitude,
                      stop.college.latitude, stop.college.longitude,
                    );
                    travelRow = (
                      <tr key={`travel-${stop.id}`} className="border-b border-dashed border-border/60 bg-muted/20">
                        <td colSpan={6} className="py-2 px-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FaIcon icon="car" style="duotone" className="text-sm" />
                            <span className="font-medium">Estimated Travel Time</span>
                            <span className="text-foreground font-semibold">{estimateDriveTime(miles)}</span>
                            <span>({Math.round(miles)} mi)</span>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <Fragment key={stop.id}>
                      {travelRow}
                      <StopRow
                        stop={stop}
                        tourId={tourId}
                        onRemove={() => onRemoveStop(stop.id)}
                      />
                    </Fragment>
                  );
                })}

                {/* Travel from last stop to ending location */}
                {(() => {
                  const lastStop = day.stops[day.stops.length - 1];
                  if (
                    day.endLatitude != null && day.endLongitude != null &&
                    lastStop?.college?.latitude != null && lastStop?.college?.longitude != null
                  ) {
                    const miles = haversineDistance(
                      lastStop.college.latitude, lastStop.college.longitude,
                      day.endLatitude, day.endLongitude,
                    );
                    return (
                      <tr className="border-b border-dashed border-border/60 bg-muted/20">
                        <td colSpan={6} className="py-2 px-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FaIcon icon="car" style="duotone" className="text-sm" />
                            <span className="font-medium">Drive to End</span>
                            <span className="text-foreground font-semibold">{estimateDriveTime(miles)}</span>
                            <span>({Math.round(miles)} mi)</span>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return null;
                })()}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border-x border-border">
            <p className="text-sm text-muted-foreground text-center py-4">
              No stops yet.
            </p>
          </div>
        )}

        {/* Ending Location */}
        <div className="rounded-b border border-border bg-orange-50/40 py-2 px-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0">
              <FaIcon icon="flag-checkered" style="solid" className="text-sm text-orange-500" />
              Ending Location
            </div>
            <LocationPicker
              value={day.endLocation}
              latitude={day.endLatitude}
              longitude={day.endLongitude}
              onChange={(loc, lat, lng) => {
                updateDay.mutate({
                  tourId,
                  dayId: day.id,
                  endLocation: loc,
                  endLatitude: lat,
                  endLongitude: lng,
                });
              }}
              placeholder="Search hotel, airport, address..."
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between print:hidden">
          <button
            onClick={() => onAddStop(day.id)}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <FaIcon icon="plus" style="solid" className="text-[10px]" />
            Add Stop
          </button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDeleteDay(day.id)}
            className="h-7 text-xs text-red-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
          >
            <FaIcon icon="trash" style="solid" className="mr-1.5 text-[10px]" />
            Delete Day
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Stop row component
// ---------------------------------------------------------------------------
const StopRow = memo(function StopRow({
  stop,
  tourId,
  onRemove,
}: {
  stop: TourStopWithCollege;
  tourId: string;
  onRemove: () => void;
}) {
  const updateStops = useUpdateStops();
  const college = stop.college;

  const topPrograms = useMemo(() => {
    if (!college?.programs) return null;
    return college.programs.slice(0, 3).join(", ");
  }, [college?.programs]);

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30">
      <td className="py-2 pr-2 pl-3 align-top">
        <select
          value={stop.visitTime || ""}
          onChange={(e) =>
            updateStops.mutate({
              tourId,
              stops: [{ id: stop.id, position: stop.position, visitTime: e.target.value }],
            })
          }
          className="rounded border border-input bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring w-[4.5rem]"
        >
          <option value="">—</option>
          <option value="1">1 hr</option>
          <option value="2">2 hrs</option>
          <option value="3">3 hrs</option>
          <option value="4">4 hrs</option>
        </select>
      </td>
      <td className="py-2 px-2 align-top">
        {college ? (
          <div>
            <Link
              href={`/college/${college.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {college.name}
            </Link>
            <p className="text-xs text-muted-foreground">
              {college.city}, {college.state}
            </p>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Unknown college</span>
        )}
      </td>
      <td className="py-2 px-2 align-top hidden sm:table-cell">
        <span className="text-xs text-muted-foreground">{college?.type || "—"}</span>
      </td>
      <td className="py-2 px-2 text-center align-top hidden md:table-cell">
        {college?.acceptanceRate != null ? (
          <span
            className={cn(
              "inline-block rounded px-1.5 py-0.5 text-[10px] font-medium",
              selectivityColor(college.acceptanceRate),
            )}
          >
            {formatPercent(college.acceptanceRate)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-2 px-2 align-top hidden lg:table-cell">
        <span className="text-xs text-muted-foreground line-clamp-1">
          {topPrograms || "—"}
        </span>
      </td>
      <td className="py-2 pl-2 text-right align-top print:hidden">
        <button
          onClick={onRemove}
          className="rounded p-1 text-gray-400 hover:text-red-500 transition-colors"
          title="Remove stop"
        >
          <FaIcon icon="xmark" style="solid" className="text-xs" />
        </button>
      </td>
    </tr>
  );
});

// ---------------------------------------------------------------------------
// Quick reference section
// ---------------------------------------------------------------------------
function QuickReference({ days }: { days: TourDayWithStops[] }) {
  const groups = useMemo(() => {
    const allStops = days.flatMap((d) => d.stops);
    const seen = new Set<string>();
    const unique: TourStopWithCollege[] = [];
    for (const stop of allStops) {
      if (!seen.has(stop.collegeId)) {
        seen.add(stop.collegeId);
        unique.push(stop);
      }
    }

    const reaches = unique.filter(
      (s) => s.college?.acceptanceRate != null && s.college.acceptanceRate < 30,
    );
    const targets = unique.filter(
      (s) => s.college?.acceptanceRate != null && s.college.acceptanceRate >= 30 && s.college.acceptanceRate < 50,
    );
    const matches = unique.filter(
      (s) => s.college?.acceptanceRate != null && s.college.acceptanceRate >= 50 && s.college.acceptanceRate < 75,
    );
    const safeties = unique.filter(
      (s) => s.college?.acceptanceRate != null && s.college.acceptanceRate >= 75,
    );
    const unknown = unique.filter((s) => s.college?.acceptanceRate == null);

    return { reaches, targets, matches, safeties, unknown };
  }, [days]);

  const sections = [
    { label: "Reaches", color: "text-red-700", items: groups.reaches },
    { label: "Targets", color: "text-amber-700", items: groups.targets },
    { label: "Matches", color: "text-blue-700", items: groups.matches },
    { label: "Safeties", color: "text-green-700", items: groups.safeties },
    { label: "Unknown", color: "text-gray-500", items: groups.unknown },
  ].filter((s) => s.items.length > 0);

  if (sections.length === 0) return null;

  return (
    <Card className="print:shadow-none print:border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FaIcon icon="chart-simple" style="duotone" className="text-sm" />
          Quick Reference — Selectivity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sections.map((section) => (
            <div key={section.label}>
              <h4 className={cn("text-xs font-semibold mb-1.5", section.color)}>
                {section.label} ({section.items.length})
              </h4>
              <ul className="space-y-1">
                {section.items.map((stop) => (
                  <li key={stop.id} className="text-xs">
                    <Link
                      href={`/college/${stop.collegeId}`}
                      className="text-foreground hover:text-primary hover:underline"
                    >
                      {stop.college?.name || "Unknown"}
                    </Link>
                    {stop.college?.acceptanceRate != null && (
                      <span className="ml-1 text-muted-foreground">
                        ({formatPercent(stop.college.acceptanceRate)})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function TourDetailPage() {
  const params = useParams();
  const tourId = params.id as string;
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUser();
  const { data: tour, isLoading: tourLoading } = useTour(tourId, user);
  const updateTour = useUpdateTour();
  const deleteTour = useDeleteTour();
  const addDay = useAddDay();
  const deleteDay = useDeleteDay();
  const removeStop = useRemoveStop();
  const addStop = useAddStop();

  const [showDeleteTour, setShowDeleteTour] = useState(false);
  const [showAddStop, setShowAddStop] = useState<string | null>(null); // dayId
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteDayConfirm, setDeleteDayConfirm] = useState<TourDayWithStops | null>(null);

  // Fetch favorites for add-stop dialog
  const { data: favoritesData } = useQuery<{ favorites: string[] }>({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await fetch("/api/favorites");
      if (!res.ok) return { favorites: [] };
      return res.json();
    },
    enabled: !!user && !!showAddStop,
  });

  const favoriteIds = favoritesData?.favorites ?? [];

  const { data: favColleges } = useQuery<{ colleges: College[] }>({
    queryKey: ["tour-fav-colleges", favoriteIds],
    queryFn: async () => {
      if (favoriteIds.length === 0) return { colleges: [] };
      const qs = new URLSearchParams();
      qs.set("favoriteIds", favoriteIds.join(","));
      qs.set("limit", String(favoriteIds.length));
      const res = await fetch(`/api/colleges?${qs.toString()}`);
      if (!res.ok) return { colleges: [] };
      return res.json();
    },
    enabled: favoriteIds.length > 0 && !!showAddStop,
  });

  // Colleges already in this tour
  const existingCollegeIds = useMemo(() => {
    if (!tour?.days) return new Set<string>();
    return new Set(tour.days.flatMap((d) => d.stops.map((s) => s.collegeId)));
  }, [tour?.days]);

  // Available colleges (favorites not yet in tour)
  const availableColleges = useMemo(() => {
    return (favColleges?.colleges ?? [])
      .filter((c) => !existingCollegeIds.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [favColleges?.colleges, existingCollegeIds]);

  // Stats
  const stats = useMemo(() => {
    if (!tour?.days) return { days: 0, schools: 0, states: [] as string[] };
    const stateSet = new Set<string>();
    let schools = 0;
    for (const day of tour.days) {
      for (const stop of day.stops) {
        schools++;
        if (stop.college?.state) stateSet.add(stop.college.state);
      }
    }
    return {
      days: tour.days.length,
      schools,
      states: [...stateSet].sort(),
    };
  }, [tour?.days]);

  const handleDeleteTour = useCallback(async () => {
    try {
      await deleteTour.mutateAsync(tourId);
      router.push("/tours");
    } catch {
      // Error handled by mutation
    }
  }, [deleteTour, tourId, router]);

  const handleRemoveStop = useCallback(
    (stopId: string) => {
      removeStop.mutate({ tourId, stopId });
    },
    [removeStop, tourId],
  );

  const handleAddStopToDay = useCallback(
    (collegeId: string) => {
      if (!showAddStop) return;
      addStop.mutate({ tourId, dayId: showAddStop, collegeId });
      setShowAddStop(null);
    },
    [addStop, tourId, showAddStop],
  );

  if (userLoading || tourLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <FaIcon icon="spinner" style="duotone" className="text-2xl fa-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Please log in to view tours.</p>
            <Link href="/login">
              <Button className="mt-4">Log in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Tour not found.</p>
            <Link href="/tours">
              <Button className="mt-4" variant="outline">Back to Tours</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur print:static print:border-0">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/tours" className="text-muted-foreground hover:text-foreground print:hidden">
              <FaIcon icon="arrow-left" style="solid" className="text-sm" />
            </Link>
            <EditableField
              value={tour.name}
              onSave={(name) => {
                if (name) updateTour.mutate({ tourId, name });
              }}
              placeholder="Tour name..."
              className="text-lg font-semibold truncate"
            />
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {stats.days} {stats.days === 1 ? "Day" : "Days"} | {stats.schools}{" "}
              {stats.schools === 1 ? "School" : "Schools"}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              title="Print itinerary"
            >
              <FaIcon icon="print" style="duotone" className="text-xs" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDeleteStep(0);
                setShowDeleteTour(true);
              }}
              className="text-red-500 hover:text-red-600 hover:border-red-300"
              title="Delete tour"
            >
              <FaIcon icon="trash" style="solid" className="text-xs" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Trip Overview */}
        <Card className="print:shadow-none print:border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FaIcon icon="clipboard-list" style="duotone" className="text-sm" />
              Trip Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                <Input
                  type="date"
                  value={tour.startDate || ""}
                  onChange={(e) =>
                    updateTour.mutate({
                      tourId,
                      startDate: e.target.value || null,
                    })
                  }
                  className="mt-1 h-8 w-44 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">End Date</label>
                <Input
                  type="date"
                  value={tour.endDate || ""}
                  onChange={(e) =>
                    updateTour.mutate({
                      tourId,
                      endDate: e.target.value || null,
                    })
                  }
                  className="mt-1 h-8 w-44 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <EditableField
                value={tour.notes}
                onSave={(notes) => updateTour.mutate({ tourId, notes })}
                placeholder="Add overview notes..."
                multiline
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Travel Notes</label>
              <EditableField
                value={tour.travelNotes}
                onSave={(travelNotes) => updateTour.mutate({ tourId, travelNotes })}
                placeholder="Flights, rental car, logistics..."
                multiline
                className="mt-1 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tour Map */}
        {tour.days && tour.days.some((d) => d.stops.length > 0) && (
          <Card className="print:shadow-none print:border overflow-hidden">
            <CardContent className="p-0">
              <TourMap days={tour.days} />
            </CardContent>
          </Card>
        )}

        {/* Day-by-day Itinerary */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FaIcon icon="calendar-days" style="duotone" className="text-sm" />
              Day-by-Day Itinerary
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addDay.mutate({ tourId, title: "New Day" })}
              className="print:hidden"
            >
              <FaIcon icon="plus" style="solid" className="mr-1.5 text-[10px]" />
              Add Day
            </Button>
          </div>

          {tour.days && tour.days.length > 0 ? (
            tour.days.map((day, index) => {
              // Compute date from tour start date + day index
              let dateString: string | null = null;
              if (tour.startDate) {
                const d = new Date(tour.startDate + "T00:00:00");
                d.setDate(d.getDate() + index);
                dateString = d.toISOString().split("T")[0];
              }
              return (
                <DayCard
                  key={day.id}
                  day={day}
                  dayNumber={index + 1}
                  tourId={tourId}
                  dateString={dateString}
                  onRemoveStop={handleRemoveStop}
                  onAddStop={setShowAddStop}
                  onDeleteDay={(dayId) => {
                    const dd = tour.days.find((d) => d.id === dayId);
                    if (dd) setDeleteDayConfirm(dd);
                  }}
                />
              );
            })
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No days yet. Add a day to start planning!</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Reference */}
        {tour.days && <QuickReference days={tour.days} />}
      </main>

      {/* Delete Day Dialog */}
      <Dialog open={!!deleteDayConfirm} onOpenChange={() => setDeleteDayConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Day</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteDayConfirm?.title || `Day`}&rdquo;
              {deleteDayConfirm && deleteDayConfirm.stops.length > 0 && (
                <> and its {deleteDayConfirm.stops.length} {deleteDayConfirm.stops.length === 1 ? "stop" : "stops"}</>
              )}
              ? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDayConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteDayConfirm) {
                  deleteDay.mutate({ tourId, dayId: deleteDayConfirm.id });
                  setDeleteDayConfirm(null);
                }
              }}
              disabled={deleteDay.isPending}
            >
              {deleteDay.isPending ? "Deleting..." : "Delete Day"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tour Dialog */}
      <Dialog open={showDeleteTour} onOpenChange={setShowDeleteTour}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Tour</DialogTitle>
            <DialogDescription>
              {deleteStep === 0
                ? `Are you sure you want to delete "${tour.name}"?`
                : "This action cannot be undone. All days and stops will be permanently deleted."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteTour(false)}>
              Cancel
            </Button>
            {deleteStep === 0 ? (
              <Button variant="destructive" onClick={() => setDeleteStep(1)}>
                Yes, Delete
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleDeleteTour}
                disabled={deleteTour.isPending}
              >
                {deleteTour.isPending ? "Deleting..." : "Confirm Delete"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Stop Dialog */}
      <Dialog open={!!showAddStop} onOpenChange={() => setShowAddStop(null)}>
        <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a College Stop</DialogTitle>
            <DialogDescription>Select a college from your favorites to add to this day.</DialogDescription>
          </DialogHeader>
          {availableColleges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              All your favorites are already in this tour.
            </p>
          ) : (
            <div className="space-y-1">
              {availableColleges.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleAddStopToDay(c.id)}
                  className="w-full flex items-center justify-between rounded-md px-3 py-2 text-left hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.city}, {c.state}
                    </p>
                  </div>
                  {c.acceptanceRate != null && (
                    <span
                      className={cn(
                        "text-[10px] font-medium rounded px-1.5 py-0.5",
                        selectivityColor(c.acceptanceRate),
                      )}
                    >
                      {formatPercent(c.acceptanceRate)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
