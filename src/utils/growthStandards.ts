// Simple CSV parser logic used instead of heavy library 
// I'll stick to raw string split to minimize dependency issues unless I see it in package.json.
// However, the CSV might have complex quoting? The `grep` output looked simple.
// "2,0,0,1.0000 ,..." 
// It looks like simple comma separated.

interface LMSData {
    gender: 'male' | 'female';
    ageMonths: number;
    L: number;
    M: number;
    S: number;
}

let standards: LMSData[] = [];
let isLoaded = false;

// Standard Normal CDF
function cdf(x: number): number {
    // Constants
    const p = 0.2316419;
    const b1 = 0.31938153;
    const b2 = -0.356563782;
    const b3 = 1.781477937;
    const b4 = -1.821255978;
    const b5 = 1.330274429;

    const t = 1 / (1 + p * Math.abs(x));
    const t_poly = 1 - ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t * Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);

    if (x < 0) return 1 - t_poly;
    return t_poly;
}

export const growthStandards = {
    async load() {
        if (isLoaded) return;
        try {
            const response = await fetch('/height_chart_LMS.csv');
            const text = await response.text();
            const rows = text.split('\n').slice(2); // Skip header (2 lines based on file view)

            standards = rows.map(row => {
                const cols = row.split(',').map(c => c.trim());
                if (cols.length < 6) return null;
                return {
                    gender: cols[0] === '1' ? 'male' : 'female',
                    ageMonths: parseInt(cols[2]),
                    L: parseFloat(cols[3]),
                    M: parseFloat(cols[4]),
                    S: parseFloat(cols[5])
                };
            }).filter((r): r is LMSData => r !== null);

            isLoaded = true;
        } catch (error) {
            console.error("Failed to load growth standards:", error);
        }
    },

    calculatePercentile(gender: 'Male' | 'Female' | 'male' | 'female', age: number, height: number): number | null {
        if (!isLoaded || !height) return null;

        // Normalize gender
        const g = gender.toLowerCase() as 'male' | 'female';

        // Age in months (Assuming input age is Years.Wait, component uses Years? Yes `age` in charts is years.)
        // But precision matters. If input is integer years, we convert. 
        // If input is float years (like 5.5), we convert.
        // The CSV has integer months.
        const targetMonths = Math.round(age * 12);

        // Find closest data point
        // We can use direct lookup if we organize by map, or just find. Array is sorted by age presumably.
        // For better precision, maybe interpolate? 
        // The user requested "compare with height_chart_LMS.csv".
        // Let's find the matching month row.
        const row = standards.find(s => s.gender === g && s.ageMonths === targetMonths);

        if (!row) return null;

        const { L, M, S } = row;

        // LMS Formula for Z-score
        // Z = ((height / M)^L - 1) / (L * S)

        let z = 0;
        if (Math.abs(L) < 0.01) {
            // Special case L ~ 0: Z = ln(height/M) / S
            z = Math.log(height / M) / S;
        } else {
            z = (Math.pow(height / M, L) - 1) / (L * S);
        }

        // Convert Z to Percentile
        return cdf(z) * 100;
    },

    // Helper to get formatted string
    getPercentileString(gender: 'Male' | 'Female', age: number, height: number): string {
        const p = this.calculatePercentile(gender, age, height);
        if (p === null) return '';
        return `${p.toFixed(1)}th`;
    }
};
