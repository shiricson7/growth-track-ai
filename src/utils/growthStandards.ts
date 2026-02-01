export interface StandardGrowthPoint {
    ageInMonths: number;
    ageInYears: number;
    percentile3: number;
    percentile50: number;
    percentile97: number;
    gender: 'Male' | 'Female';
}

export const loadStandardGrowthData = async (gender: 'Male' | 'Female'): Promise<StandardGrowthPoint[]> => {
    try {
        const response = await fetch('/height_chart_LMS.csv');
        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim() !== '');

        // Skip first 2 header lines
        const dataLines = lines.slice(2);

        const points: StandardGrowthPoint[] = [];

        dataLines.forEach(line => {
            const cols = line.split(',');
            if (cols.length < 18) return;

            const rowGender = cols[0].trim() === '1' ? 'Male' : 'Female';
            if (rowGender !== gender) return;

            const ageInMonths = parseFloat(cols[2]);
            // Col 7 = 3rd, Col 12 = 50th, Col 17 = 97th
            const p3 = parseFloat(cols[7]);
            const p50 = parseFloat(cols[12]);
            const p97 = parseFloat(cols[17]);

            if (!isNaN(ageInMonths) && !isNaN(p3) && !isNaN(p50) && !isNaN(p97)) {
                points.push({
                    ageInMonths,
                    ageInYears: Number((ageInMonths / 12).toFixed(2)),
                    percentile3: p3,
                    percentile50: p50,
                    percentile97: p97,
                    gender: rowGender
                });
            }
        });

        return points.sort((a, b) => a.ageInMonths - b.ageInMonths);
    } catch (error) {
        console.error("Failed to load standard growth data", error);
        return [];
    }
};
