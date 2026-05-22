import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  Dimensions,
  StyleSheet,
  Alert,
} from "react-native";
import { FuelEntry, Vehicle } from "@/types/maintenance";
import { useLanguage } from "@/context/LanguageContext";
import {
  loadFuelStatsResetDate,
  saveFuelStatsResetDate,
} from "@/utils/storage";

interface FuelLogProps {
  fuelEntries: FuelEntry[];
  vehicle?: Vehicle | null;
  appMode?: 'basic' | 'advance';
  onAdd: () => void;
  onEdit?: (entry: FuelEntry) => void;
  onDelete?: (id: string) => void;
  onUpdateEntries?: (entries: FuelEntry[]) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function formatCurrency(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

const BRAND_LOGOS: any = {
  pertamina: require('@/assets/images/Pertamina.png'),
  shell: require('@/assets/images/Shell.png'),
  bp: require('@/assets/images/BP.png'),
  vivo: require('@/assets/images/Vivo.png'),
};

// --- 2. FUNGSI HELPER UNTUK MENDAPATKAN LOGO ---
const getFuelLogo = (providerName: string) => {
  const name = providerName?.toLowerCase() || '';
  if (name.includes('pertamina')) return BRAND_LOGOS.pertamina;
  if (name.includes('shell')) return BRAND_LOGOS.shell;
  if (name.includes('bp')) return BRAND_LOGOS.bp;
  if (name.includes('vivo')) return BRAND_LOGOS.vivo;
  return null; // Balik ke ikon standar jika tidak cocok
};

export default function FuelLog({
  fuelEntries,
  vehicle,
  appMode = 'basic',
  onAdd,
  onEdit,
  onDelete,
}: FuelLogProps) {
  const { lang } = useLanguage();
  const isId = lang === "id";
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false); // Default: disembunyikan
  
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Reset stats state
  const [statsResetDate, setStatsResetDate] = useState<string | null>(null);
  const [prevResetDate, setPrevResetDate] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false); // Digunakan sebagai toggle inline

  useEffect(() => {
    loadFuelStatsResetDate().then((d) => setStatsResetDate(d));
  }, []);

  // 🚀 PERBAIKAN SORTING: Jika tanggalnya sama, urutkan berdasarkan Odometer!
  const sortedAsc = [...fuelEntries].sort((a, b) => {
    if (a.date === b.date) return a.odometer - b.odometer;
    return a.date.localeCompare(b.date);
  });
  
  // Sorted descending (terbaru di atas) dibuat dengan membalik sortedAsc agar urutannya 100% akurat
  const sorted = [...sortedAsc].reverse();
  let totalDistanceForAvg = 0;
  let totalLitersForAvg = 0;
  const efficiencies: any[] = [];

  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = sortedAsc[i - 1];
    const curr = sortedAsc[i];
    const distance = curr.odometer - prev.odometer;
    
