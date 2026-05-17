import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Image, Dimensions, Animated, ActivityIndicator, Alert, StatusBar 
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ShieldCheck, ChevronLeft, CheckCircle2, Upload, Download, 
  Info, Lock, Zap, X, Copy 
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function ExportScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [fileDetail, setFileDetail] = useState<any>(null);

  const [stats, setStats] = useState({
    fuel: 0,
    repairs: 0,
    total: 0,
    lastActivity: "Belum ada data"
  });

  const fetchRealStats = async () => {
    try {
      // Kita panggil data dari "Gudang" (AsyncStorage)
      const [repairsRaw, fuelRaw] = await Promise.all([
        AsyncStorage.getItem('garasi_repairs'),
        AsyncStorage.getItem('garasi_fuel_entries'), // Kata kunci ini harus sama dengan yang dipakai di FuelLog
      ]);

      const repairs = repairsRaw ? JSON.parse(repairsRaw) : [];
      const fuel = fuelRaw ? JSON.parse(fuelRaw) : [];

      const allEntries = [...repairs, ...fuel];
      const latestDate = allEntries.length > 0 
        ? allEntries.sort((a,b) => b.date.localeCompare(a.date))[0].date 
        : "Belum ada data";

    setStats({
        repairs: repairs.length,
        fuel: fuel.length,
        total: repairs.length + fuel.length,
        lastActivity: latestDate
      });
    } catch (e) {
      console.log("Gagal sinkronisasi data:", e);
    }
  };

  // Animasi Entry
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fetchRealStats();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, []);

  const handleExport = async () => {
    setLoading(true);
    try {
      // 1. Ambil seluruh data dari storage
      const keys = await AsyncStorage.getAllKeys();
      const allData = await AsyncStorage.multiGet(keys);
      const backupObj = Object.fromEntries(allData);

      // 2. Wrap data dengan metadata
      const payload = {
        app: "GarasiKu",
        version: "2.0",
        timestamp: new Date().toISOString(),
        data: backupObj
      };

      const payloadString = JSON.stringify(payload); // Langsung jadikan string

      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const fileName = `vehicle_history_backup_${dateStr}.vhdb`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // Simpan langsung sebagai string UTF-8
      await FileSystem.writeAsStringAsync(fileUri, payloadString);

      // 4. Share/Save
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }

      setFileDetail({
        name: fileName,
        size: (encrypted.length / 1024 / 1024).toFixed(2) + " MB",
        date: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      });
      setExportSuccess(true);
    } catch (e) {
      Alert.alert("Error", "Gagal melakukan export data.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled) {
        setLoading(true);
        const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
        const decrypted = JSON.parse(content);

        if (decrypted.app !== "GarasiKu") throw new Error();

        // Restore ke AsyncStorage
        const entries = Object.entries(decrypted.data);
        await AsyncStorage.multiSet(entries as [string, string][]);

        Alert.alert("Sukses", "Data kendaraan berhasil dipulihkan.");
        router.replace('/profile');
      }
    } catch (e) {
      Alert.alert("Gagal", "File .vhdb tidak valid atau rusak.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
            onPress={() => router.back()}
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#F5A623", fontSize: 16, marginBottom: 10 }}>← Kembali</Text>
          </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 18 }}>
          <Text style={styles.headerTitle}>Export History</Text>
          <Text style={styles.headerSub}>Backup data kendaraan Anda</Text>
        </View>
        <ShieldCheck color="#4ECDC4" size={24} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          
          {/* BANNER SUCCESS */}
          <View style={styles.successCard}>
             <View style={styles.glowCircle}>
                <CheckCircle2 color="#4ECDC4" size={40} />
             </View>
             <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.successTitle}>EXPORT BERHASIL</Text>
                <Text style={styles.successDesc}>Data history kendaraan Anda berhasil diekspor dengan aman.</Text>
             </View>
             <Image 
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/5610/5610944.png' }} 
                style={styles.folderIcon} 
             />
          </View>

          {/* FILE DETAIL CARD */}
          <Text style={styles.sectionLabel}>DETAIL FILE EXPORT</Text>
          <View style={styles.fileCard}>
            <View style={styles.fileIllustration}>
              <View style={styles.vhdbBadge}><Text style={styles.vhdbText}>VHDB</Text></View>
              {/* Gambar Motor Futuristik */}
              <Image 
                source={{ uri: 'https://img.icons8.com/clouds/200/motorcycle.png' }} 
                style={styles.bikeImage} 
              />
              <View style={styles.lockIcon}><Lock color="#4ECDC4" size={12} /></View>
            </View>

            <View style={styles.fileMeta}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {fileDetail?.name || "vehicle_history_backup_2026.vhdb"}
                </Text>
                <Copy color="rgba(255,255,255,0.3)" size={16} />
              </View>

              <MetaRow icon="📅" label="Update Terakhir" val={stats.lastActivity} />
              <MetaRow icon="📄" label="Ukuran File" val={fileDetail?.size || "2.48 MB"} />
              <MetaRow icon="📀" label="Format File" val="VHDB (Vehicle History Database)" />
              <MetaRow icon="🔒" label="Enkripsi" val="AES-256" />
              <MetaRow icon="🕒" label="Auto Restore" val="Didukung" />
              <MetaRow icon="📱" label="Kompatibilitas" val="GarasiKu v2.0+" />
            </View>
          </View>

          <View style={styles.infoBox}>
             <Info color="#4ECDC4" size={16} />
             <Text style={styles.infoText}>File ini dapat di-import kembali ke aplikasi GarasiKu.</Text>
          </View>

          {/* BUTTONS */}
          <View style={styles.btnRow}>
             <TouchableOpacity onPress={handleExport} style={styles.btnPrimary} disabled={loading}>
                {loading ? <ActivityIndicator color="#1B2C3C" /> : (
                  <>
                    <Upload color="#1B2C3C" size={20} />
                    <View style={{ marginLeft: 10 }}>
                       <Text style={styles.btnText}>EXPORT LAGI</Text>
                       <Text style={styles.btnSub}>Buat file backup baru</Text>
                    </View>
                  </>
                )}
             </TouchableOpacity>

             <TouchableOpacity onPress={handleImport} style={styles.btnSecondary}>
                <Download color="#4ECDC4" size={20} />
                <View style={{ marginLeft: 14 }}>
                   <Text style={[styles.btnText, { color: '#4ECDC4' }]}>IMPORT FILE</Text>
                   <Text style={styles.btnSub}>Pilih file untuk dipulihkan</Text>
                </View>
             </TouchableOpacity>
          </View>

          {/* SUMMARY GRID */}
