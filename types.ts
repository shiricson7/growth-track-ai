export interface LabResult {
  id: string;
  date: string;
  parameter: string;
  value: number;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'high' | 'low';
  patient_id?: string; // Added for DB compatibility
}

export interface GrowthPoint {
  age: number; // in years
  height: number; // in cm
  percentile3?: number;
  percentile50?: number;
  percentile97?: number;
  predicted?: number; // AI Prediction
}

export interface Measurement {
  id: string;
  patient_id: string;
  date: string;
  height?: number; // Optional
  weight?: number; // Optional
  bone_age?: number; // DB uses snake_case usually but JS prefers camel. I'll stick to DB column names or map them.
  // In `api.ts`, supabase returns DB columns. 
  // Let's use snake_case for DB types or rely on supabase data mapping.
  // For simplicity, let's look at schema: bone_age.
  boneAge?: number; // Mapped manually if needed or just use consistent casing
  measured_by?: string;
}

export interface Medication {
  id?: string; // Added for DB identification
  name: string;
  type: 'GH' | 'GnRH'; // Growth Hormone or GnRH Agonist
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'paused';
}

export interface Patient {
  id: string;
  name: string;
  dob: string;
  gender: 'Male' | 'Female';
  chartNumber?: string; // Hospital Chart Number
  ssn?: string; // Resident Registration Number (RRN)
  visitDate?: string; // Last Visit / Exam Date
  boneAge: number; // in years
  chronologicalAge: number; // in years
  predictedAdultHeight: number; // cm
  targetHeight: number; // cm (mid-parental)
  medications: Medication[];
}