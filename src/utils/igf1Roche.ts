export type IGF1Sex = 'male' | 'female';

export type IGF1ReferenceRange = {
  minAge: number; // inclusive, years
  maxAge: number; // exclusive, years
  male: [number, number];
  female: [number, number];
};

// Roche Elecsys IGF-1 reference intervals (ng/mL), pediatric-focused.
// Source: Elecsys IGF-1 package insert values as listed by St. Louis Children's test catalog (LAB526).
export const IGF1_ROCHE_ELECSYS_REFERENCE_RANGES: IGF1ReferenceRange[] = [
  { minAge: 0, maxAge: 2, male: [10, 200], female: [10, 200] },
  { minAge: 2, maxAge: 3, male: [10, 250], female: [10, 250] },
  { minAge: 3, maxAge: 4, male: [20, 250], female: [20, 250] },
  { minAge: 4, maxAge: 5, male: [30, 250], female: [30, 250] },
  { minAge: 5, maxAge: 6, male: [40, 250], female: [40, 250] },
  { minAge: 6, maxAge: 7, male: [50, 275], female: [45, 250] },
  { minAge: 7, maxAge: 8, male: [50, 300], female: [45, 300] },
  { minAge: 8, maxAge: 9, male: [60, 350], female: [50, 350] },
  { minAge: 9, maxAge: 10, male: [70, 400], female: [60, 400] },
  { minAge: 10, maxAge: 11, male: [70, 450], female: [70, 500] },
  { minAge: 11, maxAge: 12, male: [80, 500], female: [90, 600] },
  { minAge: 12, maxAge: 13, male: [85, 550], female: [100, 650] },
  { minAge: 13, maxAge: 14, male: [90, 600], female: [110, 700] },
  { minAge: 14, maxAge: 15, male: [95, 620], female: [115, 750] },
  { minAge: 15, maxAge: 16, male: [100, 650], female: [120, 700] },
  { minAge: 16, maxAge: 17, male: [100, 650], female: [120, 600] },
  { minAge: 17, maxAge: 18, male: [100, 600], female: [120, 500] },
  { minAge: 18, maxAge: 20, male: [90, 500], female: [100, 400] }
];

export const normalizeSex = (sex: string): IGF1Sex | null => {
  const value = (sex || '').toLowerCase();
  if (value === 'male' || value === 'm') return 'male';
  if (value === 'female' || value === 'f') return 'female';
  return null;
};

export const isIGF1Parameter = (parameter: string): boolean => {
  const value = (parameter || '').toLowerCase();
  return value.includes('igf-1') || value.includes('igf1') || value.includes('somatomedin');
};

export const isLikelyNgMlUnit = (unit: string): boolean => {
  const value = (unit || '').toLowerCase().replace(/\s/g, '');
  return value.includes('ng/ml') || value.includes('ngml');
};

export const getAgeYearsAtDate = (dob: string, date: string): number | null => {
  const birth = new Date(dob);
  const when = new Date(date);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(when.getTime())) return null;
  const diffMs = when.getTime() - birth.getTime();
  if (diffMs < 0) return null;
  return diffMs / (1000 * 60 * 60 * 24 * 365.25);
};

export const findIGF1ReferenceRange = (ageYears: number): IGF1ReferenceRange | null => {
  if (!Number.isFinite(ageYears)) return null;
  return IGF1_ROCHE_ELECSYS_REFERENCE_RANGES.find(
    (range) => ageYears >= range.minAge && ageYears < range.maxAge
  ) || null;
};

export const getIGF1RangeForSex = (
  ageYears: number | null,
  sex: string
): { low: number; high: number } | null => {
  if (ageYears === null) return null;
  const range = findIGF1ReferenceRange(ageYears);
  if (!range) return null;
  const normalized = normalizeSex(sex);
  if (!normalized) return null;
  const [low, high] = normalized === 'male' ? range.male : range.female;
  return { low, high };
};

// Approximate percentile: reference interval assumed to represent 2.5th-97.5th percentiles.
export const calculateIGF1Percentile = (
  value: number,
  ageYears: number | null,
  sex: string
): number | null => {
  if (ageYears === null) return null;
  if (!Number.isFinite(value)) return null;
  const range = getIGF1RangeForSex(ageYears, sex);
  if (!range) return null;
  const { low, high } = range;
  if (high <= low) return null;
  if (value <= low) return 2.5;
  if (value >= high) return 97.5;
  const ratio = (value - low) / (high - low);
  const percentile = 2.5 + ratio * 95;
  return Math.max(2.5, Math.min(97.5, percentile));
};
