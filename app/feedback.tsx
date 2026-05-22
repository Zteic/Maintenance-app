import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Image, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REPORT_TYPES = ['Bug/Error', 'Saran Fitur', 'Request Update', 'Masalah Performa', 'Masalah Backup', 'Masalah Export PDF', 'Masalah Sinkronisasi', 'Lainnya'];

export default function FeedbackScreen() {
  const router = useRouter();
  
  // States
  const [reportType, setReportType] = useState('Bug/Error');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('none');
  
  // Loading & Status States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const vData = await AsyncStorage.getItem('garasi_vehicles');
      if (vData) setVehicles(JSON.parse(vData));
    };
    loadData();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5, // 🚀 KOMPRESI OTOMATIS: 0.5 sangat ringan tapi tetap jelas terbaca
    });

    if (!result.canceled) {
      setScreenshot(result.assets[0].uri);
    }
  };

  const calculatePriority = (type: string) => {
    if (['Bug/Error', 'Masalah Backup', 'Masalah Sinkronisasi'].includes(type)) return 'High';
    if (['Masalah Performa', 'Masalah Export PDF'].includes(type)) return 'Medium';
    return 'Low';
  };

  const handleSubmit = async () => {
    if (!title || !description) {
      Alert.alert("Form Tidak Lengkap", "Judul dan deskripsi wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Simulasi Upload Screenshot
      if (screenshot) {
        setLoadingText("Uploading Screenshot...");
        await new Promise(r => setTimeout(r, 1000));
      }

      // 2. Kumpulkan Device Info Secara Otomatis
      setLoadingText("Sending Report...");
      const appVersion = Constants.expoConfig?.version || '1.0.0';
      const deviceInfo = `${Device.brand} ${Device.modelName} (Android ${Device.osVersion})`;
      
      const payload = {
        id: `fb_${Date.now()}`,
        report_type: reportType,
        title,
        description,
        screenshot,
        vehicle_id: selectedVehicle === 'none' ? null : selectedVehicle,
        app_version: appVersion,
        device_info: deviceInfo,
        priority: calculatePriority(reportType),
        status: 'Pending',
        created_at: new Date().toISOString()
      };

      // 🚀 INTEGRASI DATABASE DEVELOPER (Supabase/Firebase)
      // Di sinilah nanti Anda menaruh kode: await supabase.from('feedback_reports').insert([payload]);
      
      // Simulasi delay jaringan API
      await new Promise(r => setTimeout(r, 1500));

      // 3. Simpan ke Riwayat Lokal Pengguna
      const existingHistory = await AsyncStorage.getItem('garasi_feedback_history');
      const historyArr = existingHistory ? JSON.parse(existingHistory) : [];
      await AsyncStorage.setItem('garasi_feedback_history', JSON.stringify([payload, ...historyArr]));

      setIsSubmitting(false);
      Alert.alert("Report Sent Successfully", "Terima kasih! Feedback Anda sangat berharga bagi kami.", [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (e) {
      setIsSubmitting(false);
      Alert.alert("Pengiriman Gagal", "Gagal menghubungi server. Periksa koneksi internet Anda.", [
        { text: "Coba Lagi", onPress: handleSubmit },
        { text: "Batal", style: "cancel" }
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 10, paddingRight: 15 }}>
          <Text style={{ color: "#F5A623", fontSize: 16, fontWeight: "700" }}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kirim Feedback</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        
        {/* JENIS LAPORAN */}
        <Text style={styles.label}>JENIS LAPORAN</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginBottom: 20 }}>
          {REPORT_TYPES.map(type => (
            <TouchableOpacity 
              key={type} 
              onPress={() => setReportType(type)}
              style={[styles.pill, reportType === type && styles.pillActive]}
            >
              <Text style={[styles.pillTxt, reportType === type && styles.pillTxtActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* INPUT JUDUL & DESKRIPSI */}
        <Text style={styles.label}>JUDUL LAPORAN</Text>
        <TextInput style={styles.input} placeholder="Contoh: Aplikasi crash saat export PDF..." placeholderTextColor="#7f8c8d" value={title} onChangeText={setTitle} />

        <Text style={styles.label}>DETAIL DESKRIPSI</Text>
        <TextInput 
          style={[styles.input, { height: 120, textAlignVertical: 'top' }]} 
          placeholder="Ceritakan sedetail mungkin bug yang terjadi atau ide fitur yang Anda inginkan..." 
          placeholderTextColor="#7f8c8d" 
          multiline 
          value={description} 
          onChangeText={setDescription} 
        />

        {/* KENDARAAN TERKAIT */}
        {vehicles.length > 0 && (
          <>
            <Text style={styles.label}>KENDARAAN TERKAIT (OPSIONAL)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginBottom: 20 }}>
              <TouchableOpacity onPress={() => setSelectedVehicle('none')} style={[styles.pill, selectedVehicle === 'none' && styles.pillActive]}>
                <Text style={[styles.pillTxt, selectedVehicle === 'none' && styles.pillTxtActive]}>Tidak Ada</Text>
              </TouchableOpacity>
              {vehicles.map(v => (
                <TouchableOpacity key={v.id} onPress={() => setSelectedVehicle(v.id)} style={[styles.pill, selectedVehicle === v.id && styles.pillActive]}>
                  <Text style={[styles.pillTxt, selectedVehicle === v.id && styles.pillTxtActive]}>{v.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* UPLOAD SCREENSHOT */}
        <Text style={styles.label}>SCREENSHOT BUKTI (OPSIONAL)</Text>
        <TouchableOpacity onPress={pickImage} style={styles.uploadBox}>
          {screenshot ? (
            <Image source={{ uri: screenshot }} style={{ width: '100%', height: '100%', borderRadius: 14 }} />
          ) : (
            <>
              <Text style={{ fontSize: 24, marginBottom: 5 }}>📷</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' }}>Tap untuk upload screenshot error</Text>
            </>
          )}
        </TouchableOpacity>

        {/* INFO DEVICE OTOMATIS */}
        <View style={styles.infoCard}>
          <Text style={{ color: '#FFF', fontWeight: '800', marginBottom: 5 }}>ℹ️ Auto-Device Diagnostic</Text>
          <Text style={styles.infoTxt}>Sistem akan otomatis mengirimkan informasi berikut untuk membantu developer melakukan debugging:</Text>
          <Text style={[styles.infoTxt, { color: '#4ECDC4', marginTop: 5, fontWeight: 'bold' }]}>
            App Version: {Constants.expoConfig?.version || '1.0.0'}{'\n'}
            Device: {Device.brand} {Device.modelName} (Android {Device.osVersion})
          </Text>
        </View>

        {/* TOMBOL KIRIM */}
        <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting} style={styles.btnSubmit}>
          {isSubmitting ? <ActivityIndicator color="#0D1B2A" /> : <Text style={styles.btnSubmitTxt}>KIRIM LAPORAN SEKARANG</Text>}
        </TouchableOpacity>

        {/* CEK UPDATE MENDATANG */}
        <View style={{ marginTop: 40, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingTop: 25 }}>
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 15 }}>🚀 Lihat Update Mendatang</Text>
          <View style={{ backgroundColor: 'rgba(78,205,196,0.1)', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#4ECDC4' }}>
            <Text style={{ color: '#4ECDC4', fontWeight: '800', marginBottom: 5 }}>GarasiKu v2.2.0 (Upcoming)</Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 20 }}>
              - 
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* OVERLAY LOADING */}
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#4ECDC4" />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#1A2B3C', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', flex: 1, textAlign: 'center', marginRight: 60 },
  label: { color: '#4ECDC4', fontSize: 11, fontWeight: '800', marginBottom: 10, letterSpacing: 1 },
  pill: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pillActive: { backgroundColor: 'rgba(78,205,196,0.15)', borderColor: '#4ECDC4' },
  pillTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' },
  pillTxtActive: { color: '#4ECDC4', fontWeight: '900' },
  input: { backgroundColor: '#1A2B3C', color: '#FFF', padding: 16, borderRadius: 16, fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
  uploadBox: { height: 120, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
  infoCard: { backgroundColor: 'rgba(245,166,35,0.05)', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,166,35,0.3)', marginBottom: 25 },
  infoTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 18 },
  btnSubmit: { backgroundColor: '#4ECDC4', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#4ECDC4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  btnSubmitTxt: { color: '#0D1B2A', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,27,42,0.92)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  loadingCard: { backgroundColor: '#1A2B3C', padding: 30, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#4ECDC4' },
  loadingText: { color: '#FFF', marginTop: 20, fontWeight: '700', fontSize: 13 }
});