import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
          <Text style={styles.btnBackTxt}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Syarat & Ketentuan</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={styles.dateMeta}>Terakhir Diperbarui: Mei 2026</Text>

        <Text style={styles.sectionTitle}>1. Ketentuan Penggunaan</Text>
        <Text style={styles.paragraph}>
          Dengan mengunduh dan menggunakan aplikasi GarasiKu, Anda menyetujui secara sadar bahwa aplikasi ini ditujukan sebagai alat bantu pencatatan manajemen perawatan pribadi kelaikan kendaraan bermotor Anda secara mandiri.
        </Text>

        <Text style={styles.sectionTitle}>2. Tanggung Jawab Pengguna</Text>
        <Text style={styles.paragraph}>
          Pengguna bertanggung jawab penuh atas keakuratan data angka odometer, nominal biaya servis, serta tanggal jatuh tempo rencana perawatan bensin yang dimasukkan ke dalam sistem aplikasi. Pengembang tidak bertanggung jawab atas kelalaian fisik kendaraan akibat ketidakcocokan input data manual.
        </Text>

        <Text style={styles.sectionTitle}>3. Batasan Ekspor & Kehilangan Data</Text>
        <Text style={styles.paragraph}>
          Layanan backup data menggunakan metode ekspor file enkripsi lokal. Jika perangkat ponsel pengguna hilang, mengalami kerusakan hardware, atau aplikasi terhapus tanpa melakukan backup eksternal berkala terlebih dahulu, maka pengembang tidak memiliki kemampuan memulihkan data tersebut karena tidak adanya sinkronisasi server terpusat.
        </Text>

        <Text style={styles.sectionTitle}>4. Integritas Verifikasi Laporan</Text>
        <Text style={styles.paragraph}>
          Fitur enkripsi kode batang verifikasi (QR Code Integrity) pada footer berkas cetak PDF murni merupakan jaminan otentisitas data statis database lokal pengguna saat file tersebut dicetak. Penjualan atau pemindahtanganan dokumen palsu di luar sistem enkripsi aplikasi berada di luar tanggung jawab hukum pengembang.
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
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', flex: 1, textAlign: 'center', marginRight: 60 },
  dateMeta: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', marginBottom: 20 },
  sectionTitle: { color: '#4ECDC4', fontSize: 14, fontWeight: '800', marginTop: 20, marginBottom: 8, letterSpacing: 0.5 },
  paragraph: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 22, marginBottom: 15, textAlign: 'justify' }
});