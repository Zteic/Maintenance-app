import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../utils/supabaseClient'; 
import { useRouter } from 'expo-router';

export default function ResetPasswordScreen() {
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState(''); // 🚀 Menampung 6 angka OTP
  const [isOtpSent, setIsOtpSent] = useState(false); // 🚀 Penanda status pengiriman email OTP
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // State untuk pesan error merah
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  // State independen untuk menyembunyikan/menampilkan password
  const [securePassword, setSecurePassword] = useState(true); 
  const [secureConfirmPassword, setSecureConfirmPassword] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 🚀 FUNGSI BARU: Mengirimkan Kode OTP 6-Digit ke Email Pengguna
  const handleSendOtp = async () => {
    if (!emailInput) {
      setConfirmPasswordError('*Silakan masukkan email Anda terlebih dahulu.');
      return;
    }
    if (!emailInput.includes('@')) {
      setConfirmPasswordError('*Format email tidak valid.');
      return;
    }

    setLoading(true);
    setConfirmPasswordError('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput.trim(),
        options: {
          shouldCreateUser: false, // Mencegah pendaftaran akun baru jika email salah
        }
      });

      setLoading(false);
      if (error) {
        alert('Gagal mengirim OTP: ' + error.message);
      } else {
        setIsOtpSent(true); // Mengunci kolom email & membuka input OTP + Password Baru di UI
        alert('Sukses! Kode OTP 6 digit dalam proses pengiriman ke email Anda. Silakan cek kotak masuk/spam (Berlaku 5 menit).');
      }
    } catch (err: any) {
      setLoading(false);
      alert('Error: ' + err.message);
    }
  };

  // 🚀 FUNGSI MODIFIKASI: Verifikasi OTP terlebih dahulu, lalu Perbarui Kata Sandi
  const handleVerifyAndResetPassword = async () => {
    if (!otpInput || !newPassword || !confirmNewPassword) {
      setConfirmPasswordError('*Semua kolom wajib diisi.');
      return;
    }

    if (otpInput.length < 6) {
      setConfirmPasswordError('*Kode OTP harus berupa 6 digit angka.');
      return;
    }

    if (newPassword.length < 6) {
      setConfirmPasswordError('*Password baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setConfirmPasswordError('*Konfirmasi password baru tidak cocok.');
      return; 
    }

    setLoading(true);
    setConfirmPasswordError('');

    try {
      // Langkah 1: Verifikasi kecocokan Kode OTP ke server Supabase
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: emailInput.trim(),
        token: otpInput.trim(),
        type: 'recovery', // Tipe token pemulihan/reset sandi
      });

      if (otpError) {
        setLoading(false);
        setConfirmPasswordError('*Kode OTP salah atau sudah kedaluwarsa.');
        return;
      }

      // Langkah 2: Jika OTP sukses lolos, perbarui password user saat itu juga
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      setLoading(false);

      if (updateError) {
        Alert.alert('Gagal Memperbarui', updateError.message);
      } else {
        Alert.alert('Sukses', 'Password Anda berhasil diperbarui! Silakan masuk kembali.', [
          {
            text: 'OK',
            onPress: () => router.replace('/auth/login') // Mengembalikan pengguna ke halaman login
          }
        ]);
      }

    } catch (err: any) {
      setLoading(false);
      Alert.alert('Error', 'Terjadi kesalahan sistem: ' + err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Atur Ulang Password</Text>
      <Text style={styles.subtitle}>Sistem pemulihan akun instan via kode OTP Email.</Text>
      
      {/* 📧 INPUT EMAIL */}
      <TextInput 
        style={[styles.input, isOtpSent && { opacity: 0.5 }]} 
        placeholder="Masukkan Email Terdaftar Anda" 
        placeholderTextColor="#aaa" 
        value={emailInput} 
        onChangeText={(text) => {
          setEmailInput(text);
          setConfirmPasswordError('');
        }}
        editable={!isOtpSent} // Input otomatis terkunci jika OTP sudah berhasil terkirim
        autoCapitalize="none" 
      />

      {/* 🔄 ALUR ANTARMUKA DINAMIS */}
      {!isOtpSent ? (
        /* TAMPILKAN TOMBOL INI JIKA OTP BELUM DIKIRIM */
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#3b82f6' }]} 
          onPress={handleSendOtp} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>KIRIM KODE OTP</Text>}
        </TouchableOpacity>
      ) : (
        /* TAMPILKAN FORMULIR INI JIKA OTP SUDAH BERHASIL DIKIRIM */
        <View style={{ width: '100%' }}>
          
          {/* 🔢 INPUT KODE OTP 6-DIGIT */}
          <TextInput 
            style={[styles.input, { borderColor: '#10b981', borderWidth: 1 }]} 
            placeholder="Masukkan 6 Digit Kode OTP" 
            placeholderTextColor="#aaa" 
            value={otpInput} 
            onChangeText={(text) => {
              setOtpInput(text);
              setConfirmPasswordError('');
            }}
            keyboardType="number-pad"
            maxLength={6}
          />

          {/* 🔐 KOLOM PASSWORD BARU UTAMA + TOMBOL MATA KESATU */}
          <View style={styles.passwordContainer}>
            <TextInput 
              style={styles.passwordInput} 
              placeholder="Password Baru" 
              placeholderTextColor="#aaa" 
              value={newPassword} 
              onChangeText={(text) => {
                setNewPassword(text);
                setConfirmPasswordError('');
              }} 
              secureTextEntry={securePassword} 
              autoCapitalize="none" 
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setSecurePassword(!securePassword)}>
              <Text style={{ color: '#aaa', fontSize: 16 }}>{securePassword ? '👁️' : '🙈'}</Text>
            </TouchableOpacity>
          </View>

          {/* 🔐 KOLOM ULANGI PASSWORD BARU + TOMBOL MATA KEDUA */}
          <View style={styles.passwordContainer}>
            <TextInput 
              style={styles.passwordInput} 
              placeholder="Ulangi Password Baru" 
              placeholderTextColor="#aaa" 
              value={confirmNewPassword} 
              onChangeText={(text) => {
                setConfirmNewPassword(text);
                setConfirmPasswordError('');
              }} 
              secureTextEntry={secureConfirmPassword} 
              autoCapitalize="none" 
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setSecureConfirmPassword(!secureConfirmPassword)}>
              <Text style={{ color: '#aaa', fontSize: 16 }}>{secureConfirmPassword ? '👁️' : '🙈'}</Text>
            </TouchableOpacity>
          </View>
          
          {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

          {/* Tombol Utama Eksekusi Simpan Data */}
          <TouchableOpacity style={styles.button} onPress={handleVerifyAndResetPassword} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>SIMPAN PASSWORD BARU</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Tombol Batal */}
      <TouchableOpacity 
        style={styles.secondaryButton} 
        onPress={() => router.replace('/auth/login')} 
        disabled={loading}
      >
        <Text style={styles.secondaryButtonText}>Batal dan Kembali</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#121212' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#aaa', marginBottom: 25, textAlign: 'center', paddingHorizontal: 10 },
  button: { backgroundColor: '#10b981', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
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
    color: '#aaa', 
    fontWeight: '600',
    fontSize: 14,
  },
  input: { backgroundColor: '#1e1e1e', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, fontSize: 16 }
});