import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Share, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function PrivacyScreen() {
  const router = useRouter();

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Privacy Policy GarasiKu',
        message: 'GarasiKu berkomitmen penuh melindungi data privasi kendaraan Anda. Aplikasi ini menggunakan sistem penyimpanan Local-First (Offline Database).'
      });
    } catch (error) {
      // Fallback jika tombol ditekan saat testing di Web/Simulator
      Alert.alert(
        "Pemberitahuan", 
        "Fitur Share tidak didukung di Simulator Web. Fitur ini akan berjalan normal saat aplikasi di-install di HP fisik."
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
          <Text style={styles.btnBackTxt}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kebijakan Privasi</Text>
        <TouchableOpacity onPress={handleShare} style={{ padding: 5 }}><Text style={{ fontSize: 18 }}>🔗</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={styles.dateMeta}>Terakhir Diperbarui: Mei 2026</Text>

        <Text style={styles.sectionTitle}>1. Pengumpulan Data & Penyimpanan</Text>
        <Text style={styles.paragraph}>
          GarasiKu adalah aplikasi berbasis <Text style={styles.highlight}>Local-First Database</Text>. Seluruh data profil pengguna, spesifikasi kendaraan, nomor plat, odometer, log pengisian BBM, hingga foto nota perbaikan disimpan seutuhnya di dalam memori internal perangkat fisik Anda menggunakan enkripsi penyimpanan terisolasi.
        </Text>

        <Text style={styles.sectionTitle}>2. Penggunaan Data</Text>
        <Text style={styles.paragraph}>
          Kami selaku pihak pengembang tidak memiliki akses, tidak mengumpulkan, tidak melihat, dan tidak menjual data aset kendaraan Anda kepada server pihak ketiga manapun. Data tersebut murni diolah secara lokal untuk keperluan kalkulasi grafik statistik bulanan dan pembuatan laporan cetak PDF Anda.
        </Text>

        <Text style={styles.sectionTitle}>3. Keamanan Data & Cadangan (Backup)</Text>
        <Text style={styles.paragraph}>
          Karena data berada sepenuhnya di tangan Anda, keamanan data sangat bergantung pada integritas perangkat Anda. Saat Anda menggunakan fitur ekspor berkas cadangan (.vhdb), data akan dibundel menjadi format teks enkripsi terkompresi yang aman untuk Anda simpan sendiri di Google Drive atau penyimpanan pribadi Anda.
        </Text>

        <Text style={styles.sectionTitle}>4. Hak Pengguna</Text>
        <Text style={styles.paragraph}>
          Anda memiliki hak kontrol mutlak 100% atas data Anda sendiri. Anda dapat mengubah, memodifikasi, mengekspor, serta menghapus seluruh data catatan log garasi kapan saja secara instan melalui tombol "Hapus Semua Data Aplikasi" pada menu pengaturan profil Anda.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#1A2B3C', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  btnBack: { paddingVertical: 10, paddingRight: 15 },
  btnBackTxt: { color: "#F5A623", fontSize: 16, fontWeight: "700" },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', flex: 1, textAlign: 'center', marginLeft: 15 },
  dateMeta: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', marginBottom: 20 },
  sectionTitle: { color: '#4ECDC4', fontSize: 14, fontWeight: '800', marginTop: 20, marginBottom: 8, letterSpacing: 0.5 },
  paragraph: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 22, marginBottom: 15, textAlign: 'justify' },
  highlight: { color: '#FFF', fontWeight: 'bold' }
});