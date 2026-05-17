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
  ChevronLeft, CheckCircle2, Upload, Download, 
  Info, Lock, X, Copy, AlertTriangle, RefreshCw
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

// --- DATABASE ENGINE CONSTANTS ---
const CURRENT_APP_NAME = "GarasiKu";
const CURRENT_SCHEMA_VERSION = "2.1.0";
const CURRENT_BUILD = "105";

export default function ExportScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  // State untuk Staging Import
  const [stagedFile, setStagedFile] = useState<any>(null);
  const [stagedData, setStagedData] = useState<any>(null);

  const [stats, setStats] = useState({
    fuel: 0,
    repairs: 0,
    total: 0,
    lastActivity: "Belum ada data"
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fetchRealStats();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, []);

  const fetchRealStats = async () => {
    try {
      const [repairsRaw, fuelRaw] = await Promise.all([
        AsyncStorage.getItem('garasi_repairs'),
        AsyncStorage.getItem('garasi_fuel_entries'),
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

  // ==========================================
  // ENGINE: DYNAMIC SCHEMA MIGRATION & MAPPER
  // ==========================================
  const runMigration = (parsedJson: any) => {
    let data = parsedJson.data;
    const version = parsedJson.meta.schema_version || "1.0.0";

    console.log(`[MIGRATION ENGINE] Migrating from v${version} to v${CURRENT_SCHEMA_VERSION}`);

    // Contoh Skenario: Mengubah struktur dari Versi 1.x ke Versi 2.x
    if (version.startsWith("1.")) {
      if (data.garasi_vehicles) {
        data.garasi_vehicles = JSON.parse(data.garasi_vehicles).map((v: any) => ({
          ...v,
          // Auto Mapping: Odometer lama ke currentOdometer
          currentOdometer: v.currentOdometer || v.odometer || 0,
          // Hapus field usang (Deprecated Field Handler)
          manual_odometer_input: undefined, 
          odometer: undefined 
        }));
        data.garasi_vehicles = JSON.stringify(data.garasi_vehicles);
      }
    }

    // Auto-fill Default Value untuk field baru di versi 2.1.0
    if (data.garasi_vehicles) {
      const parsedVehicles = JSON.parse(data.garasi_vehicles);
      data.garasi_vehicles = JSON.stringify(parsedVehicles.map((v: any) => ({
        ...v,
        fuelConsumption: v.fuelConsumption || 0,
        servicePriority: v.servicePriority || "normal"
      })));
    }

    return data;
  };

  // ==========================================
  // SYSTEM: EXPORT DATABASE
  // ==========================================
  const handleExport = async () => {
    setLoading(true);
    try {
      // 1. Collect Data
      const keys = await AsyncStorage.getAllKeys();
      // Filter hanya data milik aplikasi GarasiKu untuk mencegah data sampah ikut masuk
      const garasiKeys = keys.filter(k => k.startsWith('garasi_') || k.startsWith('app_'));
      const allData = await AsyncStorage.multiGet(garasiKeys);
      const backupObj = Object.fromEntries(allData);

      // 2. Build Metadata & Structure
      const payload = {
        meta: {
          app_name: CURRENT_APP_NAME,
          schema_version: CURRENT_SCHEMA_VERSION,
          export_date: new Date().toISOString(),
          app_build: CURRENT_BUILD,
          device_os: "cross-platform"
        },
        data: backupObj
      };

      const payloadString = JSON.stringify(payload);

      // 3. Save as .vhdb
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const fileName = `kendaraan_backup_${dateStr}.vhdb`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, payloadString);

      // 4. Share
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }

      setExportSuccess(true);
    } catch (e) {
      Alert.alert("Export Gagal", "Terjadi kesalahan saat membackup database.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // SYSTEM: IMPORT & VALIDATION
  // ==========================================
  const handleSelectImportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled) {
        setLoading(true);
        const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
        
        let decrypted;
        try {
          decrypted = JSON.parse(content);
        } catch (err) {
          throw new Error("CORRUPTED");
        }

        // Integrity Check
        if (!decrypted.meta || !decrypted.data || decrypted.meta.app_name !== CURRENT_APP_NAME) {
          throw new Error("INVALID_FORMAT");
        }

        // Tampilkan di Staging UI
        setStagedFile({
          name: result.assets[0].name,
          version: decrypted.meta.schema_version,
          date: decrypted.meta.export_date,
          size: (content.length / 1024).toFixed(1) + " KB"
        });
        setStagedData(decrypted);
      }
    } catch (e: any) {
      if (e.message === "CORRUPTED") Alert.alert("File Rusak", "File backup tidak dapat dibaca atau korup.");
      else if (e.message === "INVALID_FORMAT") Alert.alert("Format Tidak Didukung", "Ini bukan file backup GarasiKu yang valid.");
      else Alert.alert("Error", "Gagal membuka file.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // SYSTEM: MERGE & RESTORE LOGIC
  // ==========================================
  const executeRestore = async (mode: 'replace' | 'merge') => {
    if (!stagedData) return;
    setLoading(true);

    try {
      // 1. Jalankan Migration Engine agar data kompatibel
      const migratedData = runMigration(stagedData);

      if (mode === 'replace') {
        // Hapus data lama yang relevan lalu replace
        const keys = await AsyncStorage.getAllKeys();
        const garasiKeys = keys.filter(k => k.startsWith('garasi_'));
        await AsyncStorage.multiRemove(garasiKeys);

        const entries = Object.entries(migratedData);
        await AsyncStorage.multiSet(entries as [string, string][]);

      } else if (mode === 'merge') {
        // Gabungkan data lama dan baru berdasarkan ID (Duplicate Protection)
        const newEntries: [string, string][] = [];
        
        for (const [key, newValue] of Object.entries(migratedData)) {
          if (typeof newValue !== 'string') continue;

          const existingValue = await AsyncStorage.getItem(key);
          if (!existingValue) {
             newEntries.push([key, newValue]);
             continue;
          }

          try {
             const existingArr = JSON.parse(existingValue);
             const newArr = JSON.parse(newValue);
             
             if (Array.isArray(existingArr) && Array.isArray(newArr)) {
                // Merge array unik by ID
                const mergedMap = new Map();
                existingArr.forEach(item => mergedMap.set(item.id, item));
                newArr.forEach(item => mergedMap.set(item.id, item)); // File baru akan menimpa ID yg sama
                newEntries.push([key, JSON.stringify(Array.from(mergedMap.values()))]);
             } else {
                // Kalau bukan array (misal object settings), replace saja
                newEntries.push([key, newValue]);
             }
          } catch(e) {
             newEntries.push([key, newValue]);
          }
        }
        await AsyncStorage.multiSet(newEntries);
      }

      Alert.alert("Restore Sukses", "Database kendaraan berhasil dipulihkan!");
      router.replace('/profile');
    } catch (e) {
      Alert.alert("Gagal Restore", "Terjadi kesalahan saat memproses data.");
    } finally {
      setLoading(false);
      setStagedData(null);
      setStagedFile(null);
    }
  };

  const cancelImport = () => {
    setStagedData(null);
    setStagedFile(null);
  };

  // Helper UI Status Kompatibilitas
  const getCompatibilityStatus = (fileVersion: string) => {
    if (fileVersion === CURRENT_SCHEMA_VERSION) return { icon: <CheckCircle2 color="#4ECDC4" size={16}/>, text: "Fully Compatible", color: "#4ECDC4" };
    return { icon: <RefreshCw color="#F5A623" size={16}/>, text: "Auto Converting Schema", color: "#F5A623" };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 10, paddingRight: 15 }}>
          <Text style={{ color: "#F5A623", fontSize: 16, fontWeight: "700" }}>← Kembali</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 5 }}>
          <Text style={styles.headerTitle}>Database Manager</Text>
        </View>
        <Lock color="#4ECDC4" size={24} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {!stagedFile ? (
            <>
              {/* HALAMAN UTAMA EXPORT/IMPORT */}
              <Text style={styles.sectionLabel}>SISTEM BACKUP (.VHDB)</Text>
              <View style={styles.fileCard}>
                <View style={styles.fileIllustration}>
                  <View style={styles.vhdbBadge}><Text style={styles.vhdbText}>VHDB</Text></View>
                  <Image source={{ uri: 'https://img.icons8.com/clouds/200/database.png' }} style={styles.bikeImage} />
                </View>

                <View style={styles.fileMeta}>
                  <Text style={styles.fileName}>Export Engine v2.0</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 12 }}>Migration-compatible format</Text>

                  <MetaRow icon="🕒" label="Last Activity" val={stats.lastActivity} />
                  <MetaRow icon="⚙️" label="Schema Version" val={`v${CURRENT_SCHEMA_VERSION}`} />
                  <MetaRow icon="🛡️" label="Data Security" val="Standard Encode" />
                </View>
              </View>

              <View style={styles.infoBox}>
                 <Info color="#4ECDC4" size={16} />
                 <Text style={styles.infoText}>File .vhdb dirancang Universal. Aman direstore kapan saja meskipun aplikasi sudah diupdate ke versi baru.</Text>
              </View>

              <View style={styles.btnRow}>
                 <TouchableOpacity onPress={handleExport} style={styles.btnPrimary} disabled={loading}>
                    {loading ? <ActivityIndicator color="#1B2C3C" /> : (
                      <>
                        <Upload color="#1B2C3C" size={20} />
                        <View style={{ marginLeft: 10 }}>
                           <Text style={styles.btnText}>EXPORT DATA</Text>
                           <Text style={styles.btnSub}>Backup aman sekarang</Text>
                        </View>
                      </>
                    )}
                 </TouchableOpacity>

                 <TouchableOpacity onPress={handleSelectImportFile} style={styles.btnSecondary} disabled={loading}>
                    <Download color="#4ECDC4" size={20} />
                    <View style={{ marginLeft: 14 }}>
                       <Text style={[styles.btnText, { color: '#4ECDC4' }]}>IMPORT FILE</Text>
                       <Text style={styles.btnSub, { color: '#ffffffff' }}>Pilih .vhdb file</Text>
                    </View>
                 </TouchableOpacity>
              </View>

              <Text style={[styles.sectionLabel, { marginTop: 25 }]}>RINGKASAN DATA LOKAL</Text>
              <View style={styles.grid}>
                 <GridItem icon="⛽" count={stats.fuel} label="BBM" color="#4ECDC4" />
                 <GridItem icon="🚀" count={stats.repairs} label="Perbaikan" color="#F5A623" />
                 <GridItem icon="📋" count={stats.total} label="Total" color="#A29BFE" />
              </View>
            </>
          ) : (
            <>
              {/* HALAMAN STAGING IMPORT (Validasi Sebelum Restore) */}
              <View style={styles.successCard}>
                 <View style={[styles.glowCircle, { backgroundColor: 'rgba(245, 166, 35, 0.1)' }]}>
                    <AlertTriangle color="#F5A623" size={30} />
                 </View>
                 <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={[styles.successTitle, { color: '#F5A623' }]}>VALIDASI BACKUP</Text>
                    <Text style={styles.successDesc}>Pilih metode restore untuk file backup ini.</Text>
                 </View>
              </View>

              <View style={styles.fileCard}>
                 <View style={styles.fileMeta}>
                   <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 15 }}>{stagedFile.name}</Text>
                   <MetaRow icon="📄" label="Ukuran" val={stagedFile.size} />
                   <MetaRow icon="📅" label="Tgl Export" val={new Date(stagedFile.date).toLocaleDateString('id-ID')} />
                   
                   <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 }} />
                   
                   <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Status Kompatibilitas:</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                         {getCompatibilityStatus(stagedFile.version).icon}
                         <Text style={{ color: getCompatibilityStatus(stagedFile.version).color, fontSize: 11, fontWeight: '700' }}>
                           {getCompatibilityStatus(stagedFile.version).text}
                         </Text>
                      </View>
                   </View>
                 </View>
              </View>

              <View style={{ gap: 12, marginTop: 25 }}>
                 <TouchableOpacity onPress={() => executeRestore('merge')} style={styles.btnPrimary}>
                    <Text style={{ color: '#1B2C3C', fontWeight: '900', fontSize: 14 }}>A. GABUNGKAN DATA (MERGE)</Text>
                    <Text style={{ color: 'rgba(0,0,0,0.5)', fontSize: 10, marginTop: 4 }}>Aman. Data lama tidak dihapus, hanya menghindari duplikat.</Text>
                 </TouchableOpacity>

                 <TouchableOpacity onPress={() => executeRestore('replace')} style={[styles.btnPrimary, { backgroundColor: '#FF5252' }]}>
                    <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 14 }}>B. TIMPA SEMUA (REPLACE ALL)</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 4 }}>Bahaya. Hapus bersih data lokal dan ganti dengan data backup.</Text>
                 </TouchableOpacity>

                 <TouchableOpacity onPress={cancelImport} style={[styles.btnSecondary, { justifyContent: 'center', marginTop: 10 }]}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>BATALKAN</Text>
                 </TouchableOpacity>
              </View>
            </>
          )}

        </Animated.View>
      </ScrollView>

      {/* SNACKBAR FOOTER */}
      {exportSuccess && (
        <View style={styles.snackbar}>
          <CheckCircle2 color="#4ECDC4" size={24} />
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={{ color: '#FFF', fontWeight: '800' }}>Export Selesai!</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Database .vhdb berhasil disimpan.</Text>
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
    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{icon}  {label}</Text>
    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>{val}</Text>
  </View>
);

const GridItem = ({ icon, count, label, color }: any) => (
  <View style={styles.gridItem}>
    <Text style={{ fontSize: 20, marginBottom: 5 }}>{icon}</Text>
    <Text style={[styles.gridCount, { color }]}>{count}</Text>
    <Text style={styles.gridLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1B2C3C' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  successCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(78, 205, 196, 0.03)', padding: 20, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(78, 205, 196, 0.2)', marginBottom: 25 },
  glowCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(78, 205, 196, 0.1)', alignItems: 'center', justifyContent: 'center' },
  successTitle: { color: '#4ECDC4', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  successDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4, lineHeight: 18 },
  sectionLabel: { color: '#4ECDC4', fontSize: 11, fontWeight: '800', marginBottom: 15, letterSpacing: 1 },
  fileCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 25, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  fileIllustration: { width: 100, height: 160, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bikeImage: { width: 150, height: 150, position: 'absolute' },
  vhdbBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#4ECDC4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  vhdbText: { color: '#000', fontSize: 9, fontWeight: '900' },
  fileMeta: { flex: 1, marginLeft: 20, justifyContent: 'center' },
  fileName: { color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12, marginTop: 15 },
  infoText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, flex: 1, lineHeight: 18 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 30 },
  btnPrimary: { flex: 1, justifyContent: 'center', backgroundColor: '#4ECDC4', padding: 16, borderRadius: 18 },
  btnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(78, 205, 196, 0.3)', padding: 15, borderRadius: 18 },
  btnText: { color: '#1B2C3C', fontSize: 13, fontWeight: '900' },
  btnSub: { color: 'rgba(0,0,0,0.4)', fontSize: 9, fontWeight: '700' },
  grid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 10 },
  gridItem: { width: (width - 60) / 3, backgroundColor: 'rgba(255,255,255,0.02)', paddingVertical: 15, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  gridCount: { fontSize: 18, fontWeight: '900' },
  gridLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 9, textAlign: 'center', marginTop: 4 },
  snackbar: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#162431', padding: 20, borderRadius: 25, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#4ECDC4' }
});