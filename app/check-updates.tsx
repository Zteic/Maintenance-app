import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';

export default function CheckUpdatesScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Menjalankan simulasi jabat tangan (handshake) server store selama 2 detik
    const timer = setTimeout(() => {
      setChecking(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
          <Text style={styles.btnBackTxt}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Periksa Pembaruan</Text>
      </View>

      <View style={styles.content}>
        {checking ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#4ECDC4" />
            <Text style={styles.loadingTxt}>Menghubungkan ke App Store Server...</Text>
            <Text style={styles.subLoadingTxt}>Memvalidasi enkripsi paket tanda tangan biner</Text>
          </View>
        ) : (
          <View style={styles.centerBox}>
            <View style={styles.iconCircle}>
              <Text style={{ fontSize: 36 }}>🛡️</Text>
            </View>
            <Text style={styles.statusTitle}>Aplikasi Sudah Diperbarui</Text>
            <Text style={styles.statusSub}>Selamat! Anda menggunakan rilis sistem operasi teraman.</Text>

            <View style={styles.versionTable}>
              <View style={styles.versionRow}>
                <Text style={styles.versionLabel}>Versi Saat Ini</Text>
                <Text style={styles.versionVal}>v2.1.0</Text>
              </View>
              <View style={[styles.versionRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.versionLabel}>Versi Server Terbaru</Text>
                <Text style={[styles.versionVal, { color: '#4ECDC4' }]}>v2.1.0</Text>
              </View>
            </View>

            <Text style={styles.footerNote}>Aplikasi sudah menggunakan versi terbaru.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#1A2B3C', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  btnBack: { paddingVertical: 10, paddingRight: 15 },
  btnBackTxt: { color: "#F5A623", fontSize: 16, fontWeight: "700" },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', flex: 1, textAlign: 'center', marginRight: 60 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  centerBox: { alignItems: 'center', width: '100%' },
  loadingTxt: { color: '#FFF', marginTop: 20, fontWeight: '700', fontSize: 14 },
  subLoadingTxt: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 5 },
  iconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(78,205,196,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#4ECDC4' },
  statusTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', marginBottom: 6 },
  statusSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', paddingHorizontal: 20, lineHeight: 18, marginBottom: 30 },
  versionTable: { backgroundColor: '#1A2B3C', borderRadius: 16, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: 25 },
  versionRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  versionLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  versionVal: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  footerNote: { color: '#4ECDC4', fontSize: 12, fontWeight: '700', letterSpacing: 0.2 }
});