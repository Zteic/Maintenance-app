import AsyncStorage from '@react-native-async-storage/async-storage';
import { RepairEntry, FuelEntry } from '@/types/maintenance';
import { supabase } from "./supabaseClient"; // 🛠️ FIX PATH: Pakai ./ karena satu folder utils

export const apiService = {

  // 🔑 1. Fungsi Dinamis menentukan Mode Aplikasi (Online/Offline)
  async getServiceMode(): Promise<'local' | 'supabase'> {
    const savedMode = await AsyncStorage.getItem('garasiku_app_mode');
    return savedMode === 'online' ? 'supabase' : 'local'; // Default: offline jika belum login
  },

  // =======================================================================
  // MODULE 1: REPAIR LOGS (DATA PERBAIKAN / SERVIS)
  // =======================================================================
  
  getRepairs: async (vehicleId: string): Promise<RepairEntry[]> => {
    const currentMode = await apiService.getServiceMode();

    if (currentMode === 'supabase') {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
          .from('repairs')
          .select('*')
          .eq('vehicleId', vehicleId)
          .eq('user_id', user.id) // 🔒 Keamanan: Hanya ambil data milik user ini
          .order('date', { ascending: false });

        if (error) throw error;
        return (data as RepairEntry[]) || [];
      } catch (error) {
        console.error("❌ Error Supabase getRepairs:", error);
      }
    }

    // Jalur Cadangan & Offline Local Storage (Selalu siap sedia)
    const localData = await AsyncStorage.getItem('garasi_repairs');
    const allRepairs: RepairEntry[] = localData ? JSON.parse(localData) : [];
    return allRepairs.filter(r => r.vehicleId === vehicleId);
  },

  saveRepair: async (entry: Omit<RepairEntry, 'id'> & { id?: string }): Promise<boolean> => {
    const currentMode = await apiService.getServiceMode();
    const finalId = entry.id || `rep_${Date.now()}`;
    const { data: { user } } = await supabase.auth.getUser();

    // Skenario Data Baru / Modifikasi Lokal
    const newLocalEntry = { 
      ...entry, 
      id: finalId, 
      user_id: user?.id || 'offline_user',
      is_synced: currentMode === 'supabase' // otomatis true jika online, false jika offline
    };

    // LANGKAH 1: Selalu amankan ke Local Storage HP terlebih dahulu
    const localData = await AsyncStorage.getItem('garasi_repairs');
    let allRepairs: any[] = localData ? JSON.parse(localData) : [];
    
    if (entry.id) {
      allRepairs = allRepairs.map(r => r.id === entry.id ? { ...r, ...newLocalEntry } : r);
    } else {
      allRepairs = [newLocalEntry, ...allRepairs];
    }
    await AsyncStorage.setItem('garasi_repairs', JSON.stringify(allRepairs));

    // LANGKAH 2: Jika mode Online aktif & user login, langsung kirim/upsert ke Cloud
    if (currentMode === 'supabase' && user) {
      try {
        const { error } = await supabase
          .from('repairs')
          .upsert({
            id: finalId,
            user_id: user.id, // 🔒 Menyimpan ID pemilik akun cloud
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
        console.error("❌ Gagal sinkron instan ke Supabase, data tetap aman di HP:", error);
        // Jika gagal karena putus sinyal mendadak, ubah status antrean ke false
        const failSync = allRepairs.map(r => r.id === finalId ? { ...r, is_synced: false } : r);
        await AsyncStorage.setItem('garasi_repairs', JSON.stringify(failSync));
        return false;
      }
    }

    return true;
  },

  // =======================================================================
  // MODULE 2: FUEL LOGS (DATA PENGISIAN BENSIN)
  // =======================================================================
  
  getFuels: async (vehicleId: string): Promise<FuelEntry[]> => {
    const currentMode = await apiService.getServiceMode();

    if (currentMode === 'supabase') {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
          .from('fuels')
          .select('*')
          .eq('vehicleId', vehicleId)
          .eq('user_id', user.id); // 🔒 Keamanan: Filter data bensin milik user

        if (error) throw error;
        return (data as FuelEntry[]) || [];
      } catch (error) {
        console.error("❌ Error Supabase getFuels:", error);
      }
    }

    const localData = await AsyncStorage.getItem('garasi_fuel_entries');
    const allFuels: FuelEntry[] = localData ? JSON.parse(localData) : [];
    return allFuels.filter(f => f.vehicleId === vehicleId);
  },

  saveFuel: async (entry: Omit<FuelEntry, 'id'> & { id?: string }): Promise<boolean> => {
    const currentMode = await apiService.getServiceMode();
    const finalId = entry.id || `fe_${Date.now()}`;
    const { data: { user } } = await supabase.auth.getUser();

    const newLocalEntry = {
      ...entry,
      id: finalId,
      user_id: user?.id || 'offline_user',
      is_synced: currentMode === 'supabase'
    };

    // LANGKAH 1: Amankan ke lokal
    const localData = await AsyncStorage.getItem('garasi_fuel_entries');
    let allFuels: any[] = localData ? JSON.parse(localData) : [];
    
    if (entry.id) {
      allFuels = allFuels.map(f => f.id === entry.id ? { ...f, ...newLocalEntry } : f);
    } else {
      allFuels = [...allFuels, newLocalEntry];
    }
    await AsyncStorage.setItem('garasi_fuel_entries', JSON.stringify(allFuels));

    // LANGKAH 2: Tembak ke Supabase Cloud
    if (currentMode === 'supabase' && user) {
      try {
        const { error } = await supabase
          .from('fuels')
          .upsert({
            id: finalId,
            user_id: user.id, // 🔒 Menyimpan ID pemilik akun cloud
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
        console.error("❌ Gagal sinkron instan ke Supabase, data tetap aman di HP:", error);
        const failSync = allFuels.map(f => f.id === finalId ? { ...f, is_synced: false } : f);
        await AsyncStorage.setItem('garasi_fuel_entries', JSON.stringify(failSync));
        return false;
      }
    }

    return true;
  },

  // =======================================================================
  // 🔄 MODULE 3: ENGINE SINKRONISASI OTOMATIS (PENGURAS ANTREAN OFFLINE)
  // =======================================================================
  syncOfflineDataToServer: async (): Promise<{ success: boolean; count: number }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, count: 0 };

      let syncCount = 0;

      // 🔄 1. Kuras Antrean Servis (Repairs)
      const localRepairs = await AsyncStorage.getItem('garasi_repairs');
      if (localRepairs) {
        const repairsArray = JSON.parse(localRepairs);
        const unSynced = repairsArray.filter((r: any) => !r.is_synced);
        
        if (unSynced.length > 0) {
          const cleanRepairs = unSynced.map((r: any) => ({
            id: r.id, vehicleId: r.vehicleId, serviceType: r.serviceType, date: r.date,
            odometer: r.odometer, cost: r.cost, workshop: r.workshop, notes: r.notes,
            nextIntervalKm: r.nextIntervalKm, tirePosition: r.tirePosition, tireBrand: r.tireBrand,
            tireSize: r.tireSize, productionCode: r.productionCode, user_id: user.id
          }));

          const { error } = await supabase.from('repairs').upsert(cleanRepairs);
          if (!error) {
            const updated = repairsArray.map((r: any) => ({ ...r, is_synced: true, user_id: user.id }));
            await AsyncStorage.setItem('garasi_repairs', JSON.stringify(updated));
            syncCount += cleanRepairs.length;
          }
        }
      }

      // 🔄 2. Kuras Antrean Bensin (Fuels)
      const localFuels = await AsyncStorage.getItem('garasi_fuel_entries');
      if (localFuels) {
        const fuelsArray = JSON.parse(localFuels);
        const unSynced = fuelsArray.filter((f: any) => !f.is_synced);

        if (unSynced.length > 0) {
          const cleanFuels = unSynced.map((f: any) => ({
            id: f.id, vehicleId: f.vehicleId, date: f.date, liters: f.liters,
            pricePerLiter: f.pricePerLiter, totalCost: f.totalCost, odometer: f.odometer,
            fuelType: f.fuelType, notes: f.notes, receiptPhoto: f.receiptPhoto, user_id: user.id
          }));

          const { error } = await supabase.from('fuels').upsert(cleanFuels);
          if (!error) {
            const updated = fuelsArray.map((f: any) => ({ ...f, is_synced: true, user_id: user.id }));
            await AsyncStorage.setItem('garasi_fuel_entries', JSON.stringify(updated));
            syncCount += cleanFuels.length;
          }
        }
      }

      // ... Ini batas akhir fungsionalitas syncOfflineDataToServer bawaan kamu ...
      return { success: true, count: syncCount };
    } catch (e) {
      console.error("❌ Error Sinkronisasi Massal:", e);
      return { success: false, count: 0 };
    }
  }, // 👈 Gunakan koma biasa untuk memisahkan fungsi di dalam satu rumpun objek

  // =======================================================================
  // ☁️ MODULE 4: CLOUD BACKUP & RESTORE SYSTEM (HYBRID ENGINE)
  // =======================================================================
  
  // 1. Mengambil daftar metadata seluruh file backup cloud milik user yang aktif
  getCloudBackups: async () => {
    try {
      const { data, error } = await supabase
        .from('cloud_backups')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error("❌ Gagal mengambil daftar backup cloud:", e);
      return [];
    }
  },

  // 2. Mengunggah file fisik .vhdb ke Supabase Storage & menyuntik metadatanya ke tabel database
  uploadBackupToCloud: async (payload: any, backupName: string, metadata: any) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return { success: false, error: 'NO_AUTH' };

      const timestamp = Date.now();
      const filePath = `${user.id}/backup_${timestamp}.vhdb`;
      const fileBody = JSON.stringify(payload);

      // A. Unggah mentahan file string JSON ke private storage bucket
      const { error: uploadError } = await supabase.storage
        .from('garasiku_backups')
        .upload(filePath, fileBody, {
          contentType: 'application/json',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // B. Daftarkan catatan riwayat metadatanya ke tabel cloud_backups
      const { error: dbError } = await supabase
        .from('cloud_backups')
        .insert({
          user_id: user.id,
          backup_name: backupName,
          file_path: filePath,
          file_size: metadata.fileSize,
          vehicle_count: metadata.vehicleCount,
          fuel_count: metadata.fuelCount,
          service_count: metadata.serviceCount,
          app_version: metadata.appVersion
        });

      if (dbError) throw dbError;
      return { success: true };
    } catch (e: any) {
      console.error("❌ Gagal mengunggah backup ke cloud:", e);
      return { success: false, error: e.message };
    }
  },

  // 3. Men-download file fisik string JSON .vhdb dari Storage untuk dikonversi ulang
  downloadBackupFromCloud: async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('garasiku_backups')
        .download(filePath);

      if (error) throw error;
      const textContent = await data.text();
      return JSON.parse(textContent);
    } catch (e) {
      console.error("❌ Gagal mengunduh file backup dari cloud:", e);
      return null;
    }
  }
};