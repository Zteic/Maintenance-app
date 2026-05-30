import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabaseClient';
export default function FeedbackHistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        // 1. Cek sesi login saat ini
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // 🚀 JIKA USER ONLINE: Tarik live status pengerjaan bug langsung dari server Supabase
          console.log("LOG: Menarik data riwayat feedback dari Supabase...");
          const { data: serverData, error } = await supabase
            .from('feedbacks')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && serverData && serverData.length > 0) {
            setHistory(serverData);
            // Sinkronisasikan salinan terbaru ke penyimpanan lokal untuk backup offline
            await AsyncStorage.setItem('garasi_feedback_history', JSON.stringify(serverData));
            return;
          }
        }
      } catch (err) {
        console.log("Gagal mengambil data dari server, beralih ke cache lokal");
      }

      // 🔄 JIKA OFFLINE/TAMU: Ambil data cadangan dari memori lokal HP seperti biasa
      const localData = await AsyncStorage.getItem('garasi_feedback_history');
      if (localData) setHistory(JSON.parse(localData));
    };

    loadHistory();
  }, []);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Pending': return '#F5A623';
      case 'Reviewed': return '#3498db';
      case 'Fixed': return '#4ECDC4';
      case 'Upcoming Update': return '#9b59b6';
      default: return '#7f8c8d';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'Critical': return '#c0392b';
      case 'High': return '#e74c3c';
      case 'Medium': return '#f39c12';
      case 'Low': return '#3498db';
      default: return '#7f8c8d';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 10, paddingRight: 15 }}>
          <Text style={{ color: "#F5A623", fontSize: 16, fontWeight: "700" }}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Riwayat Feedback Saya</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {history.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 100 }}>
            <Text style={{ fontSize: 50, marginBottom: 20, opacity: 0.5 }}>📭</Text>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800' }}>Belum Ada Laporan</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 10, textAlign: 'center' }}>Semua bug atau saran yang Anda kirimkan akan tercatat dan dipantau di sini.</Text>
          </View>
        ) : (
          history.map((item, idx) => (
            <View key={item.id || idx} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>{item.report_type.includes('Bug') ? '🐞' : '✨'}</Text>
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{item.report_type}</Text>
                </View>
                {/* STATUS BADGE */}
                <View style={{ backgroundColor: getStatusColor(item.status) + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: getStatusColor(item.status) }}>
                  <Text style={{ color: getStatusColor(item.status), fontSize: 10, fontWeight: '800' }}>{item.status.toUpperCase()}</Text>
                </View>
              </View>

              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              
              <View style={styles.metaRow}>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                {/* PRIORITY BADGE */}
                <View style={{ backgroundColor: getPriorityColor(item.priority), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: '#FFF', fontSize: 9, fontWeight: 'bold' }}>{item.priority}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#1A2B3C', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', flex: 1, textAlign: 'center', marginRight: 60 },
  card: { backgroundColor: '#1A2B3C', borderRadius: 16, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 10 },
  title: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 5 },
  desc: { color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 18, marginBottom: 15 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600' }
});