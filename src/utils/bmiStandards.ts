interface LMSData {
  gender: 'male' | 'female';
  ageMonths: number;
  L: number;
  M: number;
  S: number;
}

let standards: LMSData[] = [];
let isLoaded = false;

function cdf(x: number): number {
  const p = 0.2316419;
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1 / (1 + p * Math.abs(x));
  const tPoly =
    1 -
    ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t * Math.exp(-x * x / 2) /
      Math.sqrt(2 * Math.PI);

  if (x < 0) return 1 - tPoly;
  return tPoly;
}

export const bmiStandards = {
  async load() {
    if (isLoaded) return;
    try {
      const response = await fetch('/bmi_chart-LMS.csv');
      const text = await response.text();
      const rows = text.split('\n').slice(2);

      standards = rows
        .map((row) => {
          const cols = row.split(',').map((c) => c.trim());
          if (cols.length < 6) return null;
          const gender = cols[0] === '1' ? 'male' : cols[0] === '2' ? 'female' : null;
          if (!gender) return null;
          return {
            gender,
            ageMonths: parseInt(cols[2], 10),
            L: parseFloat(cols[3]),
            M: parseFloat(cols[4]),
            S: parseFloat(cols[5]),
          };
        })
        .filter((r): r is LMSData => r !== null);

      isLoaded = true;
    } catch (error) {
      console.error('Failed to load BMI standards:', error);
    }
  },

  calculatePercentile(gender: 'Male' | 'Female' | 'male' | 'female', ageYears: number, bmi: number): number | null {
    if (!isLoaded || !bmi) return null;
    const g = gender.toLowerCase() as 'male' | 'female';
    const targetMonths = Math.round(ageYears * 12);
    const row = standards.find((s) => s.gender === g && s.ageMonths === targetMonths);
    if (!row) return null;

    const { L, M, S } = row;
    let z = 0;
    if (Math.abs(L) < 0.01) {
      z = Math.log(bmi / M) / S;
    } else {
      z = (Math.pow(bmi / M, L) - 1) / (L * S);
    }

    return cdf(z) * 100;
  },
};
