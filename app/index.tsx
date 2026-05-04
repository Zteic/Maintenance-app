import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router"; // Ditambahkan useLocalSearchParams
import * as Notifications from "expo-notifications";
import {
  Vehicle,
  RepairEntry,
  Reminder,
  TireLog,
  FuelEntry,
  NotificationItem,
} from "@/types/maintenance";
import { MOCK_VEHICLES, MOCK_REPAIRS, MOCK_REMINDERS } from "@/data/mockData";
import {
  loadVehicles,
  saveVehicles,
  loadRepairs,
  saveRepairs,
  loadReminders,
  saveReminders,
  loadTireLogs,
  saveTireLogs,
  loadSelectedVehicleId,
  saveSelectedVehicleId,
  loadFuelEntries,
  saveFuelEntries,
  loadNotifications,
} from "@/utils/storage";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import VehicleSwitcher from "@/components/maintenance/VehicleSwitcher";
import VehicleProfileCard from "@/components/maintenance/VehicleProfileCard";
import MaintenanceStatusBar from "@/components/maintenance/MaintenanceStatusBar";
import UpcomingReminders from "@/components/maintenance/UpcomingReminders";
import RepairHistory from "@/components/maintenance/RepairHistory";
import AddRepairSheet from "@/components/maintenance/AddRepairSheet";
import VehicleEditModal from "@/components/maintenance/VehicleEditModal";
import RecommendationBanner from "@/components/maintenance/RecommendationBanner";
import FuelLog from "@/components/maintenance/FuelLog";
import FuelSheet from "@/components/maintenance/FuelSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaintenanceCalendar from "../components/maintenance/MaintenanceCalendar";

type TabType = "home" | "history" | "fuel";

