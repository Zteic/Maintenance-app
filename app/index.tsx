import React, { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from "expo-router";
import { TabContext } from "./_layout";
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
  TextInput,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
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
  saveNotifications,
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
import NotifCenter from '@/components/maintenance/NotifCenter';

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
  const { t, lang, setLang } = useLanguage();
  const now = new Date();
  const insets = useSafeAreaInsets();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

  // State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [repairs, setRepairs] = useState<RepairEntry[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(MOCK_VEHICLES[0].id);
  const { activeTab } = React.useContext(TabContext);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showFuelSheet, setShowFuelSheet] = useState(false);
  const [editingRepair, setEditingRepair] = useState<RepairEntry | null>(null);
  const [prefillServiceType, setPrefillServiceType] = useState<string | undefined>();
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showLangModal, setShowLangModal] = useState(false);
  const [isFetchingFromServer, setIsFetchingFromServer] = useState(true);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDateRecords, setSelectedDateRecords] = useState<any[]>([]);
  const [editingFuel, setEditingFuel] = useState<FuelEntry | null>(null);
  const [saveToHistoryOnly, setSaveToHistoryOnly] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planInterval, setPlanInterval] = useState("");
  const [showOdoHistory, setShowOdoHistory] = useState(false);

  // --- STATE UNTUK NAMA GARASI CUSTOM ---
  const [appName, setAppName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    const loadAppName = async () => {
      try {
        const savedName = await AsyncStorage.getItem("custom_app_name");
        if (savedName) {
          setAppName(savedName);
        } else {
          setAppName(t("appName")); // Default bawaan
        }
      } catch (e) {
        console.log("Gagal memuat nama:", e);
      }
    };
    loadAppName();
  }, []);

  // Fungsi untuk menyimpan nama saat selesai mengetik
  const saveAppName = async () => {
    setIsEditingName(false);
    const finalName = appName.trim() || t("appName"); // Jika dikosongkan, kembali ke default
    setAppName(finalName);
    try {
      await AsyncStorage.setItem("custom_app_name", finalName);
    } catch (e) {
      console.log("Gagal menyimpan nama:", e);
    }
  };

  // Notif State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const bellScale = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    openFuelSheet = () => setShowFuelSheet(true);
    openRepairSheet = () => {
      setEditingRepair(null);
      setPrefillServiceType(undefined);
      setSaveToHistoryOnly(true);
      setShowAddSheet(true);
    };
  }, []);

  const stats = React.useMemo(() => {
    const vRepairs = repairs.filter((r) => r.vehicleId === selectedVehicleId);
    const vFuel = fuelEntries.filter((f) => f.vehicleId === selectedVehicleId);

    const allOdometers = [
    ...vRepairs.map(r => r.odometer),
    ...vFuel.map(f => f.odometer)
  ].filter(odo => !isNaN(odo) && odo > 0);

    const latestOdo = allOdometers.length > 0 ? Math.max(...allOdometers) : 0;

    const vReminders = reminders
      .filter((r) => r.vehicleId === selectedVehicleId)
      .map((rem) => {
        const distanceLeft = rem.dueOdometer - latestOdo;
        let status: "safe" | "approaching" | "overdue" = "safe";

        if (distanceLeft <= 0) {
          status = "overdue";
        } else if (distanceLeft <= 1000) {
          status = "approaching";
        } else {
          status = "safe";
        }

        return { ...rem, status };
      });

    const now = new Date();
    const cMonth = now.getMonth();
    const cYear = now.getFullYear();

    const mRepairs = vRepairs.filter((r) => {
      const d = new Date(r.date);
      return d.getMonth() === cMonth && d.getFullYear() === cYear;
    });

    const mFuel = vFuel.filter((f) => {
      const d = new Date(f.date);
      return d.getMonth() === cMonth && d.getFullYear() === cYear;
    });

    const totalRepairM = mRepairs.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
    const totalFuelM = mFuel.reduce((sum, f) => sum + (Number(f.totalCost) || 0), 0);
    const totalLitersM = mFuel.reduce((sum, f) => sum + (Number(f.liters) || 0), 0);

    const monthlyOdometers = [...mRepairs.map((r) => r.odometer), ...mFuel.map((f) => f.odometer)].filter(
      (o) => o > 0
    );
    const distanceM =
      monthlyOdometers.length > 0 ? Math.max(...monthlyOdometers) - Math.min(...monthlyOdometers) : 0;

    return {
      vehicleRepairs: vRepairs,
      vehicleFuelEntries: vFuel,
      vehicleReminders: vReminders,
      selectedVehicle: vehicles.find((v) => v.id === selectedVehicleId),
      monthlyCost: totalRepairM + totalFuelM,
      totalRepairMonthly: totalRepairM,
      totalFuelMonthly: totalFuelM,
      totalLitersMonthly: totalLitersM,
      monthlyServicesDone: mRepairs.length,
      monthlyDistance: distanceM,
      autoLatestOdometer: latestOdo,
    };
  }, [repairs, fuelEntries, reminders, selectedVehicleId, vehicles]);

  const refreshData = useCallback(async () => {
    try {
      const [sv, sr, srm, ssv, sfe, sn] = await Promise.all([
        loadVehicles(),
        loadRepairs(),
        loadReminders(),
        loadSelectedVehicleId(),
        loadFuelEntries(),
        loadNotifications(),
      ]);
      setNotifications(sn && sn.length > 0 ? sn : []);
      setVehicles(sv && sv.length > 0 ? sv : MOCK_VEHICLES);
      setRepairs(sr && sr.length > 0 ? sr : MOCK_REPAIRS);
      setReminders(srm && srm.length > 0 ? srm : MOCK_REMINDERS);
      setFuelEntries(sfe && sfe.length > 0 ? sfe : []);

      if (ssv) {
        setSelectedVehicleId(ssv);
      } else if (sv && sv.length > 0) {
        setSelectedVehicleId(sv[0].id);
      } else {
        setSelectedVehicleId(MOCK_VEHICLES[0].id);
      }
    } catch (e) {
      console.error("Gagal load data", e);
    } finally {
      setIsFetchingFromServer(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  useEffect(() => {
    if (!isFetchingFromServer) {
      saveVehicles(vehicles);
    }
  }, [vehicles, isFetchingFromServer]);

  useEffect(() => {
    if (!isFetchingFromServer) {
      saveRepairs(repairs);
    }
  }, [repairs, isFetchingFromServer]);

  useEffect(() => {
    if (!isFetchingFromServer) {
      saveFuelEntries(fuelEntries);
    }
  }, [fuelEntries, isFetchingFromServer]);

  useEffect(() => {
    if (!isFetchingFromServer) {
      saveNotifications(notifications);
    }
  }, [notifications, isFetchingFromServer]);

  const handleOdometerUpdate = (newValue: number) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === selectedVehicleId
          ? { ...v, currentOdometer: newValue, lastOdometerUpdate: new Date() }
          : v
      )
    );
  };

  const handleAddReminderOnly = () => {
    setPrefillServiceType(undefined);
    setEditingRepair(null);
    setSaveToHistoryOnly(false);
    setShowAddSheet(true);
  };

  const handleRecommendationTap = (serviceType: string) => {
    setPrefillServiceType(serviceType);
    setEditingRepair(null);
    setShowAddSheet(true);
  };

  const triggerBellAnimation = () => {
    Animated.sequence([
      Animated.timing(bellScale, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.spring(bellScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
  };

  const addNotification = (
    badge: NotificationItem['badge'],
    title: string, 
    message: string, 
    type: "system" | "vehicle", 
    vId?: string,
    oldOdo?: number,
    newOdo?: number,
    source?: string
  ) => {
    const vehicleName = vehicles.find(v => v.id === vId)?.name || 'Kendaraan';
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}`,
      badge, title, message, type, vehicleId: vId, vehicleName, oldOdometer: oldOdo, newOdometer: newOdo, source,
      isRead: false, timestamp: new Date(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
    triggerBellAnimation();
  };

  // Logika Evaluasi Rollback Odometer saat Hapus Data
  const evaluateOdometerRollback = (deletedOdo: number, deletedId: string, sourceName: string) => {
    const currentOdo = stats.autoLatestOdometer;
    
    // Cari Max Odo baru tanpa item yang dihapus
    const remainingRepairs = repairs.filter(r => r.vehicleId === selectedVehicleId && r.id !== deletedId);
    const remainingFuels = fuelEntries.filter(f => f.vehicleId === selectedVehicleId && f.id !== deletedId);
    
    const allRemainingOdos = [...remainingRepairs.map(r=>r.odometer), ...remainingFuels.map(f=>f.odometer)];
    const newMaxOdo = allRemainingOdos.length > 0 ? Math.max(...allRemainingOdos) : 0;

    if (newMaxOdo < currentOdo) {
      addNotification(
        'ROLLBACK',
        'Odometer Rollback',
        `Odometer kendaraan dikembalikan ke ${newMaxOdo.toLocaleString('id-ID')} km berdasarkan histori sebelumnya.`,
        'vehicle', selectedVehicleId, currentOdo, newMaxOdo, sourceName
      );
    }
  };

  const handleEdit = (item: Reminder) => {
    setPrefillServiceType(item.serviceType);
    setSaveToHistoryOnly(false);

    const mockRepair: RepairEntry = {
      id: `temp-${Date.now()}`,
      vehicleId: selectedVehicleId,
      serviceType: item.serviceType,
      date: new Date().toISOString().split("T")[0],
      odometer: stats.autoLatestOdometer || 0,
      cost: 0,
      workshop: "",
      notes: "",
      nextIntervalKm: item.intervalKm || 10000,
    };

    setEditingRepair(mockRepair);
    setShowAddSheet(true);
  };

  const handleSaveNewPlan = () => {
    if (!planName || !planInterval) {
      alert(lang === "id" ? "Mohon isi nama dan interval!" : "Please fill name and interval!");
      return;
    }

    const vId = selectedVehicleId;
    const currentOdo = stats.autoLatestOdometer;

    const newPlan: Reminder = {
      id: `rem-${Date.now()}`,
      vehicleId: vId,
      serviceType: planName,
      intervalKm: Number(planInterval),
      dueOdometer: currentOdo + Number(planInterval),
      lastServiceOdometer: currentOdo,
      status: "safe",
      lastServiceDate: new Date().toISOString(),
    };

    setReminders((prev) => [...prev, newPlan]);

    addNotification(
      'ADD', 
      lang === "id" ? "Rencana Perawatan Baru" : "New Maintenance Plan",
      `Rencana baru untuk ${planName} setiap ${planInterval} km berhasil dijadwalkan.`,
      "vehicle",
      selectedVehicleId
    );

    setPlanName("");
    setPlanInterval("");
    setShowPlanModal(false);
  };

  const handleMarkDone = async (item: Reminder) => {
    const currentOdo = stats.selectedVehicle?.currentOdometer || 0;

    const newHistoryEntry: RepairEntry = {
      id: `rep${Date.now()}`,
      vehicleId: selectedVehicleId,
      serviceType: item.serviceType,
      date: new Date().toISOString().split("T")[0],
      odometer: currentOdo,
      cost: 0,
      workshop: "",
      notes: "Auto-generated from Priority Maintenance",
      nextIntervalKm: item.intervalKm,
    };

    const updatedReminder: Reminder = {
      ...item,
      lastServiceOdometer: currentOdo,
      dueOdometer: currentOdo + (item.intervalKm || 10000),
      status: "safe",
      lastServiceDate: new Date().toISOString(),
    };

    try {
      const newRepair: RepairEntry = {
        id: `rep${Date.now()}`,
        vehicleId: selectedVehicleId,
        serviceType: item.serviceType,
        date: new Date().toISOString().split("T")[0],
        odometer: currentOdo,
        cost: 0,
        workshop: "",
        notes: "Auto-generated from Priority Maintenance",
        nextIntervalKm: item.intervalKm,
      };
      setRepairs((prev) => [newRepair, ...prev]);

      setReminders((prev) =>
        prev.map((rem) => {
          const isMatch = rem.serviceType.toLowerCase() === item.serviceType.toLowerCase();
          if (isMatch && rem.vehicleId === selectedVehicleId) {
            return updatedReminder;
          }
          return rem;
        })
      );

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
        prev.map((v) =>
          v.id === editingVehicle.id
            ? {
                ...v,
                ...data,
                currentOdometer: data.currentOdometer ?? v.currentOdometer,
              }
            : v
        )
      );
      addNotification(
        'UPDATE', 
        lang === "id" ? "Profil Kendaraan Diperbarui" : "Vehicle Profile Updated",
        `Data kendaraan ${data.name || editingVehicle.name} telah berhasil diperbarui.`,
        "vehicle",
        editingVehicle.id
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

      addNotification(
        'ADD', 
        lang === "id" ? "Kendaraan Ditambahkan" : "Vehicle Added",
        `Kendaraan baru ${newVehicle.name} berhasil terdaftar di garasi.`,
        "vehicle",
        newVehicle.id
      );
    }

    setShowVehicleModal(false);
  };

  const handleVehicleDelete = (id: string) => {
    // 1. Pengecekan jumlah minimal kendaraan
    if (vehicles.length <= 1) {
      const msg = lang === "id" ? "Minimal harus ada satu kendaraan." : "At least one vehicle is required.";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert(lang === "id" ? "Peringatan" : "Warning", msg);
      }
      return;
    }

    const performDelete = () => {
      const newVehicles = vehicles.filter((v) => v.id !== id);
      setVehicles(newVehicles);

      if (selectedVehicleId === id) {
        const nextVehicleId = newVehicles[0].id;
        setSelectedVehicleId(nextVehicleId);
        saveSelectedVehicleId(nextVehicleId);
      }
      setShowVehicleModal(false);
    };

    const confirmMsg = lang === "id" 
      ? "Hapus kendaraan ini? Semua data riwayat akan hilang." 
      : "Delete this vehicle? All history will be lost.";

    if (Platform.OS === "web") {
      const confirmDelete = window.confirm(confirmMsg);
      if (confirmDelete) {
        performDelete();
      }
    } else {
      Alert.alert(
        lang === "id" ? "Hapus Kendaraan" : "Delete Vehicle",
        confirmMsg,
        [
          { text: lang === "id" ? "Batal" : "Cancel", style: "cancel" },
          { text: lang === "id" ? "Hapus" : "Delete", style: "destructive", onPress: performDelete },
        ]
      );
    }
  };

  const handleAddRepair = async (formData: any) => {
    try {
      const newRepair: RepairEntry = {
        vehicleId: selectedVehicleId,
        ...formData,
        id: `rep${Date.now()}`,
        date: formData.date || new Date().toISOString().split("T")[0],
      };

      setRepairs((prev) => [newRepair, ...prev]);

      setReminders((prev) =>
        prev.map((rem) => {
          const isMatch = rem.serviceType.toLowerCase() === formData.serviceType.toLowerCase();

          if (isMatch && rem.vehicleId === selectedVehicleId) {
            return {
              ...rem,
              lastServiceOdometer: Number(formData.odometer),
              dueOdometer: Number(formData.odometer) + (Number(formData.nextIntervalKm) || 10000),
              status: "safe",
              lastServiceDate: new Date().toISOString(),
            };
          }
          return rem;
        })
      );

      setShowAddSheet(false);
      setEditingRepair(null);
      setPrefillServiceType(undefined);

      addNotification(
        lang === "id" ? "Servis Ditambahkan" : "Service Added",
        `Data perbaikan/servis ${formData.serviceType} berhasil dicatat ke riwayat kendaraan.`,
        "vehicle",
        selectedVehicleId
      );

      alert(lang === "id" ? "Berhasil disimpan!" : "Successfully saved!");
    } catch (error) {
      console.error("Gagal menyimpan:", error);
    }
  };

  const handleUpdateRepair = (id: string, entry: Omit<RepairEntry, "id">) => {
    setRepairs((prev) => prev.map((r) => (r.id === id ? { ...r, ...entry, id } : r)));
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

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={{ flex: 1, backgroundColor: "#0D1B2A" }}>
      <StatusBar barStyle="light-content" />

      {/* HEADER & TOP NAVIGATION SECTION */}
      <View style={{ paddingTop: insets.top, backgroundColor: "#0D1B2A" }}>
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
            <View>
              {isEditingName ? (
                <TextInput
                  value={appName}
                  onChangeText={setAppName}
                  onBlur={saveAppName} // Simpan saat klik di luar kotak
                  onSubmitEditing={saveAppName} // Simpan saat tekan tombol Enter/Done di keyboard
                  autoFocus // Langsung munculkan keyboard
                  style={{ 
                    color: "#FFFFFF", 
                    fontSize: 22, 
                    fontWeight: "800", 
                    padding: 0, 
                    borderBottomWidth: 1, 
                    borderBottomColor: '#4ECDC4',
                    minWidth: 100
                  }}
                />
              ) : (
                <TouchableOpacity 
                  activeOpacity={0.7} 
                  onPress={() => setIsEditingName(true)} // Ubah jadi mode edit saat diklik
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800" }}>
                    {appName}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity onPress={() => setShowNotifModal(true)} activeOpacity={0.7}>
              <Animated.View
                style={{
                  backgroundColor: "#1A2B3C",
                  borderRadius: 12,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.1)",
                  position: "relative",
                  transform: [{ scale: bellScale }],
                }}
              >
                <Text style={{ fontSize: 18 }}>🔔</Text>
                {unreadNotifsCount > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      top: -5,
                      right: -5,
                      backgroundColor: "#FF5252",
                      borderRadius: 10,
                      width: 20,
                      height: 20,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: "#0D1B2A",
                    }}
                  >
                    <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "bold" }}>
                      {unreadNotifsCount > 9 ? "9+" : unreadNotifsCount}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowLangModal(true)}
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
        </View>

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
        overScrollMode="never"
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingBottom: 150,
          paddingTop: 10,
        }}
      >
        {/* 🚀 PERBAIKAN 4: Gunakan "display: flex/none" agar tab pindah secara instan tanpa loading ulang komponen */}
        
        {/* TAB 1: HOME */}
        <View style={{ display: activeTab === "home" ? "flex" : "none", width: "100%", gap: 20 }}>
          {stats.selectedVehicle ? (
            <>
              <VehicleProfileCard
                vehicle={{ ...stats.selectedVehicle, currentOdometer: stats.autoLatestOdometer }}
                onEditVehicle={() => { setEditingVehicle(stats.selectedVehicle!); setShowVehicleModal(true); }}
                onOdometerPress={() => setShowOdoHistory(true)}
              />

              <View style={{ flexDirection: "row", marginHorizontal: 20, gap: 12 }}>
                <View style={{ flex: 1, backgroundColor: "#1A2B3C", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}>
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: "600" }}>
                    {t("totalSpent")} {lang === "id" ? "BULAN INI" : "THIS MONTH"}
                  </Text>
                  <Text style={{ color: "#F5A623", fontSize: 16, fontWeight: "600", marginTop: 2, marginBottom: 8 }}>
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(stats.monthlyCost)}
                  </Text>
                  <View style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingTop: 8, gap: 4 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: "hsla(0, 0%, 100%, 0.77)", fontSize: 10 }}>⛽ {lang === "id" ? "Total Bensin" : "Total Fuel"}</Text>
                      <Text style={{ color: "#F5A623", fontSize: 10, fontWeight: "600" }}>Rp {stats.totalFuelMonthly.toLocaleString("id-ID")}</Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: "hsla(0, 0%, 100%, 0.77)", fontSize: 10 }}>🛠️ {lang === "id" ? "Total Perbaikan" : "Total Repair"}</Text>
                      <Text style={{ color: "#F5A623", fontSize: 10, fontWeight: "600" }}>Rp {stats.totalRepairMonthly.toLocaleString("id-ID")}</Text>
                    </View>
                  </View>
                  <Text style={{ color: "rgba(255,255,255,0.2)", fontSize: 14, marginTop: 10, fontStyle: "italic" }}>
                    {now.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { month: "long", year: "numeric" })}
                  </Text>
                </View>

                <TouchableOpacity onPress={() => setShowCalendarModal(true)} activeOpacity={0.7} style={{ flex: 1, backgroundColor: "#1A2B3C", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "600" }}>{t("servicesDone")}</Text>
                    <Text style={{ fontSize: 14 }}>📅</Text>
                  </View>
                  <Text style={{ color: "#4ECDC4", fontSize: 16, fontWeight: "800", marginTop: 2 }}>
                    {stats.monthlyServicesDone} <Text style={{ fontSize: 16, fontWeight: "600", marginTop: 2, marginBottom: 8 }}>{t("records")}</Text>
                  </Text>
                  <View style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingTop: 8, marginTop: 8, gap: 4 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: "hsla(0, 0%, 100%, 0.77)", fontSize: 10 }}>⛽ Total Liter</Text>
                      <Text style={{ color: "#4ECDC4", fontSize: 10, fontWeight: "700" }}>{stats.totalLitersMonthly.toFixed(1)} L</Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: "hsla(0, 0%, 100%, 0.77)", fontSize: 10 }}>🛣️ {lang === "id" ? "Jarak" : "Distance"}</Text>
                      <Text style={{ color: "#4ECDC4", fontSize: 10, fontWeight: "700" }}>+{stats.monthlyDistance.toLocaleString("id-ID")} km</Text>
                    </View>
                  </View>
                  <Text style={{ color: "rgba(255,255,255,0.2)", fontSize: 14, marginTop: 10 }}>
                    {now.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { month: "long", year: "numeric" })}
                  </Text>
                </TouchableOpacity>
              </View>

              <MaintenanceStatusBar
                reminders={stats.vehicleReminders}
                currentOdometer={stats.autoLatestOdometer}
                accentColor={stats.selectedVehicle?.color}
              />
              <UpcomingReminders
                reminders={stats.vehicleReminders}
                currentOdometer={stats.autoLatestOdometer}
                vehicle={stats.selectedVehicle}
                onAddReminder={() => setShowPlanModal(true)}
                onEditReminder={handleEdit}
                onDeleteReminder={handleDelete}
                onEditVehicle={() => { setEditingVehicle(stats.selectedVehicle!); setShowVehicleModal(true); }}
              />
            </>
          ) : null}
        </View>

        {/* TAB 2: HISTORY / SERVICE */}
        <View style={{ display: activeTab === "history" ? "flex" : "none", width: "100%" }}>
          <RepairHistory
            repairs={stats.vehicleRepairs}
            onEdit={(r) => {
              setEditingRepair(r);
              setShowAddSheet(true);
            }}
            onDelete={(id) => {
              const deletedItem = stats.vehicleRepairs.find((r) => r.id === id);
              setRepairs((prev) => prev.filter((r) => r.id !== id));
              if (deletedItem) {
                addNotification('DELETE', "Riwayat Dihapus", `Menghapus riwayat [${deletedItem.serviceType}].`, "vehicle", selectedVehicleId, deletedItem.odometer, undefined, 'Perbaikan Kendaraan');
                evaluateOdometerRollback(deletedItem.odometer, id, 'Perbaikan Kendaraan');
              }
            }}
          />
        </View>

        {/* TAB 3: FUEL */}
        <View style={{ display: activeTab === "fuel" ? "flex" : "none", width: "100%" }}>
          <FuelLog
            fuelEntries={stats.vehicleFuelEntries}
            vehicle={stats.selectedVehicle}
            onAdd={() => {
              setEditingFuel(null);
              setShowFuelSheet(true);
            }}
            onEdit={(entry) => {
              setEditingFuel(entry);
              setShowFuelSheet(true);
            }}
            onDelete={(id) => {
              const deletedFuel = stats.vehicleFuelEntries.find((f) => f.id === id);
              setFuelEntries((prev) => prev.filter((f) => f.id !== id));
              if (deletedFuel) {
                addNotification('DELETE', "Catatan Bensin Dihapus", `Menghapus data bensin ${deletedFuel.liters}L.`, "vehicle", selectedVehicleId, deletedFuel.odometer, undefined, 'Pengisian Bensin');
                evaluateOdometerRollback(deletedFuel.odometer, id, 'Pengisian Bensin');
              }
              setShowFuelSheet(false);
              setEditingFuel(null);
            }}
          />
        </View>
      </ScrollView>

      {/* MODALS SECTION */}
      <AddRepairSheet
        visible={showAddSheet}
        vehicleId={selectedVehicleId}
        currentOdometer={stats.selectedVehicle?.currentOdometer || 0}
        vehicleType={stats.selectedVehicle?.vehicleType || "motorcycle"}
        prefillServiceType={prefillServiceType}
        editEntry={editingRepair}
        isHistoryMode={saveToHistoryOnly}
        isServiceTypeLocked={!saveToHistoryOnly}
        onClose={() => {
          setShowAddSheet(false);
          setEditingRepair(null);
        }}
        onSave={(formData) => {
          const vId = selectedVehicleId;
          const isEdit = editingRepair && editingRepair.id && !editingRepair.id.includes("temp");

          if (isEdit) {
            const updatedEntry = {
              ...editingRepair,
              ...formData,
              vehicleId: vId,
            };

            setRepairs((prev) => prev.map((r) => (r.id === editingRepair.id ? updatedEntry : r)));

            setReminders((prev) =>
              prev.map((rem) => {
                const isMatch = rem.serviceType.toLowerCase() === formData.serviceType.toLowerCase();
                if (isMatch && rem.vehicleId === vId) {
                  const odo = Number(formData.odometer);
                  const interval = Number(formData.nextIntervalKm) || 10000;
                  return {
                    ...rem,
                    lastServiceOdometer: odo,
                    dueOdometer: odo + interval,
                    intervalKm: interval,
                    status: "safe",
                    lastServiceDate: new Date().toISOString(),
                  };
                }
                return rem;
              })
            );

            const oldOdo = editingRepair.odometer?.toLocaleString("id-ID") || 0;
            const newOdo = Number(formData.odometer).toLocaleString("id-ID");
            const oldCost = editingRepair.cost?.toLocaleString("id-ID") || 0;
            const newCost = Number(formData.cost).toLocaleString("id-ID");

            addNotification(
              'UPDATE',
              lang === "id" ? "Servis Diperbarui" : "Service Updated",
              `Update [${formData.serviceType}]: Odo ${oldOdo}km ➔ ${newOdo}km | Biaya Rp${oldCost} ➔ Rp${newCost}.`,
              "vehicle",
              vId
            );

            alert(lang === "id" ? "Data berhasil diperbarui!" : "Data updated successfully!");
          } else {
            const newRepair: RepairEntry = {
              vehicleId: vId,
              ...formData,
              id: `rep${Date.now()}`,
              date: formData.date || new Date().toISOString().split("T")[0],
            };

            setRepairs((prev) => [newRepair, ...prev]);

            if (!saveToHistoryOnly) {
              setReminders((prev) =>
                prev.map((rem) => {
                  const isMatch = rem.serviceType.toLowerCase() === formData.serviceType.toLowerCase();
                  if (isMatch && rem.vehicleId === vId) {
                    return {
                      ...rem,
                      lastServiceOdometer: Number(formData.odometer),
                      dueOdometer: Number(formData.odometer) + (Number(formData.nextIntervalKm) || 10000),
                      status: "safe",
                    };
                  }
                  return rem;
                })
              );
            }

            addNotification(
              'ADD',
              lang === "id" ? "Servis Ditambahkan" : "Service Added",
              `Mencatat [${formData.serviceType}] pada Odo: ${Number(formData.odometer).toLocaleString(
                "id-ID"
              )} km (Biaya: Rp${Number(formData.cost).toLocaleString("id-ID")}).`,
              "vehicle",
              vId
            );
            alert(lang === "id" ? "Berhasil disimpan!" : "Successfully saved!");
          }

          setShowAddSheet(false);
          setEditingRepair(null);
          setPrefillServiceType(undefined);
        }}
      />

      <FuelSheet
        visible={showFuelSheet}
        vehicleId={selectedVehicleId}
        currentOdometer={stats.selectedVehicle?.currentOdometer || 0}
        tankCapacity={stats.selectedVehicle?.tankCapacity}
        editEntry={editingFuel}
        onClose={() => {
          setShowFuelSheet(false);
          setEditingFuel(null);
        }}
        onDelete={(id) => {
          const deletedFuel = stats.vehicleFuelEntries.find((f) => f.id === id);
          setFuelEntries((prev) => prev.filter((f) => f.id !== id));

          if (deletedFuel) {
            addNotification(
              lang === "id" ? "Catatan Bensin Dihapus" : "Fuel Record Deleted",
              `Menghapus data bensin ${deletedFuel.liters}L pada Odo: ${deletedFuel.odometer.toLocaleString(
                "id-ID"
              )} km.`,
              "vehicle",
              selectedVehicleId
            );
          }

          setShowFuelSheet(false);
          setEditingFuel(null);
        }}
        onSave={(entry) => {
          if (editingFuel) {
            setFuelEntries((prev) => prev.map((f) => (f.id === editingFuel.id ? { ...f, ...entry } : f)));

            const oldOdoF = editingFuel.odometer?.toLocaleString("id-ID") || 0;
            const newOdoF = Number(entry.odometer).toLocaleString("id-ID");
            
            addNotification(
              'UPDATE', 
              lang === "id" ? "Catatan Bensin Diperbarui" : "Fuel Record Updated",
              `Update Bensin: Odo ${oldOdoF}km ➔ ${newOdoF}km | Liter: ${editingFuel.liters}L ➔ ${entry.liters}L.`,
              "vehicle",
              selectedVehicleId
            );
          } else {
            handleAddFuel(entry);

            addNotification(
              'ADD',
              lang === "id" ? "Bensin Ditambahkan" : "Fuel Added",
              `Mengisi ${entry.liters}L pada Odo: ${Number(entry.odometer).toLocaleString(
                "id-ID"
              )} km (Rp${Number(entry.totalCost).toLocaleString("id-ID")}).`,
              "vehicle",
              selectedVehicleId
            );
          }
          setShowFuelSheet(false);
          setEditingFuel(null);
        }}
      />

      <VehicleEditModal
        visible={showVehicleModal}
        vehicle={editingVehicle}
        onClose={() => setShowVehicleModal(false)}
        onSave={handleVehicleSave}
        onDelete={handleVehicleDelete}
      />

      <Modal 
        visible={showOdoHistory} 
        transparent 
        animationType="slide" 
        onRequestClose={() => setShowOdoHistory(false)}
       >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" }}>
          <View style={{ height: "70%", backgroundColor: "#0D1B2A", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ color: "#FFF", fontSize: 20, fontWeight: "800" }}>Riwayat Odometer</Text>
              <TouchableOpacity 
                onPress={() => setShowOdoHistory(false)} 
                style={{ backgroundColor: "rgba(255,255,255,0.1)", padding: 10, borderRadius: 15 }}
              >
                <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "bold" }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {[...stats.vehicleRepairs.map(r => ({...r, source: 'Perbaikan', icon: '🛠️'})), ...stats.vehicleFuelEntries.map(f => ({...f, source: 'Bensin', icon: '⛽'}))]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((item, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 15, marginBottom: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, marginRight: 15 }}>{item.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{item.source === 'Perbaikan' ? item.serviceType : `Isi ${item.liters} Liter`}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{new Date(item.date).toLocaleDateString('id-ID')}</Text>
                    </View>
                    <Text style={{ color: '#4ECDC4', fontWeight: '900', fontSize: 16 }}>{item.odometer.toLocaleString('id-ID')} km</Text>
                  </View>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showPlanModal} transparent animationType="none" onRequestClose={() => setShowPlanModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" }}>
          <View
            style={{
              backgroundColor: "#1A2B3C",
              borderRadius: 24,
              padding: 25,
              width: "85%",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "800", marginBottom: 20, textAlign: "center" }}>
              {lang === "id" ? "Tambah Rencana Perawatan" : "Add Maintenance Plan"}
            </Text>

            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 8, fontWeight: "700" }}>
              {lang === "id" ? "NAMA PERBAIKAN" : "SERVICE NAME"}
            </Text>
            <TextInput
              style={{
                backgroundColor: "rgba(0,0,0,0.2)",
                borderRadius: 12,
                padding: 15,
                color: "#FFF",
                marginBottom: 20,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.05)",
              }}
              placeholder="Contoh: Ganti Aki, Radiator..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={planName}
              onChangeText={setPlanName}
            />

            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 8, fontWeight: "700" }}>
              {lang === "id" ? "INTERVAL (SETIAP BERAPA KM?)" : "INTERVAL (KM)"}
            </Text>
            <TextInput
              style={{
                backgroundColor: "rgba(0,0,0,0.2)",
                borderRadius: 12,
                padding: 15,
                color: "#FFF",
                marginBottom: 25,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.05)",
              }}
              placeholder="Contoh: 10000"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="numeric"
              value={planInterval}
              onChangeText={(text) => setPlanInterval(text)}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowPlanModal(false)}
                style={{ flex: 1, paddingVertical: 15, alignItems: "center" }}
              >
                <Text style={{ color: "rgba(255,255,255,0.4)", fontWeight: "700" }}>
                  {lang === "id" ? "Batal" : "Cancel"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveNewPlan}
                style={{
                  flex: 2,
                  backgroundColor: "#4ECDC4",
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#0D1B2A", fontWeight: "800" }}>
                  {lang === "id" ? "Simpan Rencana" : "Save Plan"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showLangModal} transparent animationType="none" onRequestClose={() => setShowLangModal(false)}>
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
                      backgroundColor: lang === l ? "#F5A623" : "rgba(255,255,255,0.03)",
                      borderRadius: 16,
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ fontSize: 22, marginRight: 12 }}>{l === "id" ? "🇮🇩" : "🇬🇧"}</Text>
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

      <Modal visible={showDeleteConfirm} transparent animationType="none" onRequestClose={() => setShowDeleteConfirm(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(7, 18, 28, 0.95)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: "85%",
              backgroundColor: "#162431",
              borderRadius: 32,
              padding: 30,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: "rgba(255,255,255,0.1)",
                borderRadius: 2,
                marginBottom: 25,
              }}
            />

            <Text
              style={{
                color: "#FFF",
                fontSize: 20,
                fontWeight: "800",
                marginBottom: 10,
              }}
            >
              {lang === "id" ? "Hapus Riwayat?" : "Delete History?"}
            </Text>

            <Text
              style={{
                color: "rgba(255,255,255,0.4)",
                textAlign: "center",
                fontSize: 14,
                lineHeight: 22,
                marginBottom: 35,
              }}
            >
              {lang === "id"
                ? "Catatan pemeliharaan ini akan dihapus secara permanen dari riwayat kendaraan Anda."
                : "This maintenance record will be permanently removed from your vehicle history."}
            </Text>

            <View style={{ width: "100%", gap: 12 }}>
              <TouchableOpacity
                onPress={confirmDeleteAction}
                activeOpacity={0.8}
                style={{
                  width: "100%",
                  paddingVertical: 16,
                  borderRadius: 20,
                  backgroundColor: "#FF5252",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 16 }}>
                  {lang === "id" ? "Ya, Hapus Riwayat" : "Yes, Delete History"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(false)}
                activeOpacity={0.6}
                style={{
                  width: "100%",
                  paddingVertical: 16,
                  borderRadius: 20,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontWeight: "700",
                    fontSize: 15,
                  }}
                >
                  {lang === "id" ? "Batal" : "Cancel"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "800" }}>Jejak Kendaraan</Text>
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

            <View
              style={{
                paddingHorizontal: 5,
                paddingVertical: 10,
                backgroundColor: "rgba(0,0,0,0.1)",
                borderRadius: 20,
                marginHorizontal: 10,
              }}
            >
              <MaintenanceCalendar
                repairs={stats.vehicleRepairs}
                fuelEntries={stats.vehicleFuelEntries}
                onDayPress={(day: any) => {
                  setSelectedDate(day.dateString);
                  const repairsOnDate = stats.vehicleRepairs.filter((r) => r.date === day.dateString);
                  const fuelsOnDate = stats.vehicleFuelEntries.filter((f) => {
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

      <NotifCenter
        visible={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        notifications={notifications}
        onMarkAsRead={(id) =>
          setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
        }
        onMarkAllAsRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))}
        onDelete={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
      />
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