import React, { useState, useEffect } from "react";
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
import * as ImagePicker from "expo-image-picker";
import { RepairEntry } from "@/types/maintenance";
import { useLanguage } from "@/context/LanguageContext";
import {
  loadCustomServiceTypes,
  saveCustomServiceTypes,
} from "@/utils/storage";

const DEFAULT_SERVICE_TYPES = [
  "Ganti Oli",
  "Ganti Ban",
  "Kampas Rem",
  "Filter Udara",
  "Busi",
  "Air Radiator",
  "V-Belt / Rantai",
];

const isTireService = (s: string) => {
  const lower = s.toLowerCase();
  return (
    lower.includes("ban") || lower.includes("tire") || lower.includes("tyre")
  );
};

interface AddRepairSheetProps {
  visible: boolean;
  vehicleId: string;
  currentOdometer: number;
  vehicleType?: "car" | "motorcycle";
  prefillServiceType?: string;
  editEntry?: RepairEntry | null;
  onClose: () => void;
  onSave: (entry: Omit<RepairEntry, "id">) => void;
  onUpdate?: (id: string, entry: Omit<RepairEntry, "id">) => void;
}

export default function AddRepairSheet({
  visible,
  vehicleId,
  currentOdometer,
  vehicleType,
  prefillServiceType,
  editEntry,
  onClose,
  onSave,
  onUpdate,
}: AddRepairSheetProps) {
  const { t, lang } = useLanguage();
  const isEditing = !!editEntry;
  const isId = lang === "id";

  const [serviceType, setServiceType] = useState("");
  const [serviceTypeInput, setServiceTypeInput] = useState("");
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [odometer, setOdometer] = useState(currentOdometer?.toString() || "0");
  const [cost, setCost] = useState("");
  const [workshop, setWorkshop] = useState("");
  const [notes, setNotes] = useState("");
  const [nextInterval, setNextInterval] = useState("5000");
  const [receiptImages, setReceiptImages] = useState<string[]>([]);

  const [tirePosition, setTirePosition] = useState<"front" | "rear">("front");
  const [tireBrand, setTireBrand] = useState("");
  const [tireSize, setTireSize] = useState("");
  const [tireDotCode, setTireDotCode] = useState("");

  const showTireFields = isTireService(serviceTypeInput);

  useEffect(() => {
    loadCustomServiceTypes().then((types) => {
      if (types) setCustomTypes(types);
    });
  }, []);

  useEffect(() => {
    if (visible) {
      if (editEntry) {
        setServiceType(editEntry.serviceType);
        setServiceTypeInput(editEntry.serviceType);
        setDate(new Date(editEntry.date).toISOString().split("T")[0]);
        setOdometer(editEntry.odometer.toString());
        setCost(editEntry.cost.toString());
        setWorkshop(editEntry.workshop);
        const { cleanNotes, receipts } = extractReceipts(editEntry.notes || "");
        setNotes(cleanNotes);
        setReceiptImages(receipts);
        setNextInterval(editEntry.nextIntervalKm.toString());
        if (editEntry.tireInfo) {
          setTirePosition(editEntry.tireInfo.position);
          setTireBrand(editEntry.tireInfo.brand);
          setTireSize(editEntry.tireInfo.size);
          setTireDotCode(editEntry.tireInfo.productionCode);
        }
      } else {
        const pre = prefillServiceType || "";
        setServiceType(pre);
        setServiceTypeInput(pre);
        setDate(new Date().toISOString().split("T")[0]);
        setOdometer(currentOdometer ? currentOdometer.toString() : "0");
        setCost("");
        setWorkshop("");
        setNotes("");
        setNextInterval("5000");
        setReceiptImages([]);
        setTirePosition("front");
        setTireBrand("");
        setTireSize("");
        setTireDotCode("");
      }
      setShowServicePicker(false);
    }
  }, [prefillServiceType, visible, editEntry]);

  function extractReceipts(notes: string): {
    cleanNotes: string;
    receipts: string[];
  } {
    const match = notes.match(/\[receipts:(.*?)\]/);
    if (match)
      return {
        cleanNotes: notes.replace(/\n?\[receipts:.*?\]/, "").trim(),
        receipts: match[1].split(",").filter(Boolean),
      };
    return { cleanNotes: notes, receipts: [] };
  }

  const handleUploadReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        isId ? "Izin Diperlukan" : "Permission Required",
        isId ? "Diperlukan izin akses galeri." : "Gallery access required.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0])
      setReceiptImages((prev) => [...prev, result.assets[0].uri]);
  };

  const removeReceipt = (idx: number) =>
    setReceiptImages((prev) => prev.filter((_, i) => i !== idx));

  const selectServiceType = (type: string) => {
    setServiceType(type);
    setServiceTypeInput(type);
    setShowServicePicker(false);
  };

  const saveNewCustomType = (trimmed: string) => {
    const allTypes = [...DEFAULT_SERVICE_TYPES, ...customTypes];
    if (trimmed && !allTypes.includes(trimmed)) {
      const updated = [...customTypes, trimmed];
      setCustomTypes(updated);
      saveCustomServiceTypes(updated);
    }
  };

  const handleSaveRepair = async (newRepairData) => {
  // 1. Simpan ke History (seperti yang sudah berjalan sekarang)
  await saveToRepairHistory(newRepairData);

  // 2. LOGIKA BARU: Update target di list Prioritas
  const updatedReminder = {
    serviceType: newRepairData.serviceType,
    lastServiceOdometer: newRepairData.odometer,
    // Hitung target berikutnya (misal + 10.000 km)
    dueOdometer: newRepairData.odometer + (newRepairData.nextIntervalKm || 10000),
    status: 'safe', // Reset status jadi hijau lagi
    lastServiceDate: new Date().toISOString(),
  };

  // Simpan/Update ke daftar Reminders (Prioritas)
  await updateReminder(updatedReminder); 
};

  const handleSave = () => {
    const finalType =
      serviceTypeInput.trim() || (isId ? "Servis Umum" : "General Service");
    saveNewCustomType(finalType);
    const entry: Omit<RepairEntry, "id"> = {
      vehicleId,
      serviceType: finalType,
      date: new Date(date),
      odometer: parseInt(odometer, 10) || currentOdometer,
      cost: parseInt(cost.replace(/\D/g, ""), 10) || 0,
      workshop: workshop || (isId ? "Bengkel" : "Workshop"),
      notes:
        receiptImages.length > 0
          ? `${notes}\n[receipts:${receiptImages.join(",")}]`
          : notes,
      nextIntervalKm: parseInt(nextInterval, 10) || 5000,
      tireInfo: showTireFields
        ? {
            position: tirePosition,
            brand: tireBrand.trim(),
            size: tireSize.trim(),
            productionCode: tireDotCode.trim(),
          }
        : undefined,
    };
    if (isEditing && onUpdate && editEntry) onUpdate(editEntry.id, entry);
    else onSave(entry);
    onClose();
  };

  const allServiceTypes = [
    ...DEFAULT_SERVICE_TYPES,
    ...customTypes.filter((c) => !DEFAULT_SERVICE_TYPES.includes(c)),
  ];
  const filteredTypes = serviceTypeInput.trim()
    ? allServiceTypes.filter((st) =>
        st.toLowerCase().includes(serviceTypeInput.toLowerCase()),
      )
    : allServiceTypes;

  const inputStyle = {
    backgroundColor: "#0D1B2A" as const,
    borderRadius: 12,
    padding: 14,
    color: "#FFFFFF" as const,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)" as const,
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
                  maxHeight: "92%",
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
                    {isEditing ? t("editRepair") : t("logRepair")}
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
                  {/* Service Type Custom Input */}
