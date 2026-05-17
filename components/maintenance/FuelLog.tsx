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

  const activeEntries = statsResetDate
    ? fuelEntries.filter((e) => e.date >= statsResetDate)
    : fuelEntries;

  const sorted = [...fuelEntries].sort((a, b) => b.date.localeCompare(a.date));

  // 1. Hitung AVG KM/L (Berdasarkan semua data historis agar lebih stabil)
  const sortedAsc = [...fuelEntries].sort((a, b) => a.date.localeCompare(b.date));
  let totalDistanceForAvg = 0;
  let totalLitersForAvg = 0;
  const efficiencies: any[] = [];

  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = sortedAsc[i - 1];
    const curr = sortedAsc[i];
    const distance = curr.odometer - prev.odometer;
    
    if (distance > 0 && curr.liters > 0) {
      const kmPerL = distance / curr.liters;
      totalDistanceForAvg += distance;
      totalLitersForAvg += curr.liters;
      efficiencies.push({
        km: distance,
        liters: curr.liters,
        kmPerL: kmPerL,
        date: curr.date,
        entryId: curr.id,
      });
    }
  }

  const avgKmPerL = totalLitersForAvg > 0 ? totalDistanceForAvg / totalLitersForAvg : 0;

  // 2. Hitung Total Bulan Ini (Dari activeEntries / Reset Date)
  const totalLitersThisMonth = activeEntries.reduce((sum, e) => sum + e.liters, 0);
  const totalCostThisMonth = activeEntries.reduce((sum, e) => sum + e.totalCost, 0);

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
    const today = new Date().toISOString().split("T")[0];
    setPrevResetDate(statsResetDate);
    setStatsResetDate(today);
    saveFuelStatsResetDate(today);
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
        <TouchableOpacity onPress={onAdd} activeOpacity={0.8} style={styles.addButton}>
          <Text style={{ color: "#4ECDC4", fontSize: 16, fontWeight: "700" }}>+</Text>
          <Text style={{ color: "#4ECDC4", fontSize: 12, fontWeight: "600" }}>{isId ? "Isi BBM" : "Add Fuel"}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      {fuelEntries.length > 0 && (
        <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
          
          {/* Tombol Buka/Tutup Statistik */}
          <TouchableOpacity
            onPress={() => setShowStats(!showStats)}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(78,205,196,0.1)',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(78,205,196,0.3)',
            }}
          >
            <Text style={{ color: '#4ECDC4', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }}>
              {showStats 
                ? (isId ? "Sembunyikan Statistik BBM" : "Hide Fuel Stats") 
                : (isId ? "Tampilkan Statistik BBM 📊" : "Show Fuel Stats 📊")}
            </Text>
            <Text style={{ color: '#4ECDC4', fontSize: 16, fontWeight: 'bold' }}>
              {showStats ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {/* Isi Statistik (Hanya muncul jika tombol ditekan / showStats = true) */}
          {showStats && (
            <View style={{ gap: 10, marginTop: 15 }}>
              
              {/* VALIDASI: Cek apakah kapasitas tangki sudah diatur? */}
              {tankCapacity > 0 ? (
                // --- JIKA TANGKI SUDAH DIISI: Tampilkan Estimasi ---
                <>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={[styles.statCard, { backgroundColor: 'rgba(78,205,196,0.05)', borderColor: 'rgba(78,205,196,0.2)' }]}>
                      <Text style={styles.statIcon}>⛽</Text>
                      <Text style={styles.statLabel}>KONSUMSI</Text>
                      <Text style={[styles.statValue, { color: "#4ECDC4" }]}>{avgKmPerL > 0 ? avgKmPerL.toFixed(1) : "-"} <Text style={styles.statUnit}>km/L</Text></Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: 'rgba(245,166,35,0.05)', borderColor: 'rgba(245,166,35,0.2)' }]}>
                      <Text style={styles.statIcon}>🛢️</Text>
                      <Text style={styles.statLabel}>SISA BBM</Text>
                      <Text style={[styles.statValue, { color: "#F5A623" }]}>±{estRemainingFuel.toFixed(1)} <Text style={styles.statUnit}>L</Text></Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: 'rgba(162,155,254,0.05)', borderColor: 'rgba(162,155,254,0.2)' }]}>
                      <Text style={styles.statIcon}>🛣️</Text>
                      <Text style={styles.statLabel}>ESTIMASI</Text>
                      <Text style={[styles.statValue, { color: "#A29BFE" }]}>±{estRemainingKm.toFixed(0)} <Text style={styles.statUnit}>km</Text></Text>
                    </View>
                  </View>
                  <Text style={styles.disclaimerText}>*Estimasi berdasarkan riwayat dan kapasitas tangki {tankCapacity}L.</Text>
                </>
              ) : (
                // --- JIKA TANGKI BELUM DIISI (0): Tampilkan Peringatan ---
                <View style={{ backgroundColor: 'rgba(245,166,35,0.1)', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(245,166,35,0.3)', alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, marginBottom: 8 }}>⚠️</Text>
                  <Text style={{ color: '#F5A623', fontSize: 14, fontWeight: '800', textAlign: 'center', marginBottom: 6 }}>
                    {isId ? "Kapasitas Tangki Belum Diisi" : "Tank Capacity Not Set"}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
                    {isId 
                      ? "Untuk melihat estimasi Sisa BBM dan Jarak Tempuh, silakan edit Profil Kendaraan Anda dan isi Kapasitas Tangki terlebih dahulu." 
                      : "To see Fuel and Distance estimations, please edit your Vehicle Profile and set the Tank Capacity first."}
                  </Text>
                </View>
              )}

              {/* Row 2: Pengeluaran Bulanan / Reset (Tetap Tampil di bawah peringatan/estimasi) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: 1, fontWeight: '700' }}>
                  {isId ? `PENGELUARAN SEJAK: ${statsResetDate || '-'}` : `EXPENSES SINCE: ${statsResetDate || '-'}`}
                </Text>
                {!showResetConfirm ? (
                  <TouchableOpacity onPress={() => setShowResetConfirm(true)}>
                    <Text style={{ color: '#FF5252', fontSize: 10, fontWeight: '700' }}>🔄 {isId ? "Reset" : "Reset"}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={handleUndoReset}><Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700' }}>↶ Undo</Text></TouchableOpacity>
                    <TouchableOpacity onPress={confirmReset}><Text style={{ color: '#4ECDC4', fontSize: 10, fontWeight: '700' }}>✓ Simpan</Text></TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>TOTAL LITER</Text>
                  <Text style={styles.statValue}>{totalLitersThisMonth.toFixed(1)} <Text style={styles.statUnit}>L</Text></Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>TOTAL BIAYA</Text>
                  <Text style={[styles.statValue, { fontSize: 13 }]}>{formatCurrency(totalCostThisMonth)}</Text>
                </View>
              </View>

            </View>
          )}
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