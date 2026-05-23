import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePremium } from '@/context/PremiumContext';

const { width } = Dimensions.get('window');

interface PremiumSectionProps {
  onOpenPremiumPage: () => void;
}

// 👑 KOMPONEN 1: BANNER MEMBERSHIP (Poin 1, 2, & 11)
export default function PremiumSection({ onOpenPremiumPage }: PremiumSectionProps) {
  const { isPremium } = usePremium();

  if (isPremium) {
    return (
      <View style={styles.container}>
        {/* Tampilan Mewah untuk Pengguna Premium */}
        <LinearGradient
          colors={['#1E293B', '#0F172A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, styles.premiumBorder]}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.brandText}>GARASIKU PREMIUM</Text>
              <Text style={styles.subTitleActive}>Lifetime Access Activated</Text>
            </View>
            <View style={styles.badgePremium}>
              <Text style={styles.badgePremiumText}>👑 LIFETIME</Text>
            </View>
          </View>
          <Text style={styles.infoTextActive}>
            Semua fitur advanced, cloud backup otomatis, dan verifikasi laporan aktif permanen seumur hidup. Terima kasih telah mendukung kami!
          </Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tampilan Bersih & Elegan untuk Pengguna Gratis (Tidak Memaksa / Mengganggu) */}
      <LinearGradient
        colors={['#1A2B3C', '#162431']}
        style={styles.card}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brandTextFree}>GarasiKu Member</Text>
            <Text style={styles.subTitleFree}>Akun Standar</Text>
          </View>
          <View style={styles.badgeFree}>
            <Text style={styles.badgeFreeText}>FREE</Text>
          </View>
        </View>
        
        <Text style={styles.infoTextFree}>
          Buka fitur advanced analytics, eksport PDF laporan tanpa watermark, dan sinkronisasi multi-device tanpa batasan seumur hidup.
        </Text>

        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={onOpenPremiumPage}
          style={styles.upgradeButton}
        >
          <LinearGradient
            colors={['#F5A623', '#D48806']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Text style={styles.upgradeButtonText}>👑 Upgrade ke Premium Lifetime</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

// 🚗 KOMPONEN 2: GRID METADATA AKUN RINGKAS (Hanya Cloud Sync & Status Member)
export function AccountStatsGrid() {
  const { cloudSyncStatus, isPremium } = usePremium();

  return (
    <View style={styles.gridContainer}>
      {[
        { 
          label: 'CLOUD SYNC', 
          value: cloudSyncStatus === 'synced' ? 'Terhubung' : 'Offline', 
          icon: '☁️',
          color: cloudSyncStatus === 'synced' ? '#4ECDC4' : '#FF5252' 
        },
        { 
          label: 'STATUS MEMBER', 
          value: isPremium ? 'PREMIUM' : 'BASIC', 
          icon: '🔑', 
          color: isPremium ? '#FFD700' : 'rgba(255,255,255,0.4)' 
        }
      ].map((item, idx) => (
        <View key={idx} style={styles.gridBox}>
          <View style={styles.gridHeaderRow}>
            <Text style={styles.gridLabel}>{item.label}</Text>
            <Text style={{ fontSize: 12 }}>{item.icon}</Text>
          </View>
          <Text style={[styles.gridValue, { color: item.color || '#FFFFFF' }]}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 20, marginTop: 15, marginBottom: 10 },
  card: { borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  premiumBorder: { 
    borderColor: 'rgba(245, 166, 35, 0.3)', 
    shadowColor: '#F5A623', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    elevation: 5 
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  brandText: { color: '#FFD700', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  brandTextFree: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  subTitleActive: { color: '#4ECDC4', fontSize: 12, fontWeight: '700', marginTop: 2 },
  subTitleFree: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  badgePremium: { backgroundColor: 'rgba(255,215,0,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  badgePremiumText: { color: '#FFD700', fontSize: 10, fontWeight: '900' },
  badgeFree: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeFreeText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800' },
  infoTextActive: { color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 18 },
  infoTextFree: { color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 18, marginBottom: 15 },
  upgradeButton: { borderRadius: 12, overflow: 'hidden' },
  gradientButton: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  upgradeButtonText: { color: '#0D1B2A', fontSize: 14, fontWeight: '800' },
  
  // Grid Styles
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 20, marginBottom: 20, marginTop: 5 },
  gridBox: { flex: 1, minWidth: width * 0.4, backgroundColor: '#1A2B3C', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
  gridHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  gridLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  gridValue: { fontSize: 14, fontWeight: '800' }
});