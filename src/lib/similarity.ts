/**
 * Compute a similarity score between a target college and a candidate college.
 *
 * Scoring dimensions (max 100):
 *  - Region match:        +20
 *  - Type match:          +15
 *  - State match:         +10
 *  - Size match:          +10
 *  - Enrollment closeness: +10 (≤25%) or +5 (≤50%)
 *  - Acceptance rate:     +10 (≤5pp) or +5 (≤10pp)
 *  - Tuition closeness:   +10 (≤20%) or +5 (≤40%)
 *  - Jesuit match:        +5
 *  - Graduation rate:     +5 (≤5pp) or +3 (≤10pp)
 *  - SAT composite:       +5 (≤50pts) or +3 (≤100pts)
 *  - Program overlap:     up to +10 (2 per shared program)
 */

export interface ScoringCollege {
  region?: string | null;
  state?: string | null;
  type?: string | null;
  size?: string | null;
  jesuit?: boolean | null;
  enrollment?: number | null;
  acceptance_rate?: number | null;
  tuition_in_state?: number | null;
  graduation_rate?: number | null;
  sat_math?: number | null;
  sat_reading?: number | null;
  programs?: string[] | null;
}

export function computeSimilarityScore(
  target: ScoringCollege,
  candidate: ScoringCollege,
): number {
  let score = 0;

  if (candidate.region === target.region && target.region != null) score += 20;
  if (candidate.state === target.state && target.state != null) score += 10;
  if (candidate.type === target.type && target.type != null) score += 15;
  if (candidate.size === target.size && target.size != null) score += 10;
  if (candidate.jesuit === target.jesuit) score += 5;

  if (target.enrollment && candidate.enrollment) {
    const ratio =
      Math.abs(candidate.enrollment - target.enrollment) / target.enrollment;
    if (ratio <= 0.25) score += 10;
    else if (ratio <= 0.5) score += 5;
  }

  if (target.acceptance_rate != null && candidate.acceptance_rate != null) {
    const diff = Math.abs(candidate.acceptance_rate - target.acceptance_rate);
    if (diff <= 0.05) score += 10;
    else if (diff <= 0.1) score += 5;
  }

  if (target.tuition_in_state && candidate.tuition_in_state) {
    const ratio =
      Math.abs(candidate.tuition_in_state - target.tuition_in_state) /
      target.tuition_in_state;
    if (ratio <= 0.2) score += 10;
    else if (ratio <= 0.4) score += 5;
  }

  if (target.graduation_rate != null && candidate.graduation_rate != null) {
    const diff = Math.abs(
      candidate.graduation_rate - target.graduation_rate,
    );
    if (diff <= 0.05) score += 5;
    else if (diff <= 0.1) score += 3;
  }

  if (
    target.sat_math &&
    target.sat_reading &&
    candidate.sat_math &&
    candidate.sat_reading
  ) {
    const targetSat = target.sat_math + target.sat_reading;
    const candidateSat = candidate.sat_math + candidate.sat_reading;
    const diff = Math.abs(candidateSat - targetSat);
    if (diff <= 50) score += 5;
    else if (diff <= 100) score += 3;
  }

  if (target.programs && candidate.programs) {
    const targetPrograms = new Set(target.programs);
    const overlap = candidate.programs.filter((p) =>
      targetPrograms.has(p),
    ).length;
    score += Math.min(overlap * 2, 10);
  }

  return score;
}
