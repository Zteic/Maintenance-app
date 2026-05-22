import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
  Share,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter, Stack } from "expo-router";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import {
  loadUserProfile,
  saveUserProfile,
  loadVehicles,
  loadRepairs,
} from "@/utils/storage";
import { UserProfile, Vehicle, RepairEntry } from "@/types/maintenance";
import { MOCK_VEHICLES, MOCK_REPAIRS } from "@/data/mockData";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FuelPriceUpdate from "@/components/maintenance/FuelPriceUpdate";

// --- Fungsi Pembantu (Helpers) ---
function formatCurrency(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function buildExportText(
  vehicles: Vehicle[],
  repairs: RepairEntry[],
  lang: string,
): string {
  const isId = lang === "id";
  let text = `=== GarasiKu ${isId ? "Riwayat Servis" : "Service History"} ===\n`;
  text += `${isId ? "Diekspor" : "Exported"}: ${new Date().toLocaleDateString()}\n\n`;

  for (const v of vehicles) {
    const vRepairs = repairs.filter((r) => r.vehicleId === v.id);
    const total = vRepairs.reduce((s, r) => s + r.cost, 0);
    text += `🚗 ${v.name} (${v.plateNumber}) — ${v.year} ${v.brand} ${v.model}\n`;
    text += `Odometer: ${v.currentOdometer.toLocaleString()} km | Total: ${formatCurrency(total)}\n`;

    if (vRepairs.length === 0) {
  text += `  ${isId ? "Belum ada catatan." : "No records."}\n`;
} else {
  // Amankan sorting dengan mengonversinya ke objek Date terlebih dahulu jika berupa string
  const sorted = [...vRepairs].sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : new Date(a.date);
    const dateB = b.date instanceof Date ? b.date : new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  for (const r of sorted) {
    // Pastikan pemanggilan .toLocaleDateString() juga aman dari string
    const actualDate = r.date instanceof Date ? r.date : new Date(r.date);
    const notes = r.notes.replace(/\n?\[receipts:.*?\]/g, "").trim();
    
    text += `  • ${actualDate.toLocaleDateString()} - ${r.serviceType} - ${formatCurrency(r.cost)} - ${r.workshop}`;
    if (notes) text += `\n    📝 ${notes}`;
    text += "\n";
  }
}
    text += "\n";
  }
  return text;
}

// --- Komponen Konten ---
function ProfileContent() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const isId = lang === "id";

  // 1. Definisikan semua Hook di atas (Jangan ada 'if return' sebelum ini)
  const [showPriceUpdate, setShowPriceUpdate] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: "Pengguna",
    email: "user@example.com",
  });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [appMode, setAppMode] = useState<'basic' | 'advance'>('basic');

  useEffect(() => {
    loadUserProfile().then((p) => {
      if (p) setProfile(p);
    });
    // Membaca memori mode terakhir kali
    AsyncStorage.getItem('garasi_app_mode').then(mode => {
      if (mode) setAppMode(mode as 'basic' | 'advance');
    });
  }, []);

  // Fungsi penyimpan mode
  const toggleMode = async (mode: 'basic' | 'advance') => {
    setAppMode(mode);
    await AsyncStorage.setItem('garasi_app_mode', mode);
  };

  // 2. Fungsi-fungsi Handler
  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        isId ? "Izin Diperlukan" : "Permission Required",
        isId ? "Izin diperlukan." : "Permission required.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const updated = { ...profile, photoUri: result.assets[0].uri };
      setProfile(updated);
      saveUserProfile(updated);
    }
  };

  const handleSaveProfile = () => {
    const updated = {
      ...profile,
      name: editName.trim() || profile.name,
      email: editEmail.trim() || profile.email,
    };
    setProfile(updated);
    saveUserProfile(updated);
    setEditing(false);
  };

  const handleExport = async () => {
    try {
      const vehicles = (await loadVehicles()) ?? MOCK_VEHICLES;
      const repairs = (await loadRepairs()) ?? MOCK_REPAIRS;
      const text = buildExportText(vehicles, repairs, lang);
      await Share.share({
        title: `GarasiKu - Export`,
        message: text,
      });
    } catch (e) {
      Alert.alert("Error", "Could not export.");
    }
  };

  const handleBackupExport = async () => {
    try {
      const keys = ["garasi_vehicles", "garasi_repairs", "garasi_user_profile"];
      const pairs = await AsyncStorage.multiGet(keys);
      const backup: Record<string, any> = {};
      pairs.forEach(([k, v]) => {
        if (v) backup[k] = JSON.parse(v);
      });
      await Share.share({
        title: "GarasiKu_Backup",
        message: JSON.stringify(backup),
      });
    } catch (e) {
      Alert.alert("Error", "Backup failed.");
    }
  };

  // 3. Conditional Return (Letakkan di sini agar tidak melanggar aturan Hook)
  if (showPriceUpdate) {
    return <FuelPriceUpdate onBack={() => setShowPriceUpdate(false)} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0D1B2A" }}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 60,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#F5A623", fontSize: 16 }}>← Kembali</Text>
          </TouchableOpacity>

          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 20,
              fontWeight: "800",
              flex: 1,
              textAlign: "center",
              marginRight: 80,
            }}
          >
            {t("myProfile")}
          </Text>
        </View>

        {/* Profile Card */}
        <View
          style={{
            marginHorizontal: 20,
            backgroundColor: "#1A2B3C",
            borderRadius: 16,
            padding: 20,
            gap: 16,
          }}
        >
          {!editing ? (
            <>
              <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                {t("userName")}
              </Text>
              <Text
                style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}
              >
                {profile.name}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                {t("email")}
              </Text>
              <Text
                style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}
              >
                {profile.email}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setEditName(profile.name);
                  setEditEmail(profile.email);
                  setEditing(true);
                }}
                style={{
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: "rgba(245,166,35,0.1)",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#F5A623", fontWeight: "600" }}>
                  ✏️ {t("editProfile")}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                style={{
                  backgroundColor: "#0D1B2A",
                  color: "#fff",
                  padding: 12,
                  borderRadius: 10,
                }}
                placeholder="Name"
              />
              <TextInput
                value={editEmail}
                onChangeText={setEditEmail}
                style={{
                  backgroundColor: "#0D1B2A",
                  color: "#fff",
                  padding: 12,
                  borderRadius: 10,
                }}
                placeholder="Email"
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setEditing(false)}
                  style={{ flex: 1, alignItems: "center", padding: 12 }}
                >
                  <Text style={{ color: "#fff" }}>{t("cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveProfile}
                  style={{
                    flex: 2,
                    backgroundColor: "#F5A623",
                    alignItems: "center",
                    padding: 12,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: "#0D1B2A", fontWeight: "800" }}>
                    {t("saveProfile")}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View style={{ marginHorizontal: 20, marginTop: 16, gap: 12 }}>
          <TouchableOpacity
            onPress={() => setShowPriceUpdate(true)}
            activeOpacity={0.85}
            style={{
              backgroundColor: "#1A2B3C",
              borderRadius: 16,
              padding: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              borderWidth: 1,
              borderColor: "rgba(245,166,35,0.2)",
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: "rgba(78,205,196,0.1)",
                borderWidth: 1,
                borderColor: "rgba(245,166,35,0.3)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 22 }}>⛽</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}
              >
                Update Harga Bensin
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                Atur harga BBM per liter saat ini
              </Text>
            </View>
            <Text style={{ color: "#4ECDC4", fontSize: 18 }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
  onPress={() => router.push('/export')} // Navigasi ke halaman export
  style={{
    backgroundColor: "#1A2B3C",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.3)", // Neon teal border
    shadowColor: "#4ECDC4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  }}
>
  <View style={{
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(78,205,196,0.1)",
    alignItems: "center",
    justifyContent: "center"
  }}>
    <Text style={{ fontSize: 22 }}>📊</Text>
  </View>
  <View style={{ flex: 1 }}>
    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>
      Backup and Restore
    </Text>
    <Text style={{ color: "rgba(78,205,196,0.5)", fontSize: 12, marginTop: 2 }}>
      Backup seluruh data kendaraan ke .vhdb
              </Text>
            </View>
            <Text style={{ color: "#4ECDC4", fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 🔥 SECTION MODE PENGGUNAAN */}
        <View style={{ marginHorizontal: 20, marginTop: 25 }}>
          <Text style={{ color: '#4ECDC4', fontSize: 12, fontWeight: '800', marginBottom: 10, marginLeft: 5, letterSpacing: 1 }}>MODE PENGGUNAAN</Text>
          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
            <TouchableOpacity 
              onPress={() => toggleMode('basic')} 
              style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: appMode === 'basic' ? '#4ECDC4' : 'transparent' }}
            >
              <Text style={{ fontWeight: '800', color: appMode === 'basic' ? '#0D1B2A' : 'rgba(255,255,255,0.5)' }}>Basic</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => toggleMode('advance')} 
              style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: appMode === 'advance' ? '#F5A623' : 'transparent' }}
            >
              <Text style={{ fontWeight: '800', color: appMode === 'advance' ? '#0D1B2A' : 'rgba(255,255,255,0.5)' }}>Advance</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 8, marginLeft: 5, marginBottom: 15 }}>
            {appMode === 'basic' ? "Tampilan bersih. Fokus pada fitur utama." : "Membuka fitur tambahan (Advanced Search, dll)."}
          </Text>
        </View>

        {/* 🚀 MENU FEEDBACK & BUG REPORT BARU */}
        <View style={{ marginHorizontal: 20, marginTop: 25 }}>
          <Text style={{ color: '#4ECDC4', fontSize: 12, fontWeight: '800', marginBottom: 10, marginLeft: 5, letterSpacing: 1 }}>BANTUAN & PENGEMBANGAN</Text>
          
          <TouchableOpacity 
            onPress={() => router.push('/feedback')}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A2B3C', padding: 18, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}
          >
            <Text style={{ fontSize: 22, marginRight: 15 }}>🐞</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Laporkan Bug & Saran</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>Kirim masukan langsung ke developer</Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/feedback-history')}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A2B3C', padding: 18, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}
          >
            <Text style={{ fontSize: 22, marginRight: 15 }}>📋</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>Riwayat Feedback</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>Pantau status laporan Anda</Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Backup Modal Sederhana */}
      <Modal visible={showBackupModal} transparent animationType="none">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.8)",
            justifyContent: "center",
            padding: 40,
          }}
        >
          <View
            style={{
              backgroundColor: "#1A2B3C",
              padding: 20,
              borderRadius: 20,
              gap: 20,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 18,
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              Backup Data
            </Text>
            <TouchableOpacity
              onPress={handleBackupExport}
              style={{
                backgroundColor: "#4ECDC4",
                padding: 15,
                borderRadius: 10,
              }}
            >
              <Text style={{ textAlign: "center", fontWeight: "bold" }}>
                Export Backup
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowBackupModal(false)}
              style={{ padding: 10 }}
            >
              <Text style={{ color: "#fff", textAlign: "center" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    
    </SafeAreaView>
  );
}


// --- Komponen Utama ---
export default function ProfileScreen() {
  return (
    <LanguageProvider>
      {/* 1. Header Bawaan dimatikan di sini */}
      <Stack.Screen options={{ headerShown: false }} />
      {/* 2. Baru panggil konten */}
      <ProfileContent />
    </LanguageProvider>
  );
}
