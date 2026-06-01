import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState } from 'react-native'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabaseClient';

interface PremiumContextType {
  isPremium: boolean;
  membershipDetails: {
    status: string;
    type: string | null;
    purchaseDate: string | null;
    expiredAt: string | null;
  };
  isLoadingMembership: boolean;
  setIsPremium: (status: boolean, premiumType?: string) => Promise<boolean>;
  refreshMembership: () => Promise<void>;
  upgradeToPremium: () => Promise<boolean>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremiumState] = useState<boolean>(false);
  const [isLoadingMembership, setIsLoadingMembership] = useState<boolean>(true);
  const [membershipDetails, setMembershipDetails] = useState({
    status: 'Basic',
    type: null as string | null,
    purchaseDate: null as string | null,
    expiredAt: null as string | null,
  });

  // ── 🔄 UTAMA: AMBIL DATA LANGSUNG DARI SUPABASE (SINGLE SOURCE OF TRUTH) ──
  const fetchMembershipFromServer = async (userId: string) => {
    try {
      // Mengambil seluruh data field transaksi dari tabel profiles milik user
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_premium, membership_status, premium_type, purchase_date, premium_expired_at')
        .eq('id', userId)
        .single();

      if (!error && profile) {
        // 🛡️ ATURAN KONSISTENSI DATA: Cegah is_premium = true tapi status masih 'Basic'
        let finalStatus = profile.membership_status || 'Basic';
        let finalIsPremium = !!profile.is_premium;

        if (finalIsPremium && finalStatus === 'Basic') {
          finalStatus = 'Premium'; // Paksa sinkron ke Premium jika is_premium di server bernilai TRUE
        } else if (!finalIsPremium) {
          finalStatus = 'Basic'; // Balikkan ke Basic jika is_premium bernilai FALSE
        }

        // Set State UI Aplikasi
        setIsPremiumState(finalIsPremium);
        setMembershipDetails({
          status: finalStatus,
          type: finalIsPremium ? (profile.premium_type || 'Lifetime') : null,
          purchaseDate: finalIsPremium ? profile.purchase_date : null,
          expiredAt: finalIsPremium ? profile.premium_expired_at : null,
        });

        // Simpan cache lokal HANYA untuk bounding awal offline sewaktu aplikasi dibuka kembali
        await AsyncStorage.setItem('garasi_cache_membership_status', finalStatus);
        await AsyncStorage.setItem('garasi_cache_is_premium', finalIsPremium ? 'true' : 'false');
        await AsyncStorage.setItem('garasi_cache_purchase_date', finalIsPremium ? (profile.purchase_date || '') : '');
        return;
      }
      
      // Jika profile belum terbuat/error, lempar fallback ke Basic
      await resetToBasicState();
    } catch (err) {
      console.error("❌ Gagal sinkronisasi data dari server:", err);
      
      // Fallback Aman Offline: Ambil dari cache internal perangkat
      const cachedStatus = await AsyncStorage.getItem('garasi_cache_membership_status') || 'Basic';
      const cachedPremium = await AsyncStorage.getItem('garasi_cache_is_premium') === 'true';
      const cachedDate = await AsyncStorage.getItem('garasi_cache_purchase_date') || null;

      setIsPremiumState(cachedPremium);
      setMembershipDetails(prev => ({
        ...prev,
        status: cachedStatus,
        purchaseDate: cachedDate,
      }));
    } finally {
      setIsLoadingMembership(false);
    }
  };

  // Fungsi trigger manual penyegaran data keanggotaan
  const refreshMembership = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await fetchMembershipFromServer(user.id);
    } else {
      resetToBasicState();
    }
  };

  const resetToBasicState = async () => {
    setIsPremiumState(false);
    setMembershipDetails({ status: 'Basic', type: null, purchaseDate: null, expiredAt: null });
    await AsyncStorage.removeItem('garasi_cache_membership_status');
    await AsyncStorage.removeItem('garasi_cache_is_premium');
    await AsyncStorage.removeItem('garasi_cache_purchase_date');
    setIsLoadingMembership(false);
  };

  // ── 🔒 SINKRONISASI REALTIME STARTUP & EVENT AUTH (POINT 4, 5, 6, 8) ──
  useEffect(() => {
    let isMounted = true;

    const initializeAndListenAuth = async () => {
      setIsLoadingMembership(true);
      
      // 1. Validasi saat Startup Aplikasi Dibuka Pertama Kali
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && isMounted) {
        await fetchMembershipFromServer(session.user.id);
      } else if (isMounted) {
        await resetToBasicState();
      }
      if (isMounted) setIsLoadingMembership(false);

      // 2. Pendengar Status Login / Logout Akun Cloud secara otomatis
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (!isMounted) return;
        
        console.log(`🔔 Auth Event Terdeteksi: ${event}`);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (currentSession?.user) {
            setIsLoadingMembership(true);
            await fetchMembershipFromServer(currentSession.user.id);
            setIsLoadingMembership(false);
          }
        } else if (event === 'SIGNED_OUT') {
          // Ketika logout cloud, data di database Supabase tetap aman, aplikasi lokal kembali ke basic
          await resetToBasicState();
        }
      });

      // 3. 🚀 TAMBAHAN: Listener saat Aplikasi kembali dari Background (Foreground Sync)
      const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
        if (nextAppState === 'active' && isMounted) {
          console.log('📱 Aplikasi aktif kembali dari background, cek ulang status membership...');
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Refresh data premium secara diam-diam di background
            await fetchMembershipFromServer(session.user.id);
          }
        }
      });

      // Cleanup function yang direturn oleh initializeAndListenAuth
      return () => {
        subscription.unsubscribe();
        appStateSubscription.remove(); // 👈 Jangan lupa hapus listener AppState saat komponen unmount
      };
    };

    const cleanup = initializeAndListenAuth();

    return () => {
      isMounted = false;
      cleanup.then(clean => clean && clean());
    };
  }, []);

  // ── 💳 PROSES SINKRONISASI UPDATE DATA KE SUPABASE SAAT TRANSAKSI SUKSES ──
  const setIsPremium = async (status: boolean, premiumType: string = 'Lifetime') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // 🔧 FIX: Izinkan pergantian UI lokal khusus untuk DEV Mode saat offline
        if (__DEV__) {
          setIsPremiumState(status);
          setMembershipDetails(prev => ({
            ...prev,
            status: status ? 'Premium' : 'Basic',
            type: status ? premiumType : null,
          }));
          return true;
        }

        console.error("Gagal update membership: User tidak sedang login cloud.");
        return false;
      }

      const statusString = status ? 'Premium' : 'Basic';
      const nowString = status ? new Date().toISOString() : null;

      // 🚀 UPDATE DATABASE SUPABASE SEBAGAI SINGLE SOURCE OF TRUTH
      const { error } = await supabase
        .from('profiles')
        .update({
          is_premium: status,
          membership_status: statusString,
          premium_type: status ? premiumType : null,
          purchase_date: status ? nowString : null
        })
        .eq('id', user.id);

      if (error) {
        console.error("❌ Gagal mengunci status premium ke server Supabase:", error.message);
        return false;
      }

      // Jalankan ambil data segar ulang agar state UI langsung aktif seketika
      await fetchMembershipFromServer(user.id);
      return true;
    } catch (e) {
      console.error("Gagal memproses fungsi setIsPremium", e);
      return false;
    }
  };

  const upgradeToPremium = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Jeda simulasi transaksi aman
      const success = await setIsPremium(true, 'Lifetime');
      return success;
    } catch (error) {
      return false;
    }
  };

  return (
    <PremiumContext.Provider value={{ 
      isPremium, 
      membershipDetails,
      isLoadingMembership,
      setIsPremium,
      refreshMembership,
      upgradeToPremium
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