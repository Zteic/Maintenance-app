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
import FuelLog from "@/components/maintenance/FuelLog";
import FuelSheet from "@/components/maintenance/FuelSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaintenanceCalendar from "../components/maintenance/MaintenanceCalendar";

type TabType = "home" | "service" | "fuel";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
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

  // 1. Deklarasi Data Utama (Semua filter ditaruh di sini agar variabel tersedia)
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? vehicles[0];
  const vehicleRepairs = repairs.filter((r) => r.vehicleId === selectedVehicleId);
  const vehicleReminders = reminders.filter((r) => r.vehicleId === selectedVehicleId);
  const vehicleFuelEntries = fuelEntries.filter((f) => f.vehicleId === selectedVehicleId);

  // 2. Waktu & Periode Bulan Berjalan
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);

  // 3. Kalkulasi Rincian Biaya (Repair)
  const monthlyRepairs = vehicleRepairs.filter((r) => {
    const d = new Date(r.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalRepairMonthly = monthlyRepairs.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);

  // 4. Kalkulasi Rincian Biaya (Fuel)
  const monthlyFuel = vehicleFuelEntries.filter((f) => {
    const d = new Date(f.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalFuelMonthly = monthlyFuel.reduce((sum, f) => sum + (Number(f.totalCost) || 0), 0);

  // Kesimpulan Biaya Bulanan & Statistik
  const monthlyCost = totalFuelMonthly + totalRepairMonthly;
  const monthlyServicesDone = monthlyRepairs.length;
  const totalCost = vehicleRepairs.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  const totalLitersMonthly = monthlyFuel.reduce((sum, f) => sum + (Number(f.liters) || 0), 0);

  // Hitung Jarak Tempuh Bulan Ini (Odometer tertinggi - Odometer terendah bulan ini)
  const monthlyOdometers = [
    ...monthlyRepairs.map(r => r.odometer),
    ...monthlyFuel.map(f => f.odometer)
  ].filter(odo => odo > 0);

  const monthlyDistance = monthlyOdometers.length > 0 
    ? Math.max(...monthlyOdometers) - Math.min(...monthlyOdometers) 
    : 0;

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

  const handleAddReminderOnly = () => {
    setPrefillServiceType(undefined); 
    setEditingRepair(null); 
    setShowAddSheet(true); 
  };

  const handleRecommendationTap = (serviceType: string) => {
    setPrefillServiceType(serviceType);
    setEditingRepair(null);
    setShowAddSheet(true);
  };

  const handleEdit = (item: Reminder) => {
    // 1. Prefill tipe servis
    setPrefillServiceType(item.serviceType);

    // 2. Buat objek perbaikan sementara
    const mockRepair: RepairEntry = {
      id: `temp-${Date.now()}`,
      vehicleId: selectedVehicleId,
      serviceType: item.serviceType,
      date: new Date().toISOString().split('T')[0],
      odometer: selectedVehicle.currentOdometer,
      cost: 0,
      workshop: "",
      notes: "Service from Priority List",
      nextIntervalKm: item.intervalKm
    };

    setEditingRepair(mockRepair);
    setShowAddSheet(true); 
  };

// Fungsi pendukung untuk reset Odometer servis
const handleMarkDone = async (item: Reminder) => {
    const currentOdo = selectedVehicle?.currentOdometer || 0;
  
  const newHistoryEntry: RepairEntry = {
      id: `rep${Date.now()}`,
      vehicleId: selectedVehicleId,
      serviceType: item.serviceType,
      date: new Date().toISOString().split('T')[0],
      odometer: currentOdo,
      cost: 0, // Bisa diedit nanti di history
      workshop: "",
      notes: "Auto-generated from Priority Maintenance",
      nextIntervalKm: item.intervalKm
    };
  
  const updatedReminder: Reminder = {
      ...item,
      lastServiceOdometer: currentOdo,
      dueOdometer: currentOdo + (item.intervalKm || 10000),
      status: 'safe',
      lastServiceDate: new Date().toISOString(),
    };

  try {
      // 1. Tambahkan ke History
      const newRepair: RepairEntry = {
        id: `rep${Date.now()}`,
        vehicleId: selectedVehicleId,
        ...formData,
      };
      setRepairs(prev => [newRepair, ...prev]);

      setReminders(prev => prev.map(rem => {
        const isMatch = rem.serviceType.toLowerCase() === formData.serviceType.toLowerCase();
        
        if (isMatch && rem.vehicleId === selectedVehicleId) {
          return {
            ...rem,
            lastServiceOdometer: Number(formData.odometer),
            dueOdometer: Number(formData.odometer) + (Number(formData.nextIntervalKm) || 10000),
            status: 'safe',
            lastServiceDate: new Date().toISOString(),
          };
        }
        return rem;
      }));

      setShowAddSheet(false);
      setEditingRepair(null);
      setPrefillServiceType(undefined);
      
      alert(lang === "id" ? "Berhasil disimpan!" : "Successfully saved!");
    } catch (error) {
      console.error("Gagal menyimpan:", error);
    }
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

  const handleAddRepair = async (formData: any) => {
    try {
      // 1. Buat objek perbaikan untuk History
      const newRepair: RepairEntry = {
        id: `rep${Date.now()}`,
        vehicleId: selectedVehicleId,
        ...formData,
        date: formData.date || new Date().toISOString().split('T')[0],
      };

      // 2. Simpan ke State Repairs (History)
      setRepairs(prev => [newRepair, ...prev]);

      // 3. Update State Reminders (Priority List)
      setReminders(prev => prev.map(rem => {
        // Cari pengingat yang namanya sama (misal: "Ganti Oli")
        const isMatch = rem.serviceType.toLowerCase() === formData.serviceType.toLowerCase();
        
        if (isMatch && rem.vehicleId === selectedVehicleId) {
          return {
            ...rem,
            lastServiceOdometer: Number(formData.odometer),
            dueOdometer: Number(formData.odometer) + (Number(formData.nextIntervalKm) || 10000),
            status: 'safe',
            lastServiceDate: new Date().toISOString(),
          };
        }
        return rem;
      }));

      // 4. Tutup Sheet & Reset
      setShowAddSheet(false);
      setEditingRepair(null);
      setPrefillServiceType(undefined);
      
      alert(lang === "id" ? "Berhasil disimpan!" : "Successfully saved!");
    } catch (error) {
      console.error("Gagal menyimpan:", error);
    }
  };

  const handleUpdateRepair = (id: string, entry: Omit<RepairEntry, "id">) => {
    setRepairs((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...entry, id } : r))
    );
    setShowAddSheet(false);
    setEditingRepair(null);
  };

  const handleAddFuel = (entry: Omit<FuelEntry, "id">) => {
    setFuelEntries((prev) => [...prev, { ...entry, id: `fe${Date.now()}` }]);
  };

    const handleDelete = (id: string) => {
    setItemToDeleteId(id);
    setShowDeleteConfirm(true);
    };

    const confirmDeleteAction = () => {
    if (itemToDeleteId) {
      setReminders((prev) => prev.filter((r) => r.id !== itemToDeleteId));
      setShowDeleteConfirm(false);
      setItemToDeleteId(null);
      }
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
  onAddVehicle={() => {
    setEditingVehicle(null); 
    setShowVehicleModal(true);
  }}
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
              <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: "600" }}>
                {t("totalSpent")} {lang === "id" ? "BULAN INI" : "THIS MONTH"}
              </Text>
              
              <Text
                style={{
                  color: "#F5A623",
                  fontSize: 16,
                  fontWeight: "600",
                  marginTop: 2,
                  marginBottom: 8
                }}
              >
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(monthlyCost)}
              </Text>

              {/* Rincian Terpisah (Fuel & Repair) */}
              <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 8, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: "hsla(0, 0%, 100%, 0.77)", fontSize: 14 }}>
                    ⛽ {lang === "id" ? "Total Bensin" : "Total Fuel"}
                  </Text>
                  <Text style={{ color: "#F5A623", fontSize: 14, fontWeight: "600" }}>
                    Rp {totalFuelMonthly.toLocaleString('id-ID')}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: "hsla(0, 0%, 100%, 0.77)", fontSize: 14 }}>
                    🛠️ {lang === "id" ? "Total Perbaikan" : "Total Repair"}
                  </Text>
                  <Text style={{ color: "#F5A623", fontSize: 14, fontWeight: "600" }}>
                    Rp {totalRepairMonthly.toLocaleString('id-ID')}
                  </Text>
                </View>
              </View>

              <Text style={{ color: "rgba(255,255,255,0.2)", fontSize: 14, marginTop: 10, fontStyle: 'italic' }}>
                {now.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { month: "long", year: "numeric" })}
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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: '600' }}>
                    {t("servicesDone")}
                  </Text>
                  <Text style={{ fontSize: 14 }}>📅</Text>
                </View>

                <Text
                  style={{
                    color: "#4ECDC4",
                    fontSize: 16,
                    fontWeight: "800",
                    marginTop: 2,
                  }}
                >
                  {monthlyServicesDone} <Text style={{ fontSize: 16, fontWeight: '600',marginTop: 2,
                  marginBottom: 8 }}>{t("records")}</Text>
                </Text>

                {/* STATS TAMBAHAN UNTUK MENGISI RUANG KOSONG */}
                <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 8, marginTop: 8, gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: "hsla(0, 0%, 100%, 0.77)", fontSize: 14 }}>⛽ Total Liter</Text>
                    <Text style={{ color: "#4ECDC4", fontSize: 14, fontWeight: "700" }}>
                      {totalLitersMonthly.toFixed(1)} L
                    </Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: "hsla(0, 0%, 100%, 0.77)", fontSize: 14 }}>🛣️ {lang === "id" ? "Jarak" : "Distance"}</Text>
                    <Text style={{ color: "#4ECDC4", fontSize: 14, fontWeight: "700" }}>
                      +{monthlyDistance.toLocaleString('id-ID')} km
                    </Text>
                  </View>
                </View>

                <Text style={{ color: "rgba(255,255,255,0.2)", fontSize: 14, marginTop: 10 }}>
                  {now.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { month: "long", year: "numeric" })}
                </Text>
              </TouchableOpacity>
            </View>
            <MaintenanceStatusBar
              reminders={vehicleReminders}
              currentOdometer={selectedVehicle.currentOdometer}
              accentColor={selectedVehicle.color}
            />
            <UpcomingReminders
              reminders={reminders}
              reminders={vehicleReminders}
              currentOdometer={selectedVehicle.currentOdometer}
              vehicle={selectedVehicle}
              onAddReminder={handleAddReminderOnly}
              onEditReminder={(item) => handleEdit(item)}
              onEditReminder={handleEdit}
              onDeleteReminder={handleDelete}
            />
          </>
        )}

        {activeTab === "history" && (
  <RepairHistory
    repairs={vehicleRepairs}
    onEdit={(r) => {
      setEditingRepair(r);
      setShowAddSheet(true);
    }}
    onDelete={(id) => {
      setRepairs((prev) => prev.filter((r) => r.id !== id));
    }}
  />
)}

        {activeTab === "fuel" && (
          <FuelLog
            fuelEntries={vehicleFuelEntries}
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
        onClose={() => { setShowAddSheet(false); setEditingRepair(null); }}
        onSave={(formData) => {
    // Jika kita ingin ini HANYA masuk ke Reminder (Priority)
    const newReminder: Reminder = {
      id: `rem-${Date.now()}`,
      vehicleId: selectedVehicleId,
      serviceType: formData.serviceType,
      lastServiceOdometer: Number(formData.odometer),
      dueOdometer: Number(formData.odometer) + (Number(formData.nextIntervalKm) || 10000),
      intervalKm: Number(formData.nextIntervalKm) || 10000,
      status: 'safe',
      lastServiceDate: new Date().toISOString(),
    };

    setReminders(prev => [...prev, newReminder]);
    setShowAddSheet(false);
        alert(lang === "id" ? "Reminder ditambahkan!" : "Reminder added!");
  }}
  onUpdate={handleUpdateRepair}
/>

      {/* 2. Fuel Sheet */}
      <FuelSheet
        visible={showFuelSheet}
        vehicleId={selectedVehicleId}
        currentOdometer={selectedVehicle?.currentOdometer || 0}
        tankCapacity={selectedVehicle?.tankCapacity}
        editEntry={editingFuel}
        onClose={() => {
          setShowFuelSheet(false);
          setEditingFuel(null);
        }}
        // TAMBAHKAN LOGIKA HAPUS DI SINI
        onDelete={(id) => {
          setFuelEntries((prev) => prev.filter((f) => f.id !== id));
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
      
      {/* Custom Delete Confirmation Modal */}
      <Modal 
        visible={showDeleteConfirm} 
        transparent 
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(7, 18, 28, 0.95)', // Background overlay lebih gelap sesuai referensi
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <View style={{ 
            width: '85%', // Lebar disesuaikan menjadi 85%
            backgroundColor: '#162431', // Warna kartu disesuaikan
            borderRadius: 32, // Border radius lebih membulat (32)
            padding: 30, // Padding disesuaikan
            alignItems: 'center'
          }}>
            {/* Visual Indicator (Garis Handle di atas) */}
            <View style={{ 
              width: 40, 
              height: 4, 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              borderRadius: 2, 
              marginBottom: 25 
            }} />

            <Text style={{ 
              color: '#FFF', 
              fontSize: 20, // Font size disesuaikan
              fontWeight: '800', 
              marginBottom: 10 
            }}>
              {lang === "id" ? "Hapus Riwayat?" : "Delete History?"}
            </Text>
            
            <Text style={{ 
              color: 'rgba(255,255,255,0.4)', // Warna teks deskripsi disesuaikan
              textAlign: 'center', 
              fontSize: 14, 
              lineHeight: 22, 
              marginBottom: 35 
            }}>
              {lang === "id" 
                ? "Catatan pemeliharaan ini akan dihapus secara permanen dari riwayat kendaraan Anda." 
                : "This maintenance record will be permanently removed from your vehicle history."}
            </Text>

            <View style={{ width: '100%', gap: 12 }}>
              {/* Tombol Hapus (Confirm) */}
              <TouchableOpacity 
                onPress={confirmDeleteAction}
                activeOpacity={0.8}
                style={{ 
                  width: '100%', 
                  paddingVertical: 16, 
                  borderRadius: 20, // Border radius tombol disesuaikan
                  backgroundColor: '#FF5252',
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>
                  {lang === "id" ? "Ya, Hapus Riwayat" : "Yes, Delete History"}
                </Text>
              </TouchableOpacity>

              {/* Tombol Batal (Cancel) */}
              <TouchableOpacity 
                onPress={() => setShowDeleteConfirm(false)}
                activeOpacity={0.6}
                style={{ 
                  width: '100%', 
                  paddingVertical: 16, 
                  borderRadius: 20, 
                  alignItems: 'center' 
                }}
              >
                <Text style={{ 
                  color: 'rgba(255,255,255,0.4)', 
                  fontWeight: '700', 
                  fontSize: 15 
                }}>
                  {lang === "id" ? "Batal" : "Cancel"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
<View style={{ 
  paddingHorizontal: 5, 
  paddingVertical: 10,
  backgroundColor: 'rgba(0,0,0,0.1)', // Memberi kontras tipis agar angka tanggal terlihat jelas
  borderRadius: 20,
  marginHorizontal: 10
}}>
  <MaintenanceCalendar
    repairs={vehicleRepairs}
    fuelEntries={vehicleFuelEntries}
    // Pastikan di dalam komponen MaintenanceCalendar kamu mengatur 
    // theme={{ calendarBackground: 'transparent', ... }} agar menyatu
    onDayPress={(day: any) => {
      setSelectedDate(day.dateString);
      const repairsOnDate = vehicleRepairs.filter((r) => r.date === day.dateString);
      const fuelsOnDate = vehicleFuelEntries.filter((f) => {
        const fuelDate = typeof f.date === "string" ? f.date.split("T")[0] : f.date;
        return fuelDate === day.dateString;
      });

      const combined = [
        ...repairsOnDate.map((item) => ({ ...item, category: "repair" })),
        ...fuelsOnDate.map((item) => ({ ...item, category: "fuel" })),
      ];
      setSelectedDateRecords(combined);
    }}
  />
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
