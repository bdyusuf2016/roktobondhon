import { supabase, isSupabaseConfigured } from '../supabase/config';
import type { Hospital, HospitalCategory } from '../types';

function mapHospitalRow(row: any): Hospital {
  return {
    id: row.id,
    nameBn: row.name_bn,
    nameEn: row.name_en,
    category: row.category as HospitalCategory,
    district: row.district,
    upazila: row.upazila,
    address: row.address,
    hotline: row.hotline,
    emergencyPhone: row.emergency_phone || undefined,
    ambulancePhone: row.ambulance_phone || undefined,
    hasBloodBank: Boolean(row.has_blood_bank),
    hasICU: Boolean(row.has_icu),
    isOpen24Hours: Boolean(row.is_open_24_hours),
    mapUrl: row.map_url || undefined,
    notes: row.notes || undefined,
    isCommunityAdded: Boolean(row.is_community_added),
    verificationStatus: row.verification_status || 'verified',
    addedBy: row.added_by || undefined,
  };
}

/**
 * Fetch all hospitals from Supabase
 */
export async function getHospitalsFromSupabase(): Promise<Hospital[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .order('name_bn');

    if (error) {
      console.error('Error fetching hospitals from Supabase:', error);
      return [];
    }

    return (data || []).map(mapHospitalRow);
  } catch (err) {
    console.error('Exception fetching hospitals:', err);
    return [];
  }
}

/**
 * Add a new hospital directory entry
 */
export async function addHospitalToSupabase(hospital: Omit<Hospital, 'id'>): Promise<Hospital> {
  const id = `hosp-${Date.now()}`;
  const item: Hospital = { ...hospital, id };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('hospitals').insert({
        id: item.id,
        name_bn: item.nameBn,
        name_en: item.nameEn,
        category: item.category,
        district: item.district,
        upazila: item.upazila,
        address: item.address,
        hotline: item.hotline,
        emergency_phone: item.emergencyPhone || null,
        ambulance_phone: item.ambulancePhone || null,
        has_blood_bank: item.hasBloodBank,
        has_icu: item.hasICU,
        is_open_24_hours: item.isOpen24Hours,
        map_url: item.mapUrl || null,
        notes: item.notes || null,
        is_community_added: item.isCommunityAdded || false,
        verification_status: item.verificationStatus || 'verified',
        added_by: item.addedBy || null,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error inserting hospital in Supabase:', err);
    }
  }

  return item;
}

/**
 * Update an existing hospital
 */
export async function updateHospitalInSupabase(id: string, data: Partial<Hospital>): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const dbUpdates: Record<string, any> = {};
  if (data.nameBn !== undefined) dbUpdates.name_bn = data.nameBn;
  if (data.nameEn !== undefined) dbUpdates.name_en = data.nameEn;
  if (data.category !== undefined) dbUpdates.category = data.category;
  if (data.district !== undefined) dbUpdates.district = data.district;
  if (data.upazila !== undefined) dbUpdates.upazila = data.upazila;
  if (data.address !== undefined) dbUpdates.address = data.address;
  if (data.hotline !== undefined) dbUpdates.hotline = data.hotline;
  if (data.emergencyPhone !== undefined) dbUpdates.emergency_phone = data.emergencyPhone;
  if (data.ambulancePhone !== undefined) dbUpdates.ambulance_phone = data.ambulancePhone;
  if (data.hasBloodBank !== undefined) dbUpdates.has_blood_bank = data.hasBloodBank;
  if (data.hasICU !== undefined) dbUpdates.has_icu = data.hasICU;
  if (data.isOpen24Hours !== undefined) dbUpdates.is_open_24_hours = data.isOpen24Hours;
  if (data.mapUrl !== undefined) dbUpdates.map_url = data.mapUrl;
  if (data.notes !== undefined) dbUpdates.notes = data.notes;
  if (data.verificationStatus !== undefined) dbUpdates.verification_status = data.verificationStatus;

  const { error } = await supabase.from('hospitals').update(dbUpdates).eq('id', id);
  if (error) {
    console.error('Error updating hospital in Supabase:', error);
  }
}

/**
 * Delete a hospital
 */
export async function deleteHospitalFromSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from('hospitals').delete().eq('id', id);
  if (error) {
    console.error('Error deleting hospital from Supabase:', error);
  }
}

// Backward-compatible aliases
export const getHospitalsFromFirestore = getHospitalsFromSupabase;
export const addHospitalToFirestore = addHospitalToSupabase;
export const updateHospitalInFirestore = updateHospitalInSupabase;
export const deleteHospitalFromFirestore = deleteHospitalFromSupabase;
export const getHospitals = getHospitalsFromSupabase;
export const addHospital = addHospitalToSupabase;
export const updateHospital = updateHospitalInSupabase;
export const deleteHospital = deleteHospitalFromSupabase;