    if (distance > 0 && curr.liters > 0) {
      const kmPerL = distance / curr.liters;
      efficiencies.push({
        km: distance,
        liters: curr.liters,
        kmPerL: kmPerL,
        date: curr.date,
        entryId: curr.id,
      });

      // 🚀 KUNCI PERBAIKAN: Hanya tambahkan ke hitungan rata-rata JIKA bensin diisi SETELAH tombol reset ditekan!
      // 🚀 PERBAIKAN LOGIKA: Cari di urutan ke berapa "Titik Nol" (Reset) itu berada
      const resetIndex = statsResetDate ? sortedAsc.findIndex(e => e.id === statsResetDate) : -1;
                  
      // Hanya hitung rata-rata jika riwayat ini berada SETELAH Titik Nol
      const isAfterReset = resetIndex === -1 || i > resetIndex;
      
      if (isAfterReset) {
        totalDistanceForAvg += distance;
        totalLitersForAvg += curr.liters;
      }
    }
  }

  const avgKmPerL = totalLitersForAvg > 0 ? totalDistanceForAvg / totalLitersForAvg : 0;

  // 3. Hitung Estimasi Sisa BBM & Jarak
  let estRemainingFuel = 0;
  let estRemainingKm = 0;
  const tankCapacity = vehicle?.tankCapacity || 0;

  if (sorted.length > 0 && avgKmPerL > 0) {
    const lastEntry = sorted[0]; 
    let assumedFuelAfterFill = Math.min(lastEntry.liters + (tankCapacity * 0.2), tankCapacity); 
    const currentOdometer = vehicle?.currentOdometer || lastEntry.odometer; 
    const distanceSinceLastFill = currentOdometer - lastEntry.odometer;
    const fuelConsumed = distanceSinceLastFill / avgKmPerL;

    estRemainingFuel = Math.max(assumedFuelAfterFill - fuelConsumed, 0);
    estRemainingKm = estRemainingFuel * avgKmPerL;
  }

  const getStatus = (kmPerL: number) => {
    if (kmPerL > avgKmPerL * 1.1) return { label: isId ? "Irit" : "Efficient", color: "#4ECDC4" };
    if (kmPerL < avgKmPerL * 0.9) return { label: isId ? "Boros" : "Wasteful", color: "#FF5252" };
    return { label: "Normal", color: "#F5A623" };
  };

  const handleDelete = (id: string) => {
  setDeleteId(id); // Simpan ID untuk dikonfirmasi di Modal
};

  const confirmReset = () => {
    // 🚀 PERBAIKAN RESET: Pastikan mengambil ID dari urutan paling akhir di sortedAsc
    const latestEntryId = sortedAsc.length > 0 ? sortedAsc[sortedAsc.length - 1].id : "NONE";
    setPrevResetDate(statsResetDate);
    setStatsResetDate(latestEntryId); // Kita simpan ID-nya, bukan tanggalnya
    saveFuelStatsResetDate(latestEntryId);
    setShowResetConfirm(false);
  };

  const handleUndoReset = () => {
    setStatsResetDate(prevResetDate);
    saveFuelStatsResetDate(prevResetDate);
    setShowResetConfirm(false);
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Modal Preview Foto Struk */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <TouchableOpacity activeOpacity={1} onPress={() => setSelectedImage(null)} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedImage && <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />}
            <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.closeButton}>
              <Text style={{ color: "#FFF", fontWeight: "bold" }}>{isId ? "TUTUP" : "CLOSE"}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
          <Text style={{ color: "#FFFFFF", fontSize: 20, lineHeight: 24 }}>
          ⛽ {isId ? "Catatan BBM" : "Fuel Log"}
        </Text>
      </View>

      {/* Stats Summary (Konsumsi KM/L & Reset) - HANYA TAMPIL DI ADVANCE MODE */}
      {appMode === 'advance' && fuelEntries.length > 0 && (
        <View style={{ paddingHorizontal: 20, marginBottom: 15 }}>
          
          {/* Banner Konsumsi */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(78,205,196,0.08)',
            paddingHorizontal: 20,
            paddingVertical: 18,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(78,205,196,0.3)',
            marginBottom: 8 // Memberi jarak dengan teks reset di bawahnya
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 24 }}>⛽</Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, letterSpacing: 1, fontWeight: "800" }}>
                {isId ? "RATA-RATA KONSUMSI" : "AVG CONSUMPTION"}
              </Text>
            </View>
            <Text style={{ color: "#4ECDC4", fontSize: 22, fontWeight: "900", fontFamily: "SpaceMono" }}>
              {/* Akan benar-benar tampil 0.0 jika avgKmPerL bernilai 0 */}
              {avgKmPerL > 0 ? avgKmPerL.toFixed(1) : "0.0"} <Text style={{ fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.4)" }}>km/L</Text>
            </Text>
          </View>

          {/* Baris Informasi Tanggal & Tombol Reset */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
            <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: 1, fontWeight: '700' }}>
              {(() => {
                const resetEntry = statsResetDate ? fuelEntries.find(e => e.id === statsResetDate) : null;
                if (resetEntry) {
                  return isId ? `DIHITUNG SETELAH: ${resetEntry.date}` : `CALCULATING AFTER: ${resetEntry.date}`;
                }
                return isId ? "PERHITUNGAN AKTIF" : "CALCULATION ACTIVE";
              })()}
            </Text>
            
            {!showResetConfirm ? (
              <TouchableOpacity onPress={() => setShowResetConfirm(true)} activeOpacity={0.7} style={{ padding: 4 }}>
                <Text style={{ color: '#FF5252', fontSize: 10, fontWeight: '800' }}>🔄 {isId ? "Reset" : "Reset"}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', gap: 15 }}>
                <TouchableOpacity onPress={handleUndoReset} activeOpacity={0.7} style={{ padding: 4 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800' }}>↶ {isId ? "Batal" : "Undo"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmReset} activeOpacity={0.7} style={{ padding: 4 }}>
                  <Text style={{ color: '#4ECDC4', fontSize: 10, fontWeight: '800' }}>✓ {isId ? "Simpan" : "Save"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

        </View>
      )}

      {/* Custom Delete Confirmation Modal - Minimalist Version */}
<Modal visible={!!deleteId} transparent animationType="fade">
  <View style={{ 
    flex: 1, 
    backgroundColor: 'rgba(7, 18, 28, 0.95)', // Backdrop lebih gelap & solid
    justifyContent: 'center', 
    alignItems: 'center' 
  }}>
    <View style={{ 
      width: '85%', 
      backgroundColor: '#162431', 
      borderRadius: 32, 
      padding: 30,
      alignItems: 'center',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    }}>
      {/* Indicator Garis Tipis di Atas (Gaya iOS) */}
      <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 25 }} />

      <Text style={{ 
        color: '#FFF', 
        fontSize: 20, 
        fontWeight: '800', 
        marginBottom: 10,
        letterSpacing: -0.5 
      }}>
        {isId ? "Hapus Catatan" : "Delete Record"}
      </Text>
      
      <Text style={{ 
        color: 'rgba(255,255,255,0.4)', 
        textAlign: 'center', 
        fontSize: 14,
        lineHeight: 22, 
        marginBottom: 35,
        paddingHorizontal: 10
      }}>
        {isId 
          ? "Tindakan ini tidak dapat dibatalkan. Data bensin akan hilang dari riwayat." 
          : "This action cannot be undone. Fuel data will be removed from history."}
      </Text>

      <View style={{ width: '100%', gap: 12 }}>
        {/* Tombol Hapus - Dibuat Bold & Utama */}
        <TouchableOpacity 
          onPress={() => {
            if (deleteId) {
              onDelete?.(deleteId);
              setDeleteId(null);
            }
          }}
          activeOpacity={0.8}
          style={{ 
            width: '100%', 
            paddingVertical: 16, 
            borderRadius: 20, 
            backgroundColor: '#FF5252',
            alignItems: 'center',
            shadowColor: "#FF5252",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>
            {isId ? "Ya, Hapus Data" : "Yes, Delete Data"}
          </Text>
        </TouchableOpacity>

        {/* Tombol Batal - Dibuat Tanpa Background (Ghost Button) */}
        <TouchableOpacity 
          onPress={() => setDeleteId(null)}
          activeOpacity={0.6}
          style={{ 
            width: '100%', 
            paddingVertical: 16, 
            borderRadius: 20, 
            backgroundColor: 'transparent',
            alignItems: 'center' 
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 15 }}>
            {isId ? "Mungkin Nanti" : "Maybe Later"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

      {/* List View */}
      <View style={{ gap: 8, paddingHorizontal: 20 }}>
        {sorted.map((entry) => {
          const providerName = entry.provider || entry.notes || ""; 
          const logo = getFuelLogo(providerName);
          const isExpanded = expandedId === entry.id;
          const eff = efficiencies.find((e) => e.entryId === entry.id);
          const receiptUrl = entry.notes?.match(/\[receipt:(.*?)\]/)?.[1] || entry.receiptPhoto || null;
          let baseText = entry.notes ? entry.notes.replace(/\[receipt:.*?\]/g, "").trim() : "";
          let fuelInfo = isId ? "Bensin" : "Fuel";
          let userDescription = "";

          if (baseText.includes("|")) {
            const parts = baseText.split("|");
            fuelInfo = parts[0].trim() || (isId ? "Bensin" : "Fuel");
            userDescription = parts[1].trim();
          } else {
            fuelInfo = entry.fuelType || baseText || (isId ? "Bensin" : "Fuel");
          }

          const isFlagged = eff?.isFlagged || entry.isFlagged;

          return (
  <View key={entry.id} style={[styles.entryCard, isFlagged && { borderColor: "rgba(255,82,82,0.4)" }]}>
    
    {/* 1. BAGIAN HEADER (Selalu Tampil & Bisa Diklik) */}
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
      style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}
    >
      {/* Container Sisi Kiri (Ikon + Teks Utama) */}
      <View style={{ flexDirection: "row", gap: 10, flex: 1 }}>
        <View style={styles.iconBox}>
          {logo ? (
            <Image 
              source={logo} 
              style={{ width: 24, height: 24 }} 
              resizeMode="contain" 
            />
          ) : (
            <Text style={{ fontSize: 18 }}>⛽</Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "800" }}>{entry.liters.toFixed(1)} L</Text>
            <Text style={{ color: "#F5A623", fontSize: 12, fontWeight: "700" }}>• {fuelInfo}</Text>
          </View>
          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
            {entry.date} · {entry.odometer.toLocaleString()} km
          </Text>
        </View>
      </View>

      {/* Container Sisi Kanan (Harga & Indikator Panah) */}
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={styles.totalPriceText}>{formatCurrency(entry.totalCost)}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
          {expandedId === entry.id ? '▲' : '▼'}
        </Text>
      </View>
    </TouchableOpacity>

    {/* 2. BAGIAN DETAIL (Hanya Muncul Jika expandedId cocok) */}
    {expandedId === entry.id && (
      <View style={{ marginTop: 16, gap: 12 }}>
        
        {/* Statistik Kecil */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={styles.miniStatBox}>
            <Text style={styles.miniLabel}>HARGA/L</Text>
            <Text style={styles.miniValue}>{formatCurrency(entry.pricePerLiter)}</Text>
          </View>
          {eff && (
            <View style={styles.miniStatBox}>
              <Text style={styles.miniLabel}>KM/LITER</Text>
              <Text style={[styles.miniValue, { color: isFlagged ? "#FF5252" : "#4ECDC4" }]}>{eff.kmPerL.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Catatan & Struk */}
        {userDescription ? <Text style={styles.descriptionText}>"{userDescription}"</Text> : null}
        
        {receiptUrl && (
          <TouchableOpacity onPress={() => setSelectedImage(receiptUrl)} style={styles.receiptButton}>
            <Text style={styles.receiptButtonText}>📸 {isId ? "Lihat Struk" : "View Receipt"}</Text>
          </TouchableOpacity>
        )}

        {/* Tombol Aksi */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 }}>
          <TouchableOpacity 
            onPress={() => onEdit?.(entry)}
            activeOpacity={0.7}
            style={{ 
              flex: 1, height: 45, backgroundColor: 'rgba(245,166,35,0.1)', borderRadius: 12, 
              borderWidth: 1, borderColor: 'rgba(245,166,35,0.2)', alignItems: 'center', 
              justifyContent: 'center', flexDirection: 'row', gap: 8 
            }}
          >
            <Text>✏️</Text>
            <Text style={{ color: '#F5A623', fontWeight: '700', fontSize: 13 }}>{isId ? "Edit" : "Edit"}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleDelete(entry.id)}
            activeOpacity={0.7}
            style={{ 
              flex: 1, height: 45, backgroundColor: 'rgba(255,82,82,0.1)', borderRadius: 12, 
              borderWidth: 1, borderColor: 'rgba(255,82,82,0.2)', alignItems: 'center', 
              justifyContent: 'center', flexDirection: 'row', gap: 8 
            }}
          >
            <Text>🗑️</Text>
            <Text style={{ color: '#FF5252', fontWeight: '700', fontSize: 13 }}>{isId ? "Hapus" : "Delete"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
  </View>
);
        })}
      </View>
    </View>
    );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20 },
  addButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(78,205,196,0.15)", borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(78,205,196,0.3)" },
  
  // --- STATS CARD STYLES ---
  statCard: { flex: 1, backgroundColor: "#1A2B3C", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  statIcon: { fontSize: 16, marginBottom: 4 }, 
  statLabel: { color: "rgba(255,255,255,0.4)", fontSize: 8, letterSpacing: 1, fontWeight: "800", marginBottom: 2 },
  statValue: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", fontFamily: "SpaceMono" },
  statUnit: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.3)" },
  disclaimerText: { color: "rgba(255,255,255,0.2)", fontSize: 9, fontStyle: "italic", textAlign: "right" }, 

  resetMainBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: "rgba(255,82,82,0.1)", borderWidth: 1, borderColor: "rgba(255,82,82,0.2)" },
  resetBtnText: { color: "#FF5252", fontSize: 12, fontWeight: "700" },
  undoBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  undoBtnText: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "700" },
  saveResetBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: "rgba(78,205,196,0.2)", borderWidth: 1, borderColor: "#4ECDC4" },
  saveResetBtnText: { color: "#4ECDC4", fontSize: 12, fontWeight: "700" },
  entryCard: { backgroundColor: "#1A2B3C", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", gap: 12 },
  actionHeader: { flexDirection: "row", justifyContent: "flex-end", gap: 15, marginBottom: -5 },
  editText: { color: "#4ECDC4", fontSize: 11, fontWeight: "700", opacity: 0.8 },
  deleteText: { color: "#FF5252", fontSize: 11, fontWeight: "700", opacity: 0.8 },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(78,205,196,0.1)", alignItems: "center", justifyContent: "center" },
  totalPriceText: { color: "#F5A623", fontSize: 14, fontWeight: "700", fontFamily: "SpaceMono" },
  miniStatBox: { flex: 1, backgroundColor: "rgba(13,27,42,0.5)", borderRadius: 8, padding: 10 },
  miniLabel: { color: "rgba(255,255,255,0.3)", fontSize: 9 },
  miniValue: { color: "#FFFFFF", fontSize: 11, fontWeight: "600", fontFamily: "SpaceMono" },
  descriptionText: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontStyle: "italic", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingTop: 8 },
  receiptButton: { alignSelf: "flex-end", backgroundColor: "rgba(78,205,196,0.1)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "rgba(78,205,196,0.3)" },
  receiptButtonText: { color: "#4ECDC4", fontSize: 11, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8 },
  fullImage: { width: "100%", height: "100%" },
  closeButton: { position: "absolute", bottom: 40, alignSelf: "center", backgroundColor: "rgba(255,255,255,0.2)", paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20 },
});