import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../utils/supabaseClient'; // 👈 Tetap pertahankan rute keluar 2 kali milikmu
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router'; // 👈 TAMBAHAN FIX: Biar router tidak undefined
import { apiService } from '../../utils/apiService'; // 👈 TAMBAHAN FIX: Biar apiService tidak undefined

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 🚗 Fungsi Menangani Pengguna yang Memilih Mode Offline (Tanpa Akun)
  async function handleOfflineMode() {
    try {
      await AsyncStorage.setItem('garasiku_app_mode', 'local');
      router.replace('/'); 
    } catch (e) {
      Alert.alert('Error', 'Gagal mengaktifkan mode offline.');
    }
  }

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Email dan password wajib diisi!');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Login Gagal', error.message);
    } else {
      try {
        // 🎉 Set status online dan kuras antrean data lokal ke Cloud Supabase
        await AsyncStorage.setItem('garasiku_app_mode', 'online');
        await apiService.syncOfflineDataToServer();
      } catch (e) {
        console.error("Gagal melakukan sinkronisasi login:", e);
      }

      router.replace('/'); 
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Masuk ke Garasiku</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#aaa"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>MASUK</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/auth/register')}>
        <Text style={styles.linkText}>Belum punya akun? Daftar gratis di sini</Text>
      </TouchableOpacity>

      {/* 🔘 Pembatas Visual */}
      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>atau</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* 🚗 Tombol Opsi Masuk Tanpa Akun */}
      <TouchableOpacity style={styles.offlineButton} onPress={handleOfflineMode}>
        <Text style={styles.offlineButtonText}>🚗 Gunakan Mode Offline (Tanpa Akun)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#121212' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#1e1e1e', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, fontSize: 16 },
  button: { backgroundColor: '#10b981', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  linkText: { color: '#34d399', textAlign: 'center', marginTop: 20, fontSize: 14 },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: '#666', paddingHorizontal: 10, fontSize: 12 },
  offlineButton: { backgroundColor: 'transparent', padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  offlineButtonText: { color: '#aaa', fontWeight: '600', fontSize: 14 }
});