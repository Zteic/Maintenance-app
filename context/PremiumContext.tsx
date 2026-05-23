import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PremiumContextType {
  isPremium: boolean;
  cloudSyncStatus: 'synced' | 'offline' | 'error';
  totalVehicles: number;
  totalHistories: number;
  setIsPremium: (status: boolean) => void;
  upgradeToPremium: () => Promise<boolean>;
  restorePurchase: () => Promise<boolean>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  // Secara bawaan kita set false (FREE) untuk keperluan testing awal
  const [isPremium, setIsPremiumState] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'offline' | 'error'>('synced');

  // Load status premium dari penyimpanan lokal aman saat aplikasi dibuka
  useEffect(() => {
    const checkPremiumStatus = async () => {
      try {
        const status = await AsyncStorage.getItem('garasiku_premium_lifetime_status');
        if (status === 'true') {
          setIsPremiumState(true);
        }
      } catch (e) {
        console.error("Gagal memuat status premium", e);
      }
    };
    checkPremiumStatus();
  }, []);

  // Fungsi enkapsulasi untuk mengubah status dari luar komponen
  const setIsPremium = async (status: boolean) => {
    try {
      setIsPremiumState(status);
      await AsyncStorage.setItem('garasiku_premium_lifetime_status', status ? 'true' : 'false');
    } catch (e) {
      console.error("Gagal menyimpan status premium", e);
    }
  };

  // Poin 6 & 8: Flow simulasi upgrade aman (Bisa dihubungkan ke API/IAP Store)
  const upgradeToPremium = async () => {
    try {
      // Simulasi proses delay transaksi aman
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await setIsPremium(true);
      return true;
    } catch (error) {
      return false;
    }
  };

  // Poin 7: Restore purchase untuk memulihkan status setelah install ulang / ganti device
  const restorePurchase = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      // Di sini nanti bisa dihubungkan ke verifikasi API Server / Play Store
      await setIsPremium(true);
      return true;
    } catch (error) {
      return false;
    }
  };

  return (
    <PremiumContext.Provider value={{ 
      isPremium, 
      cloudSyncStatus,
      totalVehicles: 3,  // Diambil dinamis dari data kendaraan Anda nanti
      totalHistories: 24, // Diambil dinamis dari total log Anda nanti
      setIsPremium,
      upgradeToPremium, 
      restorePurchase 
    }}>
      {children}
    </PremiumContext.Provider>
  );
}

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within PremiumProvider');
  }
  return context;
};