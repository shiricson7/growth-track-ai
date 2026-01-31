import { Patient, GrowthPoint, LabResult } from './types';

export const PATIENT: Patient = {
  id: 'PT-2024-892',
  name: '김민준 (Kim Min-jun)',
  dob: '2012-05-15',
  gender: 'Male',
  chronologicalAge: 12.5,
  boneAge: 13.8, // Advanced bone age
  predictedAdultHeight: 174.5,
  targetHeight: 176.0,
  medications: [
    {
      name: 'Somatropin (성장호르몬)',
      type: 'GH',
      dosage: '1.2 mg',
      frequency: '매일 (피하주사)',
      startDate: '2023-01-10',
      status: 'active'
    },
    {
      name: 'Leuprorelin (GnRH 작용제)',
      type: 'GnRH',
      dosage: '3.75 mg',
      frequency: '4주 간격',
      startDate: '2023-06-15',
      status: 'active'
    }
  ]
};

export const GROWTH_DATA: GrowthPoint[] = [
  { age: 10, height: 135, percentile3: 128, percentile50: 138, percentile97: 149 },
  { age: 10.5, height: 137, percentile3: 130, percentile50: 140, percentile97: 151 },
  { age: 11, height: 139, percentile3: 133, percentile50: 143, percentile97: 154 },
  { age: 11.5, height: 142, percentile3: 136, percentile50: 146, percentile97: 157 },
  { age: 12, height: 146, percentile3: 139, percentile50: 149, percentile97: 160 }, // Growth spurt start
  { age: 12.5, height: 151, percentile3: 142, percentile50: 152, percentile97: 163 }, // Current
  // Predictions
  { age: 13, height: 156, percentile3: 145, percentile50: 156, percentile97: 167, predicted: 156 },
  { age: 14, height: 164, percentile3: 152, percentile50: 163, percentile97: 175, predicted: 165 },
  { age: 15, height: 170, percentile3: 158, percentile50: 169, percentile97: 181, predicted: 171 },
];

export const LAB_RESULTS: LabResult[] = [
  { id: '1', date: '2024-05-20', parameter: 'IGF-1', value: 450, unit: 'ng/mL', referenceRange: '143-693', status: 'normal' },
  { id: '2', date: '2024-05-20', parameter: 'IGF-BP3', value: 5.2, unit: 'mg/L', referenceRange: '3.2-8.7', status: 'normal' },
  { id: '3', date: '2024-05-20', parameter: 'TSH', value: 2.1, unit: 'uIU/mL', referenceRange: '0.5-4.5', status: 'normal' },
  { id: '4', date: '2024-05-20', parameter: 'HbA1c', value: 5.4, unit: '%', referenceRange: '< 5.7', status: 'normal' },
  { id: '5', date: '2024-02-15', parameter: 'Testosterone', value: 250, unit: 'ng/dL', referenceRange: '< 100', status: 'high' }, // Pre-GnRH
];