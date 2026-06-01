import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  FlatList, 
  Alert,  
  Platform, 
  Image,
  Modal as RNModal,
  Dimensions
} from "react-native";
import { supabase } from "@/utils/supabaseClient";
import { Vehicle } from "@/types/maintenance";
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface TaxHistoryListProps {
  visible: boolean;
  onClose: () => void;
  vehicle: Vehicle | null | undefined;
}

export default function TaxHistoryList({ visible, onClose, vehicle }: TaxHistoryListProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fullPhoto, setFullPhoto] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    if (visible && vehicle?.id) {
      fetchTaxHistory();
    } else {
      setFetching(false);
    }
  }, [visible, vehicle]);

  const fetchTaxHistory = async () => {
    if (!vehicle?.id) return;
    setFetching(true);
    
    try {
      // 🚀 PERBAIKAN: Membaca murni dari penyimpanan luring internal HP
      const rawTaxHistory = await AsyncStorage.getItem("garasi_tax_history");
      if (rawTaxHistory) {
        const allHistory = JSON.parse(rawTaxHistory);
        // Saring list transaksi hanya untuk ID kendaraan yang sedang aktif saat ini
        const filteredHistory = allHistory.filter((item: any) => item.vehicle_id === vehicle.id);
        setHistory(filteredHistory);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("Gagal menarik riwayat luring:", err);
    } finally {
      setFetching(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleDelete = (id: string) => {
    const confirmText = "Tindakan ini tidak dapat dibatalkan. Jika ini adalah data pembayaran terbaru, sistem akan otomatis menggunakan data pembayaran sebelumnya.";

    if (Platform.OS === 'web') {
      const confirmWeb = window.confirm(`Hapus Riwayat Pajak?\n\n${confirmText}`);
      if (confirmWeb) {
        executeDelete(id);
      }
      return;
    }

    Alert.alert(
      "Hapus Riwayat Pajak?",
      confirmText,
      [
        { text: "Batal", style: "cancel" },
        { text: "Ya, Hapus", style: "destructive", onPress: () => executeDelete(id) }
      ]
    );
  };

  const executeDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const rawTaxHistory = await AsyncStorage.getItem("garasi_tax_history");
      if (rawTaxHistory) {
        const allHistory = JSON.parse(rawTaxHistory);
        // Buang item target dari array local storage
        const updatedHistory = allHistory.filter((item: any) => item.id !== id);
        await AsyncStorage.setItem("garasi_tax_history", JSON.stringify(updatedHistory));
        
        // Perbarui tampilan UI
        setHistory(prev => prev.filter(item => item.id !== id));
        
        if (Platform.OS === 'web') {
          window.alert("Data riwayat offline berhasil dihapus.");
        } else {
          Alert.alert("Sukses", "Data riwayat offline berhasil dihapus.");
        }
      }
    } catch (err: any) {
      if (Platform.OS === 'web') {
        window.alert(`Gagal menghapus data: ${err.message}`);
      } else {
        Alert.alert("Gagal", `Tidak dapat menghapus data: ${err.message}`);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const formatRupiah = (v: any) => "Rp " + (parseFloat(v) || 0).toLocaleString("id-ID");

  const renderDetailRow = (label: string, value: any) => {
    const numVal = parseFloat(value) || 0;
    if (numVal <= 0) return null; 
    
    return (
      <View style={s.detailRow}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{formatRupiah(numVal)}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isExpanded = expandedId === item.id;
    const isFiveYear = item.payment_type === "five_year_stnk";
    const hasBiayaLainnya = (parseFloat(item.biaya_pengiriman) || 0) > 0 || (parseFloat(item.biaya_pemrosesan) || 0) > 0;

    return (
      <View style={s.card}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => toggleExpand(item.id)} style={s.cardMain}>
          <View style={s.cardHeader}>
            <Text style={[s.cardTitle, { color: isFiveYear ? '#F5A623' : '#4ECDC4' }]}>
              {isFiveYear ? "📄 STNK 5 TAHUNAN" : "🚗 PAJAK TAHUNAN"}
            </Text>
            <Text style={s.cardDate}>Pembayaran: {item.payment_date}</Text>
          </View>

          <View style={{ gap: 4, marginBottom: 12 }}>
            <Text style={s.targetLabel}>• Jatuh Tempo Pajak: <Text style={s.targetValue}>{item.new_tax_due_date}</Text></Text>
            {item.new_stnk_due_date && (
              <Text style={s.targetLabel}>• Jatuh Tempo STNK: <Text style={s.targetValue}>{item.new_stnk_due_date}</Text></Text>
            )}
          </View>

          <View style={{ gap: 8 }}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total Pembayaran Akhir:</Text>
              <Text style={s.totalValue}>{formatRupiah(item.total_pembayaran)}</Text>
            </View>
            {item.deskripsi && (
              <Text style={s.notesText}>Catatan: "{item.deskripsi}"</Text>
            )}
          </View>

          <View style={s.expandIndicatorBox}>
            <Text style={s.expandIndicatorText}>{isExpanded ? "Tutup Rincian ▲" : "Lihat Rincian ▼"}</Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={s.cardExpanded}>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Rincian Pembayaran</Text>
              {renderDetailRow("PKB Pokok", item.pkb_pokok)}
              {renderDetailRow("PKB Denda", item.pkb_denda)}
              {renderDetailRow("Opsen PKB", item.opsen_pkb_pokok)}
              {renderDetailRow("Opsen PKB Denda", item.opsen_pkb_denda)}
              {renderDetailRow("SWDKLLJ", item.swdkllj_pokok)}
              {renderDetailRow("SWDKLLJ Denda", item.swdkllj_denda)}
              {renderDetailRow("PNBP STNK", item.pnbp_stnk)}
              {renderDetailRow("PNBP TNKB", item.pnbp_tnkb)}
              
              <View style={s.subtotalRow}>
                <Text style={s.subtotalLabel}>Subtotal Pajak</Text>
                <Text style={s.subtotalValue}>{formatRupiah(item.subtotal_pajak)}</Text>
              </View>
            </View>

            {hasBiayaLainnya && (
              <View style={s.section}>
                {renderDetailRow("Biaya Pengiriman", item.biaya_pengiriman)}
                {renderDetailRow("Biaya Pemrosesan", item.biaya_pemrosesan)}
                <View style={s.subtotalRow}>
                  <Text style={s.subtotalLabel}>Subtotal Biaya Lainnya</Text>
                  <Text style={s.subtotalValue}>{formatRupiah(item.subtotal_biaya_lainnya)}</Text>
                </View>
              </View>
            )}

            {item.proof_files_urls && item.proof_files_urls.length > 0 && (
              <View style={s.docsContainer}>
                <Text style={s.sectionTitle}>Dokumen Lampiran ({item.proof_files_urls.length})</Text>
                {item.proof_files_urls.map((url: string, index: number) => {
                  const fileName = url.split('/').pop()?.split('?')[0] || `Dokumen_${index + 1}`;
                  const cleanFileName = decodeURIComponent(fileName);

                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.7}
                      onPress={() => {
                        setImageLoading(true);
                        setFullPhoto(url);
                      }}
                      style={s.docRowButton}
                    >
                      <Text style={s.docRowText} numberOfLines={1}>
                        📎 {cleanFileName}
                      </Text>
                      <Text style={s.docOpenText}>Lihat Struk 👁️</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={() => handleDelete(item.id)}
              disabled={deletingId === item.id}
              style={s.deleteBtn}
            >
              {deletingId === item.id ? (
                <ActivityIndicator color="#FF5252" size="small" />
              ) : (
                <Text style={s.deleteBtnText}>🗑️ Hapus Riwayat Ini</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={s.listHeader}>
      <Text style={s.headerMainText}>Riwayat Pembayaran</Text>
      <Text style={s.headerSubText}>{history.length} transaksi tercatat</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={onClose} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backBtnIcon}>←</Text>
          <Text style={s.backBtnText}>Kembali</Text>
        </TouchableOpacity>
        <Text style={s.topBarTitle} numberOfLines={1}>Arsip Pajak</Text>
        <View style={{ width: 80 }} /> 
      </View>

      {fetching ? (
        <View style={s.centerScreen}>
          <ActivityIndicator color="#4ECDC4" size="large" />
          <Text style={s.loadingText}>Memuat Arsip...</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>🗄️</Text>
              <Text style={s.emptyText}>Belum ada riwayat pembayaran untuk kendaraan ini.</Text>
            </View>
          }
        />
      )}

      {/* 🖼️ MODAL LIGHTBOX PREVIEW SEJATI (GAMBAR TAMPIL TANPA BUFFER OVERLAY TEXT) */}
      <RNModal
        visible={fullPhoto !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullPhoto(null)}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setFullPhoto(null)} 
          style={s.previewOverlay}
        >
          <View style={s.previewContainer}>
            <View style={s.previewHeader}>
              <Text style={s.previewHeaderTitle}>Bukti Nota / Struk Pajak</Text>
              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={() => setFullPhoto(null)} 
                style={s.previewCloseBtn}
              >
                <Text style={s.previewCloseText}>✕ Tutup</Text>
              </TouchableOpacity>
            </View>

            {fullPhoto && (
              <View style={s.imageWrapper}>
                <View style={s.imageBackgroundFrame}>
                  <Image
                    source={{ uri: fullPhoto }}
                    style={s.fullImageStyle}
                    resizeMode="contain"
                    onLoadEnd={() => setImageLoading(false)}
                  />
                  {imageLoading && (
                    <ActivityIndicator 
                      style={StyleSheet.absoluteFill} 
                      color="#4ECDC4" 
                      size="large" 
                    />
                  )}
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </RNModal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070C11' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16, backgroundColor: '#0A1118', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 80 },
  backBtnIcon: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  backBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  topBarTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  listContent: { padding: 16, paddingBottom: 50 },
  listHeader: { marginBottom: 20 },
  headerMainText: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  headerSubText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },
  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 12 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12, opacity: 0.8 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center' },
  
  card: { backgroundColor: '#10171E', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 16, overflow: 'hidden' },
  cardMain: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  cardDate: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600' },
  targetLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  targetValue: { color: '#FFF', fontWeight: '800' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  totalLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  totalValue: { color: '#4ECDC4', fontSize: 15, fontWeight: '900' },
  notesText: { color: '#F5A623', fontSize: 11, fontStyle: 'italic', marginTop: 4 },
  expandIndicatorBox: { alignItems: 'center', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' },
  expandIndicatorText: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700' },

  cardExpanded: { padding: 16, paddingTop: 0, backgroundColor: 'rgba(0,0,0,0.2)' },
  section: { marginTop: 12 },
  sectionTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  detailValue: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  subtotalLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600' },
  subtotalValue: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  docsText: { color: '#F5A623', fontSize: 11, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  
  deleteBtn: { marginTop: 20, backgroundColor: 'rgba(255,82,82,0.1)', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,82,82,0.3)' },
  deleteBtnText: { color: '#FF5252', fontSize: 12, fontWeight: '800' },
  
  docsContainer: { marginTop: 16, gap: 6 },
  docRowButton: { flexDirection: 'row', justifySpace: 'between', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(245,166,35,0.06)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245,166,35,0.15)' },
  docRowText: { color: '#F5A623', fontSize: 11, fontWeight: '600', flex: 1, marginRight: 10 },
  docOpenText: { color: '#4ECDC4', fontSize: 10, fontWeight: '800' },

  previewOverlay: { flex: 1, backgroundColor: 'rgba(7, 12, 17, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  previewContainer: { backgroundColor: '#10171E', borderRadius: 20, width: '95%', maxWidth: 420, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', paddingBottom: 16 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  previewHeaderTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  previewCloseBtn: { backgroundColor: 'rgba(255,82,82,0.15)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,82,82,0.3)' },
  previewCloseText: { color: '#FF5252', fontSize: 11, fontWeight: '900' },
  imageWrapper: { alignItems: 'center', justifyContent: 'center', marginTop: 16, paddingHorizontal: 16 },
  imageBackgroundFrame: { backgroundColor: '#070C11', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', overflow: 'hidden', width: '100%', height: SCREEN_HEIGHT * 0.55, justifyContent: 'center', alignItems: 'center' },
  fullImageStyle: { width: '100%', height: '100%' }
});