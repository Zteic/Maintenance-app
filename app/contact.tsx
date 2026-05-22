import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function ContactScreen() {
  const router = useRouter();

  const handleOpenEmail = () => {
    Linking.openURL('mailto:support@garasiku.id?subject=GarasiKu%20Support%20Request');
  };

  const handleOpenWebsite = () => {
    Linking.openURL('https://www.garasiku.id');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
          <Text style={styles.btnBackTxt}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hubungi Developer</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.introText}>Ada kendala atau punya ide fitur menarik? Tim pengembang GarasiKu siap membantu Anda mewujudkannya.</Text>

        {/* QUICK ACTION BANNER */}
        <View style={styles.cardBox}>
          <Text style={styles.cardHeader}>📧 EMAIL RESMI DUKUNGAN</Text>
          <Text style={styles.cardValue}>support@garasiku.id</Text>
          <TouchableOpacity onPress={handleOpenEmail} style={styles.btnAction}>
            <Text style={styles.btnActionTxt}>Kirim Email Langsung</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardBox}>
          <Text style={styles.cardHeader}>🌐 SITUS RESMI APLIKASI</Text>
          <Text style={styles.cardValue}>www.garasiku.id</Text>
          <TouchableOpacity onPress={handleOpenWebsite} style={[styles.btnAction, { backgroundColor: '#1A2B3C', borderWidth: 1, borderColor: '#4ECDC4' }]}>
            <Text style={[styles.btnActionTxt, { color: '#4ECDC4' }]}>Kunjungi Website</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#1A2B3C', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  btnBack: { paddingVertical: 10, paddingRight: 15 },
  btnBackTxt: { color: "#F5A623", fontSize: 16, fontWeight: "700" },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', flex: 1, textAlign: 'center', marginRight: 60 },
  introText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 20, marginBottom: 25, textAlign: 'center' },
  cardBox: { backgroundColor: '#1A2B3C', borderRadius: 16, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  cardHeader: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', marginBottom: 5 },
  cardValue: { color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 15 },
  btnAction: { backgroundColor: '#4ECDC4', width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnActionTxt: { color: '#0D1B2A', fontSize: 13, fontWeight: '800' },
  rowLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A2B3C', padding: 16, borderRadius: 14, marginBottom: 10 },
  rowTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  rowSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  arrow: { color: 'rgba(255,255,255,0.2)' }
});