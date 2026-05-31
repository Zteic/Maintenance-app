import React, { useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePremium } from '@/context/PremiumContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  prefillFeature?: { name: string; desc: string } | null;
}

export default function PremiumPurchaseModal({ visible, onClose, prefillFeature }: PremiumModalProps) {
  const { upgradeToPremium, restorePurchase } = usePremium();
  const [loading, setLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const router = useRouter();

  // Daftar Perbandingan Fitur FREE vs PREMIUM
  const featuresCompare = [
    { name: 'Histori Kendaraan & BBM', free: 'Basic (Terbatas)', pro: 'Tanpa Batas' },
    { name: 'Advanced Search & Filter', free: '✕', pro: '✓ (Multi-Tab)' },
    { name: 'Export Laporan (PDF/CSV)', free: '✕', pro: '✓ (Premium Layout)' },
    { name: 'Cloud Backup Otomatis', free: '✕', pro: '✓ (Real-time)' },
    { name: 'Multi-Device Sync', free: '✕', pro: '✓ (Instan)' },
    { name: 'Report Verification System', free: '✕', pro: '✓ (Valid)' },
  ];

  const handleUpgrade = async () => {
    try {
      // 🚀 1. Tarik session & user secara eksplisit untuk bypass cache browser web
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();

      // 🔒 AMAN UNTUK WEB TEMPO: Cek apakah user benar-benar bernilai null atau undefined
      if (!session || !user || !user.id) {
        
        // Gunakan window.alert jika diakses via Web Browser agar tidak memblokir UI thread
        if (Platform.OS === 'web') {
          window.alert("Akses Ditolak: Untuk mengamankan pembelian Premium Lifetime Anda seumur hidup pada server cloud, silakan Login atau Daftar akun terlebih dahulu.");
          onClose(); // Tutup modal premium
          
          // Redirect instan menggunakan router expo
          router.push('/auth/login');
          return; // Hentikan eksekusi total
        }

        // 📱 Fallback Alert UI untuk platform Mobile (Android/iOS)
        Alert.alert(
          "Akses Ditolak", 
          "Untuk mengamankan pembelian Premium Lifetime Anda seumur hidup pada server cloud, silakan Login atau Daftar akun terlebih dahulu.",
          [
            { text: "Nanti Saja", style: "cancel" },
            { 
              text: "Login / Daftar", 
              onPress: () => {
                onClose();
                setTimeout(() => {
                  router.push('/auth/login');
                }, 150);
              }
            }
          ]
        );
        return; // Hentikan eksekusi
      }

      // 🔓 2. JIKA USER CLOUD VALID & AKTIF, LANJUTKAN TRANSAKSI
      setLoading(true);
      const success = await upgradeToPremium();
      setLoading(false);
      
      if (success) {
        if (Platform.OS === 'web') {
          window.alert('Sukses! Selamat! Akun cloud Anda kini aktif sebagai PREMIUM LIFETIME.');
        } else {
          Alert.alert('Sukses!', 'Selamat! Akun cloud Anda kini aktif sebagai PREMIUM LIFETIME.');
        }
        onClose();
      } else {
        if (Platform.OS === 'web') {
          window.alert('Gagal: Proses transaksi dibatalkan atau terjadi kesalahan pada server.');
        } else {
          Alert.alert('Gagal', 'Proses transaksi dibatalkan atau terjadi kesalahan pada server.');
        }
      }

    } catch (err) {
      setLoading(false);
      console.error("Error checking auth status before payment:", err);
      if (Platform.OS === 'web') {
        window.alert("Error: Terjadi kesalahan koneksi sistem saat memproses gerbang pembayaran.");
      } else {
        Alert.alert("Error", "Terjadi kesalahan koneksi sistem saat memproses gerbang pembayaran.");
      }
    }
  };

  const handleRestore = async () => {
    setRestoreLoading(true);
    // Jalankan mesin validasi data ulang ke tabel profiles Supabase kamu
    const { refreshMembership } = usePremium() as any; 
    if (typeof refreshMembership === 'function') {
      await refreshMembership();
    }
    setRestoreLoading(false);
    Alert.alert('Sinkronisasi Berhasil', 'Status keanggotaan terbaru Anda telah disegarkan langsung dari database Cloud.');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
          
          {/* Header Banner - Gradient Elegant */}
          <LinearGradient colors={['#1E293B', '#0D1B2A']} style={styles.heroBanner}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.crownIcon}>👑</Text>
            <Text style={styles.heroTitle}>GarasiKu Premium</Text>
            <Text style={styles.heroSub}>Akses Fitur Manajemen Kendaraan Tingkat Lanjut Tanpa Batas</Text>
          </LinearGradient>

          {/* Box Preview jika dipicu oleh fitur terkunci tertentu */}
          {prefillFeature && (
            <View style={styles.prefillBox}>
              <Text style={styles.prefillLabel}>FITUR PRO TERKUNCI:</Text>
              <Text style={styles.prefillTitle}>🔒 {prefillFeature.name}</Text>
              <Text style={styles.prefillDesc}>{prefillFeature.desc}</Text>
            </View>
          )}

          {/* Tabel Perbandingan Fitur */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Perbandingan Akses Fitur</Text>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cell, { flex: 2, fontWeight: '800', color: '#FFF' }]}>Fitur</Text>
                <Text style={[styles.cell, { textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontWeight: '800' }]}>FREE</Text>
                <Text style={[styles.cell, { textAlign: 'center', color: '#FFD700', fontWeight: '800' }]}>LIFETIME</Text>
              </View>
              {featuresCompare.map((item, idx) => (
                <View key={idx} style={[styles.tableRow, idx % 2 === 0 && { backgroundColor: 'rgba(255,255,255,0.02)' }]}>
                  <Text style={[styles.cell, { flex: 2, color: 'rgba(255,255,255,0.7)', fontSize: 12 }]}>{item.name}</Text>
                  <Text style={[styles.cell, { textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12 }]}>{item.free}</Text>
                  <Text style={[styles.cell, { textAlign: 'center', color: '#4ECDC4', fontWeight: 'bold', fontSize: 12 }]}>{item.pro}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Fitur Upcoming / Masa Depan */}
          <View style={styles.upcomingBox}>
            <Text style={styles.upcomingTitle}>✨ Investasi Cerdas Seumur Hidup:</Text>
            <Text style={styles.upcomingText}>• Cukup beli sekali, gratis update ke seluruh modul fitur premium masa depan tanpa biaya langganan bulanan tambahan apa pun.</Text>
          </View>

        </ScrollView>

        {/* Sticky Bottom Action Sheet (Upgrade Flow) */}
        <View style={styles.bottomPurchaseBar}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>One Time Purchase · Lifetime Access</Text>
            <View style={styles.priceRow}>
              <Text style={styles.slashedPrice}>Rp 149.000</Text>
              <Text style={styles.actualPrice}>Rp 69.000</Text>
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.9} style={{ width: '100%' }} onPress={handleUpgrade} disabled={loading}>
  <LinearGradient colors={['#F5A623', '#D48806']} style={styles.buyButton}>
    {loading ? <ActivityIndicator color="#0D1B2A" /> : <Text style={styles.buyButtonText}>Aktifkan Akses Permanen</Text>}
  </LinearGradient>
</TouchableOpacity>

          {/* Restore Purchase Button */}
          <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn} activeOpacity={0.7} disabled={restoreLoading}>
            {restoreLoading ? <ActivityIndicator color="rgba(255,255,255,0.3)" size="small" /> : <Text style={styles.restoreBtnText}>Restore Purchase</Text>}
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#0D1B2A' },
  heroBanner: { paddingVertical: 45, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingHorizontal: 20 },
  closeBtn: { position: 'absolute', top: 20, left: 20, padding: 10 },
  closeText: { color: 'rgba(255,255,255,0.4)', fontSize: 18, fontWeight: '700' },
  crownIcon: { fontSize: 42, marginBottom: 10 },
  heroTitle: { color: '#FFD700', fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  heroSub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  prefillBox: { marginHorizontal: 20, marginTop: 20, backgroundColor: 'rgba(245,166,35,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(245,166,35,0.2)' },
  prefillLabel: { color: '#F5A623', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  prefillTitle: { color: '#FFF', fontSize: 15, fontWeight: '800', marginTop: 4, marginBottom: 2 },
  prefillDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 18 },
  sectionContainer: { marginHorizontal: 20, marginTop: 25 },
  sectionTitle: { color: '#FFF', fontSize: 15, fontWeight: '800', marginBottom: 12 },
  tableContainer: { backgroundColor: '#1A2B3C', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tableHeader: { flexDirection: 'row', padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.1)' },
  tableRow: { flexDirection: 'row', padding: 14, alignItems: 'center' },
  cell: { flex: 1, color: '#FFF', fontSize: 13 },
  upcomingBox: { marginHorizontal: 20, marginTop: 20, backgroundColor: 'rgba(78,205,196,0.05)', borderRadius: 16, padding: 16 },
  upcomingTitle: { color: '#4ECDC4', fontSize: 13, fontWeight: '800', marginBottom: 6 },
  upcomingText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 18 },
  bottomPurchaseBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#162431', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  priceContainer: { marginBottom: 15, alignItems: 'center' },
  priceLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  slashedPrice: { color: 'rgba(255,255,255,0.2)', fontSize: 14, fontWeight: '600', textDecorationLine: 'line-through' },
  actualPrice: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  buyButton: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  buyButtonText: { color: '#0D1B2A', fontSize: 16, fontWeight: '800' },
  restoreBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 4 },
  restoreBtnText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' }
});