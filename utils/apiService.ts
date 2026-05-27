import AsyncStorage from '@react-native-async-storage/async-storage';
import { RepairEntry, FuelEntry } from '@/types/maintenance';

// =========================================================================
// KHUSUS UNTUK KAMU: SAKLAR PENGATUR SERVER ONLINE
// =========================================================================
// Cukup ganti nilai ini untuk mengubah arah tembakan data seluruh aplikasi:
// 'local'    = Pakai AsyncStorage (Offline)
// 'supabase' = Pakai Supabase SDK (Online)
// 'vps'      = Pakai REST API Node.js / Axios (Online)
// =========================================================================
type ServerMode = 'local' | 'supabase' | 'vps';
const CURRENT_MODE: ServerMode = 'local'; 

// URL Backend VPS kamu nanti di masa depan
const VPS_API_URL = 'https://api.garasiku.com/v1';

export const apiService = {
  
  // -----------------------------------------------------------------------
  // MODULE 1: REPAIR/SERVICE LOGS
  // -----------------------------------------------------------------------
  
  // Fungsi Load Data Perbaikan
  getRepairs: async (vehicleId: string): Promise<RepairEntry[]> => {
    if (CURRENT_MODE === 'supabase') {
      // Nanti di sini tempat kodingan Supabase:
      // const { data } = await supabase.from('repairs').select('*').eq('vehicleId', vehicleId);
      // return data;
      return [];
    } 
    
    if (CURRENT_MODE === 'vps') {
      // Nanti di sini tempat kodingan VPS Node.js:
      // const response = await fetch(`${VPS_API_URL}/repairs?vehicleId=${vehicleId}`);
      // return response.json();
      return [];
    }

    // Default Fallback: Mode Lokal (AsyncStorage bawaan kamu sekarang)
    const localData = await AsyncStorage.getItem('garasi_repairs');
    const allRepairs: RepairEntry[] = localData ? JSON.parse(localData) : [];
    return allRepairs.filter(r => r.vehicleId === vehicleId);
  },

  // Fungsi Simpan Data Perbaikan Baru
  saveRepair: async (entry: Omit<RepairEntry, 'id'> & { id?: string }): Promise<boolean> => {
    if (CURRENT_MODE === 'supabase') {
      // Tinggal tulis query insert Supabase di sini nanti
      return true;
    }

    if (CURRENT_MODE === 'vps') {
      // Tinggal tulis fetch POST ke VPS Node.js di sini nanti
      return true;
    }

    // Mode Lokal Sekarang
    const localData = await AsyncStorage.getItem('garasi_repairs');
    const allRepairs: RepairEntry[] = localData ? JSON.parse(localData) : [];
    
    if (entry.id) {
      // Logic Update
      const updated = allRepairs.map(r => r.id === entry.id ? { ...r, ...entry } : r);
      await AsyncStorage.setItem('garasi_repairs', JSON.stringify(updated));
    } else {
      // Logic Insert New
      const newEntry = { ...entry, id: `rep${Date.now()}` };
      await AsyncStorage.setItem('garasi_repairs', JSON.stringify([newEntry, ...allRepairs]));
    }
    return true;
  },

getFuels: async (vehicleId: string): Promise<FuelEntry[]> => {
  if (CURRENT_MODE === 'local') {
    const localData = await AsyncStorage.getItem('garasi_fuel_entries'); 
    const allFuels: FuelEntry[] = localData ? JSON.parse(localData) : [];
    return allFuels.filter(f => f.vehicleId === vehicleId); 
  }
},

  saveFuel: async (entry: Omit<FuelEntry, 'id'> & { id?: string }): Promise<boolean> => {
    if (CURRENT_MODE === 'supabase') return true;
    if (CURRENT_MODE === 'vps') return true;

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