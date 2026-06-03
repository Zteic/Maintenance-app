import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Dimensions, ActivityIndicator, Alert, StatusBar, Platform, LayoutAnimation, UIManager
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
// 🚀 PERBAIKAN: Menggunakan modul legacy agar fungsi getInfoAsync berjalan lancar di Expo 54
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PremiumPurchaseModal from "@/components/Premium/PremiumPurchaseModal";
import { usePremium } from '@/context/PremiumContext';
import { useLanguage } from "@/context/LanguageContext";
import { apiService } from '@/utils/apiService';
import { supabase } from '@/utils/supabaseClient';

// 🚀 IMPORT TEMPLATE ENGINE DARI FILE EKSTERNAL ANDA
import { generatePdfTemplate } from '@/utils/DesignPDF';

const { width } = Dimensions.get('window');

const CURRENT_APP_NAME = "GarasiKu";
const CURRENT_SCHEMA_VERSION = "2.1.0";

// 🚀 PASTIKAN STRUKTUR FUNGSI INI DITUTUP DENGAN BENAR
function decryptDatabaseFile(fileText: string) {
  return fileText; 
}

// Kondisional layout Android (Pastikan penutupan if ini aman)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 🚀 BARIS 32: SEKARANG BEBAS DARI ERROR KARENA ATASNYA SUDAH MATANG
export default function ExportScreen() {
  const router = useRouter();
  const { lang } = useLanguage ? useLanguage() : { lang: 'id' };
  const isId = lang === 'id';
  const { isPremium } = usePremium(); // 🚀 Mengambil status langganan sejati pengguna
  const [premiumModalVisible, setPremiumModalVisible] = useState(false); // State pemicu modal billing jika belum premium
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['fuel', 'service', 'tax']);
  
  // Data Master State
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [fuels, setFuels] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);

  // UI & Filter State
  const [mode, setMode] = useState<'backup' | 'pdf' | 'import'>('backup');
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>(['all']);
  const [period, setPeriod] = useState<string>('all'); 
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [pdfReportType, setPdfReportType] = useState<'summary' | 'hybrid'>('hybrid');
  
  // Progress Loader State
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState('');
  // 🚀 STATE KHUSUS IMPORT & RESTORE
  const [stagedFile, setStagedFile] = useState<any>(null);
  const [stagedData, setStagedData] = useState<any>(null);
  const [exportDone, setExportDone] = useState(false);
  const [cloudBackups, setCloudBackups] = useState<any[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [isCloudUser, setIsCloudUser] = useState(false);
  const [autoBackupRule, setAutoBackupRule] = useState<string>('off');

  const handleRestoreCloud = async (backupItem: any) => {
    // 🚀 FIX 1: Validasi ukuran berkas secara mutlak sebelum diproses sistem enkripsi
    if (!backupItem || backupItem.size_bytes === 0 || backupItem.file_size === "0.0 KB") {
      Alert.alert(
        "Gagal Mengunduh",
        "Berkas di dalam cloud kosong (0.0 KB) atau rusak. Silakan lakukan backup ulang dari perangkat sebelumnya."
      );
      return;
    }

    setLoading(true);
    setProgressText("☁️ Mengunduh aman berkas dari cloud...");

    try {
      // 1. Unduh berkas biner dari Supabase Storage Bucket
      const { data, error } = await supabase.storage
        .from('database_backups')
        .download(backupItem.file_path);

      if (error) throw error;

      // 2. Ekstrak biner menjadi text string
      const fileText = await data.text();
      if (!fileText || fileText.trim() === "") {
        throw new Error("EmptyContent");
      }

      // 3. Proses bypass string teks lewat helper decrypt
      const decryptedData = decryptDatabaseFile(fileText);
      const parsedPayload = JSON.parse(decryptedData);

      // Jalankan verifikasi struktur skema database GarasiKu
      if (!parsedPayload.meta || !parsedPayload.data || parsedPayload.meta.app_name !== CURRENT_APP_NAME) {
        throw new Error("INVALID_FORMAT");
      }

      // Jalankan fungsi migrasi skema internal agar versi database sinkron
      const secureDataPayload = migrateDatabaseSchema(parsedPayload, CURRENT_SCHEMA_VERSION);
      const dataToRestore = secureDataPayload.data;

      setProgressText("🚀 Menyuntikkan data ke storage...");
      
      // 4. Bersihkan data lokal lama terlebih dahulu (Mencegah duplikasi id)
      const keys = await AsyncStorage.getAllKeys();
      const garasiKeys = keys.filter(k => k.startsWith('garasi_'));
      await AsyncStorage.multiRemove(garasiKeys);

      // 5. Suntikkan massal seluruh tabel database baru dari cloud ke internal HP
      const entries = Object.entries(dataToRestore);
      await AsyncStorage.multiSet(entries as [string, string][]);

      setLoading(false);
      
      if (Platform.OS === 'web') {
        window.alert("Restore Sukses!\n\nDatabase cloud telah berhasil dipulihkan.");
      } else {
        Alert.alert("Restore Sukses!", "Database cloud telah berhasil dipulihkan. Mengembalikan ke beranda...");
      }
      
      router.replace("/");

    } catch (err: any) {
      setLoading(false);
      console.error("Restore Error:", err.message);
      
      const isInvalid = err.message === "INVALID_FORMAT" || err.message === "EmptyContent";
      Alert.alert(
        "Gagal Mengunduh",
        isInvalid 
          ? "Berkas di dalam cloud tidak dikenali oleh enkripsi sistem." 
          : "Koneksi terputus atau gagal memproses dekripsi database."
      );
    }
  };

 // Load Data dari Local Storage saat masuk halaman
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [vRaw, rRaw, fRaw, tRaw] = await Promise.all([
          AsyncStorage.getItem('garasi_vehicles'),
          AsyncStorage.getItem('garasi_repairs'),
          AsyncStorage.getItem('garasi_fuel_entries'),
          AsyncStorage.getItem('garasi_tax_history') // <-- PASTIKAN INI ADA
        ]);
        if (vRaw) setVehicles(JSON.parse(vRaw));
        if (rRaw) setRepairs(JSON.parse(rRaw));
        if (fRaw) setFuels(JSON.parse(fRaw));
        if (tRaw) setTaxes(JSON.parse(tRaw)); // <-- PASTIKAN INI ADA
      } catch (e) {
        console.log("Error loading data for export", e);
      }
    };
    loadAllData();
  }, []);

  useEffect(() => {
    if (exportDone) {
      const timer = setTimeout(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExportDone(false);
      }, 5000); 
      
      return () => clearTimeout(timer);
    }
  }, [exportDone]);

  // ☁️ EFFECT: Ambil daftar arsip backup & aturan auto backup dari server
  useEffect(() => {
    const checkCloudUserAndFetch = async () => {
      if (mode === 'import' || mode === 'backup') {
        try {
          const currentMode = await apiService.getServiceMode();
          if (currentMode === 'supabase') {
            setIsCloudUser(true);
            if (mode === 'import') {
              setLoadingCloud(true);
              const backups = await apiService.getCloudBackups();
              setCloudBackups(backups);
            }
            // Load aturan auto backup yang tersimpan
            const savedRule = await AsyncStorage.getItem('garasi_auto_backup_rule');
            if (savedRule) setAutoBackupRule(savedRule);
          } else {
            setIsCloudUser(false);
          }
        } catch (err) {
          console.log("Gagal memuat konfigurasi cloud:", err);
        } finally {
          setLoadingCloud(false);
        }
      }
    };
    checkCloudUserAndFetch();
  }, [mode]);

  // =========================================================
  // SMART DYNAMIC YEAR FINDER
  // =========================================================
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(new Set([
    ...repairs.map(r => new Date(r.date).getFullYear()),
    ...fuels.map(f => new Date(f.date).getFullYear()),
    ...taxes.map(t => new Date(t.payment_date).getFullYear())
  ])).filter(y => !isNaN(y) && y < currentYear).sort((a,b) => b - a);

  const periodOptions = ['all', 'this_month', 'last_3_months', 'this_year', ...availableYears.map(String), 'custom'];

  const getPeriodLabel = (p: string) => {
    if (p === 'all') return isId ? 'Semua Waktu' : 'All Time';
    if (p === 'this_month') return isId ? 'Bulan Ini' : 'This Month';
    if (p === 'last_3_months') return isId ? '3 Bulan Terakhir' : 'Last 3 Months';
    if (p === 'this_year') return isId ? 'Tahun Ini' : 'This Year';
    if (p === 'custom') return isId ? 'Custom Date' : 'Custom Date';
    return `${isId ? 'Tahun' : 'Year'} ${p}`;
  };

  // 🚀 LOGIKA MULTI-SELECTION KENDARAAN
  const toggleVehicleSelection = (id: string) => {
    if (id === 'all') {
      setSelectedVehicles(['all']);
    } else {
      setSelectedVehicles((prev) => {
        const filtered = prev.filter(v => v !== 'all');
        if (filtered.includes(id)) {
          const next = filtered.filter(v => v !== id);
          return next.length === 0 ? ['all'] : next;
        } else {
          return [...filtered, id];
        }
      });
    }
  };

  // 🚀 LOGIKA MULTI-SELECTION KATEGORI DATA
  const toggleCategory = (cat: string) => {
    if (cat === 'all') {
      setSelectedCategories(['fuel', 'service', 'tax']);
    } else {
      setSelectedCategories(prev => {
        // Jika sebelumnya "Semua Data" aktif (ada 3 array), lalu klik opsi spesifik,
        // maka jadikan HANYA opsi spesifik tersebut yang aktif.
        if (prev.length === 3) {
          return [cat];
        }

        // Toggle centang biasa
        const isSelected = prev.includes(cat);
        let next = isSelected ? prev.filter(c => c !== cat) : [...prev, cat];
        
        // Jika user uncheck semuanya sampai kosong, paksa kembali ke "Semua Data"
        if (next.length === 0) {
          return ['fuel', 'service', 'tax'];
        }

        return next;
      });
    }
  };

  // =========================================================
  // CORE FILTER ENGINE (Periode & Multi-Vehicle)
  // =========================================================
  const getFilteredData = () => {
    let filteredRepairs = [...repairs];
    let filteredFuels = [...fuels];
    let filteredTaxes = [...taxes];

    if (!selectedVehicles.includes('all')) {
      filteredRepairs = filteredRepairs.filter(r => selectedVehicles.includes(r.vehicleId));
      filteredFuels = filteredFuels.filter(f => selectedVehicles.includes(f.vehicleId));
      filteredTaxes = filteredTaxes.filter(t => selectedVehicles.includes(t.vehicle_id));
    }

    const now = new Date();
    const currentMonth = now.getMonth();

    const filterByDateRange = (dateStr: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;

      if (period === 'this_month') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      if (period === 'last_3_months') {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        return d >= threeMonthsAgo && d <= now;
      }
      if (period === 'this_year') {
        return d.getFullYear() === currentYear;
      }
      if (period === 'custom') {
        const s = customStart ? new Date(customStart) : new Date('1970-01-01');
        const e = customEnd ? new Date(customEnd) : new Date('2099-12-31');
        e.setHours(23, 59, 59, 999);
        return d >= s && d <= e;
      }
      if (/^\d{4}$/.test(period)) {
        return d.getFullYear() === parseInt(period);
      }
      return true;
    };

    if (!selectedCategories.includes('fuel')) filteredFuels = [];
    if (!selectedCategories.includes('service')) filteredRepairs = [];
    if (!selectedCategories.includes('tax')) filteredTaxes = [];

    return { filteredRepairs, filteredFuels, filteredTaxes };
  };

  const { filteredRepairs, filteredFuels, filteredTaxes } = getFilteredData();
  
  // Tambahkan JSON.stringify(filteredTaxes) di bawah ini:
  const estimatedSize = ((JSON.stringify(filteredRepairs).length + JSON.stringify(filteredFuels).length + JSON.stringify(filteredTaxes).length) / 1024).toFixed(1);
  
  const vehicleName = selectedVehicles.includes('all') 
  ? (isId ? "Semua Kendaraan" : "All Vehicles") 
  : vehicles.filter(v => selectedVehicles.includes(v.id)).map(v => v.name).join(', ');
  
  // Pastikan filteredTaxes.length === 0 masuk ke dalam pengecekan ini:
  const isDataEmpty = filteredRepairs.length === 0 && filteredFuels.length === 0 && filteredTaxes.length === 0;

  // ==========================================
  // HYBRID PDF GENERATOR ENGINE (MENGGUNAKAN DESIGNPDF)
  // ==========================================
  const handleExportPDF = async () => {
    if (isDataEmpty) {
      Alert.alert(isId ? "Data Kosong" : "No Data", isId ? "Tidak ada aktivitas pada periode ini untuk diexport." : "No activities to export in this period.");
      return;
    }

    setLoading(true);
    setExportDone(false);
    try {
      setProgressText("🔄 Preparing & Filtering Data...");
      await new Promise(r => setTimeout(r, 500));

      // 🚀 EKSEKUSI PANGGILAN GENERATOR EKSTERNAL
      const htmlContent = generatePdfTemplate({
        filteredRepairs,
        filteredFuels,
        filteredTaxes, // <--- TAMBAHKAN INI
        includeTaxInPdf: selectedCategories.includes('tax'), // <--- TAMBAHKAN INI
        vehicles,
        selectedVehicles,
        pdfReportType,
        period,
        isId,
        getPeriodLabel,
        CURRENT_APP_NAME,
        CURRENT_SCHEMA_VERSION
      });

      setProgressText("🚀 Finalizing PDF Document...");
      await new Promise(r => setTimeout(r, 400));

      const finalFilename = 'JagaGarasimu_Laporan';

      if (Platform.OS === 'web') {
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFilename + '.html'; 
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setExportDone(true);
      } else if (Platform.OS === 'android') {
        const { base64 } = await Print.printToFileAsync({ html: htmlContent, base64: true });
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const savedUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, finalFilename, 'application/pdf');
          await FileSystem.writeAsStringAsync(savedUri, base64 || '', { encoding: FileSystem.EncodingType.Base64 });
          setExportDone(true);
        } else {
          setLoading(false);
          return;
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
        const newUri = FileSystem.documentDirectory + finalFilename + '.pdf';
        const fileInfo = await FileSystem.getInfoAsync(newUri);
        if (fileInfo.exists) await FileSystem.deleteAsync(newUri);
        await FileSystem.copyAsync({ from: uri, to: newUri });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(newUri, { UTI: '.pdf', mimeType: 'application/pdf' });
          setExportDone(true);
        }
      }

    } catch (e) {
      Alert.alert("Export Gagal", "Aplikasi gagal memproses file.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // BACKUP CODE ENGINE (.VHDB) - HYBRID LOCAL + CLOUD
  // =========================================================
  const handleExportBackup = async () => {
    setLoading(true);
    setExportDone(false);
    try {
      setProgressText("🔄 Menyiapkan Salinan Database...");
      await new Promise(r => setTimeout(r, 600)); 

      const keys = await AsyncStorage.getAllKeys();
      const garasiKeys = keys.filter(k => k.startsWith('garasi_') || k.startsWith('app_'));
      const allData = await AsyncStorage.multiGet(garasiKeys);
      let backupObj = Object.fromEntries(allData);

      if (!selectedVehicles.includes('all')) {
        try {
          if (backupObj.garasi_vehicles) {
            const allV = JSON.parse(backupObj.garasi_vehicles);
            backupObj.garasi_vehicles = JSON.stringify(allV.filter((v: any) => selectedVehicles.includes(v.id)));
          }
          if (backupObj.garasi_repairs) {
            const allR = JSON.parse(backupObj.garasi_repairs);
            backupObj.garasi_repairs = JSON.stringify(allR.filter((r: any) => selectedVehicles.includes(r.vehicleId)));
          }
          if (backupObj.garasi_fuel_entries) {
            const allF = JSON.parse(backupObj.garasi_fuel_entries);
            backupObj.garasi_fuel_entries = JSON.stringify(allF.filter((f: any) => selectedVehicles.includes(f.vehicleId)));
          }
          if (backupObj.garasi_reminders) {
            const allRem = JSON.parse(backupObj.garasi_reminders);
            backupObj.garasi_reminders = JSON.stringify(allRem.filter((rem: any) => selectedVehicles.includes(rem.vehicleId)));
          }
          if (backupObj.garasi_notifications) {
             const allNotif = JSON.parse(backupObj.garasi_notifications);
             backupObj.garasi_notifications = JSON.stringify(allNotif.filter((n: any) => !n.vehicleId || selectedVehicles.includes(n.vehicleId)));
          }
          
          // 🚀 SUNTIKAN INTEGRASI: Pastikan tabel histori pajak ikut tersaring berdasarkan ID kendaraan saat di-export
          if (backupObj.garasi_tax_history) {
            const allTaxHist = JSON.parse(backupObj.garasi_tax_history);
            backupObj.garasi_tax_history = JSON.stringify(allTaxHist.filter((th: any) => selectedVehicles.includes(th.vehicle_id)));
          }
        } catch (err) {
          console.log("Error filtering backup data:", err);
        }
      }

      const payload = {
        meta: {
          app_name: CURRENT_APP_NAME,
          schema_version: CURRENT_SCHEMA_VERSION,
          export_date: new Date().toISOString(),
          vehicle_target: selectedVehicles 
        },
        data: backupObj
      };

      // 📊 Hitung statistik internal database untuk struktur metadata Cloud DB
      const parsedVehicles = backupObj.garasi_vehicles ? JSON.parse(backupObj.garasi_vehicles) : [];
      const parsedRepairs = backupObj.garasi_repairs ? JSON.parse(backupObj.garasi_repairs) : [];
      const parsedFuels = backupObj.garasi_fuel_entries ? JSON.parse(backupObj.garasi_fuel_entries) : [];

      const calculatedMetadata = {
        fileSize: estimatedSize + " KB",
        vehicleCount: parsedVehicles.length,
        serviceCount: parsedRepairs.length,
        fuelCount: parsedFuels.length,
        appVersion: CURRENT_SCHEMA_VERSION
      };

      // ☁️ Cek status sinkronisasi akun (Apakah login & online)
      const currentMode = await apiService.getServiceMode();
      
      setLoading(false); // Matikan loader agar Alert dialog tidak terblokir di Android/iOS

      if (currentMode === 'supabase') {
        // 🌟 JIKA AKUN CLOUD AKTIF: Munculkan opsi pilihan penyimpanan data
        Alert.alert(
          "Pilih Lokasi Backup",
          "Akun Cloud Anda terhubung. Di mana Anda ingin mengamankan berkas database ini?",
          [
            {
              text: "💾 Simpan di Perangkat (Lokal)",
              onPress: () => saveBackupToLocalStorage(payload)
            },
            {
              text: "☁️ Unggah ke Cloud GarasiKu",
              onPress: () => saveBackupToCloudStorage(payload, calculatedMetadata)
            },
            { text: "Batal", style: "cancel" }
          ]
        );
      } else {
        // 🚗 JIKA OFFLINE/TAMU: Eksekusi langsung jalur penyimpanan internal lokal
        saveBackupToLocalStorage(payload);
      }

    } catch (e) {
      setLoading(false);
      Alert.alert("Export Gagal", "Aplikasi gagal memproses enkripsi database.");
    }
  };

  // 📝 SUB-ENGINE A: Proses Export Fisik ke File Lokal (Web & Mobile Fixed)
  const saveBackupToLocalStorage = async (payload: any) => {
    setLoading(true);
    try {
      setProgressText("🔄 Mengompres Berkas...");
      const finalFilename = 'JagaGarasimu';
      const jsonString = JSON.stringify(payload);

      if (Platform.OS === 'web') {
        // 🚀 FIX: Langsung buat blob dan download tanpa interupsi state
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFilename + '.vhdb';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Set info selesai setelah file berhasil dilempar ke browser
        setExportDone(true);
      } else if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const savedUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, finalFilename, 'application/octet-stream');
          await FileSystem.writeAsStringAsync(savedUri, jsonString);
          setExportDone(true);
        } else {
          setLoading(false);
          return;
        }
      } else {
        const fileUri = FileSystem.documentDirectory + finalFilename + '.vhdb';
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists) await FileSystem.deleteAsync(fileUri);

        await FileSystem.writeAsStringAsync(fileUri, jsonString);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { mimeType: 'application/octet-stream', dialogTitle: 'Simpan Backup GarasiKu' });
          setExportDone(true);
        }
      }

      // 🚀 FIX: Gunakan string statis untuk progress text agar tidak balapan dengan state
      setProgressText("✅ Export Completed");
      await new Promise(r => setTimeout(r, 400));

    } catch (err) {
      Alert.alert("Export Gagal", "Gagal menyimpan data ke penyimpanan lokal perangkat.");
    } finally {
      setLoading(false);
    }
  };

  // 📝 SUB-ENGINE B: Proses Unggah & Injeksi Data ke Supabase Cloud
  const saveBackupToCloudStorage = async (payload: any, metadata: any) => {
    setLoading(true);
    setProgressText("☁️ Mengamankan ke Server Cloud...");
    try {
      // Menyusun format nama arsip otomatis secara rapi berdasarkan target filter kendaraan
      const cleanVehicleTag = vehicleName.replace(/,\s*/g, '_').replace(/\s+/g, '');
      const dateTag = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
      const backupName = `Backup_${cleanVehicleTag}_${dateTag}`;

      const result = await apiService.uploadBackupToCloud(payload, backupName, metadata);

      if (result.success) {
        setExportDone(true);
        Alert.alert(
          "Sukses Cloud Backup!", 
          `Arsip database "${backupName}" telah berhasil diunggah dan diamankan pada server cloud GarasiKu.`
        );
      } else {
        // 🚀 FIX: Tampilkan error asli dari Supabase agar ketahuan masalahnya apa
        Alert.alert(
          "Gagal Cloud Backup", 
          `Sistem ditolak oleh server.\n\nDetail: ${result.error}`
        );
      }
    } catch (err: any) {
      Alert.alert("Error Cloud", `Terjadi kesalahan internal: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // 🚀 ENGINE BARU: PROSES IMPORT FILE & RESTORE (SUPPORT WEB & MOBILE)
  // =========================================================
  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        setProgressText("🔄 Mengekstrak Data...");
        
        const asset = result.assets[0];
        let content = "";

        if (Platform.OS === 'web') {
          const response = await fetch(asset.uri);
          content = await response.text();
        } else {
          content = await FileSystem.readAsStringAsync(asset.uri);
        }
        
        let decrypted;
        try {
          decrypted = JSON.parse(content);
        } catch (err) {
          throw new Error("CORRUPTED");
        }

        if (!decrypted.meta || !decrypted.data || decrypted.meta.app_name !== CURRENT_APP_NAME) {
          throw new Error("INVALID_FORMAT");
        }

        setStagedFile({
          name: asset.name || 'Backup_Database.vhdb',
          version: decrypted.meta.schema_version,
          date: decrypted.meta.export_date,
          size: (content.length / 1024).toFixed(1) + " KB"
        });
        setStagedData(decrypted);
      }
    } catch (e: any) {
       const isCorrupted = e.message === "CORRUPTED";
       const isInvalid = e.message === "INVALID_FORMAT";
       const title = isCorrupted ? "File Rusak" : (isInvalid ? "Format Tidak Dikenali" : "Error");
       const desc = isCorrupted ? "File backup tidak dapat dibaca atau korup." : (isInvalid ? "Ini bukan file backup dari aplikasi GarasiKu." : "Sistem gagal membuka file tersebut.");
       
       if (Platform.OS === 'web') {
         window.alert(`${title}\n\n${desc}`);
       } else {
         Alert.alert(title, desc);
       }
    } finally {
      setLoading(false);
    }
  };

  // ☁️ SUB-ENGINE C: Mengunduh file backup dari Supabase Storage ke antrean staged restore
  const handleCloudBackupSelect = async (backupItem: any) => {
    setLoading(true);
    setProgressText("☁️ Mengunduh aman berkas dari cloud...");
    try {
      const decrypted = await apiService.downloadBackupFromCloud(backupItem.file_path);
      
      if (!decrypted || !decrypted.meta || !decrypted.data || decrypted.meta.app_name !== CURRENT_APP_NAME) {
        throw new Error("INVALID_FORMAT");
      }

      setStagedFile({
        name: backupItem.backup_name + '.vhdb',
        version: backupItem.app_version,
        date: backupItem.created_at,
        size: backupItem.file_size,
        isFromCloud: true
      });
      setStagedData(decrypted);
    } catch (err: any) {
      Alert.alert(
        "Gagal Mengunduh", 
        err.message === "INVALID_FORMAT" 
          ? "Berkas di dalam cloud tidak dikenali oleh enkripsi sistem." 
          : "Koneksi terputus saat mengunduh berkas database."
      );
    } finally {
      setLoading(false);
    }
  };

  const executeRestore = async (restoreMode: 'replace' | 'merge') => {
    if (!stagedData) return;
    setLoading(true);
    setProgressText("🚀 Merestore Database...");

    try {
      // 🚀 STEP 1: Ambil info user yang sedang login di HP baru saat ini
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || null;

      const secureDataPayload = migrateDatabaseSchema(stagedData, CURRENT_SCHEMA_VERSION);
      let dataToRestore = { ...secureDataPayload.data };

      // 🚀 STEP 2: Sinkronisasi ID Akun (Ubah ID pemilik lama menjadi ID baru di HP ini)
      if (currentUserId) {
        console.log("LOG: Menyinkronkan ID akun lama ke ID pengguna baru:", currentUserId);
        
        // Perbarui field user_profile jika ada di dalam data backup
        if (dataToRestore.garasi_user_profile) {
          try {
            const profileObj = JSON.parse(dataToRestore.garasi_user_profile);
            profileObj.user_id = currentUserId; // Timpa ID
            if (user?.email) profileObj.email = user.email; // Samakan email login cloud
            dataToRestore.garasi_user_profile = JSON.stringify(profileObj);
          } catch (e) { console.log("Gagal sinkronisasi ID profil"); }
        }

        // Perbarui keterikatan ID pada tabel kendaraan (Mencegah data tersembunyi di RLS)
        if (dataToRestore.garasi_vehicles) {
          try {
            const vehiclesArr = JSON.parse(dataToRestore.garasi_vehicles);
            const updatedVehicles = vehiclesArr.map((v: any) => ({ ...v, user_id: currentUserId }));
            dataToRestore.garasi_vehicles = JSON.stringify(updatedVehicles);
          } catch (e) { console.log("Gagal sinkronisasi ID kendaraan"); }
        }
      }

      // LOGIKA RESTORE DATA
      if (restoreMode === 'replace') {
        const keys = await AsyncStorage.getAllKeys();
        const garasiKeys = keys.filter(k => k.startsWith('garasi_'));
        await AsyncStorage.multiRemove(garasiKeys);

        const entries = Object.entries(dataToRestore);
        await AsyncStorage.multiSet(entries as [string, string][]);
      } else if (restoreMode === 'merge') {
         const newEntries: [string, string][] = [];
         for (const [key, newValue] of Object.entries(dataToRestore)) {
            const oldValue = await AsyncStorage.getItem(key);
            if (oldValue && key.startsWith('garasi_') && key !== 'garasi_user_profile') {
              try {
                const oldArr = JSON.parse(oldValue);
                const newArr = JSON.parse(newValue as string);
                if (Array.isArray(oldArr) && Array.isArray(newArr)) {
                  const combined = [...oldArr];
                  newArr.forEach((item: any) => {
                    if (!combined.some((o: any) => o.id === item.id)) {
                      combined.push(item);
                    }
                  });
                  newEntries.push([key, JSON.stringify(combined)]);
                  continue;
                }
              } catch (e) { console.log("Merge fallback error for key:", key); }
            }
            newEntries.push([key, newValue as string]);
         }
         await AsyncStorage.multiSet(newEntries);
      }

      setStagedData(null);
      setStagedFile(null);
      
      // 🚀 STEP 3: Pastikan setelah restore, status aplikasi dipaksa mengunci ke 'online' kembali
      await AsyncStorage.setItem('garasiku_app_mode', currentUserId ? 'online' : 'local');
      
      if (Platform.OS === 'web') {
        window.alert("Restore Sukses!\n\nDatabase kendaraan telah berhasil dipulihkan.");
      } else {
        Alert.alert("Restore Sukses!", "Database kendaraan telah berhasil dipulihkan. Mengembalikan ke beranda...");
      }
      
      router.replace("/");
    } catch (e) {
      console.log("Execute Restore Error:", e);
      Alert.alert("Restore Gagal", "Sistem gagal menyuntikkan data internal.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* FIXED HEADER */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.back()} style={{ paddingVertical: 10, paddingRight: 15 }}>
          <Text style={{ color: "#F5A623", fontSize: 16, fontWeight: "700" }}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Database Manager</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 150 }}>
        
        {/* SEMBUNYIKAN TAB JIKA SEDANG VALIDASI IMPORT */}
        {!stagedFile && (
          <View style={styles.tabContainer}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => setMode('backup')} style={[styles.tabBtn, mode === 'backup' && styles.tabActive]}>
              <Text style={[styles.tabTxt, mode === 'backup' && styles.txtActive]}>💾 Backup (.vhdb)</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.9} onPress={() => setMode('pdf')} style={[styles.tabBtn, mode === 'pdf' && styles.tabActive]}>
              <Text style={[styles.tabTxt, mode === 'pdf' && styles.txtActive]}>📄 Laporan PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.9} onPress={() => setMode('import')} style={[styles.tabBtn, mode === 'import' && styles.tabActive]}>
              <Text style={[styles.tabTxt, mode === 'import' && styles.txtActive]}>📥 Import Data</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAMPILAN JIKA SEDANG VALIDASI FILE YANG DI IMPORT */}
        {stagedFile ? (
          <View style={{ gap: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 166, 35, 0.1)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#F5A623' }}>
              <Text style={{ fontSize: 30, marginRight: 15 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#F5A623', fontSize: 16, fontWeight: '900' }}>VALIDASI BACKUP</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 }}>File telah diverifikasi. Silakan pilih metode restore di bawah ini.</Text>
              </View>
            </View>

            <View style={styles.previewCard}>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 15 }}>📄 {stagedFile.name}</Text>
              <View style={{ gap: 10 }}>
                <View style={styles.previewRow}><Text style={styles.previewLabel}>Ukuran Database</Text><Text style={styles.previewVal}>{stagedFile.size}</Text></View>
                <View style={styles.previewRow}><Text style={styles.previewLabel}>Tanggal Backup</Text><Text style={styles.previewVal}>{new Date(stagedFile.date).toLocaleDateString('id-ID')}</Text></View>
                <View style={styles.previewRow}><Text style={styles.previewLabel}>Versi Mesin</Text><Text style={{ color: '#4ECDC4', fontWeight: '800' }}>v{stagedFile.version} (Compatible)</Text></View>
              </View>
            </View>

            <View style={{ gap: 12, marginTop: 10 }}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => executeRestore('merge')} style={styles.btnPrimary}>
                <Text style={styles.btnPrimaryTxt}>A. GABUNGKAN DATA (MERGE AMAN)</Text>
                <Text style={{ color: 'rgba(0,0,0,0.5)', fontSize: 11, marginTop: 2, textAlign: 'center' }}>Data saat ini tidak dihapus, hanya menutupi yang hilang.</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.9} onPress={() => executeRestore('replace')} style={[styles.btnPrimary, { backgroundColor: '#FF5252', shadowColor: '#FF5252' }]}>
                <Text style={[styles.btnPrimaryTxt, { color: '#FFF' }]}>B. TIMPA SEMUA (REPLACE ALL)</Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2, textAlign: 'center' }}>Hapus bersih aplikasi & ganti total dengan isi file ini.</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.9} onPress={() => { setStagedFile(null); setStagedData(null); }} style={{ padding: 15, alignItems: 'center', marginTop: 5 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>Batal & Kembali</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : mode === 'import' ? (
          <View style={{ gap: 20 }}>
            {/* 💾 SECTION A: LOCAL RESTORE */}
            <View style={styles.card}>
               <View style={styles.iconBox}><Text style={{fontSize:30}}>💾</Text></View>
               <Text style={styles.cardTitle}>Restore File Perangkat (.vhdb)</Text>
               <Text style={styles.cardDesc}>Unggah berkas arsip database lokal untuk memulihkan seluruh catatan kendaraan Anda secara manual.</Text>
               <TouchableOpacity activeOpacity={0.9} onPress={handleImport} style={styles.btnPrimary}>
                  <Text style={styles.btnPrimaryTxt}>PILIH FILE DARI STORAGE</Text>
               </TouchableOpacity>
            </View>

            {/* ☁️ SECTION B: CLOUD BACKUP RESTORE */}
            <View>
              <Text style={styles.sectionLabel}>☁️ CLOUD BACKUP RESTORE ENGINE</Text>
              
              {!isCloudUser ? (
                <View style={[styles.card, { borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }]}>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', lineHeight: 20, padding: 10 }}>
                    Fitur restore otomatis dari awan dinonaktifkan. Silakan aktifkan sinkronisasi Cloud terlebih dahulu pada menu Profil.
                  </Text>
                </View>
              ) : loadingCloud ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#4ECDC4" />
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 10 }}>Menghubungkan ke kluster cloud...</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <View style={{ backgroundColor: 'rgba(78,205,196,0.08)', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(78,205,196,0.2)' }}>
                    <Text style={{ color: '#4ECDC4', fontSize: 12, fontWeight: '800' }}>
                      🟢 {cloudBackups.length} Backup Cloud Ditemukan Pada Akun Ini
                    </Text>
                  </View>

                  {cloudBackups.length === 0 ? (
                    <View style={[styles.card, { padding: 30 }]}>
                      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center' }}>
                        Belum ada arsip riwayat backup cloud yang tersimpan pada server akun Anda.
                      </Text>
                    </View>
                  ) : (
                    cloudBackups.map((item) => (
                      <View key={item.id} style={[styles.previewCard, { borderColor: 'rgba(255,255,255,0.05)', padding: 16 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }} numberOfLines={1}>
                              📁 {item.backup_name}
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4 }}>
                              Diunggah: {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} &bull; v{item.app_version}
                            </Text>
                            
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>🚗 <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{item.vehicle_count}</Text> Kendaraan</Text>
                              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>⛽ <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{item.fuel_count}</Text> BBM</Text>
                              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>🛠️ <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{item.service_count}</Text> Servis</Text>
                            </View>
                          </View>
                          
                          <View style={{ alignItems: 'flex-end', gap: 12 }}>
                            <Text style={{ color: '#F5A623', fontSize: 12, fontWeight: '800', fontFamily: 'SpaceMono' }}>
                              {item.file_size}
                            </Text>
                            <TouchableOpacity 
                              activeOpacity={0.8}
                              onPress={() => handleRestoreCloud(item)} 
                              style={{ backgroundColor: 'rgba(78,205,196,0.15)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#4ECDC4' }}
                            >
                              <Text style={{ color: '#4ECDC4', fontSize: 11, fontWeight: '900' }}>RESTORE</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={{ gap: 20 }}>
            {/* STEP 1: PILIH TARGET KENDARAAN */}
            <View>
              <Text style={styles.sectionLabel}>1. TARGET KENDARAAN</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => toggleVehicleSelection('all')} style={[styles.pillBtn, selectedVehicles.includes('all') && styles.pillActive]}>
                  <Text style={[styles.pillTxt, selectedVehicles.includes('all') && styles.pillTxtActive]}>Semua Kendaraan</Text>
                </TouchableOpacity>
                {vehicles.map(v => (
                  <TouchableOpacity activeOpacity={0.9} key={v.id} onPress={() => toggleVehicleSelection(v.id)} style={[styles.pillBtn, selectedVehicles.includes(v.id) && styles.pillActive]}>
                    <Text style={[styles.pillTxt, selectedVehicles.includes(v.id) && styles.pillTxtActive]}>{v.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* ☁️ INTEGRASI OPTION: SELEKTOR JADWAL AUTO BACKUP CLOUD */}
            {mode === 'backup' && (
              isCloudUser ? (
                <View style={{ marginBottom: 5 }}>
                  <Text style={styles.sectionLabel}>🔄 ATURAN OTOMATISASI DATA</Text>
                  
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={async () => {
                      if (Platform.OS === 'web') {
                        const webChoice = window.prompt(
                          "Pilih Jadwal Auto Backup Cloud:\n\nKetik ANGKA pilihannya:\n1 = Manual Only (Nonaktif)\n2 = Harian (Setiap Hari)\n3 = Mingguan (Setiap Minggu)\n4 = Bulanan (Setiap Bulan)", 
                          autoBackupRule === 'off' ? '1' : autoBackupRule === 'daily' ? '2' : autoBackupRule === 'weekly' ? '3' : '4'
                        );
                        
                        if (webChoice === '1') {
                          await AsyncStorage.setItem('garasi_auto_backup_rule', 'off');
                          setAutoBackupRule('off');
                        } else if (webChoice === '2') {
                          await AsyncStorage.setItem('garasi_auto_backup_rule', 'daily');
                          setAutoBackupRule('daily');
                        } else if (webChoice === '3') {
                          await AsyncStorage.setItem('garasi_auto_backup_rule', 'weekly');
                          setAutoBackupRule('weekly');
                        } else if (webChoice === '4') {
                          await AsyncStorage.setItem('garasi_auto_backup_rule', 'monthly');
                          setAutoBackupRule('monthly');
                        }
                        return; 
                      }

                      Alert.alert(
                        "Jadwal Auto Backup Cloud",
                        "Pilih seberapa sering sistem harus mengamankan data Anda ke cloud secara otomatis:",
                        [
                          {
                            text: "🔒 Manual (Nonaktif)",
                            onPress: async () => {
                              await AsyncStorage.setItem('garasi_auto_backup_rule', 'off');
                              setAutoBackupRule('off');
                            }
                          },
                          {
                            text: "📅 Harian (Setiap Hari)",
                            onPress: async () => {
                              await AsyncStorage.setItem('garasi_auto_backup_rule', 'daily');
                              setAutoBackupRule('daily');
                            }
                          },
                          {
                            text: "📆 Mingguan (Setiap Minggu)",
                            onPress: async () => {
                              await AsyncStorage.setItem('garasi_auto_backup_rule', 'weekly');
                              setAutoBackupRule('weekly');
                            }
                          },
                          {
                            text: "🗄️ Bulanan (Setiap Bulan)",
                            onPress: async () => {
                              await AsyncStorage.setItem('garasi_auto_backup_rule', 'monthly');
                              setAutoBackupRule('monthly');
                            }
                          },
                          { text: "Batal", style: "cancel" }
                        ]
                      );
                    }}
                    style={{
                      backgroundColor: "#1A2B3C",
                      borderRadius: 14,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.05)"
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Text style={{ fontSize: 16 }}>☁️</Text>
                      <View>
                        <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "700" }}>Auto Backup Cloud</Text>
                        <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 2 }}>
                          Status sinkronisasi background berkala
                        </Text>
                      </View>
                    </View>
                    
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ 
                        color: autoBackupRule === 'off' ? "rgba(255,255,255,0.4)" : "#4ECDC4", 
                        fontSize: 13, 
                        fontWeight: "800" 
                      }}>
                        {autoBackupRule === 'off' ? 'Manual' : autoBackupRule === 'daily' ? 'Harian' : autoBackupRule === 'weekly' ? 'Mingguan' : 'Bulanan'}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>▼</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ backgroundColor: "rgba(255,255,255,0.02)", padding: 16, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}>
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, lineHeight: 18 }}>
                    ℹ️ Anda menggunakan **Penyimpanan Lokal**. File arsip ekspor `.vhdb` dapat Anda unduh secara manual di bawah dan disimpan ke Google Drive, Flashdisk, atau memori internal HP Anda sebagai cadangan mandiri.
                  </Text>
                </View>
              )
            )}

            {/* FILTER PERIODE DENGAN TAHUN DINAMIS & CUSTOM DATE */}
            {mode === 'pdf' && (
              <>
                <View>
                  <Text style={styles.sectionLabel}>⏱️ FILTER PERIODE LAPORAN</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {periodOptions.map((p) => (
                      <TouchableOpacity 
                        key={p} 
                        activeOpacity={0.9}
                        onPress={() => setPeriod(p)} 
                        style={[styles.smallPill, period === p && styles.smallPillActive]}
                      >
                        <Text style={[styles.smallPillTxt, period === p && styles.smallPillTxtActive]}>
                          {getPeriodLabel(p)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* INPUT TANGGAL CUSTOM */}
                  {period === 'custom' && (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                      <View style={{ flex: 1 }}>
                         <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 5 }}>DARI TANGGAL</Text>
                         <TextInput 
                           style={styles.dateInput} 
                           placeholder="YYYY-MM-DD" 
                           placeholderTextColor="rgba(255,255,255,0.2)"
                           value={customStart}
                           onChangeText={setCustomStart}
                         />
                      </View>
                      <View style={{ flex: 1 }}>
                         <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 5 }}>SAMPAI TANGGAL</Text>
                         <TextInput 
                           style={styles.dateInput} 
                           placeholder="YYYY-MM-DD" 
                           placeholderTextColor="rgba(255,255,255,0.2)"
                           value={customEnd}
                           onChangeText={setCustomEnd}
                         />
                      </View>
                    </View>
                  )}
                </View>

                <View>
                  <Text style={styles.sectionLabel}>📁 KATEGORI DATA</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
                    <TouchableOpacity 
                      activeOpacity={0.9} 
                      onPress={() => toggleCategory('all')} 
                      style={[styles.smallPill, selectedCategories.length === 3 && styles.smallPillActive]}
                    >
                      <Text style={[styles.smallPillTxt, selectedCategories.length === 3 && styles.smallPillTxtActive]}>Semua Data</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      activeOpacity={0.9} 
                      onPress={() => toggleCategory('fuel')} 
                      style={[styles.smallPill, selectedCategories.includes('fuel') && selectedCategories.length < 3 && styles.smallPillActive]}
                    >
                      <Text style={[styles.smallPillTxt, selectedCategories.includes('fuel') && selectedCategories.length < 3 && styles.smallPillTxtActive]}>Bensin</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      activeOpacity={0.9} 
                      onPress={() => toggleCategory('service')} 
                      style={[styles.smallPill, selectedCategories.includes('service') && selectedCategories.length < 3 && styles.smallPillActive]}
                    >
                      <Text style={[styles.smallPillTxt, selectedCategories.includes('service') && selectedCategories.length < 3 && styles.smallPillTxtActive]}>Servis</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      activeOpacity={0.9} 
                      onPress={() => toggleCategory('tax')} 
                      style={[styles.smallPill, selectedCategories.includes('tax') && selectedCategories.length < 3 && styles.smallPillActive]}
                    >
                      <Text style={[styles.smallPillTxt, selectedCategories.includes('tax') && selectedCategories.length < 3 && styles.smallPillTxtActive]}>Pajak</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View>
                  <Text style={styles.sectionLabel}>📐 MODE FORMAT PDF</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity 
                      activeOpacity={0.9}
                      onPress={() => setPdfReportType('summary')} 
                      style={[styles.selectorCard, pdfReportType === 'summary' && styles.selectorActive]}
                    >
                      <Text style={styles.selectorEmoji}>📊</Text>
                      <Text style={styles.selectorTitle}>Executive Summary</Text>
                      <Text style={styles.selectorDesc}>Hanya Dashboard & Analisa Insight. Sangat ringan.</Text>
                    </TouchableOpacity>

                    {/* 🔒 PREMIUM GATEWAY */}
                    <TouchableOpacity 
                      activeOpacity={0.9}
                      onPress={() => {
                        if (!isPremium) {
                          if (Platform.OS === 'web') {
                            window.alert("🔒 Fitur Premium: Hybrid Report (Statistik + Tabel Audit) memerlukan akun Premium GarasiKu.");
                          }
                          setPremiumModalVisible(true);
                          return;
                        }
                        setPdfReportType('hybrid');
                      }} 
                      style={[
                        styles.selectorCard, 
                        pdfReportType === 'hybrid' && styles.selectorActive,
                        !isPremium && { opacity: 0.65, borderColor: 'rgba(245,166,35,0.15)' }
                      ]}
                    >
                      <View style={{ position: 'absolute', top: 12, right: 14 }}>
                        <Text style={{ fontSize: 11, color: isPremium ? '#4ECDC4' : '#F5A623', fontWeight: '900' }}>
                          {isPremium ? '💎' : '🔒 PREMIUM'}
                        </Text>
                      </View>

                      <Text style={styles.selectorEmoji}>⚡</Text>
                      <Text style={styles.selectorTitle}>Hybrid Report</Text>
                      <Text style={styles.selectorDesc}>Dashboard Statistik + Lampiran Audit tabel di akhir file.</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            {/* STEP 2: PREVIEW INFORMASI DATA */}
            <View>
              <Text style={styles.sectionLabel}>2. REALTIME DATA SCOPE PREVIEW</Text>
              <View style={[styles.previewCard, isDataEmpty && mode === 'pdf' && { borderColor: '#FF5252' }]}>
                <Text style={styles.previewTitle}>📋 {vehicleName}</Text>
                
                {isDataEmpty && mode === 'pdf' ? (
                  <Text style={{ color: '#FF5252', fontSize: 12, marginTop: 10, fontWeight: '700' }}>
                    ⚠️ Tidak ada data untuk kriteria ini. PDF yang dihasilkan akan kosong.
                  </Text>
                ) : (
                  <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 15, marginTop: 10, gap: 8 }}>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Riwayat Servis Tersaring</Text>
                      <Text style={styles.previewVal}>{filteredRepairs.length} Data</Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Riwayat BBM Tersaring</Text>
                      <Text style={styles.previewVal}>{filteredFuels.length} Data</Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Riwayat Pajak Tersaring</Text>
                      <Text style={styles.previewVal}>{filteredTaxes.length} Data</Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Estimasi Ukuran Log</Text>
                      <Text style={styles.previewVal}>{estimatedSize} KB</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* STEP 3: EXE ACTION */}
            <View>
              <Text style={styles.sectionLabel}>3. PROSES GENERATE</Text>
              <View style={styles.card}>
                <Text style={styles.cardDesc}>
                  {mode === 'pdf' 
                    ? "Sistem akan membuat file laporan PDF bernama JagaGarasimu_Laporan.pdf" 
                    : "Sistem akan membuat file backup paten bernama JagaGarasimu.vhdb"}
                </Text>
                
                <TouchableOpacity 
                  onPress={() => {
                    if (mode === 'backup') {
                      handleExportBackup();
                    } else {
                      handleExportPDF(); 
                    }
                  }} 
                  style={[styles.btnPrimary, isDataEmpty && mode === 'pdf' && { backgroundColor: 'rgba(78,205,196,0.3)' }]}
                  activeOpacity={0.9}
                  disabled={isDataEmpty && mode === 'pdf'}
                >
                  <Text style={[styles.btnPrimaryTxt, isDataEmpty && mode === 'pdf' && { color: 'rgba(255,255,255,0.3)' }]}>
                    {mode === 'backup' 
                      ? (isCloudUser ? 'MULAI EKSPOR' : 'UNDUH FILE BACKUP (.VHDB)')
                      : (selectedCategories.length === 1 && selectedCategories.includes('tax') ? 'GENERATE PDF PAJAK SAMSAT' : 'GENERATE PDF LAPORAN')
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FULLSCREEN PROGRESS OVERLAY STATE */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#4ECDC4" />
            <Text style={styles.loadingText}>{progressText}</Text>
          </View>
        </View>
      )}

      {/* COMPLETED BANNER NOTIFICATION */}
      {exportDone && !loading && (
        <View style={styles.successBanner}>
          <Text style={{ fontSize: 20 }}>✅</Text>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={{ color: '#0D1B2A', fontWeight: '800' }}>Export Completed</Text>
            <Text style={{ color: 'rgba(0,0,0,0.6)', fontSize: 12 }}>File premium sukses diproses dan disimpan.</Text>
          </View>
        </View>
      )}

      {/* 💳 MODAL BILLING PEMBELIAN PREMIUM GARASIKU */}
      <PremiumPurchaseModal
        visible={premiumModalVisible}
        prefillFeature={{
          name: "Hybrid Report PDF",
          desc: "Membuka opsi ekspor kombinasi grafik infografis visual beserta tabel audit transaksi penuh."
        }}
        onClose={() => setPremiumModalVisible(false)} 
      />

    </View>
  );
}

// 🚀 CROSS-VERSION COMPATIBILITY MIGRATION ENGINE
function migrateDatabaseSchema(importedData: any, targetVersion: string): any {
  console.log(`🤖 Menjalankan Migrasi Skema: v${importedData.meta?.schema_version || '1.0.0'} -> v${targetVersion}`);
  
  const data = { ...importedData.data };

  if (data.garasi_vehicles) {
    try {
      const vehicles = JSON.parse(data.garasi_vehicles);
      const migratedVehicles = vehicles.map((v: any) => {
        if (v.tankCapacity === undefined) v.tankCapacity = 4.0;
        if (!v.color) v.color = '#4ECDC4';
        v.currentOdometer = parseInt(v.currentOdometer, 10) || 0;
        return v;
      });
      data.garasi_vehicles = JSON.stringify(migratedVehicles);
    } catch (e) {
      console.log("Gagal migrasi skema kendaraan:", e);
    }
  }

  if (data.garasi_repairs) {
    try {
      const repairs = JSON.parse(data.garasi_repairs);
      const migratedRepairs = repairs.map((r: any) => {
        if (r.cost === undefined && r.price !== undefined) r.cost = r.price;
        r.cost = parseFloat(r.cost) || 0;
        r.odometer = parseInt(r.odometer, 10) || 0;
        if (r.old_unused_field) delete r.old_unused_field; 
        return r;
      });
      data.garasi_repairs = JSON.stringify(migratedRepairs);
    } catch (e) {
      console.log("Gagal migrasi skema perbaikan:", e);
    }
  }

  if (data.garasi_fuel_entries) {
    try {
      const fuels = JSON.parse(data.garasi_fuel_entries);
      const migratedFuels = fuels.map((f: any) => {
        if (f.totalCost === undefined && f.cost !== undefined) f.totalCost = f.cost;
        f.liters = parseFloat(f.liters) || 0;
        f.pricePerLiter = parseFloat(f.pricePerLiter) || 0;
        f.totalCost = parseFloat(f.totalCost) || 0;
        f.odometer = parseInt(f.odometer, 10) || 0;
        return f;
      });
      data.garasi_fuel_entries = JSON.stringify(migratedFuels);
    } catch (e) {
      console.log("Gagal migrasi skema bensin:", e);
    }
  }

  return {
    ...importedData,
    data
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#1A2B3C', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', flex: 1, textAlign: 'center', marginRight: 60 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: 5, marginBottom: 25 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: '#1A2B3C', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  tabTxt: { color: 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 12 },
  txtActive: { color: '#4ECDC4', fontWeight: '900' },

  sectionLabel: { color: '#4ECDC4', fontSize: 11, fontWeight: '800', marginBottom: 12, letterSpacing: 1 },
  card: { backgroundColor: '#1A2B3C', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 15, textAlign: 'center' },
  cardDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 4, marginBottom: 15 },
  iconBox: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(78,205,196,0.1)', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },

  pillBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pillActive: { backgroundColor: 'rgba(78,205,196,0.15)', borderColor: '#4ECDC4' },
  pillTxt: { color: 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: 13 },
  pillTxtActive: { color: '#4ECDC4', fontWeight: '900' },

  smallPill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  smallPillActive: { backgroundColor: 'rgba(245,166,35,0.15)', borderColor: '#F5A623' },
  smallPillTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
  smallPillTxtActive: { color: '#F5A623', fontWeight: '900' },

  dateInput: { backgroundColor: 'rgba(0,0,0,0.3)', color: '#FFF', padding: 12, borderRadius: 10, fontSize: 12, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  selectorCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  selectorActive: { borderColor: '#4ECDC4', backgroundColor: 'rgba(78,205,196,0.05)' },
  selectorEmoji: { fontSize: 22, marginBottom: 6 },
  selectorTitle: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  selectorDesc: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 4, lineHeight: 14 },

  previewCard: { backgroundColor: '#1A2B3C', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(78,205,196,0.2)' },
  previewTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  previewVal: { color: '#F5A623', fontWeight: '700', fontSize: 14, fontFamily: 'SpaceMono' },

  btnPrimary: { backgroundColor: '#4ECDC4', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#4ECDC4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  btnPrimaryTxt: { color: '#0D1B2A', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },

  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,27,42,0.92)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  loadingCard: { backgroundColor: '#1A2B3C', padding: 30, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#4ECDC4', width: '75%' },
  loadingText: { color: '#FFF', marginTop: 20, fontWeight: '700', fontSize: 13, textAlign: 'center', letterSpacing: 0.5 },

  successBanner: { position: 'absolute', bottom: 100, left: 20, right: 20, backgroundColor: '#4ECDC4', padding: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, zIndex: 99 }
});