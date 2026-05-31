import React, { useState, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, Modal, Image, Dimensions, StyleSheet, FlatList } from "react-native";
import { FuelEntry, Vehicle } from "@/types/maintenance";
import { useLanguage } from "@/context/LanguageContext";
import { useRegional } from "@/context/RegionalContext";
import { formatCurrency } from "@/utils/formatters";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const BRAND_LOGOS: any = {
  pertamina: require('@/assets/images/Pertamina.png'),
  shell: require('@/assets/images/Shell.png'),
  bp: require('@/assets/images/BP.png'),
  vivo: require('@/assets/images/Vivo.png'),
};

const getFuelLogo = (providerName: string) => {
  const name = providerName?.toLowerCase() || '';
  if (name.includes('pertamina')) return BRAND_LOGOS.pertamina;
  if (name.includes('shell')) return BRAND_LOGOS.shell;
  if (name.includes('bp')) return BRAND_LOGOS.bp;
  if (name.includes('vivo')) return BRAND_LOGOS.vivo;
  return null; 
};

interface FuelLogProps {
  fuelEntries: FuelEntry[];
  vehicle?: Vehicle | null;
  appMode?: 'basic' | 'advance';
  hideSearch?: boolean;
  onToggleSearch?: () => void;
  onAdd: () => void;
  onEdit?: (entry: FuelEntry) => void;
  onDelete?: (id: string) => void;
  
  // Props baru operan dari index.tsx
  hideStats?: boolean;
  onToggleStats?: () => void;
  statsResetDate?: string | null;
  onUpdateResetDate?: (date: string | null) => void;
}

