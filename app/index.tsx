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
                  {t("servicesDone")}
                </Text>
                <Text
                  style={{
                    color: "#4ECDC4",
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  {vehicleRepairs.length} {t("records")}
                </Text>
              </View>
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
            fuelEntries={vehicleFuelEntries}
            onAdd={() => setShowFuelSheet(true)}
          />
        )}
      </ScrollView>

      {/* MODALS */}
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

      <FuelSheet
        visible={showFuelSheet}
        vehicleId={selectedVehicleId}
        currentOdometer={selectedVehicle?.currentOdometer || 0}
        onClose={() => setShowFuelSheet(false)}
        onSave={handleAddFuel}
      />

      <VehicleEditModal
        visible={showVehicleModal}
        vehicle={editingVehicle}
        onClose={() => setShowVehicleModal(false)}
        onSave={handleVehicleSave}
      />

      {/* --- TAMBAHKAN MODAL BAHASA DI SINI --- */}
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
                    activeOpacity={0.8}
                    style={{
                      paddingVertical: 18,
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor:
                        lang === l ? "#F5A623" : "rgba(255,255,255,0.03)",
                      borderRadius: 16,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor:
                        lang === l ? "#F5A623" : "rgba(255,255,255,0.08)",
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