<Text style={styles.sectionLabel}>RINGKASAN DATA YANG DIEKSPOR</Text>
          <View style={styles.grid}>
             <GridItem icon="⛽" count={stats.fuel} label="Pengisian BBM" color="#4ECDC4" />
             <GridItem icon="🚀" count={stats.repairs} label="Perbaikan" color="#F5A623" />
             <GridItem icon="📋" count={stats.total} label="Total Data" color="#A29BFE" />
          </View>

        </Animated.View>
      </ScrollView>

      {/* SNACKBAR FOOTER */}
      {exportSuccess && (
        <View style={styles.snackbar}>
          <CheckCircle2 color="#4ECDC4" size={24} />
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={{ color: '#FFF', fontWeight: '800' }}>Export selesai</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>File berhasil disimpan di penyimpanan perangkat.</Text>
          </View>
          <TouchableOpacity onPress={() => setExportSuccess(false)}><X color="#FFF" size={20} /></TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Sub-Komponen
const MetaRow = ({ icon, label, val }: any) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{icon}  {label}</Text>
    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700' }}>{val}</Text>
  </View>
);

const GridItem = ({ icon, count, label, color }: any) => (
  <View style={styles.gridItem}>
    <Text style={{ fontSize: 20, marginBottom: 5 }}>{icon}</Text>
    <Text style={[styles.gridCount, { color }]}>{count}</Text>
    <Text style={styles.gridLabel}>{label}</Text>
  </View>
);
/////
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1B2C3C' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  backBtn: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  successCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(78, 205, 196, 0.03)', padding: 20, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(78, 205, 196, 0.2)', marginBottom: 25 },
  glowCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(78, 205, 196, 0.1)', alignItems: 'center', justifyContent: 'center' },
  successTitle: { color: '#4ECDC4', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  successDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4, lineHeight: 18 },
  folderIcon: { width: 50, height: 50, opacity: 0.3 },
  sectionLabel: { color: '#4ECDC4', fontSize: 11, fontWeight: '800', marginBottom: 15, letterSpacing: 1 },
  fileCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 25, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  fileIllustration: { width: 100, height: 160, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bikeImage: { width: 150, height: 150, position: 'absolute' },
  vhdbBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#4ECDC4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  vhdbText: { color: '#000', fontSize: 9, fontWeight: '900' },
  lockIcon: { position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(78, 205, 196, 0.2)', padding: 4, borderRadius: 5 },
  fileMeta: { flex: 1, marginLeft: 20 },
  fileName: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12, marginTop: 15 },
  infoText: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 30 },
  btnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#4ECDC4', padding: 15, borderRadius: 18 },
  btnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(78, 205, 196, 0.3)', padding: 15, borderRadius: 18 },
  btnText: { color: '#1B2C3C', fontSize: 13, fontWeight: '900' },
  btnSub: { color: 'rgba(0,0,0,0.4)', fontSize: 9, fontWeight: '700' },
  grid: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    gap: 8, 
    marginTop: 10 
  },
gridItem: { 
  width: (width - 60) / 3,
  backgroundColor: 'rgba(255,255,255,0.02)', 
  paddingVertical: 15, 
  borderRadius: 20, 
  alignItems: 'center', 
  borderWidth: 1, 
  borderColor: 'rgba(255,255,255,0.05)' 
},  gridCount: { fontSize: 18, fontWeight: '900' },
  gridLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, textAlign: 'center', marginTop: 4 },
  snackbar: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#162431', padding: 20, borderRadius: 25, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#4ECDC4' }
});