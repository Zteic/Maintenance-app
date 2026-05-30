import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../utils/supabaseClient'; // 👈 Kunci titik empat
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

// Perbarui isi fungsi handleRegister() agar menyertakan opsi 'data full_name':
  const handleRegister = async () => {
    // 1. Cek apakah Username sudah ada di database
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', usernameInput) // Ganti usernameInput dengan state username Anda
      .single();

    if (existingUser) {
      Alert.alert("Gagal", "Nama pengguna (Username) sudah dipakai, silakan pilih yang lain.");
      return; // Hentikan proses register
    }

    // 2. Jika aman, daftarkan ke Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: emailInput,       // Ganti dengan state email
      password: passwordInput, // Ganti dengan state password
    });

    if (authError) {
      Alert.alert("Gagal Daftar", authError.message);
      return;
    }

    // 3. Simpan data username dan email ke tabel profiles
    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        username: usernameInput,
        email: emailInput
      });

      if (profileError) {
        console.error("Gagal simpan profil:", profileError.message);
      }
      
      Alert.alert("Sukses", "Akun berhasil dibuat!");
      // Arahkan ke halaman login...
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daftar Akun Garasiku</Text>
      
      <TextInput style={styles.input} placeholder="Nama Lengkap Pengguna" placeholderTextColor="#aaa" value={name} onChangeText={setName} />
      
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#aaa" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#aaa" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>DAFTAR</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#121212' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#1e1e1e', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 15 },
  button: { backgroundColor: '#10b981', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});