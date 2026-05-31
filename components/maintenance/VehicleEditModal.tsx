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
import { Vehicle } from "@/types/maintenance";
import { useLanguage } from "@/context/LanguageContext";
import UpdateTaxStatusModal from "./UpdateTaxStatusModal";
import TaxHistoryList from "./TaxHistoryList";

const ACCENT_COLORS = [
  "#F5A623",
  "#4ECDC4",
  "#FF6B6B",
  "#6C63FF",
  "#2ECC71",
  "#3498DB",
  "#E91E63",
];

interface VehicleEditModalProps {
  visible: boolean;
  vehicle?: Vehicle | null;
  onClose: () => void;
  onSave: (
    vehicle: Omit<Vehicle, "id" | "currentOdometer" | "lastOdometerUpdate"> & {
      currentOdometer?: number;
    },
  ) => void;
  onDelete?: (id: string) => void; // <--- Tambahkan baris ini
}

export default function VehicleEditModal({
  visible,
  vehicle,
  onClose,
  onSave,
  onDelete,
}: VehicleEditModalProps) {
  const { t, lang } = useLanguage();
  const isEdit = !!vehicle;

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [photoUri, setPhotoUri] = useState("");
  const [initialOdo, setInitialOdo] = useState("0");
  const [color, setColor] = useState("#F5A623");
  const [vehicleType, setVehicleType] = useState<"car" | "motorcycle">(
    "motorcycle",
  );
  const [taxDueDate, setTaxDueDate] = useState("");
  const [stnkDueDate, setStnkDueDate] = useState("");
  const [showTaxUpdateModal, setShowTaxUpdateModal] = useState(false);
  const [tankCapacity, setTankCapacity] = useState("");
  const [showTaxHistoryList, setShowTaxHistoryList] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setName(vehicle.name);
      setBrand(vehicle.brand);
      setModel(vehicle.model);
      setYear(vehicle.year.toString());
      setPlateNumber(vehicle.plateNumber);
      setPhotoUri(vehicle.photoUrl);
      setColor(vehicle.color);
      setVehicleType(vehicle.vehicleType ?? "motorcycle");
      setTaxDueDate(vehicle.taxDueDate ?? "");
      setStnkDueDate(vehicle.stnkDueDate ?? "");
      setTankCapacity(vehicle.tankCapacity ? vehicle.tankCapacity.toString() : "");
    } else {
      setName("");
      setBrand("");
      setModel("");
      setYear("");
      setPlateNumber("");
      setPhotoUri("");
      setInitialOdo("0");
      setColor("#F5A623");
      setVehicleType("motorcycle");
      setTaxDueDate("");
      setStnkDueDate("");
      setTankCapacity("");
    }
  }, [vehicle, visible]);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        lang === "id" ? "Izin Diperlukan" : "Permission Required",
        lang === "id"
          ? "Diperlukan izin akses galeri."
          : "Gallery access permission is required.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (
      !name.trim() ||
      !brand.trim() ||
      !model.trim() ||
      !year.trim() ||
      !plateNumber.trim()
    )
      return;
    onSave({
      name: name.trim(),
      brand: brand.trim(),
      model: model.trim(),
      year: parseInt(year, 10) || new Date().getFullYear(),
      plateNumber: plateNumber.trim().toUpperCase(),
      photoUrl:
        photoUri.trim() ||
        "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80",
      color,
      vehicleType,
      taxDueDate: taxDueDate.trim() || undefined,
      stnkDueDate: stnkDueDate.trim() || undefined,
      tankCapacity: tankCapacity.trim() ? parseFloat(tankCapacity) : undefined,
      currentOdometer: isEdit ? undefined : parseInt(initialOdo, 10) || 0,
    });
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

  const labelStyle = {
    color: "rgba(255,255,255,0.5)" as const,
    fontSize: 11,
    letterSpacing: 1 as const,
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
              behavior="height"
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
                    {isEdit ? t("editVehicleTitle") : t("addVehicleTitle")}
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
                  
                  {/* Photo Picker */}
                  <View style={{ gap: 8 }}>
                    <Text style={labelStyle}>
                      {lang === "id" ? "FOTO KENDARAAN" : "VEHICLE PHOTO"}
                    </Text>
                    <TouchableOpacity
                      onPress={handlePickPhoto}
                      activeOpacity={0.8}
                      style={{
                        height: 120,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: "rgba(245,166,35,0.3)",
                        overflow: "hidden",
                        backgroundColor: "#0D1B2A",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {photoUri ? (
                        <Image
                          source={{ uri: photoUri }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{ alignItems: "center", gap: 8 }}>
                          <Text style={{ fontSize: 28 }}>📷</Text>
                          <Text
                            style={{
                              color: "#F5A623",
                              fontSize: 13,
                              fontWeight: "600",
                            }}
                          >
                            {lang === "id"
                              ? "Pilih dari Galeri"
                              : "Pick from Gallery"}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    {photoUri ? (
                      <TouchableOpacity onPress={handlePickPhoto}>
                        <Text
                          style={{
                            color: "#F5A623",
                            fontSize: 12,
                            textAlign: "center",
                          }}
                        >
                          {lang === "id" ? "📷 Ganti Foto" : "📷 Change Photo"}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Name */}
                  <View style={{ gap: 8 }}>
                    <Text style={labelStyle}>{t("vehicleName")}</Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder={t("vehicleNamePlaceholder")}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      style={inputStyle}
                    />
                  </View>

                  {/* Brand + Model */}
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={labelStyle}>{t("brand")}</Text>
                      <TextInput
                        value={brand}
                        onChangeText={setBrand}
                        placeholder={t("brandPlaceholder")}
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={inputStyle}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={labelStyle}>{t("model")}</Text>
                      <TextInput
                        value={model}
                        onChangeText={setModel}
                        placeholder={t("modelPlaceholder")}
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={inputStyle}
                      />
                    </View>
                  </View>

                  {/* Year + Plate */}
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={labelStyle}>{t("year")}</Text>
                      <TextInput
                        value={year}
                        onChangeText={setYear}
                        placeholder={t("yearPlaceholder")}
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        keyboardType="numeric"
                        style={{ ...inputStyle, fontFamily: "SpaceMono" }}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={labelStyle}>{t("plateNumber")}</Text>
                      <TextInput
                        value={plateNumber}
                        onChangeText={setPlateNumber}
                        placeholder={t("platePlaceholder")}
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        autoCapitalize="characters"
                        style={{ ...inputStyle, fontFamily: "SpaceMono" }}
                      />
                    </View>
                  </View>

                  {/* Initial Odometer (add only) */}
                  {!isEdit && (
                    <View style={{ gap: 8 }}>
                      <Text style={labelStyle}>{t("initialOdometer")}</Text>
                      <TextInput
                        value={initialOdo}
                        onChangeText={setInitialOdo}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={{
                          ...inputStyle,
                          fontFamily: "SpaceMono",
                          color: "#4ECDC4",
                        }}
                      />
                    </View>
                  )}

                  {/* Document Dates */}
                  <View style={{ gap: 8 }}>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: 12,
                        fontWeight: "700",
                        letterSpacing: 1,
                        marginBottom: 4,
                      }}
                    >
                      📋 {t("Tax Reminder")}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <View style={{ flex: 1, gap: 8 }}>
                        <Text style={labelStyle}>{t("taxDueDate")}</Text>
                        <TextInput
                          value={taxDueDate}
                          onChangeText={setTaxDueDate}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          style={{
                            ...inputStyle,
                            fontFamily: "SpaceMono",
                            color: "#F5A623",
                          }}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 8 }}>
                        <Text style={labelStyle}>{t("stnkDueDate")}</Text>
                        <TextInput
                          value={stnkDueDate}
                          onChangeText={setStnkDueDate}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          style={{
                            ...inputStyle,
                            fontFamily: "SpaceMono",
                            color: "#4ECDC4",
                          }}
                        />
                      </View>
                    </View>

                    {/* 🚀 TOMBOL AKSES LANGSUNG KE FILE TAXHISTORYLIST */}
                 {isEdit && vehicle && (
                   <TouchableOpacity
                     activeOpacity={0.8}
                     onPress={() => setShowTaxHistoryList(true)} // 👈 Memicu state baru
                     style={{
                       backgroundColor: "rgba(78, 205, 196, 0.12)",
                       borderWidth: 1.5,
                       borderColor: "rgba(78, 205, 196, 0.35)",
                       borderRadius: 12,
                       padding: 14,
                       alignItems: "center",
                       marginTop: 8,
                     }}
                   >
                     <Text style={{ color: "#4ECDC4", fontSize: 12, fontWeight: "900", letterSpacing: 0.5 }}>
                       🗄️ LIHAT RIWAYAT ARSIP & LOG FINANSIAL PAJAK
                     </Text>
                   </TouchableOpacity>
                 )}
                  </View>

                  {/* Tank Capacity */}
                  <View style={{ gap: 8 }}>
                    <Text style={labelStyle}>
                      {lang === "id" ? "KAPASITAS TANGKI (LITER)" : "TANK CAPACITY (LITERS)"}
                    </Text>
                    <TextInput
                      value={tankCapacity}
                      onChangeText={setTankCapacity}
                      keyboardType="decimal-pad"
                      placeholder={lang === "id" ? "mis. 4.7" : "e.g. 4.7"}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      style={{
                        ...inputStyle,
                        fontFamily: "SpaceMono",
                        color: "#4ECDC4",
                      }}
                    />
                  </View>

                  {/* Accent Color */}
                  <View style={{ gap: 12 }}>
                    <Text style={labelStyle}>{t("accentColor")}</Text>
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      {ACCENT_COLORS.map((c) => (
                        <TouchableOpacity
                          key={c}
                          onPress={() => setColor(c)}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: c,
                            borderWidth: color === c ? 3 : 1.5,
                            borderColor:
                              color === c ? "#FFFFFF" : "rgba(255,255,255,0.2)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          activeOpacity={0.8}
                        >
                          {color === c && (
                            <Text
                              style={{
                                color: "#000",
                                fontSize: 14,
                                fontWeight: "700",
                              }}
                            >
                              ✓
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Container Tombol Aksi */}
                  <View style={{ gap: 12, marginTop: 8 }}>
                    {/* Tombol SIMPAN */}
                    <TouchableOpacity
                      onPress={handleSave}
                      activeOpacity={0.85}
                      style={{
                        backgroundColor: "#F5A623",
                        borderRadius: 14,
                        padding: 18,
                        alignItems: "center",
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
                        {t("save")}
                      </Text>
                    </TouchableOpacity>

                    {/* Tombol HAPUS (Hanya tampil saat mode Edit) */}
                    {isEdit && (
                      <TouchableOpacity
                        onPress={() => onDelete?.(vehicle!.id)}
                        activeOpacity={0.7}
                        style={{
                          padding: 18,
                          borderRadius: 14,
                          alignItems: "center",
                          borderWidth: 1.5,
                          borderColor: "rgba(255, 82, 82, 0.3)",
                        }}
                      >
                        <Text
                          style={{
                            color: "#FF5252",
                            fontSize: 16,
                            fontWeight: "700",
                          }}
                        >
                          {lang === "id" ? "Hapus Kendaraan" : "Delete Vehicle"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* 🏛️ FIX INTEGRASI: Membungkus TaxHistoryList dengan Modal Layar Penuh */}
      <Modal 
        visible={showTaxHistoryList} 
        animationType="slide" 
        transparent={false}
        onRequestClose={() => {
          console.log("➡️ Menutup Layar Riwayat Pajak...");
          setShowTaxHistoryList(false);
        }}
      >
        {showTaxHistoryList && vehicle && (
          <TaxHistoryList 
            visible={showTaxHistoryList}
            onClose={() => {
              console.log("➡️ Pengguna menekan tombol KEMBALI");
              setShowTaxHistoryList(false);
            }}
            vehicle={vehicle}
          />
        )}
      </Modal>

      {/* 🏛️ INTEGRASI LAYAR PENUH MANAJEMEN FINANSIAL & ARSIP PAJAK */}
      {showTaxUpdateModal && vehicle && (
        <UpdateTaxStatusModal
          visible={showTaxUpdateModal}
          onClose={() => setShowTaxUpdateModal(false)}
          vehicle={vehicle}
          initialType="annual"
          onSuccess={(newTaxDate?: string, newStnkDate?: string) => {
            console.log("=== [CALLBACK] UpdateTaxStatusModal Sukses Memberi Sinyal Balik ===");
            console.log("Tanggal mentah diterima Modal Edit:", { newTaxDate, newStnkDate });

            // 1. Sinkronisasi langsung ke TextInput Kuning (Pajak Tahunan)
            if (newTaxDate && newTaxDate !== "null") {
              console.log("🎯 Menyinkronkan [Masa Pajak] Baru ke Form Input Kuning:", newTaxDate);
              setTaxDueDate(newTaxDate);
            }
            
            // 2. 🚀 FIX UTAMA: Sinkronisasi langsung ke TextInput Toska (STNK 5 Tahunan)
            // Mengecek apakah string ada, bernilai valid, dan bukan teks tulisan "null"
            if (newStnkDate && newStnkDate !== "null" && newStnkDate.trim() !== "") {
              console.log("🎯 Menyinkronkan [Masa STNK] Baru ke Form Input Toska:", newStnkDate);
              setStnkDueDate(newStnkDate);
            } else {
              console.log("ℹ️ Pengisian Pajak Tahunan Biasa: Nilai input STNK lama tetap dipertahankan.");
            }
            
            // 3. Tutup modal pengisian formulir kas
            setShowTaxUpdateModal(false);

            // 4. Kirim paket data lengkap ke index.tsx agar dashboard depan ikut reaktif
            if (typeof onDelete === "function") {
              console.log("⚡ Memicu gabungan payload tanggal baru ke beranda index.tsx...");
              // Menggunakan penanda khusus dengan pemisah pipa (|)
              const payloadString = `REFRESH_TAX_HISTORY_TRIGGER|${newTaxDate || ''}|${newStnkDate || ''}`;
              onDelete(payloadString); 
            }
          }}
        />
      )}

    </Modal>
  );
}