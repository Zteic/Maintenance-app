import React, { useState, useEffect } from "react";
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { supabase } from "@/utils/supabaseClient";
import { Vehicle } from "@/types/maintenance";
import { LinearGradient } from "expo-linear-gradient";

interface TaxHistoryListProps {
  visible: boolean;
  onClose: () => void;
  vehicle: Vehicle | null | undefined;
}

export default function TaxHistoryList({ visible, onClose, vehicle }: TaxHistoryListProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  // Otomatis menembak Supabase setiap kali jendela riwayat ini dibuka
  useEffect(() => {
    if (visible && vehicle?.id) {
      fetchTaxHistory();
    }
  }, [visible, vehicle]);

  const fetchTaxHistory = async () => {
    if (!vehicle?.id) return;
    setFetching(true);
    console.log(`[Cloud Sync] Menarik log finansial dari Supabase untuk ID: ${vehicle.id}`);
    
    try {
      const { data, error } = await supabase
        .from("vehicle_tax_payment_history")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Gagal mengambil arsip histori:", error.message);
      }

      if (!error && data) {
        console.log(`✅ Berhasil mengunduh ${data.length} data riwayat pajak.`);
        setHistory(data);
      }
    } catch (err) {
      console.log("Crash fetchTaxHistory:", err);
    } finally {
      setFetching(false);
    }
  };

  const formatRupiah = (v: any) => "Rp " + (parseFloat(v) || 0).toLocaleString("id-ID");

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <LinearGradient colors={["#0A1118", "#121E2A"]} style={{ flex: 1 }}>
        
        {/* HEADER MODAL LAYAR PENUH */}
        <View style={s.headerContainer}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={s.headerTitle}>🗄️ LOG ARSIP FINANSIAL PAJAK</Text>
            <Text style={s.headerSub} numberOfLines={1}>
              {vehicle?.name || "Kendaraan"} • Rekam Akuntansi Resmi Cloud
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>KEMBALI</Text>
          </TouchableOpacity>
        </View>

        {/* DAFTAR RIWAYAT DILAKUKAN MAP LOOPING DI SINI */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
          <View style={s.card}>
            <Text style={s.cardTitle}>📜 HISTORI PEMBAYARAN RESMI STNK</Text>
            
            {fetching ? (
              <ActivityIndicator color="#4ECDC4" style={{ marginVertical: 30 }} />
            ) : history.length === 0 ? (
              <Text style={s.emptyHistory}>Belum ada rekam pembayaran resmi yang tercatat di cloud database.</Text>
            ) : (
              <View style={{ gap: 12 }}>
                {history.map((log) => (
                  <View key={log.id} style={s.historyRowItem}>
                    
                    {/* Header Bar per Transaksi */}
                    <View style={s.historyRowHeader}>
                      <Text style={[s.historyBadge, { color: log.payment_type === "five_year_stnk" ? "#F5A623" : "#4ECDC4" }]}>
                        {log.payment_type === "five_year_stnk" ? "📄 STNK 5 TAHUNAN" : "🚗 PAJAK TAHUNAN"}
                      </Text>
                      <Text style={s.historyDateText}>Bayar: {log.payment_date}</Text>
                    </View>
                    
                    {/* Target Validitas Masa Berlaku Baru */}
                    <View style={{ gap: 4, paddingVertical: 6 }}>
                      <Text style={s.historyTargetText}>• Jatuh Tempo Pajak: <Text style={{ fontWeight: "700", color: "#FFF" }}>{log.new_tax_due_date}</Text></Text>
                      {log.new_stnk_due_date && <Text style={s.historyTargetText}>• Jatuh Tempo STNK: <Text style={{ fontWeight: "700", color: "#FFF" }}>{log.new_stnk_due_date}</Text></Text>}
                    </View>
                    
                    {/* Rincian Akuntansi Ringkas */}
                    <View style={s.historyPriceBlock}>
                      <Text style={s.historyPriceLabel}>Total Pembayaran Akhir:</Text>
                      <Text style={s.historyPriceVal}>{formatRupiah(log.total_pembayaran)}</Text>
                    </View>
                    
                    {/* Memo Catatan Tambahan User */}
                    {log.deskripsi && <Text style={s.historyMemo}>Catatan: "{log.deskripsi}"</Text>}
                    
                    {/* Proteksi Deteksi Berkas Multi Upload */}
                    {log.proof_files_urls && log.proof_files_urls.length > 0 && (
                      <Text style={s.historyFileBadge}>📎 Terlampir {log.proof_files_urls.length} Berkas Bukti Aman di Cloud Storage</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            
          </View>
        </ScrollView>

      </LinearGradient>
    </Modal>
  );
}

const s = StyleSheet.create({
  headerContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16, backgroundColor: "#132230", borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  headerTitle: { color: "#FFF", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  headerSub: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 },
  closeBtn: { backgroundColor: "rgba(255,255,255,0.05)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  closeText: { color: "#FFF", fontSize: 11, fontWeight: "900" },
  card: { backgroundColor: "#132230", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.04)" },
  cardTitle: { color: "#FFF", fontSize: 12, fontWeight: "800", marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", paddingBottom: 4 },
  emptyHistory: { color: "rgba(255,255,255,0.3)", fontSize: 11, textAlign: "center", paddingVertical: 25 },
  historyRowItem: { backgroundColor: "#0A1118", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.03)" },
  historyRowHeader: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", paddingBottom: 6, marginBottom: 4 },
  historyBadge: { fontSize: 10, fontWeight: "900" },
  historyDateText: { color: "rgba(255,255,255,0.4)", fontSize: 10 },
  historyTargetText: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  historyPriceBlock: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.03)" },
  historyPriceLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  historyPriceVal: { color: "#4ECDC4", fontSize: 12, fontWeight: "900" },
  historyMemo: { color: "rgba(245,166,35,0.6)", fontSize: 10, fontStyle: "italic", marginTop: 4 },
  historyFileBadge: { color: "#F5A623", fontSize: 9, fontWeight: "700", marginTop: 6 }
});