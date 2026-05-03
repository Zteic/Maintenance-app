import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  Dimensions,
  StyleSheet,
} from "react-native";
import { FuelEntry } from "@/types/maintenance";
import { useLanguage } from "@/context/LanguageContext";

interface FuelLogProps {
  fuelEntries: FuelEntry[];
  onAdd: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function formatCurrency(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function FuelLog({ fuelEntries, onAdd }: FuelLogProps) {
  const { lang } = useLanguage();
  const isId = lang === "id";

  // State untuk Preview Foto
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const sorted = [...fuelEntries].sort((a, b) => b.date.localeCompare(a.date));

  // Calculate efficiency between consecutive entries
  const efficiencies: {
    km: number;
    liters: number;
    kmPerL: number;
    costPerKm: number;
    date: string;
  }[] = [];
  const sortedAsc = [...fuelEntries].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = sortedAsc[i - 1];
    const curr = sortedAsc[i];
    const kmDiff = curr.odometer - prev.odometer;
    if (kmDiff > 0 && curr.liters > 0) {
      efficiencies.push({
        km: kmDiff,
        liters: curr.liters,
        kmPerL: kmDiff / curr.liters,
        costPerKm: curr.totalCost / kmDiff,
        date: curr.date,
      });
    }
  }

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

      {/* Header */}
      <View style={styles.header}>
        <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>
          ⛽ {isId ? "Riwayat BBM" : "Fuel History"}
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

      {/* Entry List */}
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
            const eff = efficiencies.find((e) => e.date === entry.date);

            const receiptUrl =
              entry.notes?.match(/\[receipt:(.*?)\]/)?.[1] || null;

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
              fuelInfo = baseText || (isId ? "Bensin" : "Fuel");
            }

            return (
              <View key={entry.id} style={styles.entryCard}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start", // Jaga ikon & harga tetap di atas jika teks wrap
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 10,
                      flex: 1,
                      marginRight: 8,
                    }}
                  >
                    <View style={styles.iconBox}>
                      <Text style={{ fontSize: 18 }}>⛽</Text>
                    </View>

                    {/* Container Teks Liter & Nama Bensin dengan Flex Wrap */}
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          flexWrap: "wrap", // Ini yang membuat teks pindah baris
                          gap: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 15,
                            fontWeight: "800",
                          }}
                        >
                          {entry.liters.toFixed(1)} L
                        </Text>
                        <Text
                          style={{
                            color: "#F5A623",
                            fontSize: 12,
                            fontWeight: "700",
                            flexShrink: 1, // Memaksa teks mengalah jika mentok ke kanan
                          }}
                        >
                          • {fuelInfo}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.4)",
                          fontSize: 11,
                          marginTop: 1,
                        }}
                      >
                        {entry.date} · {entry.odometer.toLocaleString()} km
                      </Text>
                    </View>
                  </View>

                  {/* Total biaya tetap kokoh di kanan */}
                  <Text
                    style={{
                      color: "#F5A623",
                      fontSize: 14,
                      fontWeight: "700",
                      fontFamily: "SpaceMono",
                      textAlign: "right",
                    }}
                  >
                    {formatCurrency(entry.totalCost)}
                  </Text>
                </View>

                {/* Stats Bar */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={styles.miniStatBox}>
                    <Text style={styles.miniLabel}>
                      {isId ? "HARGA/L" : "PRICE/L"}
                    </Text>
                    <Text style={styles.miniValue}>
                      {formatCurrency(entry.pricePerLiter)}
                    </Text>
                  </View>
                  {eff && (
                    <View style={styles.miniStatBox}>
                      <Text style={styles.miniLabel}>KM/LITER</Text>
                      <Text style={[styles.miniValue, { color: "#4ECDC4" }]}>
                        {eff.kmPerL.toFixed(1)}
                      </Text>
                    </View>
                  )}
                  {eff && (
                    <View style={styles.miniStatBox}>
                      <Text style={styles.miniLabel}>
                        {isId ? "BIAYA/KM" : "COST/KM"}
                      </Text>
                      <Text style={[styles.miniValue, { color: "#F5A623" }]}>
                        {formatCurrency(eff.costPerKm)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* DESKRIPSI CATATAN DI BAWAH STATS */}
                {userDescription ? (
                  <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionText}>
                      "{userDescription}"
                    </Text>
                  </View>
                ) : null}

                {/* Tombol Struk */}
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
  entryCard: {
    backgroundColor: "#1A2B3C",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 12,
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
