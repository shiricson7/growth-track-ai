export interface GrowthStandardPoint {
    ageInMonths: number;
    ageInYears: number;
    percentile3: number;
    percentile50: number;
    percentile97: number;
}

// Data Source: 2017 Korean National Growth Charts
// Format: [Age(Months), P3, P50, P97]

const MALE_RAW = [
    [0, 46.3, 49.9, 53.4],
    [1, 51.1, 54.7, 58.4],
    [2, 54.7, 58.4, 62.2],
    [3, 57.6, 61.4, 65.3],
    [4, 60.0, 63.9, 67.8],
    [5, 61.9, 65.9, 69.9],
    [6, 63.6, 67.6, 71.6],
    [7, 65.1, 69.2, 73.2],
    [8, 66.5, 70.6, 74.7],
    [9, 67.7, 72.0, 76.2],
    [10, 69.0, 73.3, 77.6],
    [11, 70.2, 74.5, 78.9],
    [12, 71.3, 75.7, 80.2],
    [15, 74.4, 79.1, 83.9],
    [18, 77.2, 82.3, 87.3],
    [21, 79.7, 85.1, 90.5],
    [24, 81.4, 87.1, 92.9],
    [30, 85.5, 91.9, 98.3],
    [36, 89.7, 96.5, 104.4],
    [48, 95.6, 103.1, 111.2],
    [60, 101.6, 109.6, 118.0],
    [72, 107.4, 115.9, 125.0],
    [84, 113.1, 122.1, 131.7],
    [96, 118.5, 127.9, 137.9],
    [108, 123.6, 133.4, 143.9],
    [120, 128.4, 138.8, 150.2],
    [132, 133.2, 144.7, 157.1],
    [144, 138.2, 151.4, 164.7],
    [156, 144.2, 158.6, 171.9],
    [168, 150.6, 165.0, 176.9],
    [180, 156.5, 169.2, 179.9],
    [192, 160.3, 171.4, 181.7],
    [204, 162.2, 172.6, 183.1],
    [216, 163.3, 173.6, 184.3],
    [227, 164.4, 174.5, 185.3]
];

const FEMALE_RAW = [
    [0, 45.6, 49.1, 52.7],
    [1, 50.0, 53.7, 57.4],
    [2, 53.2, 57.1, 60.9],
    [3, 55.8, 59.8, 63.8],
    [4, 58.0, 62.1, 66.2],
    [5, 59.9, 64.0, 68.2],
    [6, 61.5, 65.7, 70.0],
    [7, 62.9, 67.3, 71.6],
    [8, 64.3, 68.7, 73.2],
    [9, 65.6, 70.1, 74.7],
    [10, 66.8, 71.5, 76.1],
    [11, 68.0, 72.8, 77.5],
    [12, 69.2, 74.0, 78.9],
    [15, 72.4, 77.5, 82.7],
    [18, 75.2, 80.7, 86.2],
    [21, 77.9, 83.7, 89.4],
    [24, 79.6, 85.7, 91.8],
    [30, 84.0, 90.7, 97.3],
    [36, 88.1, 95.4, 103.0],
    [48, 94.5, 101.9, 109.8],
    [60, 100.7, 108.4, 116.7],
    [72, 106.6, 114.7, 123.3],
    [84, 112.2, 120.8, 130.2],
    [96, 117.5, 126.7, 137.1],
    [108, 122.8, 132.6, 144.1],
    [120, 128.2, 139.1, 151.2],
    [132, 133.8, 145.8, 157.6],
    [144, 139.5, 151.7, 162.6],
    [156, 144.7, 155.9, 166.0],
    [168, 147.9, 158.3, 168.1],
    [180, 149.3, 159.5, 169.2],
    [192, 150.3, 160.0, 169.8],
    [204, 151.0, 160.2, 170.1]
];

// Helper to expand raw data if we want more points, but for now linear interpolation by chart is fine.
// Actually, to make curve smooth, we need more points. The raw CSV had monthly.
// I selected key milestones to reduce file size for this "Emergency Fix".
// If the user wants super smooth, we can interpolate or add more.
// Let's rely on Recharts `type="monotone"` to smooth it out.

const processData = (rawData: number[][]): GrowthStandardPoint[] => {
    return rawData.map(row => ({
        ageInMonths: row[0],
        ageInYears: Number((row[0] / 12).toFixed(2)),
        percentile3: row[1],
        percentile50: row[2],
        percentile97: row[3]
    }));
};

export const MALE_STANDARDS = processData(MALE_RAW);
export const FEMALE_STANDARDS = processData(FEMALE_RAW);

export const getGrowthStandards = (gender: 'Male' | 'Female') => {
    return gender === 'Male' ? MALE_STANDARDS : FEMALE_STANDARDS;
};