<View style={{ gap: 8 }}>
  <Text
    style={{
      color: "rgba(255,255,255,0.5)",
      fontSize: 11,
      letterSpacing: 1,
    }}
  >
    {t("serviceType")}
  </Text>
  <View>
    <TextInput
      value={serviceTypeInput}
      onChangeText={(v) => {
        setServiceTypeInput(v);
        setShowServicePicker(true);
      }}
      // --- TAMBAHKAN 2 BARIS DI BAWAH INI ---
      editable={!prefillServiceType} // Kunci input jika ada data kiriman (prefill)
      selectTextOnFocus={!prefillServiceType} 
      
      onFocus={() => !prefillServiceType && setShowServicePicker(true)} // Hanya buka picker jika tidak dikunci
      onBlur={() => {
        saveNewCustomType(serviceTypeInput.trim());
      }}
      placeholder={
        isId
          ? "Ketik jenis servis..."
          : "Type service type..."
      }
      placeholderTextColor="rgba(255,255,255,0.3)"
      style={{ 
        ...inputStyle, 
        paddingRight: 44,
        // --- TAMBAHKAN STYLE DI BAWAH INI ---
        backgroundColor: prefillServiceType ? "rgba(255,255,255,0.03)" : inputStyle.backgroundColor,
        color: prefillServiceType ? "rgba(255,255,255,0.3)" : "#FFF" 
      }}
    />
    
    {/* Tombol Dropdown Panah */}
    <TouchableOpacity
      // --- UBAH ONPRESS DI BAWAH INI ---
      onPress={() => !prefillServiceType && setShowServicePicker(!showServicePicker)}
      disabled={!!prefillServiceType} // Matikan tombol jika dikunci
      style={{
        position: "absolute",
        right: 12,
        top: 0,
        bottom: 0,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 14,
          // --- TAMBAHKAN OPACITY ---
          opacity: prefillServiceType ? 0 : 1 // Sembunyikan panah jika dikunci agar user tidak bingung
        }}
      >
        {showServicePicker ? "▲" : "▼"}
      </Text>
    </TouchableOpacity>
  </View>
  
  {/* Sisa kode Picker tetap sama, tapi pastikan hanya muncul jika tidak prefill */}
  {!prefillServiceType && showServicePicker && filteredTypes.length > 0 && (
    <View
      style={{
        backgroundColor: "#0D1B2A",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        overflow: "hidden",
        maxHeight: 200,
      }}
    >
      {/* ... isi ScrollView picker ... */}
    </View>
  )}
