import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../utils/supabaseClient'; // 👈 Kunci titik empat
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [usernameInput, setUsernameInput] = useState('');   
  const [email, setEmail] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [secureConfirmPassword, setSecureConfirmPassword] = useState(true);
  const [securePassword, setSecurePassword] = useState(true); // 👁️ True artinya password tersembunyi
  const [loading, setLoading] = useState(false);
  const router = useRouter();

// Perbarui isi fungsi handleRegister() agar menyertakan opsi 'data full_name':
  const handleRegister = async () => {
    try {
      // 🚀 BARU & DI SINI TEMPATNYA: Reset semua pesan error setiap kali tombol daftar diklik ulang
      setUsernameError('');
      setEmailError('');
      setConfirmPasswordError(''); // 👈 Reset error konfirmasi password

      // 🚀 BARU & DI SINI TEMPATNYA: Validasi kecocokan input password pertama dan kedua
      if (password !== confirmPassword) {
        setConfirmPasswordError('*Konfirmasi password tidak cocok.');
        return; // Hentikan proses jika tidak sama
      }

      // Log awal untuk memastikan tombol merespons saat diklik
      console.log("Mulai proses register untuk email:", email, "dan username:", usernameInput);

      // 1. Cek apakah Username sudah ada di database
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', usernameInput)
        .maybeSingle(); 

      // Pantau jika ada error saat mengecek database
      if (checkError) {
        console.error("Error saat cek username:", checkError.message);
      }

      if (existingUser) {
        console.warn("Username bentrok:", usernameInput);
        setUsernameError('*Nama pengguna sudah dipakai, silakan pilih yang lain.');
        return; // Hentikan proses register
      }

      // 2. Jika aman, daftarkan ke Supabase Auth
      console.log("Username aman, mengirim data ke Supabase Auth...");
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,       
        password: password, 
      });

      if (authError) {
        console.error("Gagal Register Supabase Auth:", authError.message);
        
        if (authError.message.includes('already registered')) {
          setEmailError('*Email ini sudah terdaftar, silakan gunakan email lain.');
        } else {
          alert("Gagal Daftar: " + authError.message);
        }
        return;
      }

      // 3. Simpan data username dan email ke tabel profiles
      if (authData?.user) {
        console.log("Auth berhasil, menyimpan profil ke database...");
        
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          username: usernameInput,
          email: email
        });

        if (profileError) {
          console.error("Gagal simpan profil di database:", profileError.message);
          alert("Gagal simpan profil: " + profileError.message);
          return;
        }
        
        console.log("Proses register SELESAI dan SUKSES!");
        alert("Sukses: Akun berhasil dibuat!");
        
        router.replace('/auth/login');
      }
      
    } catch (err: any) {
      console.error("Sistem Error Kritis:", err.message);
      alert("Terjadi kesalahan sistem: " + err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daftar Akun Garasiku</Text>
      
      {/* Kolom Username */}
      <TextInput 
        style={styles.input} 
        placeholder="Username" 
        placeholderTextColor="#aaa" 
        value={usernameInput} 
        onChangeText={(text) => {
          setUsernameInput(text);
          setUsernameError(''); 
        }} 
        autoCapitalize="none" 
      />
      {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}

      {/* Kolom Email */}
      <TextInput 
        style={styles.input} 
        placeholder="Email" 
        placeholderTextColor="#aaa" 
        value={email} 
        onChangeText={(text) => {
          setEmail(text);
          setEmailError(''); 
        }} 
        autoCapitalize="none" 
      />
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
      
      {/* 🔐 1. KOLOM PASSWORD UTAMA + TOMBOL MATA KESATU */}
      <View style={styles.passwordContainer}>
        <TextInput 
          style={styles.passwordInput} 
          placeholder="Password" // 👈 Menggunakan state 'password' asli
          placeholderTextColor="#aaa" 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry={securePassword} // 👈 Diatur oleh 'securePassword'
          autoCapitalize="none" 
        />
        <TouchableOpacity style={styles.eyeButton} onPress={() => setSecurePassword(!securePassword)}>
          <Text style={{ color: '#aaa', fontSize: 16 }}>{securePassword ? '👁️' : '🙈'}</Text>
        </TouchableOpacity>
      </View>

      {/* 🔐 2. KOLOM ULANGI PASSWORD + TOMBOL MATA KEDUA */}
      <View style={styles.passwordContainer}>
        <TextInput 
          style={styles.passwordInput} 
          placeholder="Ulangi Password" // 👈 Menggunakan state 'confirmPassword'
          placeholderTextColor="#aaa" 
          value={confirmPassword} 
          onChangeText={(text) => {
            setConfirmPassword(text);
            setConfirmPasswordError('');
          }} 
          secureTextEntry={secureConfirmPassword} // 👈 Diatur oleh 'secureConfirmPassword'
          autoCapitalize="none" 
        />
        <TouchableOpacity style={styles.eyeButton} onPress={() => setSecureConfirmPassword(!secureConfirmPassword)}>
          <Text style={{ color: '#aaa', fontSize: 16 }}>{secureConfirmPassword ? '👁️' : '🙈'}</Text>
        </TouchableOpacity>
      </View>
      {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>DAFTAR</Text>}
      </TouchableOpacity>

      {/* ➕ TAMBAHKAN TOMBOL INI TEPAT DI BAWAHNYA */}
      <TouchableOpacity 
        style={styles.secondaryButton} 
        onPress={() => router.replace('/auth/login')}
        disabled={loading}
      >
        <Text style={styles.secondaryButtonText}>Sudah punya akun? Login di sini</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#121212' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#1e1e1e', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 15 },
  button: { backgroundColor: '#10b981', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  errorText: { color: '#FF5252', fontSize: 12, marginTop: -10, marginBottom: 15, fontWeight: '600', alignSelf: 'flex-start', paddingHorizontal: 4 },
  passwordContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1e1e1e', 
    borderRadius: 8, 
    marginBottom: 15,
    paddingRight: 15
  },
  passwordInput: { 
    flex: 1, 
    color: '#fff', 
    padding: 15 
  },
  eyeButton: { 
    padding: 5 
  },
  secondaryButton: {
    marginTop: 20,
    padding: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#10b981', // Menggunakan warna hijau yang sama agar serasi
    fontWeight: '600',
    fontSize: 14,
  },
});