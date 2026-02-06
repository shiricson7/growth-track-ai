export interface LabResult {
  id: string;
  date: string;
  parameter: string;
  value: number;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'high' | 'low';
  patient_id?: string; // Added for DB compatibility
  isManual?: boolean; // OCR manual entry flag
}

export type AiReportKind = 'dashboard' | 'parent_report';

export interface AiReport {
  id: string;
  patientId: string;
  kind: AiReportKind;
  analysis?: string[] | null;
  predictedHeight?: number | null;
  markdownReport?: string | null;
  updatedAt?: string | null;
  sourceModel?: string | null;
}

export interface GrowthPoint {
  age: number; // in years
  height: number; // in cm
  percentile3?: number;
  percentile50?: number;
  percentile97?: number;
  predicted?: number; // AI Prediction
  weight?: number;
  boneAge?: number;
  date?: string;
  isPatient?: boolean;
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

export interface ClinicInfo {
  id: string;
  name: string;
  clinicCode?: string;
  role?: ClinicRole;
  doctorName?: string | null;
  address?: string | null;
  phone?: string | null;
}

// NOTE: 'member' is a legacy role stored in older data; treat as 'staff'.
export type ClinicRole = 'owner' | 'staff' | 'tablet' | 'member';

export interface ClinicMember {
  id: string;
  userId: string;
  role: ClinicRole;
  createdAt: string;
  email?: string | null;
}

export interface Patient {
  id: string;
  name: string;
  dob: string;
  gender: 'Male' | 'Female';
  chartNumber?: string; // Hospital Chart Number
  ssn?: string; // Resident Registration Number (RRN)
  visitDate?: string; // Last Visit / Exam Date
  lastVisitDate?: string; // Latest body measurement date
  clinicId?: string;
  tannerStage?: string;
  boneAge: number; // in years
  chronologicalAge: number; // in years
  predictedAdultHeight: number; // cm
  targetHeight: number; // cm (mid-parental)
  heightFather?: number; // cm
  heightMother?: number; // cm
  medications: Medication[];
}

export interface IntakeToken {
  id: string;
  token: string;
  patient_id: string;
  created_at: string;
  expires_at: string;
  status: 'active' | 'used' | 'expired';
  used_at?: string | null;
}

export interface IntakeForm {
  id: string;
  patient_id: string;
  created_at: string;
  submitted_at: string;
  status: 'submitted' | 'reviewed';
  token?: string | null;
}

export interface IntakeAnswer {
  id: string;
  form_id: string;
  created_at: string;
  version: string;
  answers_json: Record<string, any>;
  flags_json?: Record<string, boolean> | null;
  summary_json?: string[] | null;
}