// --- GLOBAL TRIGGER UNTUK LAYOUT ---
export let openFuelSheet: () => void = () => {};
export let openRepairSheet: () => void = () => {};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function AppContent() {
  const router = useRouter();
  const params = useLocalSearchParams(); // Mengambil parameter dari URL
  const { t, lang, setLang } = useLanguage();
  const insets = useSafeAreaInsets();

  // State
  const [vehicles, setVehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
  const [repairs, setRepairs] = useState<RepairEntry[]>(MOCK_REPAIRS);
  const [reminders, setReminders] = useState<Reminder[]>(MOCK_REMINDERS);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(
    MOCK_VEHICLES[0].id,
  );
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showFuelSheet, setShowFuelSheet] = useState(false);
  const [editingRepair, setEditingRepair] = useState<RepairEntry | null>(null);
  const [prefillServiceType, setPrefillServiceType] = useState<
    string | undefined
  >();
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showLangModal, setShowLangModal] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDateRecords, setSelectedDateRecords] = useState<any[]>([]);
  const [editingFuel, setEditingFuel] = useState<FuelEntry | null>(null);

  // 1. Sinkronisasi Tab dari URL (Penting!)
  useEffect(() => {
    if (params.tab) {
      setActiveTab(params.tab as TabType);
    }
  }, [params.tab]);

  // 2. Registrasi Fungsi untuk FAB di Layout
  useEffect(() => {
    openFuelSheet = () => setShowFuelSheet(true);
    openRepairSheet = () => {
      setEditingRepair(null);
      setPrefillServiceType(undefined);
      setShowAddSheet(true);
    };
  }, []);

  const selectedVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) ?? vehicles[0];
  const vehicleRepairs = repairs.filter(
    (r) => r.vehicleId === selectedVehicleId,
  );
  const vehicleReminders = reminders.filter(
    (r) => r.vehicleId === selectedVehicleId,
  );
  const vehicleFuelEntries = fuelEntries.filter(
    (f) => f.vehicleId === selectedVehicleId,
  );
  const totalCost = vehicleRepairs.reduce((sum, r) => sum + r.cost, 0);

  // Load Data
  useEffect(() => {
    (async () => {
      const [sv, sr, srm, ssv, sfe] = await Promise.all([
        loadVehicles(),
        loadRepairs(),
        loadReminders(),
        loadSelectedVehicleId(),
        loadFuelEntries(),
      ]);
      if (sv) setVehicles(sv);
      if (sr) setRepairs(sr);
      if (srm) setReminders(srm);
      if (ssv) setSelectedVehicleId(ssv);
      if (sfe) setFuelEntries(sfe);
      setDataLoaded(true);
    })();
  }, []);

  // Save Data
  useEffect(() => {
    if (dataLoaded) saveVehicles(vehicles);
  }, [vehicles, dataLoaded]);
  useEffect(() => {
    if (dataLoaded) saveRepairs(repairs);
  }, [repairs, dataLoaded]);
  useEffect(() => {
    if (dataLoaded) saveFuelEntries(fuelEntries);
  }, [fuelEntries, dataLoaded]);

  // Handlers
  const handleOdometerUpdate = (newValue: number) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === selectedVehicleId
          ? { ...v, currentOdometer: newValue, lastOdometerUpdate: new Date() }
          : v,
      ),
    );
  };

  const handleRecommendationTap = (serviceType: string) => {
    setPrefillServiceType(serviceType);
    setEditingRepair(null);
    setShowAddSheet(true);
  };

  const handleVehicleSave = (data: any) => {
    if (editingVehicle) {
      setVehicles((prev) =>
        prev.map((v) => (v.id === editingVehicle.id ? { ...v, ...data } : v)),
      );
    } else {
      const newVehicle = {
        id: `v${Date.now()}`,
        ...data,
        currentOdometer: data.currentOdometer ?? 0,
        lastOdometerUpdate: new Date(),
      };
      setVehicles((prev) => [...prev, newVehicle]);
      setSelectedVehicleId(newVehicle.id);
    }
    setShowVehicleModal(false);
  };

  const handleVehicleDelete = (id: string) => {
    // Validasi: Minimal harus ada 1 kendaraan
    if (vehicles.length <= 1) {
      alert(
        lang === "id"
          ? "Minimal harus ada satu kendaraan."
          : "At least one vehicle is required.",
      );
      return;
    }

    const confirmDelete = confirm(
      lang === "id"
        ? "Hapus kendaraan ini? Semua data servis dan bensin akan hilang."
        : "Delete this vehicle? All service and fuel data will be lost.",
    );

    if (confirmDelete) {
      const newVehicles = vehicles.filter((v) => v.id !== id);
      setVehicles(newVehicles);

      // Jika kendaraan yang dihapus adalah yang sedang dipilih, alihkan ke kendaraan pertama
      if (selectedVehicleId === id) {
        const nextVehicleId = newVehicles[0].id;
        setSelectedVehicleId(nextVehicleId);
        saveSelectedVehicleId(nextVehicleId);
      }

      setShowVehicleModal(false);
    }
  };

  const handleAddRepair = (entry: Omit<RepairEntry, "id">) => {
    setRepairs((prev) => [...prev, { ...entry, id: `r${Date.now()}` }]);
    setShowAddSheet(false);
  };

  const handleAddFuel = (entry: Omit<FuelEntry, "id">) => {
    setFuelEntries((prev) => [...prev, { ...entry, id: `fe${Date.now()}` }]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0D1B2A" }}>
      <StatusBar barStyle="light-content" />

      {/* HEADER & TOP NAVIGATION SECTION */}
      <View style={{ paddingTop: insets.top, backgroundColor: "#0D1B2A" }}>
        {/* Container untuk Logo & Bahasa */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.push("/profile")}
              style={{
                width: 45,
                height: 45,
                borderRadius: 22.5,
                backgroundColor: "#1A2B3C",
                borderWidth: 1.5,
                borderColor: "#F5A623",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 20 }}>👤</Text>
            </TouchableOpacity>
            <View>
              <Text
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 1,
                }}
              >
                {t("appTagline").toUpperCase()}
              </Text>
              <Text
                style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800" }}
              >
                {t("appName")}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setShowLangModal(true)} // Pastikan ini memanggil modal
            activeOpacity={0.7}
            style={{
              backgroundColor: "#1A2B3C",
              borderRadius: 12,
              padding: 10,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            <Text style={{ fontSize: 18 }}>{lang === "id" ? "🇮🇩" : "🇬🇧"}</Text>
          </TouchableOpacity>
        </View>

        {/* Baris Switcher Kendaraan */}
        <View style={{ paddingBottom: 8 }}>
          <VehicleSwitcher
            vehicles={vehicles}
            selectedId={selectedVehicleId}
            onSelect={setSelectedVehicleId}
            onAddVehicle={() => setShowVehicleModal(true)}
          />
        </View>
      </View>

      {/* BODY CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: 20,
          paddingBottom: 150, // Ruang untuk Navbar Bawah & FAB
          paddingTop: 10,
        }}
      >
        {activeTab === "home" && (
          <>
            <VehicleProfileCard
              vehicle={selectedVehicle}
              onOdometerUpdate={handleOdometerUpdate}
              onEditVehicle={() => {
                setEditingVehicle(selectedVehicle);
                setShowVehicleModal(true);
              }}
            />
            <View
              style={{ flexDirection: "row", marginHorizontal: 20, gap: 12 }}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#1A2B3C",
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.05)",
                }}
              >
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>
                  {t("totalSpent")}
                </Text>
                <Text
                  style={{
                    color: "#F5A623",
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(totalCost)}
                </Text>
              </View>
              {/* KOTAK SERVICES DONE YANG BISA DIKLIK */}
              <TouchableOpacity
                onPress={() => setShowCalendarModal(true)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  backgroundColor: "#1A2B3C",
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.05)",
                }}
              >
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>
                  {t("servicesDone")}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "#4ECDC4",
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  >
                    {vehicleRepairs.length} {t("records")}
                  </Text>
                  <Text style={{ fontSize: 12 }}>📅</Text>
                </View>
              </TouchableOpacity>
            </View>
            <MaintenanceStatusBar
              reminders={vehicleReminders}
              currentOdometer={selectedVehicle.currentOdometer}
              accentColor={selectedVehicle.color}
            />
            <RecommendationBanner
              reminders={vehicleReminders}
              currentOdometer={selectedVehicle.currentOdometer}
              onTap={handleRecommendationTap}
            />
            <UpcomingReminders vehicle={selectedVehicle} />
          </>
        )}

        {activeTab === "history" && (
          <RepairHistory
            repairs={vehicleRepairs}
            onEdit={(r) => {
              setEditingRepair(r);
              setShowAddSheet(true);
            }}
            onDelete={(id) =>
              setRepairs((prev) => prev.filter((r) => r.id !== id))
            }
          />
        )}

        {activeTab === "fuel" && (
          <FuelLog
            // Filter data agar hanya menampilkan 7 hari terakhir
            fuelEntries={vehicleFuelEntries.filter((entry) => {
              const entryDate = new Date(entry.date);
              const today = new Date();
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(today.getDate() - 7);

              // Mengembalikan true jika tanggal entry berada di antara 7 hari lalu dan hari ini
              return entryDate >= sevenDaysAgo && entryDate <= today;
            })}
            onAdd={() => {
              setEditingFuel(null);
              setShowFuelSheet(true);
            }}
            onEdit={(entry) => {
              setEditingFuel(entry);
              setShowFuelSheet(true);
            }}
            onDelete={(id) => {
              setFuelEntries((prev) => prev.filter((f) => f.id !== id));
            }}
          />
        )}
      </ScrollView>

      {/* MODALS SECTION */}

      {/* 1. Add Repair Sheet */}
      <AddRepairSheet
        visible={showAddSheet}
        vehicleId={selectedVehicleId}
        currentOdometer={selectedVehicle.currentOdometer}
        vehicleType={selectedVehicle.vehicleType}
        prefillServiceType={prefillServiceType}
        editEntry={editingRepair}
        onClose={() => setShowAddSheet(false)}
        onSave={handleAddRepair}
      />

      {/* 2. Fuel Sheet */}
      <FuelSheet
        visible={showFuelSheet}
        vehicleId={selectedVehicleId}
        currentOdometer={selectedVehicle?.currentOdometer || 0}
        editEntry={editingFuel} // TAMBAHKAN INI agar form terisi saat edit
        onClose={() => {
          setShowFuelSheet(false);
          setEditingFuel(null);
        }}
        onSave={(entry) => {
          if (editingFuel) {
            // Logika Update data lama
            setFuelEntries((prev) =>
              prev.map((f) =>
                f.id === editingFuel.id ? { ...f, ...entry } : f,
              ),
            );
          } else {
            // Logika Tambah data baru
            handleAddFuel(entry);
          }
          setShowFuelSheet(false);
          setEditingFuel(null);
        }}
      />

      {/* 3. Vehicle Edit */}
      <VehicleEditModal
        visible={showVehicleModal}
        vehicle={editingVehicle}
        onClose={() => setShowVehicleModal(false)}
        onSave={handleVehicleSave}
        onDelete={handleVehicleDelete} // <--- TAMBAHKAN BARIS INI
      />

      {/* 4. MODAL BAHASA (Sudah Diperbaiki Penutupnya) */}
      <Modal
        visible={showLangModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLangModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowLangModal(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.8)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: "#1A2B3C",
                  borderRadius: 28,
                  padding: 24,
                  width: "85%",
                  maxWidth: 320,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.1)",
                }}
              >
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: 20,
                    fontWeight: "800",
                    textAlign: "center",
                    marginBottom: 24,
                  }}
                >
                  {lang === "id" ? "Pilih Bahasa" : "Select Language"}
                </Text>
                {(["id", "en"] as const).map((l) => (
                  <TouchableOpacity
                    key={l}
                    onPress={() => {
                      setLang(l);
                      setShowLangModal(false);
                    }}
                    style={{
                      paddingVertical: 18,
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor:
                        lang === l ? "#F5A623" : "rgba(255,255,255,0.03)",
                      borderRadius: 16,
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ fontSize: 22, marginRight: 12 }}>
                      {l === "id" ? "🇮🇩" : "🇬🇧"}
                    </Text>
                    <Text
                      style={{
                        color: lang === l ? "#0D1B2A" : "#FFFFFF",
                        fontSize: 16,
                        fontWeight: "800",
                      }}
                    >
                      {l === "id" ? "Indonesia" : "English"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 5. MODAL KALENDER (Sekarang Sejajar, Bukan di Dalam) */}
      <Modal
        visible={showCalendarModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.85)",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              margin: 20,
              height: "85%",
              backgroundColor: "#1A2B3C",
              borderRadius: 25,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            {/* HEADER */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                padding: 20,
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.02)",
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255,255,255,0.05)",
              }}
            >
              <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "800" }}>
                Jejak Kendaraan
              </Text>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                <View
                  style={{
                    backgroundColor: "rgba(255,82,82,0.1)",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      color: "#FF5252",
                      fontWeight: "800",
                      fontSize: 12,
                    }}
                  >
                    TUTUP
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* KALENDER */}
            <View style={{ paddingHorizontal: 10, paddingVertical: 10 }}>
              <MaintenanceCalendar
                repairs={vehicleRepairs}
                fuelEntries={vehicleFuelEntries} // Pastikan props ini terisi
                onDayPress={(day: any) => {
                  setSelectedDate(day.dateString);

                  // 1. Ambil data perbaikan/servis
                  const repairsOnDate = vehicleRepairs.filter(
                    (r) => r.date === day.dateString,
                  );

                  // 2. Ambil data bensin (Fuel)
                  // Kita tambahkan pengecekan format tanggal untuk berjaga-jaga
                  const fuelsOnDate = vehicleFuelEntries.filter((f) => {
                    const fuelDate =
                      typeof f.date === "string"
                        ? f.date.split("T")[0]
                        : f.date;
                    return fuelDate === day.dateString;
                  });

                  // 3. GABUNGKAN KEDUANYA ke dalam satu list
                  const combined = [
                    ...repairsOnDate.map((item) => ({
                      ...item,
                      category: "repair", // Label untuk membedakan di UI
                    })),
                    ...fuelsOnDate.map((item) => ({
                      ...item,
                      category: "fuel", // Label untuk membedakan di UI
                    })),
                  ];

                  // 4. Update state records untuk ditampilkan di ScrollView bawah kalender
                  setSelectedDateRecords(combined);
                }}
              />
            </View>

            {/* LIST RIWAYAT */}
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.2)" }}>
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  backgroundColor: "rgba(255,255,255,0.03)",
                }}
              >
                <Text
                  style={{ color: "#4ECDC4", fontSize: 12, fontWeight: "700" }}
                >
                  {selectedDate
                    ? `LOG TANGGAL: ${selectedDate}`
                    : "SILAKAN PILIH TANGGAL"}
                </Text>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 20, paddingBottom: 30 }}
              >
                {selectedDateRecords.length > 0 ? (
                  selectedDateRecords.map((item, index) => (
                    <View
                      key={index}
                      style={{
                        flexDirection: "row",
                        backgroundColor: "rgba(255,255,255,0.05)",
                        padding: 15,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            backgroundColor:
                              item.category === "fuel"
                                ? "rgba(245, 166, 35, 0.1)"
                                : "rgba(78, 205, 196, 0.1)",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ fontSize: 20 }}>
                            {item.category === "fuel" ? "⛽" : "🔧"}
                          </Text>
                        </View>
                        <View>
                          <Text
                            style={{
                              color: "#FFF",
                              fontWeight: "700",
                              fontSize: 14,
                            }}
                          >
                            {item.category === "fuel"
                              ? "Isi Bensin"
                              : item.serviceType || "Servis"}
                          </Text>
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.4)",
                              fontSize: 11,
                            }}
                          >
                            {item.category === "fuel"
                              ? `${item.liters}L • ${item.fuelType}`
                              : item.workshop || "Bengkel"}
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={{
                            color:
                              item.category === "fuel" ? "#F5A623" : "#4ECDC4",
                            fontWeight: "800",
                          }}
                        >
                          Rp {Number(item.cost || 0).toLocaleString("id-ID")}
                        </Text>
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.2)",
                            fontSize: 9,
                          }}
                        >
                          {item.odometer?.toLocaleString("id-ID")} km
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={{ alignItems: "center", marginTop: 40 }}>
                    <Text
                      style={{ fontSize: 40, marginBottom: 10, opacity: 0.2 }}
                    >
                      📋
                    </Text>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.3)",
                        fontStyle: "italic",
                        textAlign: "center",
                      }}
                    >
                      Tidak ada catatan pada tanggal ini.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
