import { supabase } from '../lib/supabase';
import { Patient, Measurement, LabResult, ClinicInfo } from '../../types';

export const api = {
    async getMyClinic(): Promise<ClinicInfo | null> {
        const { data, error } = await supabase
            .from('clinic_memberships')
            .select('clinic_id, role, clinics(id, name, clinic_code)')
            .maybeSingle();

        if (error) throw error;
        if (!data || !data.clinics) return null;

        const clinic = Array.isArray(data.clinics) ? data.clinics[0] : data.clinics;
        if (!clinic) return null;

        return {
            id: data.clinic_id,
            name: clinic.name,
            clinicCode: clinic.clinic_code,
            role: data.role
        };
    },

    async createClinic(name: string): Promise<ClinicInfo> {
        const { data: clinic, error } = await supabase
            .rpc('create_clinic', { p_name: name })
            .single();

        if (error) throw error;
        const created = clinic as any;

        return {
            id: created.id,
            name: created.name,
            clinicCode: created.clinic_code,
            role: 'owner'
        };
    },

    async joinClinicByCode(code: string): Promise<void> {
        const { error } = await supabase.rpc('join_clinic_by_code', { p_code: code });
        if (error) throw error;
    },

    // --- Patients ---
    async getPatients(clinicId: string) {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        const patientIds = (data || []).map((p: any) => p.id).filter(Boolean);
        const latestVisitByPatient: Record<string, string> = {};
        if (patientIds.length > 0) {
            const { data: measurements, error: measurementsError } = await supabase
                .from('measurements')
                .select('patient_id, date, height, weight')
                .in('patient_id', patientIds)
                .order('date', { ascending: false });
            if (!measurementsError && measurements) {
                for (const m of measurements as any[]) {
                    const hasBodyMeasure = (m.height && m.height > 0) || (m.weight && m.weight > 0);
                    if (!hasBodyMeasure) continue;
                    if (!latestVisitByPatient[m.patient_id]) {
                        latestVisitByPatient[m.patient_id] = m.date;
                    }
                }
            } else if (measurementsError) {
                console.warn('Failed to load measurements for last visit date', measurementsError);
            }
        }

        // Map DB snake_case to Frontend camelCase
        return data.map((p: any) => {
            // Calculate Age (1 decimal)
            const birthDate = new Date(p.birth_date);
            const today = new Date();
            const age = Number(((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1));

            // Calculate MPH
            let mph = 0;
            if (p.height_father && p.height_mother) {
                if (p.gender === 'male') {
                    mph = (p.height_father + p.height_mother + 13) / 2;
                } else {
                    mph = (p.height_father + p.height_mother - 13) / 2;
                }
            }

            return {
                ...p,
                dob: p.birth_date,
                ssn: p.registration_number,
                clinicId: p.clinic_id,
                // heightFather/Mother
                heightFather: p.height_father,
                heightMother: p.height_mother,
                chartNumber: p.chart_number,
                tannerStage: p.tanner_stage,
                lastVisitDate: latestVisitByPatient[p.id] || null,

                // Calculated values
                boneAge: p.bone_age || 0,
                chronologicalAge: age,
                predictedAdultHeight: 0, // Placeholder for AI
                targetHeight: parseFloat(mph.toFixed(1)), // MPH
                medications: []
            };
        }) as Patient[];
    },

    async getPatient(id: string) {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        const p = data as any;

        // Calculate Age (1 decimal)
        const birthDate = new Date(p.birth_date);
        const today = new Date();
        const age = Number(((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1));

        // Calculate MPH
        let mph = 0;
        if (p.height_father && p.height_mother) {
            if (p.gender === 'male') {
                mph = (p.height_father + p.height_mother + 13) / 2;
            } else {
                mph = (p.height_father + p.height_mother - 13) / 2;
            }
        }

        return {
            ...p,
            dob: p.birth_date,
            ssn: p.registration_number,
            clinicId: p.clinic_id,
            heightFather: p.height_father,
            heightMother: p.height_mother,
            chartNumber: p.chart_number,
            tannerStage: p.tanner_stage,
            boneAge: p.bone_age || 0,
            chronologicalAge: age,
            predictedAdultHeight: 0,
            targetHeight: parseFloat(mph.toFixed(1)),
            medications: []
        } as Patient;
    },

    async createPatient(patient: Omit<Patient, 'id'>, clinicId: string) {
        // Map Frontend camelCase to DB snake_case
        const dbPatient = {
            name: patient.name,
            birth_date: patient.dob,
            gender: patient.gender.toLowerCase(), // 'Male' -> 'male'
            registration_number: patient.ssn,
            chart_number: patient.chartNumber,
            height_father: patient.heightFather || null,
            height_mother: patient.heightMother || null,
            tanner_stage: patient.tannerStage || null,
            clinic_id: clinicId
            // contact_number, guardian_name, etc.
        };

        const { data, error } = await supabase
            .from('patients')
            .insert([dbPatient])
            .select()
            .single();

        if (error) throw error;

        // Return mapped back
        const p = data as any;
        return {
            ...p,
            dob: p.birth_date,
            ssn: p.registration_number,
            clinicId: p.clinic_id
        } as Patient;
    },

    async updatePatient(id: string, updates: Partial<Patient>) {
        // Map updates
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.dob) dbUpdates.birth_date = updates.dob;
        if (updates.gender) dbUpdates.gender = updates.gender.toLowerCase();
        if (updates.ssn) dbUpdates.registration_number = updates.ssn;
        if (updates.chartNumber) dbUpdates.chart_number = updates.chartNumber;
        if (updates.heightFather) dbUpdates.height_father = updates.heightFather;
        if (updates.heightMother) dbUpdates.height_mother = updates.heightMother;
        if (updates.boneAge !== undefined) dbUpdates.bone_age = updates.boneAge; // Added mapping
        if (updates.tannerStage !== undefined) dbUpdates.tanner_stage = updates.tannerStage || null;

        const { data, error } = await supabase
            .from('patients')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        const p = data as any;
        return {
            ...p,
            dob: p.birth_date,
            ssn: p.registration_number,
            boneAge: p.bone_age,
            clinicId: p.clinic_id
        } as Patient;
    },

    // --- Measurements ---
    async getMeasurements(patientId: string) {
        const { data, error } = await supabase
            .from('measurements')
            .select('*')
            .eq('patient_id', patientId)
            .order('date', { ascending: true });

        if (error) throw error;

        return data.map((m: any) => ({
            id: m.id,
            patient_id: m.patient_id,
            date: m.date,
            height: m.height,
            weight: m.weight,
            boneAge: m.bone_age
        })) as Measurement[];
    },

    async addMeasurement(measurement: Omit<Measurement, 'id'>) {
        const dbMeasurement = {
            patient_id: measurement.patient_id,
            date: measurement.date,
            height: measurement.height,
            weight: measurement.weight,
            bone_age: measurement.boneAge
        };

        const { data, error } = await supabase
            .from('measurements')
            .insert([dbMeasurement])
            .select()
            .single();

        if (error) throw error;
        const m = data as any;
        return {
            id: m.id,
            patient_id: m.patient_id,
            date: m.date,
            height: m.height,
            weight: m.weight,
            boneAge: m.bone_age
        } as Measurement;
    },

    async updateMeasurement(id: string, updates: Partial<Measurement>) {
        const dbUpdates: any = {};
        if (updates.date) dbUpdates.date = updates.date;
        if (updates.height !== undefined) dbUpdates.height = updates.height;
        if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
        if (updates.boneAge !== undefined) dbUpdates.bone_age = updates.boneAge;

        const { data, error } = await supabase
            .from('measurements')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        const m = data as any;
        return {
            id: m.id,
            patient_id: m.patient_id,
            date: m.date,
            height: m.height,
            weight: m.weight,
            boneAge: m.bone_age
        } as Measurement;
    },

    // --- Lab Results ---
    async getLabResults(patientId: string) {
        const { data, error } = await supabase
            .from('lab_results')
            .select('*')
            .eq('patient_id', patientId)
            .order('date', { ascending: false });

        if (error) throw error;

        return data.map((r: any) => ({
            id: r.id,
            patient_id: r.patient_id,
            date: r.date,
            parameter: r.test_type,
            value: r.value,
            unit: r.unit,
            referenceRange: r.reference_range_low && r.reference_range_high
                ? `${r.reference_range_low}-${r.reference_range_high}`
                : '',
            status: 'normal' // Logic needed to compare value with range
        })) as LabResult[];
    },

    async addLabResults(results: LabResult[]) {
        const dbResults = results.map(r => ({
            patient_id: r.patient_id,
            date: r.date,
            test_type: r.parameter,
            value: r.value,
            unit: r.unit,
            // Simple parser for range "low-high"
            reference_range_low: r.referenceRange ? parseFloat(r.referenceRange.split('-')[0]) || null : null,
            reference_range_high: r.referenceRange ? parseFloat(r.referenceRange.split('-')[1]) || null : null
        }));

        const { data, error } = await supabase
            .from('lab_results')
            .insert(dbResults)
            .select();

        if (error) throw error;
        return data as unknown as LabResult[];
    },

    // --- Medications ---
    async getMedications(patientId: string) {
        const { data, error } = await supabase
            .from('medications')
            .select('*')
            .eq('patient_id', patientId)
            .order('start_date', { ascending: false });

        if (error) throw error;

        return data.map((m: any) => ({
            id: m.id, // Map ID
            name: m.name,
            type: m.type,
            dosage: m.dosage,
            frequency: m.frequency,
            startDate: m.start_date,
            endDate: m.end_date,
            status: m.status
        })) as any[];
    },

    async addMedication(patientId: string, med: any) {
        const dbMed = {
            patient_id: patientId,
            name: med.name,
            type: med.type,
            dosage: med.dosage,
            frequency: med.frequency,
            start_date: med.startDate,
            end_date: med.endDate || null,
            status: med.status
        };

        const { error } = await supabase
            .from('medications')
            .insert([dbMed]);

        if (error) throw error;
    },

    async updateMedication(id: string, med: any) {
        const dbMed = {
            name: med.name,
            type: med.type,
            dosage: med.dosage,
            frequency: med.frequency,
            start_date: med.startDate,
            end_date: med.endDate || null,
            status: med.status
        };

        const { error } = await supabase
            .from('medications')
            .update(dbMed)
            .eq('id', id);

        if (error) throw error;
    },

    async deleteMedication(id: string) {
        const { error } = await supabase
            .from('medications')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
