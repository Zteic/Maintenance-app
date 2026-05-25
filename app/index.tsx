import React, { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  Animated,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Notifications from "expo-notifications";
import {
  Vehicle,
  RepairEntry,
  Reminder,
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
  loadSelectedVehicleId,
  saveSelectedVehicleId,
  loadFuelEntries,
  saveFuelEntries,
  loadNotifications,
  saveNotifications,
} from "@/utils/storage";
import { usePremium } from '@/context/PremiumContext';
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
import PremiumSection, { AccountStatsGrid } from "@/components/Premium/PremiumSection";
import PremiumPurchaseModal from "@/components/Premium/PremiumPurchaseModal";
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
  const { isPremium } = usePremium();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

  // State Utama
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [repairs, setRepairs] = useState<RepairEntry[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(MOCK_VEHICLES[0].id);
  const params = useLocalSearchParams();
  const activeTab = params.tab?.toString() || "home";
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
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [activePrefillFeature, setActivePrefillFeature] = useState<{name: string, desc: string} | null>(null);

  // 🚀 STATE KHUSUS SMART REMINDER (ADVANCED MODE)
  const [oneTimeReminders, setOneTimeReminders] = useState<any[]>([]);
  const [showSmartReminderModal, setShowSmartReminderModal] = useState(false);
  const [srTitle, setSrTitle] = useState("");
  const [srDate, setSrDate] = useState("");
  const [srTime, setSrTime] = useState("");
  const [srNotes, setSrNotes] = useState("");
  const [srEstCost, setSrEstCost] = useState("");
  const [srType, setSrType] = useState<"one_time" | "repeat">("one_time");
  const [srInterval, setSrInterval] = useState("1_week");
  const [srCustomDays, setSrCustomDays] = useState("");

  // Complete Reminder Sheet State
  const [showCompleteSheet, setShowCompleteSheet] = useState(false);
  const [activeSrItem, setActiveSrItem] = useState<any>(null);
  const [actualCost, setActualCost] = useState("");
  const [resultNotes, setResultNotes] = useState("");

  // Sinkronisasi Otomatis Kata Kunci Pengingat
  const syncUpcomingReminder = useCallback((serviceType: string, currentOdo: number, nextIntervalKm: number) => {
    const inputKey = serviceType.toLowerCase().trim();
    const matchesKeyword = (remType: string) => {
      const remKey = remType.toLowerCase().trim();
      if (remKey === inputKey || inputKey.includes(remKey) || remKey.includes(inputKey)) return true;
      const oilKeywords = ['oli', 'oil', 'lubricant', 'pelumas'];
      if (oilKeywords.some(k => inputKey.includes(k)) && oilKeywords.some(k => remKey.includes(k))) return true;
      const tireKeywords = ['ban', 'tire', 'roda', 'wheel', 'tyre', 'velg'];
      if (tireKeywords.some(k => inputKey.includes(k)) && tireKeywords.some(k => remKey.includes(k))) return true;
      return false;
    };

    setReminders((prev) =>
      prev.map((rem) => {
        if (rem.vehicleId === selectedVehicleId && matchesKeyword(rem.serviceType)) {
          const interval = Number(nextIntervalKm) || rem.intervalKm || 10000;
          return { ...rem, lastServiceOdometer: currentOdo, dueOdometer: currentOdo + interval, intervalKm: interval, status: "safe", lastServiceDate: new Date().toISOString() };
        }
        return rem;
      })
    );
  }, [selectedVehicleId]);

  // State Search & Filter
  const [appMode, setAppMode] = useState<'basic' | 'advance'>('basic');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [hideSearch, setHideSearch] = useState(false);
  const [fuelSearchQuery, setFuelSearchQuery] = useState('');
  const [recentFuelSearches, setRecentFuelSearches] = useState<string[]>([]);
  const [fuelFilter, setFuelFilter] = useState<string>('all');
  const [fuelCustomStart, setFuelCustomStart] = useState('');
  const [fuelCustomEnd, setFuelCustomEnd] = useState('');
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [historyCustomStart, setHistoryCustomStart] = useState('');
  const [historyCustomEnd, setHistoryCustomEnd] = useState('');
  const [appName, setAppName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  // Load Nama Aplikasi & Smart Reminders
  useEffect(() => {
    AsyncStorage.getItem('garasi_hide_search').then(val => { if (val) setHideSearch(val === 'true'); });
    AsyncStorage.getItem('garasi_smart_reminders').then(data => { if (data) setOneTimeReminders(JSON.parse(data)); });
    AsyncStorage.getItem("custom_app_name").then(savedName => { setAppName(savedName || t("appName")); });
  }, []);

  // Save Smart Reminders
  useEffect(() => {
    if (!isFetchingFromServer) {
      AsyncStorage.setItem('garasi_smart_reminders', JSON.stringify(oneTimeReminders));
    }
  }, [oneTimeReminders, isFetchingFromServer]);

  const saveAppName = async () => {
    setIsEditingName(false);
    const finalName = appName.trim() || t("appName");
    setAppName(finalName);
    try { await AsyncStorage.setItem("custom_app_name", finalName); } catch (e) { console.log(e); }
  };

  const toggleSearch = () => {
    const newVal = !hideSearch;
    setHideSearch(newVal);
    AsyncStorage.setItem('garasi_hide_search', newVal ? 'true' : 'false');
  };

  useEffect(() => {
    AsyncStorage.getItem('garasi_app_mode').then(mode => { if (mode) setAppMode(mode as 'basic' | 'advance'); });
    if (activeTab === 'history') {
      AsyncStorage.getItem('garasi_recent_searches').then(recents => { if (recents) setRecentSearches(JSON.parse(recents)); });
    } else if (activeTab === 'fuel') {
      AsyncStorage.getItem('garasi_recent_fuel_searches').then(recents => { if (recents) setRecentFuelSearches(JSON.parse(recents)); });
    } else {
      setSearchQuery(''); setFuelSearchQuery(''); setFuelFilter('all');
    }
  }, [activeTab]);

  const executeSearch = (query: string, type: 'service' | 'fuel') => {
    const q = query.trim();
    if (type === 'service') {
      setSearchQuery(q);
      if (q !== '' && !recentSearches.includes(q)) {
        const newRecents = [q, ...recentSearches].slice(0, 5);
        setRecentSearches(newRecents);
        AsyncStorage.setItem('garasi_recent_searches', JSON.stringify(newRecents));
      }
    } else {
      setFuelSearchQuery(q);
      if (q !== '' && !recentFuelSearches.includes(q)) {
        const newRecents = [q, ...recentFuelSearches].slice(0, 5);
        setRecentFuelSearches(newRecents);
        AsyncStorage.setItem('garasi_recent_fuel_searches', JSON.stringify(newRecents));
      }
    }
  };

  const removeRecentSearch = (kw: string, type: 'service' | 'fuel') => {
    if (type === 'service') {
      const updated = recentSearches.filter(item => item !== kw);
      setRecentSearches(updated);
      AsyncStorage.setItem('garasi_recent_searches', JSON.stringify(updated));
    } else {
      const updated = recentFuelSearches.filter(item => item !== kw);
      setRecentFuelSearches(updated);
      AsyncStorage.setItem('garasi_recent_fuel_searches', JSON.stringify(updated));
    }
  };

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const bellScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    openFuelSheet = () => setShowFuelSheet(true);
    openRepairSheet = () => { setEditingRepair(null); setPrefillServiceType(undefined); setSaveToHistoryOnly(true); setShowAddSheet(true); };
  }, []);

  const stats = React.useMemo(() => {
    const vRepairs = repairs.filter((r) => r.vehicleId === selectedVehicleId);
    const vFuel = fuelEntries.filter((f) => f.vehicleId === selectedVehicleId);
    const allOdometers = [...vRepairs.map(r => r.odometer), ...vFuel.map(f => f.odometer)].filter(odo => !isNaN(odo) && odo > 0);
    const latestOdo = allOdometers.length > 0 ? Math.max(...allOdometers) : 0;

    const vReminders = reminders.filter((r) => r.vehicleId === selectedVehicleId).map((rem) => {
      const distanceLeft = rem.dueOdometer - latestOdo;
      let status: "safe" | "approaching" | "overdue" = "safe";
      if (distanceLeft <= 0) status = "overdue";
      else if (distanceLeft <= 1000) status = "approaching";
      return { ...rem, status };
    });

    const mRepairs = vRepairs.filter((r) => new Date(r.date).getMonth() === now.getMonth() && new Date(r.date).getFullYear() === now.getFullYear());
    const mFuel = vFuel.filter((f) => new Date(f.date).getMonth() === now.getMonth() && new Date(f.date).getFullYear() === now.getFullYear());
    const totalRepairM = mRepairs.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
    const totalFuelM = mFuel.reduce((sum, f) => sum + (Number(f.totalCost) || 0), 0);
    const totalLitersM = mFuel.reduce((sum, f) => sum + (Number(f.liters) || 0), 0);
    const monthlyOdometers = [...mRepairs.map((r) => r.odometer), ...mFuel.map((f) => f.odometer)].filter((o) => o > 0);
    const distanceM = monthlyOdometers.length > 0 ? Math.max(...monthlyOdometers) - Math.min(...monthlyOdometers) : 0;

    return {
      vehicleRepairs: vRepairs, vehicleFuelEntries: vFuel, vehicleReminders: vReminders,
      selectedVehicle: vehicles.find((v) => v.id === selectedVehicleId),
      monthlyCost: totalRepairM + totalFuelM, totalRepairMonthly: totalRepairM, totalFuelMonthly: totalFuelM,
      totalLitersMonthly: totalLitersM, monthlyServicesDone: mRepairs.length, monthlyDistance: distanceM, autoLatestOdometer: latestOdo,
    };
  }, [repairs, fuelEntries, reminders, selectedVehicleId, vehicles]);

  const refreshData = useCallback(async () => {
    try {
      const [sv, sr, srm, ssv, sfe, sn] = await Promise.all([
        loadVehicles(), loadRepairs(), loadReminders(), loadSelectedVehicleId(), loadFuelEntries(), loadNotifications(),
      ]);
      setNotifications(sn || []);
      setVehicles(sv?.length ? sv : MOCK_VEHICLES);
      setRepairs(sr || []);
      setReminders(srm || []);
      setFuelEntries(sfe || []);
      setSelectedVehicleId(ssv || sv?.[0]?.id || MOCK_VEHICLES[0].id);
    } catch (e) { console.error("Gagal load data", e); } finally { setIsFetchingFromServer(false); }
  }, []);

  useFocusEffect(useCallback(() => { refreshData(); }, [refreshData]));

  useEffect(() => { if (!isFetchingFromServer) saveVehicles(vehicles); }, [vehicles, isFetchingFromServer]);
  useEffect(() => { if (!isFetchingFromServer) saveRepairs(repairs); }, [repairs, isFetchingFromServer]);
  useEffect(() => { if (!isFetchingFromServer) saveFuelEntries(fuelEntries); }, [fuelEntries, isFetchingFromServer]);
  useEffect(() => { if (!isFetchingFromServer) saveNotifications(notifications); }, [notifications, isFetchingFromServer]);

  const handleOdometerUpdate = (newValue: number) => {
    setVehicles((prev) => prev.map((v) => v.id === selectedVehicleId ? { ...v, currentOdometer: newValue, lastOdometerUpdate: new Date() } : v));
  };

  const triggerBellAnimation = () => {
    Animated.sequence([
      Animated.timing(bellScale, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.spring(bellScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
  };

  const addNotification = (badge: NotificationItem['badge'], title: string, message: string, type: "system" | "vehicle", vId?: string, oldOdo?: number, newOdo?: number, source?: string) => {
    const vehicleName = vehicles.find(v => v.id === vId)?.name || 'Kendaraan';
    const newNotif: NotificationItem = { id: `notif_${Date.now()}`, badge, title, message, type, vehicleId: vId, vehicleName, oldOdometer: oldOdo, newOdometer: newOdo, source, isRead: false, timestamp: new Date() };
    setNotifications((prev) => [newNotif, ...prev]);
    triggerBellAnimation();
  };

  const evaluateOdometerRollback = (deletedOdo: number, deletedId: string, sourceName: string) => {
    const currentOdo = stats.autoLatestOdometer;
    const remainingRepairs = repairs.filter(r => r.vehicleId === selectedVehicleId && r.id !== deletedId);
    const remainingFuels = fuelEntries.filter(f => f.vehicleId === selectedVehicleId && f.id !== deletedId);
    const allRemainingOdos = [...remainingRepairs.map(r=>r.odometer), ...remainingFuels.map(f=>f.odometer)];
    const newMaxOdo = allRemainingOdos.length > 0 ? Math.max(...allRemainingOdos) : 0;

    if (newMaxOdo < currentOdo) {
      addNotification('ROLLBACK', 'Odometer Rollback', `Odometer dikembalikan ke ${newMaxOdo.toLocaleString('id-ID')} km.`, 'vehicle', selectedVehicleId, currentOdo, newMaxOdo, sourceName);
    }
  };

  const handleEdit = (item: Reminder) => {
    setPrefillServiceType(item.serviceType); setSaveToHistoryOnly(false);
    setEditingRepair({ id: `temp-${Date.now()}`, vehicleId: selectedVehicleId, serviceType: item.serviceType, date: new Date().toISOString().split("T")[0], odometer: stats.autoLatestOdometer || 0, cost: 0, workshop: "", notes: "", nextIntervalKm: item.intervalKm || 10000 });
    setShowAddSheet(true);
  };

  const handleSaveNewPlan = () => {
    if (!planName || !planInterval) return;
    const newPlan: Reminder = { id: `rem-${Date.now()}`, vehicleId: selectedVehicleId, serviceType: planName, intervalKm: Number(planInterval), dueOdometer: stats.autoLatestOdometer + Number(planInterval), lastServiceOdometer: stats.autoLatestOdometer, status: "safe", lastServiceDate: new Date().toISOString() };
    setReminders((prev) => [...prev, newPlan]); setShowPlanModal(false);
    setPlanName(""); setPlanInterval("");
  };

  const handleVehicleSave = (data: any) => {
    if (editingVehicle) {
      setVehicles((prev) => prev.map((v) => v.id === editingVehicle.id ? { ...v, ...data } : v));
    } else {
      const newVehicle = { id: `v${Date.now()}`, ...data, currentOdometer: data.currentOdometer ?? 0, lastOdometerUpdate: new Date() };
      setVehicles((prev) => [...prev, newVehicle]); setSelectedVehicleId(newVehicle.id);
    }
    setShowVehicleModal(false);
  };

  const handleVehicleDelete = (id: string) => {
    if (vehicles.length <= 1) return;
    const newVehicles = vehicles.filter((v) => v.id !== id);
    setVehicles(newVehicles);
    if (selectedVehicleId === id) setSelectedVehicleId(newVehicles[0].id);
    setShowVehicleModal(false);
  };

  const handleDelete = (id: string) => { setItemToDeleteId(id); setShowDeleteConfirm(true); };
  const confirmDeleteAction = () => {
    if (itemToDeleteId) { setReminders((prev) => prev.filter((r) => r.id !== itemToDeleteId)); setShowDeleteConfirm(false); }
  };

  // 🚀 LOGIKA SYSTEM SMART REMINDER REPEAT & SAVE
  const calculateNextSrDate = (currentDateStr: string, interval: string, customDays: string) => {
    const date = new Date(currentDateStr);
    if (interval === "1_week") date.setDate(date.getDate() + 7);
    else if (interval === "2_weeks") date.setDate(date.getDate() + 14);
    else if (interval === "1_month") date.setMonth(date.getMonth() + 1);
    else if (interval === "custom") date.setDate(date.getDate() + (Number(customDays) || 1));
    return date.toISOString().split('T')[0];
  };

  const handleSaveSmartReminder = () => {
    if (!srTitle || !srDate) return;
    const newItem = { id: `sr-${Date.now()}`, vehicleId: selectedVehicleId, title: srTitle, description: srNotes, dueDate: srDate, time: srTime, estimatedCost: srEstCost, reminderType: srType, repeatInterval: srInterval, customDays: srCustomDays };
    setOneTimeReminders(prev => [...prev, newItem]);
    setShowSmartReminderModal(false);
    setSrTitle(""); setSrDate(""); setSrTime(""); setSrNotes(""); setSrEstCost(""); setSrType("one_time");
    addNotification('ADD', 'Smart Reminder', `Agenda "${srTitle}" sukses dijadwalkan!`, 'vehicle', selectedVehicleId);
  };

  const handleTriggerCompleteSheet = (item: any) => {
    setActiveSrItem(item); setActualCost(item.estimatedCost || ""); setResultNotes(""); setShowCompleteSheet(true);
  };

  const handleFinalizeReminder = () => {
    if (!activeSrItem) return;
    const newHistory: RepairEntry = {
      id: `rep-sr-${Date.now()}`, vehicleId: activeSrItem.vehicleId, serviceType: activeSrItem.title,
      date: new Date().toISOString().split("T")[0], odometer: stats.autoLatestOdometer,
      cost: Number(actualCost) || 0, workshop: "Smart Reminder", notes: resultNotes || activeSrItem.description || "", nextIntervalKm: 0,
      isSmartReminder: true, reminderType: activeSrItem.reminderType, estimatedCost: activeSrItem.estimatedCost
    } as any;

    setRepairs(prev => [newHistory, ...prev]);

    if (activeSrItem.reminderType === 'repeat') {
      const nextDate = calculateNextSrDate(activeSrItem.dueDate, activeSrItem.repeatInterval, activeSrItem.customDays);
      setOneTimeReminders(prev => prev.map(r => r.id === activeSrItem.id ? { ...r, dueDate: nextDate } : r));
    } else {
      setOneTimeReminders(prev => prev.filter(r => r.id !== activeSrItem.id));
    }
    setShowCompleteSheet(false); setActiveSrItem(null);
  };

  const handleDeleteSmartReminder = (id: string) => { setOneTimeReminders(prev => prev.filter(r => r.id !== id)); };

  // Engine Smart Filters
  const filteredHistory = stats.vehicleRepairs.filter(r => {
    if (appMode === 'basic') return true;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (r.serviceType || '').toLowerCase().includes(q) || (r.notes || '').toLowerCase().includes(q) || (r.workshop || '').toLowerCase().includes(q);
    }
    const d = new Date(r.date);
    if (historyFilter === 'month' && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
    if (historyFilter === 'year' && d.getFullYear() !== now.getFullYear()) return false;
    if (historyFilter === 'custom') {
      const s = historyCustomStart ? new Date(historyCustomStart) : new Date('1970-01-01');
      const e = historyCustomEnd ? new Date(historyCustomEnd) : new Date('2099-12-31');
      e.setHours(23, 59, 59, 999);
      if (d < s || d > e) return false;
    }
    return true;
  });

  const filteredFuel = stats.vehicleFuelEntries.filter(f => {
    if (appMode === 'basic') return true;
    if (fuelSearchQuery.trim() !== '') {
      const q = fuelSearchQuery.toLowerCase();
      return (f.notes || '').toLowerCase().includes(q) || (f.fuelType || '').toLowerCase().includes(q) || (f.station || '').toLowerCase().includes(q);
    }
    const d = new Date(f.date);
    if (fuelFilter === 'month' && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
    if (fuelFilter === 'year' && d.getFullYear() !== now.getFullYear()) return false;
    if (fuelFilter === 'custom') {
      const s = fuelCustomStart ? new Date(fuelCustomStart) : new Date('1970-01-01');
      const e = fuelCustomEnd ? new Date(fuelCustomEnd) : new Date('2099-12-31');
      e.setHours(23, 59, 59, 999);
      if (d < s || d > e) return false;
    }
    return true;
  });

  const finalFuelData = filteredFuel;
  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={{ flex: 1, backgroundColor: "#0D1B2A" }}>
      <StatusBar barStyle="light-content" />
      
      {/* ==================== HEADER SECTION ==================== */}
      <View style={{ paddingTop: insets.top, backgroundColor: "#0D1B2A" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>            
            <View>
              {isEditingName ? (
                <TextInput value={appName} onChangeText={setAppName} onBlur={saveAppName} onSubmitEditing={saveAppName} autoFocus style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800", padding: 0, borderBottomWidth: 1, borderBottomColor: '#4ECDC4', minWidth: 100 }} />
              ) : (
                <TouchableOpacity activeOpacity={0.7} onPress={() => setIsEditingName(true)} style={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
                  <View style={{ paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center' }}>
                    <Image source={isPremium ? require('../assets/images/Premium-Logo.png') : require('../assets/images/Basic-Logo.png')} style={{ width: 50, height: 26, transform: [{ scale: 3.3 }] }} resizeMode="contain" />
                  </View>
                  <Text style={{ color: "#FFFFFF", fontSize: 22, marginLeft: 10, marginTop: 0, fontFamily: "Windpower" }} className="w-[316px] h-[25px]">{appName}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity onPress={() => setShowNotifModal(true)} activeOpacity={0.7}>
              <Animated.View style={{ backgroundColor: "#1A2B3C", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", position: "relative", transform: [{ scale: bellScale }] }}>
                <Text style={{ fontSize: 18 }}>🔔</Text>
                {unreadNotifsCount > 0 && (
                  <View style={{ position: "absolute", top: -5, right: -5, backgroundColor: "#FF5252", borderRadius: 10, width: 20, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#0D1B2A" }}>
                    <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "bold" }}>{unreadNotifsCount > 9 ? "9+" : unreadNotifsCount}</Text>
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowLangModal(true)} activeOpacity={0.7} style={{ backgroundColor: "#1A2B3C", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}><Text style={{ fontSize: 18 }}>{lang === "id" ? "🇮🇩" : "🇬🇧"}</Text></TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingBottom: 8 }}>
          <VehicleSwitcher vehicles={vehicles} selectedId={selectedVehicleId} onSelect={setSelectedVehicleId} onAddVehicle={() => { setEditingVehicle(null); setShowVehicleModal(true); }} />
        </View>
      </View>

      {/* ==================== BODY CONTENT & RENDERING TAB TEPAT ==================== */}
      <View style={{ flex: 1 }}>
        
        {/* TAB 1: HOME */}
        {activeTab === "home" && (
          <ScrollView overScrollMode="never" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150, paddingTop: 10, gap: 20 }}>
            {stats.selectedVehicle ? (
              <>
                <VehicleProfileCard vehicle={{ ...stats.selectedVehicle, currentOdometer: stats.autoLatestOdometer }} onEditVehicle={() => { setEditingVehicle(stats.selectedVehicle!); setShowVehicleModal(true); }} onOdometerPress={() => setShowOdoHistory(true)} />

                <View style={{ flexDirection: "row", marginHorizontal: 20, gap: 12 }}>
                  <View style={{ flex: 1, backgroundColor: "#1A2B3C", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}>
                    <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: "600" }}>{t("totalSpent")} {lang === "id" ? "BULAN INI" : "THIS MONTH"}</Text>
                    <Text style={{ color: "#F5A623", fontSize: 16, fontWeight: "600", marginTop: 2, marginBottom: 8 }}>
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(stats.monthlyCost)}
                    </Text>
                    <View style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingTop: 8, gap: 4 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: "hsla(0, 0%, 100%, 0.77)", fontSize: 10 }}>⛽ {lang === "id" ? "Total Bensin" : "Total Fuel"}</Text><Text style={{ color: "#F5A623", fontSize: 10, fontWeight: "600" }}>Rp {stats.totalFuelMonthly.toLocaleString("id-ID")}</Text></View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: "hsla(0, 0%, 100%, 0.77)", fontSize: 10 }}>🛠️ {lang === "id" ? "Total Perbaikan" : "Total Repair"}</Text><Text style={{ color: "#F5A623", fontSize: 10, fontWeight: "600" }}>Rp {stats.totalRepairMonthly.toLocaleString("id-ID")}</Text></View>
                    </View>
                    <Text style={{ color: "rgba(255,255,255,0.2)", fontSize: 14, marginTop: 10, fontStyle: "italic" }}>{now.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { month: "long", year: "numeric" })}</Text>
                  </View>

                  <TouchableOpacity onPress={() => setShowCalendarModal(true)} activeOpacity={0.7} style={{ flex: 1, backgroundColor: "#1A2B3C", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "600" }}>{t("servicesDone")}</Text><Text style={{ fontSize: 14 }}>📅</Text></View>
                    <Text style={{ color: "#4ECDC4", fontSize: 16, fontWeight: "800", marginTop: 2 }}>{stats.monthlyServicesDone} <Text style={{ fontSize: 16, fontWeight: "600", marginTop: 2, marginBottom: 8 }}>{t("records")}</Text></Text>
                    <View style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", paddingTop: 8, marginTop: 8, gap: 4 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={{ color: "hsla(0, 0%, 100%, 0.77)", fontSize: 10 }}>⛽ Total Liter</Text><Text style={{ color: "#4ECDC4", fontSize: 10, fontWeight: "700" }}>{stats.totalLitersMonthly.toFixed(1)} L</Text></View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={{ color: "hsla(0, 0%, 100%, 0.77)", fontSize: 10 }}>🛣️ {lang === "id" ? "Jarak" : "Distance"}</Text><Text style={{ color: "#4ECDC4", fontSize: 10, fontWeight: "700" }}>+{stats.monthlyDistance.toLocaleString("id-ID")} km</Text></View>
                    </View>
                    <Text style={{ color: "rgba(255,255,255,0.2)", fontSize: 14, marginTop: 10 }}>{now.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { month: "long", year: "numeric" })}</Text>
                  </TouchableOpacity>
                </View>

                <MaintenanceStatusBar reminders={stats.vehicleReminders} currentOdometer={stats.autoLatestOdometer} accentColor={stats.selectedVehicle?.color} />
                
                <UpcomingReminders
                  reminders={stats.vehicleReminders}
                  currentOdometer={stats.autoLatestOdometer}
                  vehicle={stats.selectedVehicle}
                  isAdvancedMode={isPremium || appMode === 'advance'}
                  oneTimeReminders={oneTimeReminders.filter(r => r.vehicleId === selectedVehicleId)}
                  onAddOneTimeReminder={() => setShowSmartReminderModal(true)}
                  onMarkOneTimeDone={handleTriggerCompleteSheet}
                  onDeleteOneTimeReminder={handleDeleteSmartReminder}
                  onAddReminder={() => setShowPlanModal(true)}
                  onEditReminder={handleEdit}
                  onDeleteReminder={handleDelete}
                  onEditVehicle={() => { setEditingVehicle(stats.selectedVehicle!); setShowVehicleModal(true); }} />
              </>
            ) : null}
          </ScrollView>
        )}

        {/* TAB 2: HISTORY */}
        {activeTab === "history" && (
          <View style={{ flex: 1 }}>
            {appMode === 'advance' && !hideSearch && (
              <View style={{ marginHorizontal: 20, marginBottom: 15, marginTop: 5 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                  {[{ id: 'all', label: 'Semua' }, { id: 'month', label: 'Bulan Ini' }, { id: 'year', label: 'Tahun Ini' }, { id: 'custom', label: 'Custom Date' }].map(f => (
                    <TouchableOpacity key={f.id} activeOpacity={0.9} onPress={() => setHistoryFilter(f.id)} style={{ backgroundColor: historyFilter === f.id ? '#4ECDC4' : 'rgba(255,255,255,0.05)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 }}>
                      <Text style={{ color: historyFilter === f.id ? '#0D1B2A' : 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700' }}>{f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {historyFilter === 'custom' && (
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    <View style={{ flex: 1 }}><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 5, fontWeight: '800' }}>DARI TANGGAL</Text><TextInput style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: '#FFF', padding: 12, borderRadius: 10, fontSize: 12, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.2)" value={historyCustomStart} onChangeText={setHistoryCustomStart} /></View>
                    <View style={{ flex: 1 }}><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 5, fontWeight: '800' }}>SAMPAI TANGGAL</Text><TextInput style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: '#FFF', padding: 12, borderRadius: 10, fontSize: 12, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.2)" value={historyCustomEnd} onChangeText={setHistoryCustomEnd} /></View>
                  </View>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A2B3C', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: searchQuery ? '#F5A623' : 'rgba(255,255,255,0.1)' }}>
                  <Text style={{ fontSize: 16, marginRight: 10, opacity: 0.5 }}>🔍</Text>
                  <TextInput style={{ flex: 1, color: '#FFF', paddingVertical: 12, fontSize: 13 }} placeholder={lang === 'id' ? "Cari oli, ban, bengkel..." : "Search oil, tire, workshop..."} placeholderTextColor="rgba(255,255,255,0.3)" value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={() => executeSearch(searchQuery, 'service')} />
                  {searchQuery !== '' && <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 5 }}><Text style={{ color: '#FF5252', fontWeight: 'bold' }}>✕</Text></TouchableOpacity>}
                </View>

                {searchQuery === '' && recentSearches.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700' }}>Pencarian Terakhir</Text><TouchableOpacity onPress={() => { setRecentSearches([]); AsyncStorage.removeItem('garasi_recent_searches'); }}><Text style={{ color: '#FF5252', fontSize: 11, fontWeight: '700' }}>Bersihkan</Text></TouchableOpacity></View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {recentSearches.map((kw, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingLeft: 12 }}><TouchableOpacity onPress={() => executeSearch(kw, 'service')} style={{ paddingVertical: 8, paddingRight: 8 }}><Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>🕒 {kw}</Text></TouchableOpacity><TouchableOpacity onPress={() => removeRecentSearch(kw, 'service')} style={{ padding: 8, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.05)' }}><Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>✕</Text></TouchableOpacity></View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            <View style={{ flex: 1 }}>
              <RepairHistory
                repairs={filteredHistory}
                appMode={appMode}
                hideSearch={hideSearch}
                onToggleSearch={toggleSearch}
                onEdit={(r) => { setEditingRepair(r); setSaveToHistoryOnly(true); setShowAddSheet(true); }}
                onDelete={(id) => {
                  const deletedItem = repairs.find((r) => r.id === id);
                  setRepairs((prev) => prev.filter((r) => r.id !== id));
                  if (deletedItem) {
                    addNotification('DELETE', "Riwayat Dihapus", `Menghapus riwayat [${deletedItem.serviceType}].`, "vehicle", selectedVehicleId);
                    evaluateOdometerRollback(deletedItem.odometer, id, 'Perbaikan Kendaraan');
                  }
                }} />
            </View>
          </View>
        )}

        {/* TAB 3: FUEL */}
        {activeTab === "fuel" && (
          <View style={{ flex: 1 }}>
            {appMode === 'advance' && !hideSearch && (
              <View style={{ marginHorizontal: 20, marginBottom: 15, marginTop: 5 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                  {[{ id: 'all', label: 'Semua' }, { id: 'month', label: 'Bulan Ini' }, { id: 'year', label: 'Tahun Ini' }, { id: 'custom', label: 'Custom Date' }].map(f => (
                    <TouchableOpacity key={f.id} activeOpacity={0.9} onPress={() => setFuelFilter(f.id)} style={{ backgroundColor: fuelFilter === f.id ? '#4ECDC4' : 'rgba(255,255,255,0.05)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 }}>
                      <Text style={{ color: fuelFilter === f.id ? '#0D1B2A' : 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700' }}>{f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {fuelFilter === 'custom' && (
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    <View style={{ flex: 1 }}><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 5, fontWeight: '800' }}>DARI TANGGAL</Text><TextInput style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: '#FFF', padding: 12, borderRadius: 10, fontSize: 12, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.2)" value={fuelCustomStart} onChangeText={setFuelCustomStart} /></View>
                    <View style={{ flex: 1 }}><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 5, fontWeight: '800' }}>SAMPAI TANGGAL</Text><TextInput style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: '#FFF', padding: 12, borderRadius: 10, fontSize: 12, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.2)" value={fuelCustomEnd} onChangeText={setFuelCustomEnd} /></View>
                  </View>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A2B3C', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: fuelSearchQuery ? '#F5A623' : 'rgba(255,255,255,0.1)' }}>
                  <Text style={{ fontSize: 16, marginRight: 10, opacity: 0.5 }}>🔍</Text>
                  <TextInput style={{ flex: 1, color: '#FFF', paddingVertical: 12, fontSize: 13 }} placeholder="Cari Pertamax, Shell, atau SPBU..." placeholderTextColor="rgba(255,255,255,0.3)" value={fuelSearchQuery} onChangeText={setFuelSearchQuery} onSubmitEditing={() => executeSearch(fuelSearchQuery, 'fuel')} />
                  {fuelSearchQuery !== '' && <TouchableOpacity onPress={() => setFuelSearchQuery('')} style={{ padding: 5 }}><Text style={{ color: '#FF5252', fontWeight: 'bold' }}>✕</Text></TouchableOpacity>}
                </View>

                {fuelSearchQuery === '' && recentFuelSearches.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {recentFuelSearches.map((kw, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingLeft: 12 }}><TouchableOpacity onPress={() => executeSearch(kw, 'fuel')} style={{ paddingVertical: 8, paddingRight: 8 }}><Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>🕒 {kw}</Text></TouchableOpacity><TouchableOpacity onPress={() => removeRecentSearch(kw, 'fuel')} style={{ padding: 8, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.05)' }}><Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>✕</Text></TouchableOpacity></View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            <View style={{ flex: 1 }}>
              <FuelLog
                fuelEntries={finalFuelData} vehicle={stats.selectedVehicle} appMode={appMode} hideSearch={hideSearch} onToggleSearch={toggleSearch}
                onAdd={() => { setEditingFuel(null); setShowFuelSheet(true); }}
                onEdit={(entry) => { setEditingFuel(entry); setShowFuelSheet(true); }}
                onDelete={(id) => {
                  const deletedFuel = fuelEntries.find((f) => f.id === id);
                  setFuelEntries((prev) => prev.filter((f) => f.id !== id));
                  if (deletedFuel) {
                    addNotification('DELETE', "Catatan Bensin Dihapus", `Menghapus data bensin ${deletedFuel.liters}L.`, "vehicle", selectedVehicleId);
                    evaluateOdometerRollback(deletedFuel.odometer, id, 'Pengisian Bensin');
                  }
                  setShowFuelSheet(false); setEditingFuel(null);
                }} />
            </View>
          </View>
        )}

        {/* TAB 4: PROFILE */}
        {activeTab === "profile" && (
          <ScrollView overScrollMode="never" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150, paddingTop: 10, paddingHorizontal: 20, gap: 15 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginTop: 10, marginBottom: 5 }}>{lang === 'id' ? 'Profil Saya' : 'My Profile'}</Text>
            <AccountStatsGrid />
            <PremiumSection onOpenPremiumPage={() => { setActivePrefillFeature(null); setPremiumModalVisible(true); }} />
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800', marginTop: 15, letterSpacing: 0.5 }}>EKSKLUSIF PREMIUM FEATURES</Text>
            
            <TouchableOpacity activeOpacity={0.8} style={{ backgroundColor: '#1A2B3C', padding: 16, borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={{ fontSize: 18 }}>📈</Text><View><Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Advanced Fuel Analytics</Text><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>Grafik efisiensi BBM mendalam</Text></View></View>
              <Text style={{ color: '#F5A623', fontSize: 10, fontWeight: '900', backgroundColor: 'rgba(245,166,35,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>🔒 PRO</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} style={{ backgroundColor: '#1A2B3C', padding: 16, borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={{ fontSize: 18 }}>📄</Text><View><Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>Export PDF Laporan</Text><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>Cetak berkas laporan tanpa watermark</Text></View></View>
              <Text style={{ color: '#F5A623', fontSize: 10, fontWeight: '900', backgroundColor: 'rgba(245,166,35,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>🔒 PRO</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* ==================== MODALS SECTION (LENGKAP SEMUA MODAL ASLI + MODAL BARU) ==================== */}
      <AddRepairSheet
        visible={showAddSheet}
        vehicleId={selectedVehicleId}
        currentOdometer={stats.autoLatestOdometer > 0 ? stats.autoLatestOdometer : (stats.selectedVehicle?.currentOdometer || 0)}
        vehicleType={stats.selectedVehicle?.vehicleType}
        prefillServiceType={prefillServiceType}
        editEntry={editingRepair}
        isHistoryMode={saveToHistoryOnly}
        isServiceTypeLocked={!saveToHistoryOnly}
        onClose={() => { setShowAddSheet(false); setEditingRepair(null); }}
        onSave={(formData) => {
          const vId = selectedVehicleId;
          const isEdit = editingRepair && editingRepair.id && !editingRepair.id.includes("temp");
          if (isEdit) {
            setRepairs((prev) => prev.map((r) => r.id === editingRepair.id ? { ...r, ...formData, vehicleId: vId } : r));
            syncUpcomingReminder(formData.serviceType, Number(formData.odometer), Number(formData.nextIntervalKm));
            alert(lang === "id" ? "Data berhasil diperbarui!" : "Data updated successfully!");
          } else {
            setRepairs((prev) => [{ ...formData, id: `rep${Date.now()}`, vehicleId: vId, date: formData.date || new Date().toISOString().split("T")[0] }, ...prev]);
            if (!saveToHistoryOnly) syncUpcomingReminder(formData.serviceType, Number(formData.odometer), Number(formData.nextIntervalKm));
            alert(lang === "id" ? "Berhasil disimpan!" : "Successfully saved!");
          }
          setShowAddSheet(false); setEditingRepair(null); setPrefillServiceType(undefined);
        }} />

      <FuelSheet
        visible={showFuelSheet}
        vehicleId={selectedVehicleId}
        currentOdometer={stats.autoLatestOdometer > 0 ? stats.autoLatestOdometer : (stats.selectedVehicle?.currentOdometer || 0)}
        tankCapacity={stats.selectedVehicle?.tankCapacity}
        editEntry={editingFuel}
        onClose={() => { setShowFuelSheet(false); setEditingFuel(null); }}
        onSave={(entry) => {
          if (editingFuel) {
            setFuelEntries((prev) => prev.map((f) => f.id === editingFuel.id ? { ...f, ...entry } : f));
          } else {
            setFuelEntries((prev) => [{ ...entry, id: `fe${Date.now()}` }, ...prev]);
          }
          setShowFuelSheet(false); setEditingFuel(null);
        }} />

      <VehicleEditModal visible={showVehicleModal} vehicle={editingVehicle} onClose={() => setShowVehicleModal(false)} onSave={handleVehicleSave} onDelete={handleVehicleDelete} />

      <Modal visible={showOdoHistory} transparent animationType="slide" onRequestClose={() => setShowOdoHistory(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" }}>
          <View style={{ height: "70%", backgroundColor: "#0D1B2A", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ color: "#FFF", fontSize: 20, fontWeight: "800" }}>Riwayat Odometer</Text>
              <TouchableOpacity onPress={() => setShowOdoHistory(false)} style={{ backgroundColor: "rgba(255,255,255,0.1)", padding: 10, borderRadius: 15 }}><Text style={{ color: "#FFF", fontSize: 14, fontWeight: "bold" }}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView>
              {[...repairs.map(r => ({...r, source: 'Perbaikan', icon: '🛠️'})), ...fuelEntries.map(f => ({...f, source: 'Bensin', icon: '⛽'}))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item: any, idx) => (
                <View key={idx} style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 15, marginBottom: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, marginRight: 15 }}>{item.icon}</Text>
                  <View style={{ flex: 1 }}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>{item.source === 'Perbaikan' ? item.serviceType : `Isi ${item.liters} Liter`}</Text><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{new Date(item.date).toLocaleDateString('id-ID')}</Text></View>
                  <Text style={{ color: '#4ECDC4', fontWeight: '900', fontSize: 16 }}>{item.odometer.toLocaleString('id-ID')} km</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showPlanModal} transparent animationType="none" onRequestClose={() => setShowPlanModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ backgroundColor: "#1A2B3C", borderRadius: 24, padding: 25, width: "85%", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
            <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "800", marginBottom: 20, textAlign: "center" }}>{lang === "id" ? "Tambah Rencana Perawatan" : "Add Maintenance Plan"}</Text>
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 8, fontWeight: "700" }}>{lang === "id" ? "NAMA PERBAIKAN" : "SERVICE NAME"}</Text>
            <TextInput style={{ backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 15, color: "#FFF", marginBottom: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }} placeholder="Contoh: Ganti Aki..." value={planName} onChangeText={setPlanName} />
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 8, fontWeight: "700" }}>{lang === "id" ? "INTERVAL (KM)" : "INTERVAL (KM)"}</Text>
            <TextInput style={{ backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 15, color: "#FFF", marginBottom: 25, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }} placeholder="Contoh: 10000" keyboardType="numeric" value={planInterval} onChangeText={setPlanInterval} />
            <View style={{ flexDirection: "row", gap: 12 }}><TouchableOpacity onPress={() => setShowPlanModal(false)} style={{ flex: 1, paddingVertical: 15, alignItems: "center" }}><Text style={{ color: "rgba(255,255,255,0.4)", fontWeight: "700" }}>Batal</Text></TouchableOpacity><TouchableOpacity onPress={handleSaveNewPlan} style={{ flex: 2, backgroundColor: "#4ECDC4", borderRadius: 14, paddingVertical: 15, alignItems: "center" }}><Text style={{ color: "#0D1B2A", fontWeight: "800" }}>Simpan Rencana</Text></TouchableOpacity></View>
          </View>
        </View>
      </Modal>

      <Modal visible={showLangModal} transparent animationType="none" onRequestClose={() => setShowLangModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowLangModal(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center" }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: "#1A2B3C", borderRadius: 28, padding: 24, width: "85%", maxWidth: 320, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                <Text style={{ color: "#FFF", fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 24 }}>{lang === "id" ? "Pilih Bahasa" : "Select Language"}</Text>
                {(["id", "en"] as const).map((l) => (
                  <TouchableOpacity key={l} onPress={() => { setLang(l); setShowLangModal(false); }} style={{ paddingVertical: 18, flexDirection: "row", justifyContent: "center", alignItems: "center", backgroundColor: lang === l ? "#F5A623" : "rgba(255,255,255,0.03)", borderRadius: 16, marginBottom: 12 }}><Text style={{ fontSize: 22, marginRight: 12 }}>{l === "id" ? "🇮🇩" : "🇬🇧"}</Text><Text style={{ color: lang === l ? "#0D1B2A" : "#FFFFFF", fontSize: 16, fontWeight: "800" }}>{l === "id" ? "Indonesia" : "English"}</Text></TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={showDeleteConfirm} transparent animationType="none" onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(7, 18, 28, 0.95)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ width: "85%", backgroundColor: "#162431", borderRadius: 32, padding: 30, alignItems: "center" }}>
            <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 25 }} />
            <Text style={{ color: "#FFF", fontSize: 20, fontWeight: "800", marginBottom: 10 }}>{lang === "id" ? "Hapus Riwayat?" : "Delete History?"}</Text>
            <View style={{ width: "100%", gap: 12 }}><TouchableOpacity onPress={confirmDeleteAction} style={{ width: "100%", paddingVertical: 16, borderRadius: 20, backgroundColor: "#FF5252", alignItems: "center" }}><Text style={{ color: "#FFF", fontWeight: "800", fontSize: 16 }}>Ya, Hapus</Text></TouchableOpacity><TouchableOpacity onPress={() => setShowDeleteConfirm(false)} style={{ width: "100%", paddingVertical: 16, borderRadius: 20, alignItems: "center" }}><Text style={{ color: "rgba(255,255,255,0.4)", fontWeight: "700" }}>Batal</Text></TouchableOpacity></View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCalendarModal} transparent animationType="slide" onRequestClose={() => setShowCalendarModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center" }}>
          <View style={{ margin: 20, height: "85%", backgroundColor: "#1A2B3C", borderRadius: 25, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 20, alignItems: "center", backgroundColor: "rgba(255,255,255,0.02)", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" }}><Text style={{ color: "#FFF", fontSize: 18, fontWeight: "800" }}>Jejak Kendaraan</Text><TouchableOpacity onPress={() => setShowCalendarModal(false)}><View style={{ backgroundColor: "rgba(255,82,82,0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}><Text style={{ color: "#FF5252", fontWeight: "800", fontSize: 12 }}>TUTUP</Text></View></TouchableOpacity></View>
            <View style={{ flex: 1, paddingHorizontal: 5, paddingVertical: 10, backgroundColor: "rgba(0,0,0,0.1)", borderRadius: 20, marginHorizontal: 10, marginBottom: 15, overflow: 'hidden' }}>
              <MaintenanceCalendar repairs={repairs} fuelEntries={fuelEntries} onDayPress={(day: any) => { setSelectedDate(day.dateString); }} />
            </View>
          </View>
        </View>
      </Modal>

      <NotifCenter visible={showNotifModal} onClose={() => setShowNotifModal(false)} notifications={notifications} onMarkAsRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? {...n, isRead: true} : n))} onMarkAllAsRead={() => setNotifications(prev => prev.map(n => ({...n, isRead: true})))} onDelete={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />
      <PremiumPurchaseModal visible={premiumModalVisible} prefillFeature={activePrefillFeature} onClose={() => { setPremiumModalVisible(false); setActivePrefillFeature(null); }} />

      {/* 🚀 MODAL BARU 1: INPUT SMART REMINDER FORM (Khusus Advanced) */}
      <Modal visible={showSmartReminderModal} transparent animationType="slide" onRequestClose={() => setShowSmartReminderModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#1A2B3C", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <View><Text style={{ color: "#FFF", fontSize: 18, fontWeight: "800" }}>🔧 Smart Vehicle To-Do List</Text><Text style={{ color: "#A864FD", fontSize: 11, fontWeight: "600", marginTop: 2 }}>Advanced Mode Only</Text></View>
              <TouchableOpacity onPress={() => setShowSmartReminderModal(false)} style={{ backgroundColor: "rgba(255,255,255,0.1)", padding: 8, borderRadius: 12 }}><Text style={{ color: "#FFF", fontSize: 12 }}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 30 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <div style={{ flex: 1 }}><Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "700", marginBottom: 6 }}>JUDUL REMINDER *</Text><TextInput style={{ backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 12, color: "#FFF", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }} placeholder="Cuci mobil, poles..." value={srTitle} onChangeText={setSrTitle} /></div>
                <div style={{ flex: 1 }}><Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "700", marginBottom: 6 }}>TANGGAL *</Text><TextInput style={{ backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 12, color: "#FFF", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }} placeholder="YYYY-MM-DD" value={srDate} onChangeText={setSrDate} /></div>
              </View>
              <View>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "700", marginBottom: 8 }}>REMINDER TYPE</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={() => setSrType("one_time")} style={{ flex: 1, backgroundColor: srType === 'one_time' ? '#A864FD' : 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 10, alignItems: 'center' }}><Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>One Time</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setSrType("repeat")} style={{ flex: 1, backgroundColor: srType === 'repeat' ? '#4ECDC4' : 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 10, alignItems: 'center' }}><Text style={{ color: srType === 'repeat' ? '#0D1B2A' : '#FFF', fontWeight: '700', fontSize: 12 }}>Repeat</Text></TouchableOpacity>
                </View>
              </View>
              {srType === "repeat" && (
                <View style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: 12, borderRadius: 12, gap: 8 }}>
                  <Text style={{ color: '#4ECDC4', fontSize: 10, fontWeight: '800' }}>INTERVAL PENGULANGAN:</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {[['1_week', '1 Minggu'], ['2_weeks', '2 Minggu'], ['1_month', '1 Bulan'], ['custom', 'Custom']].map(([val, lbl]) => (
                      <TouchableOpacity key={val} onPress={() => setSrInterval(val)} style={{ backgroundColor: srInterval === val ? 'rgba(78,205,196,0.2)' : 'rgba(255,255,255,0.03)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: srInterval === val ? '#4ECDC4' : 'transparent' }}><Text style={{ color: srInterval === val ? '#4ECDC4' : '#FFF', fontSize: 11 }}>{lbl}</Text></TouchableOpacity>
                    ))}
                  </View>
                  {srInterval === 'custom' && <TextInput style={{ backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 8, padding: 10, color: "#FFF", marginTop: 5, fontSize: 12 }} placeholder="Hari sekali? (Contoh: 10)" keyboardType="numeric" value={srCustomDays} onChangeText={setSrCustomDays} />}
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <div style={{ flex: 1 }}><Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "700", marginBottom: 6 }}>JAM (OPSIONAL)</Text><TextInput style={{ backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 12, color: "#FFF", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }} placeholder="09:00" value={srTime} onChangeText={setSrTime} /></div>
                <div style={{ flex: 1 }}><Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "700", marginBottom: 6 }}>ESTIMASI BIAYA</Text><TextInput style={{ backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 12, color: "#FFF", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }} placeholder="Rp 0" keyboardType="numeric" value={srEstCost} onChangeText={setSrEstCost} /></div>
              </View>
              <View><Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "700", marginBottom: 6 }}>CATATAN</Text><TextInput style={{ backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 12, color: "#FFF", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", minHeight: 60 }} placeholder="Catatan opsional..." multiline textAlignVertical="top" value={srNotes} onChangeText={setSrNotes} /></View>
              <TouchableOpacity onPress={handleSaveSmartReminder} activeOpacity={0.8} style={{ backgroundColor: "#A864FD", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}><Text style={{ color: "#FFF", fontWeight: "900" }}>BUAT SMART REMINDER 🚀</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 🚀 MODAL BARU 2: COMPLETE REMINDER SHEET */}
      <Modal visible={showCompleteSheet} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#162431", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 }}>
            <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "800", marginBottom: 4 }}>🏁 Selesaikan Aktivitas</Text>
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 20 }}>Konfirmasi pengerjaan untuk disimpan ke riwayat aktivitas</Text>
            <View style={{ gap: 15, marginBottom: 25 }}>
              <View><Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "700", marginBottom: 6 }}>BIAYA AKTUAL (OPSIONAL)</Text><TextInput style={{ backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 12, color: "#FFF", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" }} placeholder="Rp 0" keyboardType="numeric" value={actualCost} onChangeText={setActualCost} /></View>
              <View><Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "700", marginBottom: 6 }}>DOKUMENTASI HASIL (OPSIONAL)</Text><TextInput style={{ backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 12, color: "#FFF", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", minHeight: 70 }} placeholder="Selesai dicuci, kinclong..." multiline textAlignVertical="top" value={resultNotes} onChangeText={setResultNotes} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}><TouchableOpacity onPress={() => setShowCompleteSheet(false)} style={{ flex: 1, paddingVertical: 14, alignItems: "center" }}><Text style={{ color: "rgba(255,255,255,0.4)", fontWeight: "700" }}>Batal</Text></TouchableOpacity><TouchableOpacity onPress={handleFinalizeReminder} style={{ flex: 2, backgroundColor: "#4ECDC4", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}><Text style={{ color: "#0D1B2A", fontWeight: "900" }}>SIMPAN KE HISTORY</Text></TouchableOpacity></View>
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