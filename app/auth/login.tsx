import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
WebBrowser.maybeCompleteAuthSession();
import { supabase } from '../../utils/supabaseClient'; // 👈 Tetap pertahankan rute keluar 2 kali milikmu
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router'; // 👈 TAMBAHAN FIX: Biar router tidak undefined
import { apiService } from '../../utils/apiService'; // 👈 TAMBAHAN FIX: Biar apiService tidak undefined

export default function LoginScreen() {
  const [loginIdentifier, setLoginIdentifier] = useState('');
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
    if (!loginIdentifier || !password) {
      Alert.alert('Error', 'Email/Username dan password wajib diisi!');
      return;
    }

    setLoading(true);
    
    // Siapkan wadah untuk email final
    let finalEmail = loginIdentifier.trim();

    // 🚀 CEK USERNAME: Jika input tidak mengandung '@', berarti user mengetikkan Username
    if (!finalEmail.includes('@')) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', finalEmail)
        .single();

      if (profileError || !profileData) {
        setLoading(false);
        Alert.alert("Login Gagal", "Nama pengguna (Username) tidak ditemukan.");
        return;
      }
      
      // Ubah username menjadi email aslinya agar dikenali Supabase
      finalEmail = profileData.email; 
    }

    // 🚀 LANJUT LOGIN (Sudah pasti menggunakan Email di titik ini)
    const { error } = await supabase.auth.signInWithPassword({
      email: finalEmail,
      password: password,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Login Gagal', error.message);
    } else {
      try {
        await AsyncStorage.setItem('garasiku_app_mode', 'online');
        
        // AMBIL NAMA PENGGUNA ASLI DARI SERVER CLOUD SUPABASE METADATA
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.user_metadata?.full_name) {
          const profileData = {
            name: user.user_metadata.full_name,
            email: user.email || ""
          };
          await AsyncStorage.setItem('garasi_user_profile', JSON.stringify(profileData));
        }

        await apiService.syncOfflineDataToServer();
      } catch (e) {
        console.error("Gagal melakukan sinkronisasi login:", e);
      }

      router.replace('/'); 
    }
  }

  // 🔐 FUNGSI LUPA PASSWORD
  async function handleForgotPassword() {
    // Pastikan user sudah mengetikkan email, bukan username kosong
    if (!loginIdentifier || !loginIdentifier.includes('@')) {
      Alert.alert('Perhatian', 'Silakan ketik alamat Email Anda di kolom pengisian terlebih dahulu, lalu tekan tombol Lupa Password.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(loginIdentifier.trim());
    setLoading(false);

    if (error) {
      Alert.alert('Gagal Mengirim Tautan', error.message);
    } else {
      Alert.alert('Cek Email Anda', 'Tautan untuk mereset password telah dikirim ke email Anda.');
    }
   }

    async function handleGoogleSignIn() {
    try {
      // 1. Buat URL khusus untuk kembali ke aplikasi Anda (misal: exp://... atau garasiku://)
      const redirectUrl = Linking.createURL('/'); 
      
      // 2. Minta URL Login dari Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true, // 👈 Wajib true untuk React Native/Expo
        },
      });

      if (error) throw error;

      // 3. Buka browser di dalam aplikasi
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        // 4. Jika berhasil login, Supabase otomatis menangkap sesinya dan Anda bisa arahkan user
        if (result.type === 'success') {
          await AsyncStorage.setItem('garasiku_app_mode', 'online');
          router.replace('/'); 
        }
      }
    } catch (e: any) {
      Alert.alert('Google Sign-In Gagal', e.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Masuk ke Garasiku</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email atau Nama Pengguna" 
        placeholderTextColor="#aaa"
        value={loginIdentifier} 
        onChangeText={setLoginIdentifier} 
        autoCapitalize="none"
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

      {/* 🚀 TOMBOL LUPA PASSWORD */}
      <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: 'flex-end', marginBottom: 15 }}>
        <Text style={{ color: '#34d399', fontSize: 13, fontWeight: '600' }}>Lupa Password?</Text>
      </TouchableOpacity>

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

      {/* 🌐 TOMBOL LOGIN GOOGLE */}
      <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
        <Text style={styles.googleIcon}>G</Text>
        <Text style={styles.googleButtonText}>Masuk dengan Google</Text>
      </TouchableOpacity>

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
  offlineButtonText: { color: '#aaa', fontWeight: '600', fontSize: 14 },
  googleButton: { 
    backgroundColor: '#fff', 
    padding: 14, 
    borderRadius: 8, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 15 
  },
  googleIcon: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: '#DB4437', // Warna khas merah Google
    marginRight: 10 
  },
  googleButtonText: { 
    color: '#000', 
    fontWeight: 'bold', 
    fontSize: 15 
  },
});