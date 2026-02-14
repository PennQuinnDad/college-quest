import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FaIcon } from "@/components/ui/fa-icon";
import { CollegeActions } from "@/components/college-actions";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import type { College, UserProfile } from "@/lib/types";

interface CollegeCardProps {
  college: College;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  user: UserProfile | null | undefined;
}

export function CollegeCard({
  college,
  isFavorite,
  onToggleFavorite,
  user,
}: CollegeCardProps) {
  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative h-36 bg-gradient-to-br from-primary/10 to-amber-50 flex items-center justify-center">
        <FaIcon
          icon="graduation-cap"
          style="duotone"
          className="text-4xl text-primary/20"
        />
        {college.jesuit && (
          <Badge className="absolute top-2 left-2 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-[10px]">
            Jesuit
          </Badge>
        )}
        <CollegeActions
          collegeId={college.id}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          user={user}
          variant="grid"
        />
      </div>
      <CardContent className="p-4">
        <a
          href={`/college/${college.id}`}
          className="mb-1 block text-base font-semibold text-primary hover:underline line-clamp-1"
        >
          {college.name}
        </a>
        <p className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
          <FaIcon
            icon="location-dot"
            style="duotone"
            className="text-xs shrink-0"
          />
          {college.city}, {college.state}
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-gray-50 px-2 py-1.5">
            <span className="block text-muted-foreground">Tuition</span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatCurrency(college.tuitionInState)}
            </span>
          </div>
          <div className="rounded-md bg-gray-50 px-2 py-1.5">
            <span className="block text-muted-foreground">Acceptance</span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatPercent(college.acceptanceRate)}
            </span>
          </div>
          <div className="rounded-md bg-gray-50 px-2 py-1.5">
            <span className="block text-muted-foreground">Enrollment</span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatNumber(college.enrollment)}
            </span>
          </div>
          <div className="rounded-md bg-gray-50 px-2 py-1.5">
            <span className="block text-muted-foreground">Type</span>
            <span className="font-semibold text-foreground">
              {college.type || "N/A"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
