export interface GradeLevel {
  grade: string   // e.g. 'A*', 'A', ..., 'F'
  min: number     // minimum percentage, inclusive
  max: number     // maximum percentage, inclusive
}

export const DEFAULT_GRADING_LEVELS: GradeLevel[] = [
  { grade: 'A*', min: 90, max: 100 },
  { grade: 'A', min: 80, max: 90 },
  { grade: 'B', min: 70, max: 80 },
  { grade: 'C', min: 60, max: 70 },
  { grade: 'D', min: 50, max: 60 },
  { grade: 'E', min: 40, max: 50 },
  { grade: 'F', min: 0, max: 40 },
];

export function parseGradingLevels(value: unknown): GradeLevel[] {
  if (!value) {
    return DEFAULT_GRADING_LEVELS;
  }

  if (Array.isArray(value)) {
    const parsed = (value as unknown[]).map((item) => {
      const it = item as Record<string, unknown> | null | undefined;
      return {
        grade: String(it?.grade || ''),
        min: Number(it?.min ?? 0),
        max: Number(it?.max ?? 0),
      };
    });
    if (parsed.length > 0 && parsed.every(p => p.grade)) {
      return parsed;
    }
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const a = obj.A ?? obj.grading_scale_a;
    const b = obj.B ?? obj.grading_scale_b;
    const c = obj.C ?? obj.grading_scale_c;
    const d = obj.D ?? obj.grading_scale_d;

    if (a !== undefined || b !== undefined || c !== undefined || d !== undefined) {
      const valA = Number(a ?? 80);
      const valB = Number(b ?? 70);
      const valC = Number(c ?? 60);
      const valD = Number(d ?? 50);

      const minE = Math.max(0, valD - 10);

      return [
        { grade: 'A', min: valA, max: 100 },
        { grade: 'B', min: valB, max: valA },
        { grade: 'C', min: valC, max: valB },
        { grade: 'D', min: valD, max: valC },
        { grade: 'E', min: minE, max: valD },
        { grade: 'F', min: 0, max: minE },
      ];
    }
  }

  return DEFAULT_GRADING_LEVELS;
}

export function getGradeForPercentage(percentage: number | null | undefined, levels: GradeLevel[]): string {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return '-';
  }
  const clamped = Math.max(0, Math.min(100, percentage));
  
  // Try matching directly first (supports decimals without rounding)
  for (const lvl of levels) {
    if (clamped >= lvl.min && clamped <= lvl.max) {
      return lvl.grade;
    }
  }

  // Fallback to nearest integer check for integer-based scales that have gaps (e.g. 89.5 between 89 and 90)
  const rounded = Math.round(clamped);
  for (const lvl of levels) {
    if (rounded >= lvl.min && rounded <= lvl.max) {
      return lvl.grade;
    }
  }
  
  return '-';
}

export function getGradeColor(grade: string | null | undefined): string {
  if (!grade) return 'var(--color-text-muted)';
  const normalized = grade.trim().toUpperCase();
  if (normalized === 'A*' || normalized === 'A') {
    return 'var(--color-success)';
  }
  if (normalized === 'B') {
    return 'var(--color-secondary)';
  }
  if (normalized === 'C') {
    return 'var(--color-text)';
  }
  if (normalized === 'D' || normalized === 'E') {
    return 'var(--color-warning)';
  }
  if (normalized === 'F') {
    return 'var(--color-error)';
  }
  return 'var(--color-text-muted)';
}

export function validateGradingLevels(levels: GradeLevel[]): string | null {
  if (!levels || levels.length === 0) {
    return "Grading levels cannot be empty.";
  }

  for (const lvl of levels) {
    if (lvl.min === undefined || lvl.max === undefined || lvl.min === null || lvl.max === null || isNaN(lvl.min) || isNaN(lvl.max)) {
      return `Scores for Grade ${lvl.grade} must be valid numbers.`;
    }
    if (lvl.min < 0 || lvl.min > 100 || lvl.max < 0 || lvl.max > 100) {
      return `All scores must be between 0 and 100 (Grade ${lvl.grade}).`;
    }
    if (lvl.min > lvl.max) {
      return `Grade ${lvl.grade} has a minimum score (${lvl.min}%) greater than its maximum score (${lvl.max}%).`;
    }
  }

  const bestBand = levels[0];
  const worstBand = levels[levels.length - 1];

  if (bestBand.max !== 100) {
    return `The highest grade (${bestBand.grade}) must have a maximum score of 100%.`;
  }
  if (worstBand.min !== 0) {
    return `The lowest grade (${worstBand.grade}) must have a minimum score of 0%.`;
  }

  for (let i = 1; i < levels.length; i++) {
    const prev = levels[i - 1];
    const curr = levels[i];
    // For contiguous bands: either curr.max matches prev.min exactly (decimal/inclusive style),
    // or curr.max matches prev.min - 1 (integer style).
    if (curr.max !== prev.min && curr.max !== prev.min - 1) {
      return `Grade ${curr.grade}'s maximum (${curr.max}%) must be equal to Grade ${prev.grade}'s minimum (${prev.min}%) or exactly 1% less to avoid overlaps or gaps.`;
    }
  }

  return null;
}
