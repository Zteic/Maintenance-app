import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // ── FUNGSI INTI: AMBIL DATA LANGSUNG DARI SUPABASE (SINGLE SOURCE OF TRUTH) ──
  const fetchMembershipFromServer = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
  .from('profiles')
  .select('membership_status')
  .eq('id', userId)
  .single();

      if (!error && profile) {
        const hasPremium = profile.membership_status === 'Premium' || profile.membership_status === 'Premium Lifetime';
        setIsPremiumState(hasPremium);
        setMembershipDetails({
          status: profile.membership_status || 'Basic',
          type: profile.premium_type,
          purchaseDate: profile.purchase_date,
          expiredAt: profile.premium_expired_at,
        });
        await AsyncStorage.setItem('garasi_cache_membership_status', profile.membership_status || 'Basic');
      } else {
        // Jika profile belum terbuat di database, buat fallback instan ke Basic
        await resetToBasicState();
      }
    } catch (err) {
      console.error("❌ Gagal sinkronisasi data dari server:", err);
      const cachedStatus = await AsyncStorage.getItem('garasi_cache_membership_status');
      setIsPremiumState(cachedStatus === 'Premium' || cachedStatus === 'Premium Lifetime');
    } finally {
      // 🚀 MATIKAN LOADING DI SINI: Apapun yang terjadi (sukses/gagal), matikan roda berputar!
      setIsLoadingMembership(false);
    }
  };

  // Fungsi manual untuk trigger refresh dari komponen lain
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
  };

  // ── VALIDASI SAAT STARTUP & PERUBAHAN AUTH (REAL-TIME GUARD) ──
  useEffect(() => {
    let isMounted = true;

    const initializeAndListenAuth = async () => {
      setIsLoadingMembership(true);
      
      // Check session aktif saat aplikasi dibuka (Startup Validation)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && isMounted) {
        await fetchMembershipFromServer(session.user.id);
      } else if (isMounted) {
        await resetToBasicState();
      }
      if (isMounted) setIsLoadingMembership(false);

      // Dengarkan perubahan auth secara realtime (Login, Logout, Token Refreshed)
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
          await resetToBasicState();
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    };

    initializeAndListenAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // ── FUNGSI SET PREMIUM (DIPANGGIL SAAT TRANSAKSI SUKSES) ──
  const setIsPremium = async (status: boolean, premiumType: string = 'Lifetime') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("Gagal update membership: User tidak sedang login cloud.");
        return false;
      }

      const statusString = status ? 'Premium' : 'Basic';
      const nowString = status ? new Date().toISOString() : null;

      // 🚀 UPDATE DATABASE SUPABASE SEBAGAI UTAMA
      const { error } = await supabase
        .from('profiles')
        .update({
          membership_status: statusString,
          premium_type: status ? premiumType : null,
          purchase_date: nowString
        })
        .eq('id', user.id);

      if (error) {
        console.error("❌ Gagal mengunci status premium ke server:", error.message);
        return false;
      }

      // Jalankan fetch ulang agar data state lokal dan database 100% sinkron dan akurat
      await fetchMembershipFromServer(user.id);
      return true;
    } catch (e) {
      console.error("Gagal memproses fungsi setIsPremium", e);
      return false;
    }
  };

  // Simulasi Flow upgrade aman (bisa dihubungkan ke Midtrans / In-App Purchase Store)
  const upgradeToPremium = async () => {
    try {
      // Simulasi delay gateway pembayaran selama 1 detik
      await new Promise((resolve) => setTimeout(resolve, 1000));
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