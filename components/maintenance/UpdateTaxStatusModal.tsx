import React, { useState, useEffect } from "react";
import { View, Text, Modal, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, StyleSheet, Platform} from "react-native";
import * as DocumentPicker from "expo-document-picker";
// 🚀 IMPOR SINKRONISASI LOKAL OFFLINE
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from "@/utils/supabaseClient";
import { Vehicle } from "@/types/maintenance";
import { LinearGradient } from "expo-linear-gradient";

interface UpdateTaxStatusModalProps {
  visible: boolean;
  onClose: () => void;
  vehicle: Vehicle | null | undefined;
  initialType?: "annual" | "five_year" | null;
  onSuccess: (newTaxDate?: string, newStnkDate?: string) => void; 
}

interface LocalFile {
  uri: string;
  name: string;
  type?: string;
}

export default function UpdateTaxStatusModal({ visible, onClose, vehicle, initialType = "annual", onSuccess }: UpdateTaxStatusModalProps) {
  const [loading, setLoading] = useState(false);
  const [taxType, setTaxType] = useState<"annual" | "five_year">("annual");

  // --- STATES FORM INPUT (100% UTALH) ---
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextTaxDate, setNextTaxDate] = useState("");
  const [nextStnkDate, setNextStnkDate] = useState("");
  const [deskripsi, setDeskripsi] = useState("");

  // Rincian Pecahan Nominal (String)
  const [pkbPokok, setPkbPokok] = useState("0");
  const [pkbDenda, setPkbDenda] = useState("0");
  const [opsenPkbPokok, setOpsenPkbPokok] = useState("0");
  const [opsenPkbDenda, setOpsenPkbDenda] = useState("0");
  const [swdklljPokok, setSwdklljPokok] = useState("0");
  const [swdklljDenda, setSwdklljDenda] = useState("0");
  const [pnbpStnk, setPnbpStnk] = useState("0");
  const [pnbpTnkb, setPnbpTnkb] = useState("0");

  // Biaya Opsional
  const [biayaPengiriman, setBiayaPengiriman] = useState("0");
  const [biayaPemrosesan, setBiayaPemrosesan] = useState("0");

  // Lampiran Files & Notifikasi Proses
  const [uploadedFiles, setUploadedFiles] = useState<LocalFile[]>([]);
  const [processMsg, setProcessMsg] = useState("");

  // --- HITUNGAN MATEMATIS OTOMATIS ASLI ---
  const num = (val: string) => parseFloat(val) || 0;

  const subtotalPajak =
    num(pkbPokok) + num(pkbDenda) +
    num(opsenPkbPokok) + num(opsenPkbDenda) +
    num(swdklljPokok) + num(swdklljDenda) +
    (taxType === "five_year" ? num(pnbpStnk) + num(pnbpTnkb) : 0);

  const subtotalBiayaLainnya = num(biayaPengiriman) + num(biayaPemrosesan);
  const totalPembayaran = subtotalPajak + subtotalBiayaLainnya;

  // Sync awal tipe pajak & reset form
  useEffect(() => {
    if (visible && vehicle) {
      if (initialType) {
        setTaxType(initialType === "five_year" ? "five_year" : "annual");
      }
      resetForm();
    }
  }, [visible, initialType, vehicle]);

  const resetForm = () => {
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setNextTaxDate("");
    setNextStnkDate("");
    setDeskripsi("");
    setPkbPokok("0"); setPkbDenda("0");
    setOpsenPkbPokok("0"); setOpsenPkbDenda("0");
    setSwdklljPokok("0"); setSwdklljDenda("0");
    pnbpStnk === "0" ? setPnbpStnk("0") : setPnbpStnk("0");
    setPnbpTnkb("0");
    setBiayaPengiriman("0"); setBiayaPemrosesan("0");
    setUploadedFiles([]);
    setProcessMsg("");
  };

  const handlePickDocuments = async () => {
    if (uploadedFiles.length >= 10) {
      Alert.alert("Batas Maximum", "Maksimal berkas yang diunggah adalah 10 file.");
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        multiple: true
      });
      if (!result.canceled && result.assets) {
        const validExtensions = ["jpg", "jpeg", "png", "pdf"];
        const selected: LocalFile[] = [];
        result.assets.forEach(asset => {
          const ext = asset.name.split('.').pop()?.toLowerCase() || "";
          if (validExtensions.includes(ext)) {
            selected.push({ uri: asset.uri, name: asset.name, type: asset.mimeType });
          }
        });
        setUploadedFiles(prev => [...prev, ...selected].slice(0, 10));
      }
    } catch (err) {
      Alert.alert("Gagal memuat berkas.");
    }
  };

  const handleSave = () => {
    setProcessMsg("");
    const cleanNextTaxDate = nextTaxDate.trim();
    const cleanNextStnkDate = nextStnkDate.trim();

    if (!cleanNextTaxDate) {
      Alert.alert("Tanggal Kosong", "Silakan isi tanggal pajak berikutnya.");
      return;
    }

    if (taxType === "five_year" && !cleanNextStnkDate) {
      Alert.alert("Tanggal Kosong", "Silakan isi tanggal masa berlaku STNK baru.");
      return;
    }

    if (Platform.OS === 'web') {
      const konfirmasiWeb = window.confirm(
        "Simpan Rekam Keuangan?\n\nPastikan rincian biaya yang dimasukkan sudah sesuai dengan lembar fisik Samsat Anda."
      );
      if (konfirmasiWeb) executeSave();
      return;
    }

    Alert.alert(
      "Simpan Rekam Keuangan", 
      "Pastikan rincian biaya yang dimasukkan sudah sesuai dengan lembar fisik Samsat Anda.", 
      [
        { text: "Batal", style: "cancel" },
        { text: "Simpan Sekarang", fontWeight: "bold", onPress: executeSave }
      ]
    );
  };

  // 🏛️ ENGINE UTAMA OFFLINE FIRST (SESUAI PERINTAH)
  const executeSave = async () => {
    if (!vehicle?.id) return;
    
    setLoading(true);
    setProcessMsg("⏳ Mengamankan rekam keuangan ke memori internal...");
    
    try {
      // Ambil path URI gambar lokal HP untuk cadangan offline
      const localUrls = uploadedFiles.map(file => file.uri);
      const finalTaxDate = nextTaxDate.trim();
      const finalStnkDate = taxType === "five_year" ? nextStnkDate.trim() : (vehicle?.stnkDueDate || "");

      // 1. SINKRONISASI TANGGAL KENDARAAN PADA MASTER UTAMA (garasi_vehicles)
      const rawVehicles = await AsyncStorage.getItem("garasi_vehicles");
      let localVehiclesList: Vehicle[] = rawVehicles ? JSON.parse(rawVehicles) : [];

      localVehiclesList = localVehiclesList.map((v) => {
        if (v.id === vehicle.id) {
          return {
            ...v,
            taxDueDate: finalTaxDate,
            stnkDueDate: taxType === "five_year" ? finalStnkDate : v.stnkDueDate
          };
        }
        return v;
      });
      await AsyncStorage.setItem("garasi_vehicles", JSON.stringify(localVehiclesList));

      // 2. AMANKAN LOG RINCIAN FINANSIAL SAMSAT KELUAR KE HISTORI LOKAL (garasi_tax_history)
      const payloadHistori = {
        id: `tax_local_${Date.now()}`, // Generate ID offline unik
        vehicle_id: vehicle.id,
        payment_type: taxType === "five_year" ? "five_year_stnk" : "annual_tax",
        payment_date: paymentDate.trim(),
        new_tax_due_date: finalTaxDate,
        new_stnk_due_date: taxType === "five_year" ? finalStnkDate : null,
        pkb_pokok: num(pkbPokok), 
        pkb_denda: num(pkbDenda),
        opsen_pkb_pokok: num(opsenPkbPokok), 
        opsen_pkb_denda: num(opsenPkbDenda),
        swdkllj_pokok: num(swdklljPokok), 
        swdkllj_denda: num(swdklljDenda),
        pnbp_stnk: taxType === "five_year" ? num(pnbpStnk) : 0,
        pnbp_tnkb: taxType === "five_year" ? num(pnbpTnkb) : 0,
        biaya_pengiriman: num(biayaPengiriman), 
        biaya_pemrosesan: num(biayaPemrosesan),
        subtotal_pajak: subtotalPajak, 
        subtotal_biaya_lainnya: subtotalBiayaLainnya,
        total_pembayaran: totalPembayaran, 
        deskripsi: deskripsi.trim() || null, 
        proof_files_urls: localUrls,
        created_at: new Date().toISOString()
      };

      const rawTaxHistory = await AsyncStorage.getItem("garasi_tax_history");
      const localTaxHistoryList = rawTaxHistory ? JSON.parse(rawTaxHistory) : [];
      localTaxHistoryList.unshift(payloadHistori);
      await AsyncStorage.setItem("garasi_tax_history", JSON.stringify(localTaxHistoryList));

      setProcessMsg("✅ Riwayat offline berhasil diarsipkan!");
      
      setTimeout(() => {
        resetForm();
        // Trigger callback reaktivitas beranda depan
        onSuccess(finalTaxDate, taxType === "five_year" ? finalStnkDate : undefined);
      }, 500);

    } catch (e: any) {
      setProcessMsg(`❌ GAGAL: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (v: number) => "Rp " + v.toLocaleString("id-ID");

  // Sisa visual komponen render() di bawah ini dibiarkan 100% utuh sesuai file asli Anda...
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <LinearGradient colors={["#0A1118", "#121E2A"]} style={{ flex: 1 }}>
        {/* HEADER BAR */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.headerTitle}>🗄️ MANAJEMEN RIWAYAT & FISIK PAJAK</Text>
            <Text style={styles.headerSub}>{vehicle?.name || "Kendaraan"} • Pembaruan & Log Finansial</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>TUTUP</Text>
          </TouchableOpacity>
        </View>

        {/* TOGGLE PILIHAN */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity onPress={() => setTaxType("annual")} style={[styles.toggleItem, taxType === "annual" && styles.toggleActive]}>
            <Text style={[styles.toggleText, taxType === "annual" && styles.toggleTextActive]}>PAJAK 1 TAHUN</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTaxType("five_year")} style={[styles.toggleItem, taxType === "five_year" && styles.toggleActive]}>
            <Text style={[styles.toggleText, taxType === "five_year" && styles.toggleTextActive]}>PAJAK & STNK 5 TAHUN</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }}>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📝 FORM MASUKAN DATA BARU</Text>
            
            {processMsg !== "" && (
              <Text style={{ color: "#4ECDC4", fontSize: 11, fontWeight: "bold", marginBottom: 10, textAlign: "center" }}>{processMsg}</Text>
            )}

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.miniLabel}>TANGGAL BAYAR</Text>
                <TextInput style={styles.smallInput} value={paymentDate} onChangeText={setPaymentDate} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.2)" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.miniLabel}>TANGGAL PAJAK BARU</Text>
                <TextInput style={styles.smallInput} value={nextTaxDate} onChangeText={setNextTaxDate} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.2)" />
              </View>
              {taxType === "five_year" && (
                <View style={{ flex: 1 }}>
                  <Text style={styles.miniLabel}>TANGGAL STNK BARU</Text>
                  <TextInput style={styles.smallInput} value={nextStnkDate} onChangeText={setNextStnkDate} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.2)" />
                </View>
              )}
            </View>

            <Text style={styles.sectionHeader}>📊 RINCIAN KOMPONEN BIAYA RESMI</Text>
            <View style={styles.grid2Col}>
              <View style={styles.gridItem}>
                <Text style={styles.miniLabel}>PKB Pokok</Text>
                <TextInput style={styles.smallInput} keyboardType="number-pad" placeholder="0" placeholderTextColor="rgba(255,255,255,0.2)" value={pkbPokok === "0" ? "" : pkbPokok} onChangeText={setPkbPokok} />
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.miniLabel}>PKB Denda</Text>
                <TextInput style={styles.smallInput} keyboardType="number-pad" placeholder="0" placeholderTextColor="rgba(255,255,255,0.2)" value={pkbDenda === "0" ? "" : pkbDenda} onChangeText={setPkbDenda} />
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.miniLabel}>Opsen PKB Pokok</Text>
                <TextInput style={styles.smallInput} keyboardType="number-pad" placeholder="0" placeholderTextColor="rgba(255,255,255,0.2)" value={opsenPkbPokok === "0" ? "" : opsenPkbPokok} onChangeText={setOpsenPkbPokok} />
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.miniLabel}>Opsen PKB Denda</Text>
                <TextInput style={styles.smallInput} keyboardType="number-pad" placeholder="0" placeholderTextColor="rgba(255,255,255,0.2)" value={opsenPkbDenda === "0" ? "" : opsenPkbDenda} onChangeText={setOpsenPkbDenda} />
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.miniLabel}>SWDKLLJ Pokok</Text>
                <TextInput style={styles.smallInput} keyboardType="number-pad" placeholder="0" placeholderTextColor="rgba(255,255,255,0.2)" value={swdklljPokok === "0" ? "" : swdklljPokok} onChangeText={setSwdklljPokok} />
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.miniLabel}>SWDKLLJ Denda</Text>
                <TextInput style={styles.smallInput} keyboardType="number-pad" placeholder="0" placeholderTextColor="rgba(255,255,255,0.2)" value={swdklljDenda === "0" ? "" : swdklljDenda} onChangeText={setSwdklljDenda} />
              </View>
              {taxType === "five_year" && (
                <>
                  <View style={styles.gridItem}>
                    <Text style={styles.miniLabel}>PNBP STNK</Text>
                    <TextInput style={styles.smallInput} keyboardType="number-pad" placeholder="0" placeholderTextColor="rgba(255,255,255,0.2)" value={pnbpStnk === "0" ? "" : pnbpStnk} onChangeText={setPnbpStnk} />
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.miniLabel}>PNBP TNKB</Text>
                    <TextInput style={styles.smallInput} keyboardType="number-pad" placeholder="0" placeholderTextColor="rgba(255,255,255,0.2)" value={pnbpTnkb === "0" ? "" : pnbpTnkb} onChangeText={setPnbpTnkb} />
                  </View>
                </>
              )}
            </View>

            <View style={styles.rowSubtotal}>
              <Text style={styles.subtotalLabel}>Subtotal Pajak:</Text>
              <Text style={styles.subtotalVal}>{formatRupiah(subtotalPajak)}</Text>
            </View>

            <Text style={styles.sectionHeader}>⚙️ BIAYA LAINNYA (OPSIONAL)</Text>
            <View style={styles.grid2Col}>
              <View style={styles.gridItem}>
                <Text style={styles.miniLabel}>Biaya Pengiriman</Text>
                <TextInput style={styles.smallInput} keyboardType="number-pad" placeholder="0" placeholderTextColor="rgba(255,255,255,0.2)" value={biayaPengiriman === "0" ? "" : biayaPengiriman} onChangeText={setBiayaPengiriman} />
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.miniLabel}>Biaya Pemrosesan / Jasa</Text>
                <TextInput style={styles.smallInput} keyboardType="number-pad" placeholder="0" placeholderTextColor="rgba(255,255,255,0.2)" value={biayaPemrosesan === "0" ? "" : biayaPemrosesan} onChangeText={setBiayaPemrosesan} />
              </View>
            </View>

            <View style={styles.rowSubtotal}>
              <Text style={styles.subtotalLabel}>Subtotal Biaya Lainnya:</Text>
              <Text style={styles.subtotalVal}>{formatRupiah(subtotalBiayaLainnya)}</Text>
            </View>

            <Text style={styles.miniLabel}>DESKRIPSI / CATATAN TAMBAHAN</Text>
            <TextInput style={[styles.smallInput, { height: 40, textAlignVertical: "top" }]} multiline placeholder="Contoh: Pembayaran via e-Samsat..." placeholderTextColor="rgba(255,255,255,0.2)" value={deskripsi} onChangeText={setDeskripsi} />

            <View style={styles.totalHighlightContainer}>
              <Text style={styles.totalLabel}>TOTAL PEMBAYARAN AKHIR</Text>
              <Text style={styles.totalAmount}>{formatRupiah(totalPembayaran)}</Text>
            </View>

            <TouchableOpacity onPress={handlePickDocuments} style={styles.uploadBtn}>
              <Text style={styles.uploadBtnText}>📎 Upload Dokumen Bukti (Gambar / PDF)</Text>
            </TouchableOpacity>

            {uploadedFiles.length > 0 && (
              <View style={styles.fileListCard}>
                {uploadedFiles.map((f, i) => <Text key={i} style={styles.fileNameText} numberOfLines={1}>📄 {f.name}</Text>)}
                <Text style={styles.fileCountBadge}>Jumlah File: {uploadedFiles.length} / 10</Text>
              </View>
            )}

            <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn}>
              {loading ? <ActivityIndicator color="#0A1118" /> : <Text style={styles.saveBtnText}>Simpan Riwayat Pajak (Lokal)</Text>}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16, backgroundColor: "#132230", borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  headerTitle: { color: "#FFF", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  headerSub: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 },
  closeBtn: { backgroundColor: "rgba(255,82,82,0.15)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,82,82,0.3)" },
  closeText: { color: "#FF5252", fontSize: 11, fontWeight: "900" },
  toggleContainer: { flexDirection: "row", padding: 4, backgroundColor: "#132230", borderRadius: 10, margin: 16, marginBottom: 4 },
  toggleItem: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  toggleActive: { backgroundColor: "rgba(255,255,255,0.06)" },
  toggleText: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "700" },
  toggleTextActive: { color: "#4ECDC4", fontWeight: "900" },
  card: { backgroundColor: "#132230", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.04)" },
  cardTitle: { color: "#FFF", fontSize: 12, fontWeight: "800", marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", paddingBottom: 4 },
  rowInputs: { flexDirection: "row", gap: 10, marginBottom: 12 },
  miniLabel: { color: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: "700", marginBottom: 4 },
  smallInput: { backgroundColor: "#0A1118", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, color: "#FFF", fontSize: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  sectionHeader: { color: "#F5A623", fontSize: 10, fontWeight: "800", marginTop: 4, marginBottom: 8, letterSpacing: 0.5 },
  grid2Col: { flexDirection: "row", flexWrap: "wrap", rowGap: 8, columnGap: 10, marginBottom: 8 },
  gridItem: { width: "48%" },
  rowSubtotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#0A1118", padding: 8, borderRadius: 8, marginVertical: 6 },
  subtotalLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  subtotalVal: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  totalHighlightContainer: { backgroundColor: "rgba(78,205,196,0.08)", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(78,205,196,0.2)", alignItems: "center", marginVertical: 12 },
  totalLabel: { color: "#4ECDC4", fontSize: 10, fontWeight: "800", marginBottom: 2 },
  totalAmount: { color: "#4ECDC4", fontSize: 18, fontWeight: "900" },
  uploadBtn: { backgroundColor: "#0A1118", padding: 10, borderRadius: 8, alignItems: "center", borderStyle: "dashed", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", marginBottom: 10 },
  uploadBtnText: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "600" },
  fileListCard: { backgroundColor: "rgba(255,255,255,0.02)", padding: 8, borderRadius: 8, marginBottom: 10, gap: 2 },
  fileNameText: { color: "rgba(255,255,255,0.5)", fontSize: 10 },
  fileCountBadge: { color: "#F5A623", fontSize: 9, fontWeight: "bold", marginTop: 2 },
  saveBtn: { backgroundColor: "#4ECDC4", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#0A1118", fontSize: 13, fontWeight: "900" },
});