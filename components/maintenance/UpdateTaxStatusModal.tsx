import React, { useState, useEffect } from "react";
import { View, Text, Modal, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, StyleSheet, Platform} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "@/utils/supabaseClient";
import { Vehicle } from "@/types/maintenance";
import { LinearGradient } from "expo-linear-gradient";

interface UpdateTaxStatusModalProps {
  visible: boolean;
  onClose: () => void;
  vehicle: Vehicle | null | undefined;
  initialType?: "annual" | "five_year" | null;
  onSuccess: (newTaxDate?: string, newStnkDate?: string) => void; // 🚀 FIX 1: Izinkan menerima parameter tanggal agar bisa dilempar ke parent
}

interface LocalFile {
  uri: string;
  name: string;
  type?: string;
}

export default function UpdateTaxStatusModal({ visible, onClose, vehicle, initialType = "annual", onSuccess }: UpdateTaxStatusModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  const [taxType, setTaxType] = useState<"annual" | "five_year">("annual");
  const [history, setHistory] = useState<any[]>([]);

  // --- STATES FORM INPUT ---
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

  // Lampiran Files
  const [uploadedFiles, setUploadedFiles] = useState<LocalFile[]>([]);

  // --- HITUNGAN MATEMATIS OTOMATIS ---
  const num = (val: string) => parseFloat(val) || 0;

  const subtotalPajak =
    num(pkbPokok) + num(pkbDenda) +
    num(opsenPkbPokok) + num(opsenPkbDenda) +
    num(swdklljPokok) + num(swdklljDenda) +
    (taxType === "five_year" ? num(pnbpStnk) + num(pnbpTnkb) : 0);

  const subtotalBiayaLainnya = num(biayaPengiriman) + num(biayaPemrosesan);
  const totalPembayaran = subtotalPajak + subtotalBiayaLainnya;

  // Sync awal tipe pajak & fetch riwayat dari database
  useEffect(() => {
    if (visible && vehicle) {
      if (initialType) {
        setTaxType(initialType === "five_year" ? "five_year" : "annual");
      }
      resetForm();
    }
  }, [visible]);

  useEffect(() => {
    if (visible && vehicle?.id) {
      fetchHistoryData();
    }
  }, [visible, vehicle?.id]);

  const resetForm = () => {
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setNextTaxDate("");
    setNextStnkDate("");
    setDeskripsi("");
    setPkbPokok("0"); setPkbDenda("0");
    setOpsenPkbPokok("0"); setOpsenPkbDenda("0");
    setSwdklljPokok("0"); setSwdklljDenda("0");
    setPnbpStnk("0"); setPnbpTnkb("0");
    setBiayaPengiriman("0"); setBiayaPemrosesan("0");
    setUploadedFiles([]);
  };

  const fetchHistoryData = async () => {
    if (!vehicle?.id) return;
    setFetchingHistory(true);
    try {
      const { data, error } = await supabase
        .from("vehicle_tax_payment_history")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .order("created_at", { ascending: false });
      if (!error && data) setHistory(data);
    } catch (err) {
      console.log("History error:", err);
    } finally {
      setFetchingHistory(false);
    }
  };

  const handlePickDocuments = async () => {
    if (uploadedFiles.length >= 10) {
      Alert.alert("Batas Maksimum", "Maksimal berkas yang diunggah adalah 10 file.");
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
    console.log("=== [KLIK TRIGGERED] Tombol Simpan Riwayat Pajak Ditekan ===");
    
    const cleanNextTaxDate = nextTaxDate.trim();
    const cleanNextStnkDate = nextStnkDate.trim();

    console.log("Detail Payload Form:", {
      taxType,
      paymentDate: paymentDate.trim(),
      nextTaxDate: cleanNextTaxDate,
      nextStnkDate: cleanNextStnkDate,
      totalPembayaran
    });

    if (!cleanNextTaxDate) {
      console.log("❌ Validasi Gagal: Tanggal Pajak Baru masih kosong!");
      Alert.alert("Tanggal Kosong", "Silakan isi tanggal pajak berikutnya.");
      return;
    }

    if (taxType === "five_year" && !cleanNextStnkDate) {
      console.log("❌ Validasi Gagal: Tanggal STNK Baru masih kosong untuk tipe 5 Tahunan!");
      Alert.alert("Tanggal Kosong", "Silakan isi tanggal masa berlaku STNK baru.");
      return;
    }

    if (Platform.OS === 'web') {
      const konfirmasiWeb = window.confirm(
        "Simpan Rekam Keuangan?\n\nPastikan rincian biaya yang dimasukkan sudah sesuai dengan lembar fisik Samsat Anda."
      );
      if (konfirmasiWeb) {
        console.log("🔄 Web Browser: Konfirmasi disetujui, mengeksekusi ekspor data...");
        executeSave();
      } else {
        console.log("❌ Web Browser: Pengguna membatalkan transaksi.");
      }
      return;
    }

    Alert.alert(
      "Simpan Rekam Keuangan", 
      "Pastikan rincian biaya yang dimasukkan sudah sesuai dengan lembar fisik Samsat Anda.", 
      [
        { text: "Batal", style: "cancel", onPress: () => console.log("❌ Mobile: Pengguna membatalkan.") },
        { text: "Simpan Sekarang", fontWeight: "bold", onPress: () => {
            console.log("🔄 Mobile: Konfirmasi disetujui, mengeksekusi executeSave()...");
            executeSave();
          } 
        }
      ]
    );
  };

  const executeSave = async () => {
    if (!vehicle?.id) {
      console.log("❌ Abort: ID Kendaraan tidak terbaca (null/undefined).");
      return;
    }
    
    setLoading(true);
    console.log("==========================================================");
    console.log("🚀 Memulai Proses Sinkronisasi Transaksi Ke Cloud Supabase...");
    
    try {
      const urls: string[] = [];
      
      // 1. PROSES MULTI-FILE UPLOAD BUKTI (JIKA ADA) DENGAN ENGINE HYBRID WEB BLOB
      if (uploadedFiles.length > 0) {
        console.log(`📂 Memproses unggahan ${uploadedFiles.length} file dokumen bukti...`);
        for (const [index, file] of uploadedFiles.entries()) {
          const ext = file.name.split('.').pop()?.toLowerCase();
          const path = `${vehicle.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          
          const contentType = ext === 'pdf' ? 'application/pdf' : (file.type || 'image/jpeg');
          let fileBody: any;

          if (Platform.OS === 'web') {
            console.log(`💻 Lingkungan Web Browser: Mengonversi berkas ${ext} ke Blob murni...`);
            const response = await fetch(file.uri);
            fileBody = await response.blob();
          } else {
            console.log("📱 Lingkungan perangkat Mobile...");
            const formData = new FormData();
            formData.append("file", { 
              uri: file.uri, 
              name: file.name, 
              type: contentType 
            } as any);
            fileBody = formData;
          }

          const { data: upData, error: upErr } = await supabase.storage
            .from("tax_proofs")
            .upload(path, fileBody, {
              contentType: contentType,
              cacheControl: '3600',
              upsert: true
            });
          
          if (upErr) {
            console.error(`❌ Gagal Upload Berkas ke-${index + 1}:`, upErr.message);
            throw upErr;
          }
          
          if (upData) {
            const { data } = supabase.storage.from("tax_proofs").getPublicUrl(path);
            if (data?.publicUrl) urls.push(data.publicUrl);
          }
        }
        console.log("✅ Seluruh berkas lampiran sukses terunggah.");
      }

      // 2. 🚀 FIX UTAMA: UPDATE DATA KENDARAAN SESUAI KOLOM SQL (tax_due_date & stnk_due_date)
      const mainUpdate: any = { tax_due_date: nextTaxDate.trim() };
      if (taxType === "five_year") mainUpdate.stnk_due_date = nextStnkDate.trim();

      console.log("[DB Update] Mengirim data ke tabel 'vehicles'...", mainUpdate);
      const { error: vErr } = await supabase.from("vehicles").update(mainUpdate).eq("id", vehicle.id);
      if (vErr) {
        console.error("❌ [Supabase Error] Gagal mengupdate tabel vehicles:", vErr.message);
        throw vErr;
      }

      // 3. INSERT LOG AUDIT BARU (TABLE: vehicle_tax_payment_history)
      const payloadHistori = {
        vehicle_id: vehicle.id,
        payment_type: taxType === "five_year" ? "five_year_stnk" : "annual_tax",
        payment_date: paymentDate.trim(),
        new_tax_due_date: nextTaxDate.trim(),
        new_stnk_due_date: taxType === "five_year" ? nextStnkDate.trim() : null,
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
        proof_files_urls: urls
      };

      console.log("[DB Insert] Mengirim data log ke 'vehicle_tax_payment_history'...", payloadHistori);
      const { error: hErr } = await supabase.from("vehicle_tax_payment_history").insert(payloadHistori);
      if (hErr) {
        console.error("❌ [Supabase Error] Gagal mencatat history pajak:", hErr.message);
        throw hErr;
      }

      console.log("==========================================================");
      console.log("🎉 SINKRONISASI CLOUD BERHASIL DATA TERSIMPAN!");
      console.log("==========================================================");
      
      if (Platform.OS === 'web') {
        window.alert("✅ Riwayat pembayaran berhasil diarsipkan ke Cloud!");
      } else {
        Alert.alert("Sukses", "✅ Riwayat pembayaran berhasil diarsipkan.");
      }

      const finalTaxDate = nextTaxDate.trim();
      const finalStnkDate = taxType === "five_year" ? nextStnkDate.trim() : "null";

      resetForm();
      await fetchHistoryData(); 
      
      // 🚀 EKSEKUSI CALLBACK: Kirim data tanggal keluar agar dibaca reaktif oleh form edit & dashboard
      onSuccess(finalTaxDate, finalStnkDate);
      
    } catch (e: any) {
      console.error("💥 CRASH DETECTED pada Blok DB Supabase:", e);
      Alert.alert("Gagal Menyimpan", e.message || "Terjadi kendala integrasi database.");
    } finally {
      setLoading(false);
      console.log("=== [SELESAI] Proses Eksekusi Selesai ===");
      console.log("==========================================================");
    }
  };

  const formatRupiah = (v: number) => "Rp " + v.toLocaleString("id-ID");

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <LinearGradient colors={["#0A1118", "#121E2A"]} style={{ flex: 1 }}>
        {/* HEADER BAR FULL SCREEN */}
        <View style={s.headerContainer}>
          <View>
            <Text style={s.headerTitle}>🗄️ MANAJEMEN RIWAYAT & FISIK PAJAK</Text>
            <Text style={s.headerSub}>{vehicle?.name || "Kendaraan"} • Pembaruan & Log Finansial</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>TUTUP</Text>
          </TouchableOpacity>
        </View>

        {/* TOGGLE PILIHAN JENIS PAJAK */}
        <View style={s.toggleContainer}>
          <TouchableOpacity onPress={() => setTaxType("annual")} style={[s.toggleItem, taxType === "annual" && s.toggleActive]}>
            <Text style={[s.toggleText, taxType === "annual" && s.toggleTextActive]}>PAJAK 1 TAHUN</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTaxType("five_year")} style={[s.toggleItem, taxType === "five_year" && s.toggleActive]}>
            <Text style={[s.toggleText, taxType === "five_year" && s.toggleTextActive]}>PAJAK & STNK 5 TAHUN</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }}>
          
          {/* CARD 1: FORMULIR RINCIAN PEMBAYARAN (COMPACT DESIGN) */}
          <View style={s.card}>
            <Text style={s.cardTitle}>📝 FORM MASUKAN DATA BARU</Text>
            
            {/* Kolom Tanggal Berjajar Ringkas */}
            <View style={s.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={s.miniLabel}>TANGGAL BAYAR</Text>
                <TextInput style={s.smallInput} value={paymentDate} onChangeText={setPaymentDate} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.2)" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.miniLabel}>TANGGAL PAJAK BARU</Text>
                <TextInput style={s.smallInput} value={nextTaxDate} onChangeText={setNextTaxDate} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.2)" />
              </View>
              {taxType === "five_year" && (
                <View style={{ flex: 1 }}>
                  <Text style={s.miniLabel}>TANGGAL STNK BARU</Text>
                  <TextInput style={s.smallInput} value={nextStnkDate} onChangeText={setNextStnkDate} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.2)" />
                </View>
              )}
            </View>

            {/* Grid Komponen Finansial (Samsat) */}
            <Text style={s.sectionHeader}>📊 RINCIAN KOMPONEN BIAYA RESMI</Text>
            <View style={s.grid2Col}>
              <View style={s.gridItem}>
                <Text style={s.miniLabel}>PKB Pokok</Text>
                <TextInput 
                  style={s.smallInput} 
                  keyboardType="number-pad" 
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={pkbPokok === "0" ? "" : pkbPokok} 
                  onChangeText={setPkbPokok} 
                />
              </View>
              <View style={s.gridItem}>
                <Text style={s.miniLabel}>PKB Denda</Text>
                <TextInput 
                  style={s.smallInput} 
                  keyboardType="number-pad" 
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={pkbDenda === "0" ? "" : pkbDenda} 
                  onChangeText={setPkbDenda} 
                />
              </View>
              <View style={s.gridItem}>
                <Text style={s.miniLabel}>Opsen PKB Pokok</Text>
                <TextInput 
                  style={s.smallInput} 
                  keyboardType="number-pad" 
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={opsenPkbPokok === "0" ? "" : opsenPkbPokok} 
                  onChangeText={setOpsenPkbPokok} 
                />
              </View>
              <View style={s.gridItem}>
                <Text style={s.miniLabel}>Opsen PKB Denda</Text>
                <TextInput 
                  style={s.smallInput} 
                  keyboardType="number-pad" 
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={opsenPkbDenda === "0" ? "" : opsenPkbDenda} 
                  onChangeText={setOpsenPkbDenda} 
                />
              </View>
              <View style={s.gridItem}>
                <Text style={s.miniLabel}>SWDKLLJ Pokok</Text>
                <TextInput 
                  style={s.smallInput} 
                  keyboardType="number-pad" 
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={swdklljPokok === "0" ? "" : swdklljPokok} 
                  onChangeText={setSwdklljPokok} 
                />
              </View>
              <View style={s.gridItem}>
                <Text style={s.miniLabel}>SWDKLLJ Denda</Text>
                <TextInput 
                  style={s.smallInput} 
                  keyboardType="number-pad" 
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={swdklljDenda === "0" ? "" : swdklljDenda} 
                  onChangeText={setSwdklljDenda} 
                />
              </View>
              {taxType === "five_year" && (
                <>
                  <View style={s.gridItem}>
                    <Text style={s.miniLabel}>PNBP STNK</Text>
                    <TextInput 
                      style={s.smallInput} 
                      keyboardType="number-pad" 
                      placeholder="0"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      value={pnbpStnk === "0" ? "" : pnbpStnk} 
                      onChangeText={setPnbpStnk} 
                    />
                  </View>
                  <View style={s.gridItem}>
                    <Text style={s.miniLabel}>PNBP TNKB</Text>
                    <TextInput 
                      style={s.smallInput} 
                      keyboardType="number-pad" 
                      placeholder="0"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      value={pnbpTnkb === "0" ? "" : pnbpTnkb} 
                      onChangeText={setPnbpTnkb} 
                    />
                  </View>
                </>
              )}
            </View>

            {/* Subtotal Bagian Pajak */}
            <View style={s.rowSubtotal}>
              <Text style={s.subtotalLabel}>Subtotal Pajak:</Text>
              <Text style={s.subtotalVal}>{formatRupiah(subtotalPajak)}</Text>
            </View>

            {/* Biaya Eksternal Opsional */}
            <Text style={s.sectionHeader}>⚙️ BIAYA LAINNYA (OPSIONAL)</Text>
            <View style={s.grid2Col}>
              <View style={s.gridItem}>
                <Text style={s.miniLabel}>Biaya Pengiriman</Text>
                <TextInput 
                  style={s.smallInput} 
                  keyboardType="number-pad" 
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={biayaPengiriman === "0" ? "" : biayaPengiriman} 
                  onChangeText={setBiayaPengiriman} 
                />
              </View>
              <View style={s.gridItem}>
                <Text style={s.miniLabel}>Biaya Pemrosesan / Jasa</Text>
                <TextInput 
                  style={s.smallInput} 
                  keyboardType="number-pad" 
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={biayaPemrosesan === "0" ? "" : biayaPemrosesan} 
                  onChangeText={setBiayaPemrosesan} 
                />
              </View>
            </View>

            <View style={s.rowSubtotal}>
              <Text style={s.subtotalLabel}>Subtotal Biaya Lainnya:</Text>
              <Text style={s.subtotalVal}>{formatRupiah(subtotalBiayaLainnya)}</Text>
            </View>

            {/* Tambahan Kolom Catatan */}
            <Text style={s.miniLabel}>DESKRIPSI / CATATAN TAMBAHAN</Text>
            <TextInput style={[s.smallInput, { height: 40, textAlignVertical: "top" }]} multiline placeholder="Contoh: Pembayaran via e-Samsat..." placeholderTextColor="rgba(255,255,255,0.2)" value={deskripsi} onChangeText={setDeskripsi} />

            {/* Total Highlight Utama */}
            <View style={s.totalHighlightContainer}>
              <Text style={s.totalLabel}>TOTAL PEMBAYARAN AKHIR</Text>
              <Text style={s.totalAmount}>{formatRupiah(totalPembayaran)}</Text>
            </View>

            {/* Multi Document Picker Uploader Button */}
            <TouchableOpacity onPress={handlePickDocuments} style={s.uploadBtn}>
              <Text style={s.uploadBtnText}>📎 Upload Dokumen Bukti (Gambar / PDF)</Text>
            </TouchableOpacity>

            {uploadedFiles.length > 0 && (
              <View style={s.fileListCard}>
                {uploadedFiles.map((f, i) => <Text key={i} style={s.fileNameText} numberOfLines={1}>📄 {f.name}</Text>)}
                <Text style={s.fileCountBadge}>Jumlah File: {uploadedFiles.length} / 10</Text>
              </View>
            )}

            {/* Tombol Simpan Aksi */}
            <TouchableOpacity onPress={handleSave} disabled={loading} style={s.saveBtn}>
              {loading ? <ActivityIndicator color="#0A1118" /> : <Text style={s.saveBtnText}>Simpan Riwayat Pajak</Text>}
            </TouchableOpacity>
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