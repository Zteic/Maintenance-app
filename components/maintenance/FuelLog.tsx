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
import { FuelEntry } from "@/types/maintenance";
import { useLanguage } from "@/context/LanguageContext";
import {
  loadFuelStatsResetDate,
  saveFuelStatsResetDate,
} from "@/utils/storage";

interface FuelLogProps {
  fuelEntries: FuelEntry[];
  onAdd: () => void;
  onEdit?: (entry: FuelEntry) => void;
  onDelete?: (id: string) => void;
  onUpdateEntries?: (entries: FuelEntry[]) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const MONTH_NAMES_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const MONTH_NAMES_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function FuelLog({
  fuelEntries,
  onAdd,
  onEdit,
  onDelete,
}: FuelLogProps) {
  const { lang } = useLanguage();
  const isId = lang === "id";

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);

  // Reset stats state
  const [statsResetDate, setStatsResetDate] = useState<string | null>(null);
  const [prevResetDate, setPrevResetDate] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSaveAfterReset, setShowSaveAfterReset] = useState(false);

  useEffect(() => {
    loadFuelStatsResetDate().then((d) => setStatsResetDate(d));
  }, []);

  // Entries filtered by reset date for stats calculation
  const activeEntries = statsResetDate
    ? fuelEntries.filter((e) => e.date >= statsResetDate)
    : fuelEntries;

  const sorted = [...fuelEntries].sort((a, b) => b.date.localeCompare(a.date));

  // Calculate efficiency
  const efficiencies: {
    km: number;
    liters: number;
    kmPerL: number;
    costPerKm: number;
    date: string;
    entryId: string;
    isFlagged?: boolean;
  }[] = [];
  const sortedAsc = [...activeEntries].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = sortedAsc[i - 1];
    const curr = sortedAsc[i];
    const kmDiff = curr.odometer - prev.odometer;
    if (kmDiff > 0 && curr.liters > 0) {
      const kmPerL = kmDiff / curr.liters;
      // Auto-flag: flag if kmPerL > 50 (unlikely) or < 1 (impossible) or kmDiff > 2000 (very far)
      const isFlagged = kmPerL > 50 || kmPerL < 1 || kmDiff > 2000 || curr.liters > 150;
      efficiencies.push({
        km: kmDiff,
        liters: curr.liters,
        kmPerL,
        costPerKm: curr.totalCost / kmDiff,
        date: curr.date,
        entryId: curr.id,
        isFlagged,
      });
    }
  }

  const avgKmPerL =
    efficiencies.length > 0
      ? efficiencies.reduce((acc, curr) => acc + curr.kmPerL, 0) /
        efficiencies.length
      : 0;

  const totalLiters = activeEntries.reduce((sum, e) => sum + e.liters, 0);
  const totalFuelCost = activeEntries.reduce((sum, e) => sum + e.totalCost, 0);

  const getStatus = (kmPerL: number) => {
    if (kmPerL > avgKmPerL * 1.1)
      return { label: isId ? "Irit" : "Efficient", color: "#4ECDC4" };
    if (kmPerL < avgKmPerL * 0.9)
      return { label: isId ? "Boros" : "Wasteful", color: "#FF5252" };
    return { label: "Normal", color: "#F5A623" };
  };

  const handleDelete = (id: string) => {
    const message = isId 
      ? "Apakah Anda yakin ingin menghapus data ini?" 
      : "Are you sure you want to delete this data?";
    
    Alert.alert(
      isId ? "Hapus Catatan" : "Delete Record",
      message,
      [
        { text: isId ? "Batal" : "Cancel", style: "cancel" },
        {
          text: isId ? "Hapus" : "Delete",
          style: "destructive",
          onPress: () => {
            console.log("Menghapus ID:", id);
            onDelete?.(id);
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleResetStats = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    const today = new Date().toISOString().split("T")[0];
    setPrevResetDate(statsResetDate);
    setStatsResetDate(today);
    saveFuelStatsResetDate(today);
    setShowResetConfirm(false);
    setShowSaveAfterReset(true);
  };

  const handleUndoReset = () => {
    setStatsResetDate(prevResetDate);
    saveFuelStatsResetDate(prevResetDate);
    setShowSaveAfterReset(false);
  };

  const handleSaveReset = () => {
    setShowSaveAfterReset(false);
  };

  // Calendar helpers
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const monthNames = isId ? MONTH_NAMES_ID : MONTH_NAMES_EN;
  const fuelDatesInMonth = new Set(
    fuelEntries
      .filter((e) => {
        const [y, m] = e.date.split("-").map(Number);
        return y === calYear && m === calMonth + 1;
      })
      .map((e) => parseInt(e.date.split("-")[2], 10))
  );

  const selectedDateEntries = selectedCalDate
    ? fuelEntries.filter((e) => e.date === selectedCalDate)
    : [];

  const totalOnDate = selectedDateEntries.reduce((s, e) => s + e.totalCost, 0);

  return (
    <View style={{ gap: 12 }}>
      {/* Modal Preview Foto Struk */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              onPress={() => setSelectedImage(null)}
              style={styles.closeButton}
            >
              <Text style={{ color: "#FFF", fontWeight: "bold" }}>
                {isId ? "TUTUP" : "CLOSE"}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reset Confirm Modal */}
      <Modal visible={showResetConfirm} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ backgroundColor: "#1A2B3C", borderRadius: 20, padding: 24, width: "85%", gap: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
            <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "800", textAlign: "center" }}>
              {isId ? "Reset Statistik BBM?" : "Reset Fuel Statistics?"}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textAlign: "center", lineHeight: 20 }}>
              {isId
                ? "Data lama tetap tersimpan, hanya statistik dihitung ulang dari hari ini. Anda bisa Undo jika terjadi kesalahan."
                : "Old data stays saved, statistics will recalculate from today. You can Undo if needed."}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity onPress={() => setShowResetConfirm(false)} style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontWeight: "700" }}>{isId ? "Batal" : "Cancel"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmReset} style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: "rgba(255,82,82,0.15)", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,82,82,0.3)" }}>
                <Text style={{ color: "#FF5252", fontWeight: "800" }}>{isId ? "Reset" : "Reset"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>
          ⛽ {isId ? "Catatan BBM" : "Fuel Log"}
        </Text>
        <TouchableOpacity
          onPress={onAdd}
          activeOpacity={0.8}
          style={styles.addButton}
        >
          <Text style={{ color: "#4ECDC4", fontSize: 16, fontWeight: "700" }}>
            +
          </Text>
          <Text style={{ color: "#4ECDC4", fontSize: 12, fontWeight: "600" }}>
            {isId ? "Isi BBM" : "Add Fuel"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      {activeEntries.length > 0 && (
        <View style={{ paddingHorizontal: 20, gap: 8 }}>
          {statsResetDate && (
            <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: 1 }}>
              {isId ? `STATISTIK DARI: ${statsResetDate}` : `STATS FROM: ${statsResetDate}`}
            </Text>
          )}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>AVG KM/L</Text>
              <Text style={[styles.statValue, { color: "#4ECDC4" }]}>
                {avgKmPerL > 0 ? avgKmPerL.toFixed(1) : "-"}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{isId ? "TOTAL LITER" : "TOTAL LITERS"}</Text>
              <Text style={[styles.statValue, { color: "#F5A623" }]}>
                {totalLiters.toFixed(1)} L
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{isId ? "TOTAL BIAYA" : "TOTAL COST"}</Text>
              <Text style={[styles.statValue, { color: "#FF6B6B", fontSize: 9 }]}>
                {formatCurrency(totalFuelCost)}
              </Text>
            </View>
          </View>

          {/* Reset & Undo buttons */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={handleResetStats}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: "rgba(255,82,82,0.08)", borderWidth: 1, borderColor: "rgba(255,82,82,0.2)" }}
            >
              <Text style={{ color: "#FF5252", fontSize: 11, fontWeight: "700" }}>
                🔄 {isId ? "Reset Statistik" : "Reset Stats"}
              </Text>
            </TouchableOpacity>
            {showSaveAfterReset && (
              <>
                <TouchableOpacity
                  onPress={handleUndoReset}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: "rgba(245,166,35,0.08)", borderWidth: 1, borderColor: "rgba(245,166,35,0.2)" }}
                >
                  <Text style={{ color: "#F5A623", fontSize: 11, fontWeight: "700" }}>
                    ↩ Undo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveReset}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: "rgba(78,205,196,0.08)", borderWidth: 1, borderColor: "rgba(78,205,196,0.2)" }}
                >
                  <Text style={{ color: "#4ECDC4", fontSize: 11, fontWeight: "700" }}>
                    ✓ {isId ? "Simpan" : "Save"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <>
          {sorted.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
              <Text style={{ fontSize: 32 }}>⛽</Text>
              <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                {isId ? "Belum ada catatan BBM" : "No fuel records yet"}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8, paddingHorizontal: 20 }}>
              {sorted.map((entry) => {
                const eff = efficiencies.find((e) => e.entryId === entry.id);

                const receiptUrl =
                  entry.notes?.match(/\[receipt:(.*?)\]/)?.[1] || entry.receiptPhoto || null;

                let baseText = entry.notes
                  ? entry.notes.replace(/\[receipt:.*?\]/g, "").trim()
                  : "";

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
                    {/* Auto-flag warning */}
                    {isFlagged && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,82,82,0.08)", borderRadius: 8, padding: 8 }}>
                        <Text style={{ fontSize: 14 }}>❗</Text>
                        <Text style={{ color: "#FF5252", fontSize: 11, fontWeight: "700", flex: 1 }}>
                          {isId ? "Data tampak tidak wajar, mohon periksa kembali." : "Data looks unusual, please double-check."}
                        </Text>
                      </View>
                    )}

                    {/* Action Buttons */}
<View style={styles.actionHeader}>
  <TouchableOpacity onPress={() => onEdit?.(entry)}>
    <Text style={styles.editText}>{isId ? "Edit" : "Edit"}</Text>
  </TouchableOpacity>
  
  <TouchableOpacity onPress={() => handleDelete(entry.id)}>
    <Text style={styles.deleteText}>{isId ? "Hapus" : "Delete"}</Text>
  </TouchableOpacity>
</View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flexDirection: "row", gap: 10, flex: 1, marginRight: 8 }}>
                        <View style={styles.iconBox}>
                          <Text style={{ fontSize: 18 }}>⛽</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                            <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "800" }}>
                              {entry.liters.toFixed(1)} L
                            </Text>
                            <Text style={{ color: "#F5A623", fontSize: 12, fontWeight: "700", flexShrink: 1 }}>
                              • {fuelInfo}
                            </Text>
                            {isFlagged && <Text style={{ fontSize: 14 }}>❗</Text>}
                          </View>
                          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 1 }}>
                            {entry.date} · {entry.odometer.toLocaleString()} km
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: "#F5A623", fontSize: 14, fontWeight: "700", fontFamily: "SpaceMono", textAlign: "right" }}>
                        {formatCurrency(entry.totalCost)}
                      </Text>
                    </View>

                    {/* Stats Bar */}
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <View style={styles.miniStatBox}>
                        <Text style={styles.miniLabel}>{isId ? "HARGA/L" : "PRICE/L"}</Text>
                        <Text style={styles.miniValue}>{formatCurrency(entry.pricePerLiter)}</Text>
                      </View>
                      {eff && (
                        <View style={styles.miniStatBox}>
                          <Text style={styles.miniLabel}>KM/LITER</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Text style={[styles.miniValue, { color: isFlagged ? "#FF5252" : "#4ECDC4" }]}>
                              {eff.kmPerL.toFixed(1)}
                            </Text>
                            <Text style={{ fontSize: 8, color: getStatus(eff.kmPerL).color, fontWeight: "900" }}>
                              ({getStatus(eff.kmPerL).label})
                            </Text>
                          </View>
                        </View>
                      )}
                      {eff && (
                        <View style={styles.miniStatBox}>
                          <Text style={styles.miniLabel}>{isId ? "BIAYA/KM" : "COST/KM"}</Text>
                          <Text style={[styles.miniValue, { color: "#F5A623" }]}>{formatCurrency(eff.costPerKm)}</Text>
                        </View>
                      )}
                    </View>

                    {userDescription ? (
                      <View style={styles.descriptionBox}>
                        <Text style={styles.descriptionText}>"{userDescription}"</Text>
                      </View>
                    ) : null}

                    {receiptUrl && (
                      <TouchableOpacity
                        onPress={() => setSelectedImage(receiptUrl)}
                        style={styles.receiptButton}
                      >
                        <Text style={styles.receiptButtonText}>
                          📸 {isId ? "Lihat Struk" : "View Receipt"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(78,205,196,0.15)",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.3)",
  },
  statCard: {
    flex: 1,
    backgroundColor: "#1A2B3C",
    borderRadius: 12,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  statLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: "700",
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    fontFamily: "SpaceMono",
  },
  entryCard: {
    backgroundColor: "#1A2B3C",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 12,
  },
  actionHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 15,
    marginBottom: -5,
  },
  editText: { color: "#4ECDC4", fontSize: 11, fontWeight: "700", opacity: 0.8 },
  deleteText: {
    color: "#FF5252",
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(78,205,196,0.1)",
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  miniStatBox: {
    flex: 1,
    backgroundColor: "rgba(13,27,42,0.5)",
    borderRadius: 8,
    padding: 10,
    gap: 2,
  },
  miniLabel: { color: "rgba(255,255,255,0.3)", fontSize: 9, letterSpacing: 1 },
  miniValue: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "SpaceMono",
  },
  descriptionBox: {
    marginTop: -4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  descriptionText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontStyle: "italic",
  },
  receiptButton: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(78,205,196,0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.3)",
    marginTop: 4,
  },
  receiptButtonText: { color: "#4ECDC4", fontSize: 11, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
    justifyContent: "center",
  },
  fullImage: { width: "100%", height: "100%" },
  closeButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
});
