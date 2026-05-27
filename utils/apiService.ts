import AsyncStorage from '@react-native-async-storage/async-storage';
import { RepairEntry, FuelEntry } from '@/types/maintenance';
import { supabase } from "../utils/supabaseClient"; // LOCK_TEMPO

type ServerMode = 'local' | 'supabase' | 'vps';

// 🚀 AKTIFKAN CLOUD SUPABASE SEKARANG!
const CURRENT_MODE: ServerMode = 'supabase'; 

export const apiService = {
  
  // =======================================================================
  // MODULE 1: REPAIR LOGS (DATA PERBAIKAN / SERVIS)
  // =======================================================================
  
  // 1. Ambil data perbaikan secara online dari tabel Supabase
  getRepairs: async (vehicleId: string): Promise<RepairEntry[]> => {
    if (CURRENT_MODE === 'supabase') {
      try {
        const { data, error } = await supabase
          .from('repairs')
          .select('*')
          .eq('vehicleId', vehicleId)
          .order('date', { ascending: false }); // Urutkan dari tanggal terbaru

        if (error) throw error;
        return (data as RepairEntry[]) || [];
      } catch (error) {
        console.error("❌ Error Supabase getRepairs:", error);
        return []; // Jalur aman jika koneksi internet terputus
      }
    }

    // Jalur Cadangan (Offline Local Storage)
    const localData = await AsyncStorage.getItem('garasi_repairs');
    const allRepairs: RepairEntry[] = localData ? JSON.parse(localData) : [];
    return allRepairs.filter(r => r.vehicleId === vehicleId);
  },

  // 2. Simpan data perbaikan ke cloud (Bisa insert baru maupun update data lama)
  saveRepair: async (entry: Omit<RepairEntry, 'id'> & { id?: string }): Promise<boolean> => {
    if (CURRENT_MODE === 'supabase') {
      try {
        const finalId = entry.id || `rep_${Date.now()}`;
        
        const { error } = await supabase
          .from('repairs')
          .upsert({
            id: finalId,
            vehicleId: entry.vehicleId,
            serviceType: entry.serviceType,
            date: entry.date,
            odometer: entry.odometer,
            cost: entry.cost,
            workshop: entry.workshop,
            notes: entry.notes,
            nextIntervalKm: entry.nextIntervalKm,
            tirePosition: entry.tirePosition,
            tireBrand: entry.tireBrand,
            tireSize: entry.tireSize,
            productionCode: entry.productionCode
          });

        if (error) throw error;
        return true;
      } catch (error) {
        console.error("❌ Error Supabase saveRepair:", error);
        return false;
      }
    }

    // Jalur Cadangan (Offline Local Storage)
    const localData = await AsyncStorage.getItem('garasi_repairs');
    const allRepairs: RepairEntry[] = localData ? JSON.parse(localData) : [];
    if (entry.id) {
      const updated = allRepairs.map(r => r.id === entry.id ? { ...r, ...entry } : r);
      await AsyncStorage.setItem('garasi_repairs', JSON.stringify(updated));
    } else {
      const newEntry = { ...entry, id: `rep${Date.now()}` };
      await AsyncStorage.setItem('garasi_repairs', JSON.stringify([newEntry, ...allRepairs]));
    }
    return true;
  },

  // =======================================================================
  // MODULE 2: FUEL LOGS (DATA PENGISIAN BENSIN)
  // =======================================================================
  
  // 1. Ambil data bensin secara online dari tabel Supabase
  getFuels: async (vehicleId: string): Promise<FuelEntry[]> => {
    if (CURRENT_MODE === 'supabase') {
      try {
        const { data, error } = await supabase
          .from('fuels')
          .select('*')
          .eq('vehicleId', vehicleId);

        if (error) throw error;
        return (data as FuelEntry[]) || [];
      } catch (error) {
        console.error("❌ Error Supabase getFuels:", error);
        return [];
      }
    }

    // Jalur Cadangan (Offline Local Storage)
    const localData = await AsyncStorage.getItem('garasi_fuel_entries');
    const allFuels: FuelEntry[] = localData ? JSON.parse(localData) : [];
    return allFuels.filter(f => f.vehicleId === vehicleId);
  },

  // 2. Simpan atau edit data bensin ke cloud Supabase
  saveFuel: async (entry: Omit<FuelEntry, 'id'> & { id?: string }): Promise<boolean> => {
    if (CURRENT_MODE === 'supabase') {
      try {
        const finalId = entry.id || `fe_${Date.now()}`;

        const { error } = await supabase
          .from('fuels')
          .upsert({
            id: finalId,
            vehicleId: entry.vehicleId,
            date: entry.date,
            liters: entry.liters,
            pricePerLiter: entry.pricePerLiter,
            totalCost: entry.totalCost,
            odometer: entry.odometer,
            fuelType: entry.fuelType,
            notes: entry.notes,
            receiptPhoto: entry.receiptPhoto
          });

        if (error) throw error;
        return true;
      } catch (error) {
        console.error("❌ Error Supabase saveFuel:", error);
        return false;
      }
    }

    // Jalur Cadangan (Offline Local Storage)
    const localData = await AsyncStorage.getItem('garasi_fuel_entries');
    const allFuels: FuelEntry[] = localData ? JSON.parse(localData) : [];
    if (entry.id) {
      const updated = allFuels.map(f => f.id === entry.id ? { ...f, ...entry } : f);
      await AsyncStorage.setItem('garasi_fuel_entries', JSON.stringify(updated));
    } else {
      const newEntry = { ...entry, id: `fe${Date.now()}` };
      await AsyncStorage.setItem('garasi_fuel_entries', JSON.stringify([...allFuels, newEntry]));
    }
    return true;
  }
};