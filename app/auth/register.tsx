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
  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Semua kolom wajib diisi!');
      return;
    }
    setLoading(true);
    
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          full_name: name.trim()
        }
      }
    });
    setLoading(false);

    if (error) {
      Alert.alert('Pendaftaran Gagal', error.message);
    } else {
      try {
        await AsyncStorage.setItem('garasiku_app_mode', 'online');
      } catch (e) {
        console.error(e);
      }

      Alert.alert('Sukses!', 'Akun berhasil dibuat!');
      router.replace('/auth/login');
    }
  }

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