function FuelLogComponent({ 
  fuelEntries, vehicle, appMode = 'basic', hideSearch = false, onToggleSearch, onAdd, onEdit, onDelete,
  hideStats = false, onToggleStats, statsResetDate = null, onUpdateResetDate
}: FuelLogProps) {
  const { lang } = useLanguage();
  const isId = lang === "id";
  const { currency, distanceUnit, volumeUnit } = useRegional();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [prevResetDate, setPrevResetDate] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 🚀 KUNCI PERBAIKAN: Dibungkus useMemo agar tidak berhitung berulang kali setiap render!
  const { sorted, sortedAsc, efficiencies, avgKmPerL } = useMemo(() => {
    const sortedAsc = [...fuelEntries].sort((a, b) => {
      if (a.date === b.date) return a.odometer - b.odometer;
      return a.date.localeCompare(b.date);
    });
    
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
        efficiencies.push({ km: distance, liters: curr.liters, kmPerL: kmPerL, date: curr.date, entryId: curr.id });
        const resetIndex = statsResetDate ? sortedAsc.findIndex(e => e.id === statsResetDate) : -1;
        if (resetIndex === -1 || i > resetIndex) {
          totalDistanceForAvg += distance;
          totalLitersForAvg += curr.liters;
        }
      }
    }

    const avgKmPerL = totalLitersForAvg > 0 ? totalDistanceForAvg / totalLitersForAvg : 0;
    return { sorted, sortedAsc, efficiencies, avgKmPerL };
  }, [fuelEntries, statsResetDate]);

  const confirmReset = () => {
    const latestEntryId = sortedAsc.length > 0 ? sortedAsc[sortedAsc.length - 1].id : "NONE";
    setPrevResetDate(statsResetDate);
    onUpdateResetDate?.(latestEntryId);
    setShowResetConfirm(false);
  };

  const handleUndoReset = () => {
    onUpdateResetDate?.(prevResetDate);
    setShowResetConfirm(false);
  };

  const renderItem = useCallback(({ item: entry }: { item: any }) => {
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
      <View style={[styles.entryCard, isFlagged && { borderColor: "rgba(255,82,82,0.4)" }]}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => setExpandedId(expandedId === entry.id ? null : entry.id)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flexDirection: "row", gap: 10, flex: 1 }}>
            <View style={styles.iconBox}>{logo ? <Image source={logo} style={{ width: 24, height: 24 }} resizeMode="contain" /> : <Text style={{ fontSize: 18 }}>⛽</Text>}</View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "800" }}>{entry.liters.toFixed(1)} L</Text>
                <Text style={{ color: "#F5A623", fontSize: 12, fontWeight: "700" }}>• {fuelInfo}</Text>
              </View>
              <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{entry.date} · {entry.odometer.toLocaleString()} km</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={styles.totalPriceText}>{formatCurrency(entry.totalCost, entry.currencySnapshot || currency)}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>{isExpanded ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={{ marginTop: 16, gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={styles.miniStatBox}><Text style={styles.miniLabel}>HARGA/L</Text><Text style={styles.miniValue}>{formatCurrency(entry.pricePerLiter, entry.currencySnapshot || currency)}</Text></View>
              {eff && <View style={styles.miniStatBox}><Text style={styles.miniLabel}>KM/LITER</Text><Text style={[styles.miniValue, { color: isFlagged ? "#FF5252" : "#4ECDC4" }]}>{eff.kmPerL.toFixed(1)}</Text></View>}
            </View>
            {userDescription ? <Text style={styles.descriptionText}>"{userDescription}"</Text> : null}
            {receiptUrl && <TouchableOpacity onPress={() => setSelectedImage(receiptUrl)} style={styles.receiptButton}><Text style={styles.receiptButtonText}>📸 {isId ? "Lihat Struk" : "View Receipt"}</Text></TouchableOpacity>}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 }}>
              <TouchableOpacity onPress={() => onEdit?.(entry)} activeOpacity={0.9} style={{ flex: 1, height: 45, backgroundColor: 'rgba(245,166,35,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,166,35,0.2)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}><Text>✏️</Text><Text style={{ color: '#F5A623', fontWeight: '700', fontSize: 13 }}>{isId ? "Edit" : "Edit"}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setDeleteId(entry.id)} activeOpacity={0.9} style={{ flex: 1, height: 45, backgroundColor: 'rgba(255,82,82,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,82,82,0.2)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}><Text>🗑️</Text><Text style={{ color: '#FF5252', fontWeight: '700', fontSize: 13 }}>{isId ? "Hapus" : "Delete"}</Text></TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
    }, [expandedId, isId, onEdit, efficiencies, currency, distanceUnit, volumeUnit]);

    return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        initialNumToRender={8}
        maxToRenderPerBatch={5}
        windowSize={5}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 15 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 20 }}>⛽</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 }}>{isId ? "Riwayat BBM" : "Fuel Log"}</Text>
                {appMode === 'advance' && fuelEntries.length > 0 && (
                  <TouchableOpacity activeOpacity={0.9} onPress={onToggleStats} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, marginLeft: 2 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700' }}>{hideStats ? '🡻' : '🢁'}</Text>
                  </TouchableOpacity>
                )}
              </View>
                <TouchableOpacity activeOpacity={0.9} onPress={onToggleSearch} style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700' }}>{hideSearch ? '🡻' : '🢁'}</Text>
                </TouchableOpacity>
             </View>

            {appMode === 'advance' && !hideStats && fuelEntries.length > 0 && (
              <View style={{ marginBottom: 15 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(78,205,196,0.08)', paddingHorizontal: 20, paddingVertical: 18, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(78,205,196,0.3)', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={{ fontSize: 24 }}>⛽</Text><Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, letterSpacing: 1, fontWeight: "800" }}>{isId ? "RATA-RATA KONSUMSI" : "AVG CONSUMPTION"}</Text></View>
                  <Text style={{ color: "#4ECDC4", fontSize: 22, fontWeight: "900", fontFamily: "SpaceMono" }}>{avgKmPerL > 0 ? avgKmPerL.toFixed(1) : "0.0"} <Text style={{ fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.4)" }}>km/L</Text></Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                  <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: 1, fontWeight: '700' }}>{(() => { const resetEntry = statsResetDate ? fuelEntries.find(e => e.id === statsResetDate) : null; if (resetEntry) return isId ? `DIHITUNG SETELAH: ${resetEntry.date}` : `CALCULATING AFTER: ${resetEntry.date}`; return isId ? "PERHITUNGAN AKTIF" : "CALCULATION ACTIVE"; })()}</Text>
                  {!showResetConfirm ? (
                    <TouchableOpacity onPress={() => setShowResetConfirm(true)} activeOpacity={0.9} style={{ padding: 4 }}><Text style={{ color: '#FF5252', fontSize: 10, fontWeight: '800' }}>🔄 {isId ? "Reset" : "Reset"}</Text></TouchableOpacity>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 15 }}>
                      <TouchableOpacity onPress={handleUndoReset} activeOpacity={0.9} style={{ padding: 4 }}><Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800' }}>↶ {isId ? "Batal" : "Undo"}</Text></TouchableOpacity>
                      <TouchableOpacity onPress={confirmReset} activeOpacity={0.9} style={{ padding: 4 }}><Text style={{ color: '#4ECDC4', fontSize: 10, fontWeight: '800' }}>✓ {isId ? "Simpan" : "Save"}</Text></TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}
          </>
        }
      />

      {/* 🖼️ MODAL PREVIEW STRUK DENGAN DESAIN BARU YANG ELEGAN */}
      <Modal 
        visible={!!selectedImage} 
        transparent 
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setSelectedImage(null)} 
          style={styles.previewOverlay}
        >
          <View style={styles.previewContainer} onStartShouldSetResponder={() => true}>
            {/* Header Box di dalam Frame */}
            <View style={styles.previewHeader}>
              <Text style={styles.previewHeaderTitle}>
                {isId ? "Bukti Nota / Struk Perbaikan" : "Repair Proof Receipt"}
              </Text>
              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={() => setSelectedImage(null)} 
                style={styles.previewCloseBtn}
              >
                <Text style={styles.previewCloseText}>✕ {isId ? "Tutup" : "Close"}</Text>
              </TouchableOpacity>
            </View>

            {/* Konten Gambar Terisolasi */}
            {selectedImage && (
              <View style={styles.imageWrapper}>
                <View style={styles.imageBackgroundFrame}>
                  <Image 
                    source={{ uri: selectedImage }} 
                    style={styles.fullImage} 
                    resizeMode="contain" 
                  />
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!deleteId} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(7, 18, 28, 0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '85%', backgroundColor: '#162431', borderRadius: 32, padding: 30, alignItems: 'center', elevation: 10 }}>
            <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 25 }} />
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 10, letterSpacing: -0.5 }}>{isId ? "Hapus Catatan" : "Delete Record"}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: 14, lineHeight: 22, marginBottom: 35, paddingHorizontal: 10 }}>{isId ? "Tindakan ini tidak dapat dibatalkan. Data bensin akan hilang dari riwayat." : "This action cannot be undone."}</Text>
            <View style={{ width: '100%', gap: 12 }}>
              <TouchableOpacity onPress={() => { if (deleteId) { onDelete?.(deleteId); setDeleteId(null); } }} style={{ width: '100%', paddingVertical: 16, borderRadius: 20, backgroundColor: '#FF5252', alignItems: 'center' }}><Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>{isId ? "Ya, Hapus Data" : "Yes, Delete Data"}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setDeleteId(null)} style={{ width: '100%', paddingVertical: 16, borderRadius: 20, backgroundColor: 'transparent', alignItems: 'center' }}><Text style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 15 }}>{isId ? "Mungkin Nanti" : "Maybe Later"}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  entryCard: { backgroundColor: "#1A2B3C", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", gap: 12 },
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
  // Salin dan masukkan kode style ini ke dalam StyleSheet.create Anda:
  previewOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(7, 12, 17, 0.85)', // Efek backdrop gelap transparan menutupi layar belakang
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 16 
  },
  previewContainer: { 
    backgroundColor: '#10171E', // Frame abu-abu gelap kontras
    borderRadius: 20, 
    width: '95%', 
    maxWidth: 420, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)', 
    overflow: 'hidden', 
    paddingBottom: 16 
  },
  previewHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.05)' 
  },
  previewHeaderTitle: { 
    color: '#FFF', 
    fontSize: 14, 
    fontWeight: '800' 
  },
  previewCloseBtn: { 
    backgroundColor: 'rgba(255,82,82,0.15)', 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: 'rgba(255,82,82,0.3)' 
  },
  previewCloseText: { 
    color: '#FF5252', 
    fontSize: 11, 
    fontWeight: '900' 
  },
  imageWrapper: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 16, 
    paddingHorizontal: 16 
  },
  imageBackgroundFrame: { 
    backgroundColor: '#070C11', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.04)', 
    overflow: 'hidden', 
    width: '100%', 
    height: 400, // Ukuran tinggi frame foto yang ideal dan proporsional
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  fullImage: { 
    width: '100%', 
    height: '100%' 
  }
});

export default React.memo(FuelLogComponent);