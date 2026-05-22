import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';

export default function ChangelogScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
          <Text style={styles.btnBackTxt}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apa yang Baru</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        <Text style={styles.statusBanner}>✅ Aplikasi sudah menggunakan versi terbaru.</Text>

        {/* VERSION 2.1.0 */}
        <View style={styles.logCard}>
          <View style={styles.versionHeader}>
            <Text style={styles.versionText}>v2.1.0</Text>
            <View style={styles.badgeNew}><Text style={styles.badgeNewTxt}>NEW</Text></View>
          </View>
          <Text style={styles.dateText}>Diperbarui: 22 Mei 2026</Text>
          
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>✨ <Text style={styles.bold}>Advanced Search Activity:</Text> Pencarian pintar riwayat mekanik menggunakan keyword bebas (Fuzzy Match).</Text>
            <Text style={styles.bulletItem}>✨ <Text style={styles.bold}>Basic & Advance Mode:</Text> Fitur pemisah visibilitas layout menu berdasarkan kenyamanan pengguna.</Text>
            <Text style={styles.bulletItem}>📷 <Text style={styles.bold}>Lampiran Galeri Media:</Text> Export cetak PDF kini mendukung lampiran foto struk BBM & dokumentasi fisik sparepart.</Text>
            <Text style={styles.bulletItem}>🛡️ <Text style={styles.bold}>Store Security Compliance:</Text> Integrasi modul kalkulator penyimpanan database lokal dan halaman legal resmi.</Text>
            <Text style={styles.bulletItem}>🐞 <Text style={styles.bold}>Bug Fix:</Text> Perbaikan *delay rendering* micro-second saat perpindahan tab navbar utama.</Text>
          </View>
        </View>

        {/* VERSION 2.0.0 */}
        <View style={[styles.logCard, { opacity: 0.5 }]}>
          <View style={styles.versionHeader}>
            <Text style={styles.versionText}>v2.0.0</Text>
          </View>
          <Text style={styles.dateText}>Diperbarui: 10 April 2026</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>📦 <Text style={styles.bold}>Multi-Vehicle Architecture:</Text> Dukungan pengelolaan lebih dari satu kendaraan dalam satu garasi.</Text>
            <Text style={styles.bulletItem}>📊 <Text style={styles.bold}>Smart Verification QR:</Text> Penyematan enkripsi baris QR Code unik pada bagian kaki dokumen cetak.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#1A2B3C', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  btnBack: { paddingVertical: 10, paddingRight: 15 },
  btnBackTxt: { color: "#F5A623", fontSize: 16, fontWeight: "700" },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', flex: 1, textAlign: 'center', marginRight: 60 },
  statusBanner: { backgroundColor: 'rgba(78,205,196,0.1)', color: '#4ECDC4', padding: 14, borderRadius: 12, textAlign: 'center', fontSize: 12, fontWeight: '700', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(78,205,196,0.2)' },
  logCard: { backgroundColor: '#1A2B3C', borderRadius: 16, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  versionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  versionText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  badgeNew: { backgroundColor: '#FF5252', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeNewTxt: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  dateText: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4, marginBottom: 15, fontWeight: '600' },
  bulletList: { gap: 12 },
  bulletItem: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20 },
  bold: { color: '#FFF', fontWeight: '700' }
});