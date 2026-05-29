import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Image,
  Alert,
} from "react-native";
import { FuelEntry } from "@/types/maintenance";
import { useLanguage } from "@/context/LanguageContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiService } from "@/utils/apiService";
import { useRegional } from "@/context/RegionalContext";
import { getCurrencySymbol, formatCurrency } from "@/utils/formatters";


interface FuelSheetProps {
  visible: boolean;
  vehicleId: string;
  currentOdometer: number;
  tankCapacity?: number;
  editEntry?: FuelEntry | null;
  onClose: () => void;
  onSave: (entry: Omit<FuelEntry, "id">) => void;
  onDelete?: (id: string) => void;
}

interface SavedFuelPrice {
  id: string;
  brand: string;
  product: string;
  price: string;
}

const STORAGE_KEY = "garasiku_fuel_prices";

export default function FuelSheet({
  visible,
  vehicleId,
  currentOdometer,
  tankCapacity,
  editEntry,
  onClose,
  onSave,
  onDelete,
}: FuelSheetProps) {
  const { lang } = useLanguage();
  const router = useRouter();
  const { currency, distanceUnit, volumeUnit } = useRegional();
  const currencySymbol = getCurrencySymbol(currency);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [liters, setLiters] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [odometer, setOdometer] = useState(currentOdometer.toString());
  const [notes, setNotes] = useState("");
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // State untuk sinkronisasi harga
  const [savedPrices, setSavedPrices] = useState<SavedFuelPrice[]>([]);
  const [selectedFuelName, setSelectedFuelName] = useState("");
  const [showFuelPicker, setShowFuelPicker] = useState(false);

  // Memuat referensi harga dari profil saat modal terbuka
  useEffect(() => {
    if (visible) {
      const loadFuelPrices = async () => {
        try {
          const saved = await AsyncStorage.getItem(STORAGE_KEY);
          let parsedPrices = [];
          if (saved) {
            parsedPrices = JSON.parse(saved);
          }
          
          // 🚀 FIX: Pastikan Bensin Eceran (Manual) selalu ada di memori saat modal dibuka
          const hasEceran = parsedPrices.find((p: any) => p.brand === "Bensin Eceran");
          if (!hasEceran) {
            parsedPrices.push({
              id: `e_manual_temp`,
              brand: "Bensin Eceran",
              product: "Input Manual",
              price: "0",
              isManual: true
            });
          }
          
          setSavedPrices(parsedPrices);
        } catch (e) {
          console.error("Gagal memuat referensi harga bensin", e);
        }
      };

      loadFuelPrices();

      if (editEntry) {
        // Populate form with editEntry data
        setDate(editEntry.date);
        setLiters(editEntry.liters.toString());
        setPricePerLiter(editEntry.pricePerLiter.toString());
        setOdometer(editEntry.odometer.toString());
        setSelectedFuelName(editEntry.fuelType || "");
        setReceiptImage(editEntry.receiptPhoto || null);
        // Extract notes
        let baseNotes = editEntry.notes || "";
        baseNotes = baseNotes.replace(/\[receipt:.*?\]/g, "").trim();
        if (baseNotes.includes("|")) {
          const parts = baseNotes.split("|");
          setSelectedFuelName(editEntry.fuelType || parts[0].trim() || "");
          setNotes(parts[1]?.trim() || "");
        } else {
          setNotes(baseNotes);
        }
      } else {
        setDate(new Date().toISOString().split("T")[0]);
        setLiters("");
        setPricePerLiter("");
        setSelectedFuelName("");
        setOdometer(currentOdometer.toString());
        setNotes("");
        setReceiptImage(null);
        setShowFuelPicker(false);
      }
    }
  }, [visible, currentOdometer, editEntry]);

  // Logika untuk mengambil foto struk dari galeri
  const handlePickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert(
        lang === "id"
          ? "Izin galeri diperlukan!"
          : "Gallery permission required!",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
    });

    if (!result.canceled && result.assets[0]) {
      setReceiptImage(result.assets[0].uri);
    }
  };

  // Logika saat user memilih bensin dari daftar custom
  const handleSelectFuel = (fuel: SavedFuelPrice) => {
    setSelectedFuelName(`${fuel.brand} - ${fuel.product}`);
    setPricePerLiter(fuel.price);
    setShowFuelPicker(false);
  };

  const totalCost =
    (parseFloat(liters) || 0) * (parseFloat(pricePerLiter) || 0);

  const handleSave = async () => {
    const l = parseFloat(liters.replace(/[^0-9.,]/g, "").replace(/,/g, ".")) || 0;
    const p = parseFloat(pricePerLiter.replace(/[^0-9.,]/g, "").replace(/,/g, ".")) || 0;
    if (!l || !p) return;

    const fuelLabel = selectedFuelName || (lang === "id" ? "Bensin" : "Fuel");
    const manualNotes = notes.trim();

    const finalNotes = `${fuelLabel} | ${manualNotes} ${
      receiptImage ? `[receipt:${receiptImage}]` : ""
    }`.trim();

    const entryData: any = {
      vehicleId,
      date,
      liters: l,
      pricePerLiter: p,
      totalCost: l * p,
      odometer: parseInt(odometer.replace(/[^0-9]/g, ""), 10) || currentOdometer,
      fuelType: fuelLabel,
      notes: finalNotes,
      receiptPhoto: receiptImage || undefined,
    };

    // 🚀 Coba kirim ke server (jika gagal, biarkan saja)
    try {
      if (editEntry) {
        await apiService.saveFuel({ ...entryData, id: editEntry.id });
      } else {
        await apiService.saveFuel(entryData);
      }
    } catch (error) {
      console.log("Server tidak terhubung, menyimpan ke memori lokal...");
    }

    // 💾 SELALU SIMPAN KE MEMORI LOKAL UI
    if (editEntry) {
      onSave({ ...entryData, id: editEntry.id });
    } else {
      onSave(entryData);
    }
    
    onClose();
  };

  const inputStyle = {
    backgroundColor: "#0D1B2A" as const,
    borderRadius: 12,
    padding: 14,
    color: "#FFFFFF" as const,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)" as const,
  };

  const label =
    lang === "id"
      ? {
          title: "Catat Pengisian BBM",
          fuelType: "JENIS BBM",
          date: "TANGGAL",
          liters: "JUMLAH LITER",
          price: "HARGA / LITER (OTOMATIS)",
          odometer: "ODOMETER (KM)",
          receipt: "FOTO STRUK (OPSIONAL)",
          notes: "CATATAN",
          notesPlaceholder: "Catatan opsional...",
          total: "TOTAL BIAYA",
          save: "SIMPAN CATATAN BBM",
        }
      : {
          title: "Sudah Update Harga Terbaru?",
          fuelType: "FUEL TYPE",
          date: "DATE",
          liters: "LITERS",
          price: "PRICE / LITER (AUTO)",
          odometer: "ODOMETER (KM)",
          receipt: "RECEIPT PHOTO (OPTIONAL)",
          notes: "NOTES",
          notesPlaceholder: "Optional notes...",
          total: "TOTAL COST",
          save: "SAVE FUEL LOG",
        };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "flex-end",
          }}
        >
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View
                style={{
                  backgroundColor: "#1A2B3C",
                  borderTopLeftRadius: 28,
                  borderTopRightRadius: 28,
                  maxHeight: "90%",
                  borderWidth: 1,
                  borderBottomWidth: 0,
                  borderColor: "rgba(255,255,255,0.1)",
                }}
              >
                <View
                  style={{
                    alignItems: "center",
                    paddingTop: 14,
                    paddingBottom: 4,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: "rgba(255,255,255,0.2)",
                    }}
                  />
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(255,255,255,0.06)",
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 20,
                      fontWeight: "800",
                    }}
                  >
                    ⛽ {label.title}
                  </Text>
                  <TouchableOpacity
                    onPress={onClose}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: "rgba(255,255,255,0.08)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{ color: "rgba(255,255,255,0.6)", fontSize: 16 }}
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  contentContainerStyle={{
                    padding: 24,
                    gap: 16,
                    paddingBottom: 40,
                  }}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Dropdown Custom Jenis BBM & Peringatan Jika Kosong */}
                  <View style={{ gap: 8 }}>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 11,
                        letterSpacing: 1,
                      }}
                    >
                      {label.fuelType}
                    </Text>

                    {/* Dropdown Custom Jenis BBM */}
                    {savedPrices.length === 0 ? (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          onClose(); 
                          router.push("/profile"); 
                        }}
                        style={{
                          backgroundColor: "rgba(255,82,82,0.1)",
                          borderRadius: 12,
                          padding: 16,
                          borderWidth: 1,
                          borderColor: "rgba(255,82,82,0.3)",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <Text style={{ fontSize: 24 }}>⚠️</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#FF5252", fontWeight: "800", fontSize: 13, marginBottom: 2 }}>
                            {lang === "id" ? "Harga BBM Belum Diatur" : "Fuel Prices Not Set"}
                          </Text>
                          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, lineHeight: 16 }}>
                            {lang === "id" 
                              ? "Ketuk di sini untuk pergi ke Profile dan update harga bensin terbaru." 
                              : "Tap here to go to Profile and update current fuel prices."}
                          </Text>
                        </View>
                        <Text style={{ color: "#FF5252", fontSize: 18 }}>›</Text>
                      </TouchableOpacity>
                    ) : (

                      <>
                        <TouchableOpacity
                          onPress={() => setShowFuelPicker(!showFuelPicker)}
                          style={inputStyle}
                        >
                          <Text
                            style={{
                              color: selectedFuelName ? "#F5A623" : "rgba(255,255,255,0.3)",
                              fontWeight: selectedFuelName ? "700" : "400",
                            }}
                          >
                            {selectedFuelName ||
                              (lang === "id" ? "-- Pilih Jenis BBM --" : "-- Select Fuel Type --")}
                          </Text>
                        </TouchableOpacity>

                        {showFuelPicker && (
                          <View
                            style={{
                              backgroundColor: "#0D1B2A",
                              borderRadius: 12,
                              padding: 8,
                              borderWidth: 1,
                              borderColor: "rgba(255,255,255,0.1)",
                              maxHeight: 220,
                            }}
                          >
                            <ScrollView nestedScrollEnabled={true}>
                              {savedPrices.map((fuel) => (
                                <TouchableOpacity
                                  key={fuel.id}
                                  onPress={() => handleSelectFuel(fuel)}
                                  style={{
                                    padding: 14,
                                    borderBottomWidth: 1,
                                    borderBottomColor: "rgba(255,255,255,0.05)",
                                  }}
                                >
                                  {/* 🚀 Tampilan khusus untuk Bensin Eceran agar mudah dicari */}
                                  {fuel.brand === "Bensin Eceran" ? (
                                    <Text style={{ color: "#4ECDC4", fontSize: 14, fontWeight: "bold" }}>
                                      ⛽ Bensin Eceran (Input Manual)
                                    </Text>
                                  ) : (
                                    <Text style={{ color: "#FFF", fontSize: 14 }}>
                                      {fuel.brand} - {fuel.product.replace(/\s*\(RON\s*\d+\)/gi, "")}
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </>
                    )}
                  </View>

                  {/* Date & Odometer */}
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    
                    {/* --- BAGIAN TANGGAL DENGAN FORMAT DD/MM/YYYY --- */}
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.5)",
                          fontSize: 11,
                          letterSpacing: 1,
                        }}
                      >
                        {label.date}
                      </Text>

                      {Platform.OS === 'web' ? (
                        /* Tampilan Rapi Khusus di Web/Komputer */
                        <TextInput
                          value={date}
                          onChangeText={setDate}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          style={{ ...inputStyle, fontFamily: "SpaceMono", height: 48 }}
                        />
                      ) : (
                        /* Tampilan Kalender Pop-up Khusus di HP (Android/iOS) */
                        <>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setShowDatePicker(true)}
                            style={{ ...inputStyle, justifyContent: 'center', height: 48 }}
                          >
                            {/* Mengubah tampilan data YYYY-MM-DD menjadi DD/MM/YYYY */}
                            <Text style={{ color: "#FFF", fontFamily: "SpaceMono" }}>
                              {date ? `${date.split('-')[2]}/${date.split('-')[1]}/${date.split('-')[0]}` : ''}
                            </Text>
                          </TouchableOpacity>

                          {showDatePicker && (
                            <DateTimePicker
                              value={new Date(date)}
                              mode="date"
                              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                              onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) {
                                  setDate(selectedDate.toISOString().split("T")[0]);
                                }
                              }}
                            />
                          )}
                        </>
                      )}
                    </View>

                    {/* --- BAGIAN ODOMETER --- */}
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.5)",
                          fontSize: 11,
                          letterSpacing: 1,
                        }}
                      >
                        {label.odometer.replace(/\(KM\)/i, "").trim()} ({distanceUnit.toUpperCase()})
                      </Text>
                      <TextInput
                        value={odometer}
                        onChangeText={setOdometer}
                        keyboardType="numeric"
                        style={{ ...inputStyle, fontFamily: "SpaceMono", height: 48 }}
                      />
                    </View>

                  </View>

                  {/* Liters & Price */}
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    
                    {/* --- Kolom Liter (TIDAK DIUBAH) --- */}
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: 1 }}>
                        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: 1 }}>
                        VOLUME ({volumeUnit})
                      </Text>
                      </Text>
                      <TextInput
                        value={liters}
                        onChangeText={setLiters}
                        keyboardType="decimal-pad"
                        placeholder={tankCapacity ? `Est: ${tankCapacity}L` : "0.0"}
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={{ ...inputStyle, color: "#4ECDC4", fontFamily: "SpaceMono" }}
                      />
                      {tankCapacity && (
                        <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>
                          📏 {lang === "id" ? "Kapasitas tangki" : "Tank capacity"}: {tankCapacity}L
                        </Text>
                      )}
                    </View>

                    {/* --- Kolom Harga (SUDAH DIUBAH: DIBUKA KUNCINYA UNTUK ECERAN) --- */}
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: 1 }}>
                        {/* Ubah judul label jika sedang memilih eceran */}
                        {selectedFuelName.includes("Eceran") 
                          ? (lang === "id" ? "HARGA MANUAL / L" : "MANUAL PRICE / L") 
                          : label.price}
                      </Text>
                      
                      {selectedFuelName.includes("Eceran") ? (
                        /* 🔓 TAMPILAN JIKA ECERAN: Munculkan TextInput agar bisa diketik bebas */
                        <View style={{ ...inputStyle, flexDirection: "row", alignItems: "center", height: 48, paddingVertical: 0 }}>
                          <Text style={{ color: "#F5A623", fontFamily: "SpaceMono", fontWeight: "700", marginRight: 6 }}>Rp</Text>
                          <TextInput
                            value={pricePerLiter}
                            onChangeText={(val) => setPricePerLiter(val.replace(/[^0-9.,]/g, "").replace(/,/g, "."))}
                            keyboardType="decimal-pad" // 👈 Penting untuk user luar negeri!
                            placeholder="0"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            style={{ flex: 1, color: "#F5A623", fontFamily: "SpaceMono", fontWeight: "700", padding: 0 }}
                          />
                        </View>
                      ) : (
                        /* 🔒 TAMPILAN JIKA BUKAN ECERAN: Tetap statis dan diformat otomatis (Read-Only) */
                        <View style={{ ...inputStyle, backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(245,166,35,0.2)", justifyContent: "center", height: 48 }}>
                          <Text style={{ color: pricePerLiter ? "#F5A623" : "rgba(255,255,255,0.2)", fontFamily: "SpaceMono", fontWeight: "700" }}>
                            {pricePerLiter ? formatCurrency(parseFloat(pricePerLiter), currency) : "---"}
                          </Text>
                        </View>
                      )}
                    </View>

                  </View>

                  {/* Upload Struk Section */}
                  <View style={{ gap: 8 }}>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 11,
                        letterSpacing: 1,
                      }}
                    >
                      {label.receipt}
                    </Text>
                    <TouchableOpacity
                      onPress={handlePickReceipt}
                      style={{
                        height: 140,
                        backgroundColor: "#0D1B2A",
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.1)",
                        borderStyle: receiptImage ? "solid" : "dashed",
                        justifyContent: "center",
                        alignItems: "center",
                        overflow: "hidden",
                      }}
                    >
                      {receiptImage ? (
                        <Image
                          source={{ uri: receiptImage }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{ alignItems: "center" }}>
                          <Text style={{ fontSize: 32, marginBottom: 8 }}>
                            📸
                          </Text>
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.4)",
                              fontSize: 12,
                            }}
                          >
                            {lang === "id"
                              ? "Upload Foto Struk"
                              : "Upload Receipt Photo"}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    {receiptImage && (
                      <TouchableOpacity
                        onPress={() => setReceiptImage(null)}
                        style={{ alignSelf: "flex-end", padding: 4 }}
                      >
                        <Text
                          style={{
                            color: "#FF6B6B",
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          {lang === "id" ? "Hapus Foto" : "Remove Photo"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Total Cost Preview */}
                  {totalCost > 0 && (
                    <View
                      style={{
                        backgroundColor: "rgba(245,166,35,0.08)",
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: "rgba(245,166,35,0.2)",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.5)",
                          fontSize: 12,
                          letterSpacing: 1,
                        }}
                      >
                        {label.total}
                      </Text>
                      <Text
                        style={{
                          color: "#F5A623",
                          fontSize: 18,
                          fontWeight: "800",
                          fontFamily: "SpaceMono",
                        }}
                      >
                        <Text style={{ color: "#F5A623", fontSize: 18, fontWeight: "800", fontFamily: "SpaceMono" }}>
                        {formatCurrency(totalCost, currency)}
                      </Text>
                      </Text>
                    </View>
                  )}

                  {/* Notes */}
                  <View style={{ gap: 8 }}>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 11,
                        letterSpacing: 1,
                      }}
                    >
                      {label.notes}
                    </Text>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder={label.notesPlaceholder}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      multiline
                      numberOfLines={2}
                      textAlignVertical="top"
                      style={{ ...inputStyle, minHeight: 64 }}
                    />
                  </View>

                  {/* Save Button */}
                  <TouchableOpacity
                    onPress={handleSave}
                    activeOpacity={0.85}
                    style={{
                      backgroundColor: "#4ECDC4",
                      borderRadius: 14,
                      padding: 18,
                      alignItems: "center",
                      marginTop: 8,
                      shadowColor: "#4ECDC4",
                      shadowOpacity: 0.3,
                      shadowRadius: 10,
                      elevation: 5,
                    }}
                  >
                    <Text
                      style={{
                        color: "#0D1B2A",
                        fontSize: 16,
                        fontWeight: "800",
                      }}
                    >
                      {label.save}
                    </Text>
                  </TouchableOpacity>

                  {/* TOMBOL HAPUS */}
{editEntry && (
  <TouchableOpacity
    onPress={() => {
      Alert.alert(
        "Hapus Data",
        "Yakin ingin menghapus catatan bensin ini?",
        [
          { text: "Batal", style: "cancel" },
          { 
            text: "Hapus", 
            style: "destructive", 
            onPress: () => {
              onDelete?.(editEntry.id);
              onClose(); // Tutup modal setelah hapus
            }
          }
        ]
      );
    }}
    style={{
      marginTop: 15,
      padding: 15,
      alignItems: "center",
    }}
  >
    <Text style={{ color: "#FF5252", fontWeight: "700", fontSize: 14 }}>
      🗑️ Hapus Catatan Ini
    </Text>
  </TouchableOpacity>
)}

                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
