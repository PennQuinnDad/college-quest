import { describe, it, expect } from "vitest";
import {
  computeSimilarityScore,
  ScoringCollege,
} from "@/lib/similarity";

function makeCollege(overrides: Partial<ScoringCollege> = {}): ScoringCollege {
  return {
    region: "Northeast",
    state: "MA",
    type: "Private",
    size: "Medium",
    jesuit: false,
    enrollment: 10000,
    acceptance_rate: 0.3,
    tuition_in_state: 50000,
    graduation_rate: 0.85,
    sat_math: 700,
    sat_reading: 700,
    programs: ["Computer Science", "Engineering", "Biology"],
    ...overrides,
  };
}

describe("computeSimilarityScore", () => {
  it("gives maximum score for identical colleges", () => {
    const target = makeCollege();
    const candidate = makeCollege();
    // Region 20 + State 10 + Type 15 + Size 10 + Jesuit 5
    // + Enrollment 10 + Acceptance 10 + Tuition 10
    // + Graduation 5 + SAT 5 + Programs 6 (3 programs * 2, capped at 10)
    expect(computeSimilarityScore(target, candidate)).toBe(106);
  });

  describe("region match", () => {
    it("adds 20 for same region", () => {
      const target = makeCollege({ region: "Northeast" });
      const a = makeCollege({ region: "Northeast" });
      const b = makeCollege({ region: "Southeast" });
      expect(
        computeSimilarityScore(target, a) -
          computeSimilarityScore(target, b),
      ).toBe(20);
    });

    it("adds 0 when target region is null", () => {
      const target = makeCollege({ region: null });
      const candidate = makeCollege({ region: null });
      // Both null — should NOT match (null is not a meaningful region)
      const base = computeSimilarityScore(
        makeCollege({ region: "X" }),
        makeCollege({ region: "Y" }),
      );
      const score = computeSimilarityScore(target, candidate);
      // The null-null case should not get the +20 bonus
      expect(score).toBeLessThanOrEqual(
        computeSimilarityScore(makeCollege(), makeCollege()) - 20 + 5,
      );
    });
  });

  describe("state match", () => {
    it("adds 10 for same state", () => {
      const target = makeCollege();
      const same = makeCollege({ state: "MA" });
      const diff = makeCollege({ state: "CA" });
      expect(
        computeSimilarityScore(target, same) -
          computeSimilarityScore(target, diff),
      ).toBe(10);
    });
  });

  describe("type match", () => {
    it("adds 15 for same type", () => {
      const target = makeCollege();
      const same = makeCollege({ type: "Private" });
      const diff = makeCollege({ type: "Public" });
      expect(
        computeSimilarityScore(target, same) -
          computeSimilarityScore(target, diff),
      ).toBe(15);
    });
  });

  describe("size match", () => {
    it("adds 10 for same size", () => {
      const target = makeCollege();
      const same = makeCollege({ size: "Medium" });
      const diff = makeCollege({ size: "Large" });
      expect(
        computeSimilarityScore(target, same) -
          computeSimilarityScore(target, diff),
      ).toBe(10);
    });
  });

  describe("jesuit match", () => {
    it("adds 5 for same jesuit status", () => {
      const target = makeCollege({ jesuit: true });
      const same = makeCollege({ jesuit: true });
      const diff = makeCollege({ jesuit: false });
      expect(
        computeSimilarityScore(target, same) -
          computeSimilarityScore(target, diff),
      ).toBe(5);
    });
  });

  describe("enrollment", () => {
    it("adds 10 when within 25%", () => {
      const target = makeCollege({ enrollment: 10000 });
      const close = makeCollege({ enrollment: 12000 }); // 20% diff
      const far = makeCollege({ enrollment: 20000 }); // 100% diff
      expect(
        computeSimilarityScore(target, close) -
          computeSimilarityScore(target, far),
      ).toBe(10);
    });

    it("adds 5 when between 25% and 50%", () => {
      const target = makeCollege({ enrollment: 10000 });
      const mid = makeCollege({ enrollment: 14000 }); // 40% diff
      const far = makeCollege({ enrollment: 20000 }); // 100% diff
      expect(
        computeSimilarityScore(target, mid) -
          computeSimilarityScore(target, far),
      ).toBe(5);
    });

    it("adds 0 when either is null", () => {
      const target = makeCollege({ enrollment: null });
      const candidate = makeCollege({ enrollment: 10000 });
      const base = computeSimilarityScore(target, candidate);
      target.enrollment = 10000;
      const withEnrollment = computeSimilarityScore(target, candidate);
      expect(withEnrollment).toBeGreaterThan(base);
    });
  });

  describe("acceptance rate", () => {
    it("adds 10 when within 5 percentage points", () => {
      const target = makeCollege({ acceptance_rate: 0.3 });
      const close = makeCollege({ acceptance_rate: 0.33 }); // 3pp diff
      const far = makeCollege({ acceptance_rate: 0.8 }); // 50pp diff
      expect(
        computeSimilarityScore(target, close) -
          computeSimilarityScore(target, far),
      ).toBe(10);
    });

    it("adds 5 when between 5pp and 10pp", () => {
      const target = makeCollege({ acceptance_rate: 0.3 });
      const mid = makeCollege({ acceptance_rate: 0.38 }); // 8pp diff
      const far = makeCollege({ acceptance_rate: 0.8 }); // 50pp diff
      expect(
        computeSimilarityScore(target, mid) -
          computeSimilarityScore(target, far),
      ).toBe(5);
    });

    it("handles null acceptance rate", () => {
      const target = makeCollege({ acceptance_rate: null });
      const candidate = makeCollege({ acceptance_rate: 0.3 });
      // Should not crash, just skip
      expect(() => computeSimilarityScore(target, candidate)).not.toThrow();
    });
  });

  describe("tuition", () => {
    it("adds 10 when within 20%", () => {
      const target = makeCollege({ tuition_in_state: 50000 });
      const close = makeCollege({ tuition_in_state: 55000 }); // 10% diff
      const far = makeCollege({ tuition_in_state: 100000 }); // 100% diff
      expect(
        computeSimilarityScore(target, close) -
          computeSimilarityScore(target, far),
      ).toBe(10);
    });

    it("adds 5 when between 20% and 40%", () => {
      const target = makeCollege({ tuition_in_state: 50000 });
      const mid = makeCollege({ tuition_in_state: 65000 }); // 30% diff
      const far = makeCollege({ tuition_in_state: 100000 }); // 100% diff
      expect(
        computeSimilarityScore(target, mid) -
          computeSimilarityScore(target, far),
      ).toBe(5);
    });
  });

  describe("graduation rate", () => {
    it("adds 5 when within 5pp", () => {
      const target = makeCollege({ graduation_rate: 0.85 });
      const close = makeCollege({ graduation_rate: 0.87 }); // 2pp
      const far = makeCollege({ graduation_rate: 0.50 }); // 35pp
      expect(
        computeSimilarityScore(target, close) -
          computeSimilarityScore(target, far),
      ).toBe(5);
    });

    it("adds 3 when between 5pp and 10pp", () => {
      const target = makeCollege({ graduation_rate: 0.85 });
      const mid = makeCollege({ graduation_rate: 0.78 }); // 7pp
      const far = makeCollege({ graduation_rate: 0.50 }); // 35pp
      expect(
        computeSimilarityScore(target, mid) -
          computeSimilarityScore(target, far),
      ).toBe(3);
    });
  });

  describe("SAT composite", () => {
    it("adds 5 when composite diff ≤ 50", () => {
      const target = makeCollege({ sat_math: 700, sat_reading: 700 });
      const close = makeCollege({ sat_math: 680, sat_reading: 700 }); // 20 diff
      const far = makeCollege({ sat_math: 500, sat_reading: 500 }); // 400 diff
      expect(
        computeSimilarityScore(target, close) -
          computeSimilarityScore(target, far),
      ).toBe(5);
    });

    it("adds 3 when composite diff between 50 and 100", () => {
      const target = makeCollege({ sat_math: 700, sat_reading: 700 });
      const mid = makeCollege({ sat_math: 650, sat_reading: 680 }); // 70 diff
      const far = makeCollege({ sat_math: 500, sat_reading: 500 }); // 400 diff
      expect(
        computeSimilarityScore(target, mid) -
          computeSimilarityScore(target, far),
      ).toBe(3);
    });

    it("skips SAT scoring when either has null", () => {
      const target = makeCollege({ sat_math: null, sat_reading: 700 });
      const candidate = makeCollege({ sat_math: 700, sat_reading: 700 });
      expect(() => computeSimilarityScore(target, candidate)).not.toThrow();
    });
  });

  describe("program overlap", () => {
    it("adds 2 per shared program up to 10", () => {
      const target = makeCollege({
        programs: ["CS", "Math", "Bio", "Chem", "Physics", "Eng"],
      });
      const full = makeCollege({
        programs: ["CS", "Math", "Bio", "Chem", "Physics", "Eng"],
      }); // 6 shared → min(12, 10) = 10
      const partial = makeCollege({ programs: ["CS", "Math"] }); // 2 shared → 4
      const none = makeCollege({ programs: ["Art", "Music"] }); // 0 shared → 0

      const baseTarget = makeCollege({
        programs: ["CS", "Math", "Bio", "Chem", "Physics", "Eng"],
      });
      const scoreNone = computeSimilarityScore(baseTarget, none);
      const scorePartial = computeSimilarityScore(baseTarget, partial);
      const scoreFull = computeSimilarityScore(baseTarget, full);

      expect(scorePartial - scoreNone).toBe(4);
      expect(scoreFull - scoreNone).toBe(10);
    });

    it("caps at 10 even with many shared programs", () => {
      const programs = Array.from({ length: 20 }, (_, i) => `Prog${i}`);
      const target = makeCollege({ programs });
      const candidate = makeCollege({ programs });
      // 20 shared * 2 = 40, capped at 10
      const noPrograms = makeCollege({ programs: [] });
      const diff =
        computeSimilarityScore(target, candidate) -
        computeSimilarityScore(target, noPrograms);
      expect(diff).toBe(10);
    });

    it("handles null programs", () => {
      const target = makeCollege({ programs: null });
      const candidate = makeCollege({ programs: ["CS"] });
      expect(() => computeSimilarityScore(target, candidate)).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("handles completely empty colleges", () => {
      const empty: ScoringCollege = {};
      // jesuit: undefined === undefined → true, so +5
      expect(computeSimilarityScore(empty, empty)).toBe(5);
    });

    it("scores 0 for completely different colleges (except jesuit mismatch)", () => {
      const target = makeCollege({
        region: "Northeast",
        state: "MA",
        type: "Private",
        size: "Small",
        jesuit: true,
        enrollment: 1000,
        acceptance_rate: 0.1,
        tuition_in_state: 60000,
        graduation_rate: 0.95,
        sat_math: 750,
        sat_reading: 750,
        programs: ["CS"],
      });
      const candidate = makeCollege({
        region: "West",
        state: "CA",
        type: "Public",
        size: "Large",
        jesuit: false,
        enrollment: 50000,
        acceptance_rate: 0.9,
        tuition_in_state: 10000,
        graduation_rate: 0.4,
        sat_math: 400,
        sat_reading: 400,
        programs: ["Art"],
      });
      expect(computeSimilarityScore(target, candidate)).toBe(0);
    });
  });
});
