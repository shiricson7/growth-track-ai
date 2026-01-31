import { supabase } from '../lib/supabase';
import { Patient, Measurement, LabResult } from '../../types';

export const api = {
    // --- Patients ---
    async getPatients() {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Patient[];
    },

    async getPatient(id: string) {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Patient;
    },

    async createPatient(patient: Omit<Patient, 'id'>) {
        const { data, error } = await supabase
            .from('patients')
            .insert([patient])
            .select()
            .single();

        if (error) throw error;
        return data as Patient;
    },

    async updatePatient(id: string, updates: Partial<Patient>) {
        const { data, error } = await supabase
            .from('patients')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Patient;
    },

    // --- Measurements ---
    async getMeasurements(patientId: string) {
        const { data, error } = await supabase
            .from('measurements')
            .select('*')
            .eq('patient_id', patientId)
            .order('date', { ascending: true });

        if (error) throw error;
        return data as Measurement[]; // Adjust type if needed
    },

    async addMeasurement(measurement: Omit<Measurement, 'id'>) {
        const { data, error } = await supabase
            .from('measurements')
            .insert([measurement])
            .select()
            .single();

        if (error) throw error;
        return data as Measurement;
    },

    // --- Lab Results ---
    async getLabResults(patientId: string) {
        const { data, error } = await supabase
            .from('lab_results')
            .select('*')
            .eq('patient_id', patientId)
            .order('date', { ascending: false });

        if (error) throw error;
        return data as LabResult[];
    },

    async addLabResults(results: Omit<LabResult, 'id'>[]) {
        const { data, error } = await supabase
            .from('lab_results')
            .insert(results)
            .select();

        if (error) throw error;
        return data as LabResult[];
    }
};