</View>

                  {/* Date & Odometer */}
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.5)",
                          fontSize: 11,
                          letterSpacing: 1,
                        }}
                      >
                        {t("date")}
                      </Text>
                      <TextInput
                        value={date}
                        onChangeText={setDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={{ ...inputStyle, fontFamily: "SpaceMono" }}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.5)",
                          fontSize: 11,
                          letterSpacing: 1,
                        }}
                      >
                        {t("odometer")}
                      </Text>
                      <TextInput
                        value={odometer}
                        onChangeText={setOdometer}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={{ ...inputStyle, fontFamily: "SpaceMono" }}
                      />
                    </View>
                  </View>

                  {/* Cost */}
                  <View style={{ gap: 8 }}>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 11,
                        letterSpacing: 1,
                      }}
                    >
                      {t("cost")}
                    </Text>
                    <TextInput
                      value={cost}
                      onChangeText={setCost}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      style={{
                        ...inputStyle,
                        color: "#F5A623",
                        fontSize: 16,
                        fontWeight: "600",
                        borderColor: "rgba(245,166,35,0.2)",
                        fontFamily: "SpaceMono",
                      }}
                    />
                  </View>

                  {/* Workshop */}
                  <View style={{ gap: 8 }}>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 11,
                        letterSpacing: 1,
                      }}
                    >
                      {t("workshop")}
                    </Text>
                    <TextInput
                      value={workshop}
                      onChangeText={setWorkshop}
                      placeholder={t("workshopPlaceholder")}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      style={inputStyle}
                    />
                  </View>

                  {/* Next Interval */}
                  <View style={{ gap: 8 }}>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 11,
                        letterSpacing: 1,
                      }}
                    >
                      {t("nextInterval")}
                    </Text>
                    <TextInput
                      value={nextInterval}
                      onChangeText={setNextInterval}
                      keyboardType="numeric"
                      placeholder="5000"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      style={{
                        ...inputStyle,
                        color: "#4ECDC4",
                        fontWeight: "600",
                        borderColor: "rgba(78,205,196,0.2)",
                        fontFamily: "SpaceMono",
                      }}
                    />
                  </View>

                  {/* Tire Fields */}
                  {showTireFields && (
                    <View
                      style={{
                        backgroundColor: "rgba(78,205,196,0.05)",
                        borderRadius: 14,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: "rgba(78,205,196,0.2)",
                        gap: 14,
                      }}
                    >
                      <Text
                        style={{
                          color: "#4ECDC4",
                          fontSize: 13,
                          fontWeight: "700",
                        }}
                      >
                        🛞 {isId ? "Info Ban" : "Tire Info"}
                      </Text>
                      <View style={{ gap: 8 }}>
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.5)",
                            fontSize: 11,
                            letterSpacing: 1,
                          }}
                        >
                          {isId ? "POSISI BAN" : "TIRE POSITION"}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          {(["front", "rear"] as const).map((pos) => (
                            <TouchableOpacity
                              key={pos}
                              onPress={() => setTirePosition(pos)}
                              activeOpacity={0.8}
                              style={{
                                flex: 1,
                                paddingVertical: 10,
                                borderRadius: 10,
                                borderWidth: 1,
                                backgroundColor:
                                  tirePosition === pos
                                    ? "rgba(78,205,196,0.15)"
                                    : "#0D1B2A",
                                borderColor:
                                  tirePosition === pos
                                    ? "#4ECDC4"
                                    : "rgba(255,255,255,0.08)",
                                alignItems: "center",
                              }}
                            >
                              <Text
                                style={{
                                  color:
                                    tirePosition === pos
                                      ? "#4ECDC4"
                                      : "rgba(255,255,255,0.6)",
                                  fontSize: 13,
                                  fontWeight: "600",
                                }}
                              >
                                {pos === "front"
                                  ? isId
                                    ? "Depan"
                                    : "Front"
                                  : isId
                                    ? "Belakang"
                                    : "Rear"}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        <View style={{ flex: 1, gap: 8 }}>
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.5)",
                              fontSize: 11,
                              letterSpacing: 1,
                            }}
                          >
                            {isId ? "MEREK BAN" : "TIRE BRAND"}
                          </Text>
                          <TextInput
                            value={tireBrand}
                            onChangeText={setTireBrand}
                            placeholder="e.g. Michelin"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            style={inputStyle}
                          />
                        </View>
                        <View style={{ flex: 1, gap: 8 }}>
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.5)",
                              fontSize: 11,
                              letterSpacing: 1,
                            }}
                          >
                            {isId ? "UKURAN" : "SIZE"}
                          </Text>
                          <TextInput
                            value={tireSize}
                            onChangeText={setTireSize}
                            placeholder="e.g. 185/65R15"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            style={inputStyle}
                          />
                        </View>
                      </View>
                      <View style={{ gap: 8 }}>
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.5)",
                            fontSize: 11,
                            letterSpacing: 1,
                          }}
                        >
                          DOT / {isId ? "KODE PRODUKSI" : "PRODUCTION CODE"}
                        </Text>
                        <TextInput
                          value={tireDotCode}
                          onChangeText={(v) =>
                            setTireDotCode(v.replace(/\D/g, "").slice(0, 4))
                          }
                          keyboardType="numeric"
                          placeholder="e.g. 2423"
                          maxLength={4}
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          style={{
                            ...inputStyle,
                            color: "#4ECDC4",
                            fontFamily: "SpaceMono",
                          }}
                        />
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.3)",
                            fontSize: 11,
                          }}
                        >
                          {isId
                            ? "mis. 2423 = minggu 24, tahun 2023"
                            : "e.g. 2423 = week 24, year 2023"}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Notes + Receipt */}
                  <View style={{ gap: 8 }}>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 11,
                        letterSpacing: 1,
                      }}
                    >
                      {t("notes")}
                    </Text>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder={t("notesPlaceholder")}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      style={{ ...inputStyle, minHeight: 80, lineHeight: 22 }}
                    />
                    <View
                      style={{
                        backgroundColor: "#0D1B2A",
                        borderRadius: 12,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.06)",
                        gap: 10,
                      }}
                    >
                      <TouchableOpacity
                        onPress={handleUploadReceipt}
                        activeOpacity={0.8}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "rgba(245,166,35,0.1)",
                          borderRadius: 10,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: "rgba(245,166,35,0.25)",
                          gap: 8,
                        }}
                      >
                        <Text style={{ fontSize: 18 }}>📎</Text>
                        <Text
                          style={{
                            color: "#F5A623",
                            fontSize: 13,
                            fontWeight: "600",
                          }}
                        >
                          {t("uploadReceipt")}
                        </Text>
                      </TouchableOpacity>
                      {receiptImages.length > 0 && (
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          {receiptImages.map((uri, idx) => (
                            <View key={idx} style={{ position: "relative" }}>
                              <Image
                                source={{ uri }}
                                style={{
                                  width: 72,
                                  height: 72,
                                  borderRadius: 8,
                                }}
                                resizeMode="cover"
                              />
                              <TouchableOpacity
                                onPress={() => removeReceipt(idx)}
                                style={{
                                  position: "absolute",
                                  top: -6,
                                  right: -6,
                                  width: 20,
                                  height: 20,
                                  borderRadius: 10,
                                  backgroundColor: "#FF6B6B",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Text
                                  style={{
                                    color: "#FFF",
                                    fontSize: 10,
                                    fontWeight: "700",
                                  }}
                                >
                                  ✕
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Save */}
                  <TouchableOpacity
                    onPress={handleSave}
                    activeOpacity={0.85}
                    style={{
                      backgroundColor: "#F5A623",
                      borderRadius: 14,
                      padding: 18,
                      alignItems: "center",
                      marginTop: 8,
                      shadowColor: "#F5A623",
                      shadowOpacity: 0.4,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 4 },
                    }}
                  >
                    <Text
                      style={{
                        color: "#0D1B2A",
                        fontSize: 16,
                        fontWeight: "800",
                        letterSpacing: 0.5,
                      }}
                    >
                      {isEditing ? t("save") : t("saveRepairLog")}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
