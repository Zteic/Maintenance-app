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
  Image,
} from "react-native";
import { useRouter } from "expo-router";
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
  loadUserProfile,
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
import NotifCenter from "@/components/maintenance/NotifCenter";

type TabType = "home" | "history" | "fuel";

// Setup notifications handlerr
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function requestNotifPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

function AppContent() {
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();

  const [vehicles, setVehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
  const [repairs, setRepairs] = useState<RepairEntry[]>(MOCK_REPAIRS);
  const [reminders, setReminders] = useState<Reminder[]>(MOCK_REMINDERS);
  const [tireLogs, setTireLogs] = useState<TireLog[]>([]);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | undefined>();
  const [selectedVehicleId, setSelectedVehicleId] = useState(
    MOCK_VEHICLES[0].id,
  );
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingRepair, setEditingRepair] = useState<RepairEntry | null>(null);
  const [prefillServiceType, setPrefillServiceType] = useState<
    string | undefined
  >();
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showFuelSheet, setShowFuelSheet] = useState(false);
  const [showNotifCenter, setShowNotifCenter] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Tab animation
  const tabAnim = useRef(new Animated.Value(0)).current;

  const animateTab = () => {
    tabAnim.setValue(0);
    Animated.spring(tabAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  };

  const handleTabChange = (tab: TabType) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      animateTab();
    }
  };

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
  const vehicleTireLogs = tireLogs.filter(
    (t) => t.vehicleId === selectedVehicleId,
  );
  const totalCost = vehicleRepairs.reduce((sum, r) => sum + r.cost, 0);

  // Monthly stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthlyRepairs = vehicleRepairs.filter(
    (r) => r.date >= monthStart && r.date <= monthEnd,
  );
  const monthlyCost = monthlyRepairs.reduce((sum, r) => sum + r.cost, 0);
  const monthlyCount = monthlyRepairs.length;

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  // Load from AsyncStorage
  useEffect(() => {
    (async () => {
      const [sv, sr, srm, stl, ssv, sfe, sn, sp] = await Promise.all([
        loadVehicles(),
        loadRepairs(),
        loadReminders(),
        loadTireLogs(),
        loadSelectedVehicleId(),
        loadFuelEntries(),
        loadNotifications(),
        loadUserProfile(),
      ]);
      if (sv) setVehicles(sv);
      if (sr) setRepairs(sr);
      if (srm) setReminders(srm);
      if (stl) setTireLogs(stl);
      if (ssv) setSelectedVehicleId(ssv);
      if (sfe) setFuelEntries(sfe);
      if (sn) setNotifications(sn);
      if (sp?.photoUri) setProfilePhotoUri(sp.photoUri);
      setDataLoaded(true);
    })();
    requestNotifPermission();
  }, []);

  // Persist
  useEffect(() => {
    if (dataLoaded) saveVehicles(vehicles);
  }, [vehicles, dataLoaded]);
  useEffect(() => {
    if (dataLoaded) saveRepairs(repairs);
  }, [repairs, dataLoaded]);
  useEffect(() => {
    if (dataLoaded) saveReminders(reminders);
  }, [reminders, dataLoaded]);
  useEffect(() => {
    if (dataLoaded) saveTireLogs(tireLogs);
  }, [tireLogs, dataLoaded]);
  useEffect(() => {
    if (dataLoaded) saveSelectedVehicleId(selectedVehicleId);
  }, [selectedVehicleId, dataLoaded]);
  useEffect(() => {
    if (dataLoaded) saveFuelEntries(fuelEntries);
  }, [fuelEntries, dataLoaded]);
  useEffect(() => {
    if (dataLoaded) saveNotifications(notifications);
  }, [notifications, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded || !selectedVehicle) return;
    scheduleOdometerNotif(selectedVehicle, lang, t, addNotification);
  }, [selectedVehicle, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded || !selectedVehicle) return;
    scheduleDocNotifs(selectedVehicle, lang, t, addNotification);
  }, [selectedVehicle, dataLoaded]);

  const addNotification = (title: string, body: string) => {
    const newNotif: NotificationItem = {
      id: `n${Date.now()}`,
      title,
      body,
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
  };

  const handleOdometerUpdate = (newValue: number) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === selectedVehicleId
          ? { ...v, currentOdometer: newValue, lastOdometerUpdate: new Date() }
          : v,
      ),
    );
    setReminders((prev) =>
      prev.map((r) => {
        if (r.vehicleId !== selectedVehicleId) return r;
        const kmRemaining = r.dueOdometer - newValue;
        const thresholdKm = r.intervalKm * 0.15;
        let status: Reminder["status"] = "safe";
        if (kmRemaining <= 0) status = "overdue";
        else if (kmRemaining <= thresholdKm) status = "approaching";
        return { ...r, status };
      }),
    );
  };

  const handleAddRepair = (entry: Omit<RepairEntry, "id">) => {
    const newRepair: RepairEntry = { ...entry, id: `r${Date.now()}` };
    setRepairs((prev) => [...prev, newRepair]);
    const nextOdometer = entry.odometer + entry.nextIntervalKm;
    const newReminder: Reminder = {
      id: `rem${Date.now()}`,
      vehicleId: entry.vehicleId,
      serviceType: entry.serviceType,
      dueDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      dueOdometer: nextOdometer,
      status:
        nextOdometer - selectedVehicle.currentOdometer <= 0
          ? "overdue"
          : "safe",
      intervalKm: entry.nextIntervalKm,
      lastServiceOdometer: entry.odometer,
    };
    setReminders((prev) => {
      const filtered = prev.filter(
        (r) =>
          !(
            r.vehicleId === entry.vehicleId &&
            r.serviceType === entry.serviceType
          ),
      );
      return [...filtered, newReminder];
    });
  };

  const handleUpdateRepair = (id: string, entry: Omit<RepairEntry, "id">) => {
    setRepairs((prev) => prev.map((r) => (r.id === id ? { ...entry, id } : r)));
  };

  const handleDeleteRepair = (id: string) => {
    setRepairs((prev) => prev.filter((r) => r.id !== id));
  };

  const handleEditRepair = (entry: RepairEntry) => {
    setEditingRepair(entry);
    setPrefillServiceType(undefined);
    setShowAddSheet(true);
  };

  const handleRecommendationTap = (serviceType: string) => {
    setPrefillServiceType(serviceType);
    setEditingRepair(null);
    setShowAddSheet(true);
  };

  const handleAddTireLog = (log: Omit<TireLog, "id">) => {
    const newLog = { ...log, id: `tl${Date.now()}` };
    setTireLogs((prev) => [...prev, newLog]);
  };

  const handleVehicleSave = (
    data: Omit<Vehicle, "id" | "currentOdometer" | "lastOdometerUpdate"> & {
      currentOdometer?: number;
    },
  ) => {
    if (editingVehicle) {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === editingVehicle.id
            ? { ...v, ...data, currentOdometer: v.currentOdometer }
            : v,
        ),
      );
    } else {
      const newVehicle: Vehicle = {
        id: `v${Date.now()}`,
        ...data,
        currentOdometer: data.currentOdometer ?? 0,
        lastOdometerUpdate: new Date(),
      };
      setVehicles((prev) => [...prev, newVehicle]);
      setSelectedVehicleId(newVehicle.id);
    }
    setEditingVehicle(null);
  };

  const handleAddFuel = (entry: Omit<FuelEntry, "id">) => {
    setFuelEntries((prev) => [...prev, { ...entry, id: `fe${Date.now()}` }]);
  };

  const openEditVehicle = () => {
    setEditingVehicle(selectedVehicle);
    setShowVehicleModal(true);
  };
  const openAddVehicle = () => {
    setEditingVehicle(null);
    setShowVehicleModal(true);
  };

  const tabTranslateY = tabAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [8, -4, 0],
  });
  const tabOpacity = tabAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.6, 1, 1],
  });

  const TABS: { key: TabType; icon: string; label: () => string }[] = [
    { key: "home", icon: "🏠", label: () => t("overview") },
    { key: "fuel", icon: "⛽", label: () => (lang === "id" ? "BBM" : "Fuel") },
    { key: "history", icon: "🔧", label: () => t("history") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#0D1B2A" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              activeOpacity={0.7}
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
                  letterSpacing: 2,
                  fontWeight: "600",
                }}
              >
                {t("appTagline")}
              </Text>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 22,
                  fontWeight: "800",
                  letterSpacing: 0.5,
                }}
              >
                {t("appName")}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowLangModal(true)}
              style={{
                backgroundColor: "#1A2B3C",
                borderRadius: 12,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 14 }}>
                {lang === "id" ? "🇮🇩" : "🇬🇧"}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                {lang.toUpperCase()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={{
                backgroundColor: "#1A2B3C",
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <Text style={{ fontSize: 18 }}>🔔</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Vehicle Switcher */}
        <VehicleSwitcher
          vehicles={vehicles}
          selectedId={selectedVehicleId}
          onSelect={setSelectedVehicleId}
          onAddVehicle={openAddVehicle}
        />

        {/* Main Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 20, paddingBottom: 110 }}
        >
          {activeTab === "home" && (
            <>
              <VehicleProfileCard
                vehicle={selectedVehicle}
                onOdometerUpdate={handleOdometerUpdate}
                onEditVehicle={openEditVehicle}
              />

              {/* Stats Row */}
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
                    borderColor: "rgba(255,255,255,0.06)",
                    gap: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 10,
                      letterSpacing: 1,
                    }}
                  >
                    {t("totalSpent")}
                  </Text>
                  <Text
                    style={{
                      color: "#F5A623",
                      fontSize: 14,
                      fontWeight: "700",
                      fontFamily: "SpaceMono",
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
                    borderColor: "rgba(255,255,255,0.06)",
                    gap: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 10,
                      letterSpacing: 1,
                    }}
                  >
                    {t("servicesDone")}
                  </Text>
                  <Text
                    style={{
                      color: "#4ECDC4",
                      fontSize: 14,
                      fontWeight: "700",
                      fontFamily: "SpaceMono",
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
              onEdit={handleEditRepair}
              onDelete={handleDeleteRepair}
            />
          )}

          {activeTab === "fuel" && (
            <FuelLog
              fuelEntries={vehicleFuelEntries}
              onAdd={() => setShowFuelSheet(true)}
            />
          )}
        </ScrollView>

        {/* Bottom Navigation Bar */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            flexDirection: "row",
            backgroundColor: "#1A2B3C",
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.08)",
            paddingBottom: 24,
            paddingTop: 12,
            paddingHorizontal: 20,
            alignItems: "flex-start",
          }}
        >
          <TouchableOpacity
            onPress={() => setActiveTab("home")}
            activeOpacity={0.8}
            style={{ flex: 1, alignItems: "center", gap: 4 }}
          >
            <View
              style={{
                width: 32,
                height: 3,
                borderRadius: 2,
                backgroundColor:
                  activeTab === "home" ? "#F5A623" : "transparent",
                marginBottom: 4,
              }}
            />
            <Text style={{ fontSize: 22 }}>🏠</Text>
            <Text
              style={{
                color:
                  activeTab === "home" ? "#F5A623" : "rgba(255,255,255,0.4)",
                fontSize: 11,
                fontWeight: activeTab === "home" ? "700" : "400",
              }}
            >
              {t("overview")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleTabChange("fuel")}
            activeOpacity={0.8}
            style={{ flex: 1, alignItems: "center", gap: 4 }}
          >
            <View
              style={{
                width: 32,
                height: 3,
                borderRadius: 2,
                backgroundColor:
                  activeTab === "fuel" ? "#F5A623" : "transparent",
                marginBottom: 4,
              }}
            />
            <Text style={{ fontSize: 22 }}>⛽</Text>
            <Text
              style={{
                color:
                  activeTab === "fuel" ? "#F5A623" : "rgba(255,255,255,0.4)",
                fontSize: 11,
                fontWeight: activeTab === "fuel" ? "700" : "400",
              }}
            >
              {lang === "id" ? "BBM" : "Fuel"}
            </Text>
          </TouchableOpacity>

          {/* FAB center */}
          <TouchableOpacity
            onPress={() => {
              setPrefillServiceType(undefined);
              setEditingRepair(null);
              setShowAddSheet(true);
            }}
            activeOpacity={0.85}
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: "#F5A623",
              alignItems: "center",
              justifyContent: "center",
              marginTop: -24,
              shadowColor: "#F5A623",
              shadowOpacity: 0.5,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 10,
              marginHorizontal: 10,
            }}
          >
            <Text
              style={{
                color: "#0D1B2A",
                fontSize: 28,
                fontWeight: "700",
                lineHeight: 32,
              }}
            >
              +
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("history")}
            activeOpacity={0.8}
            style={{ flex: 1, alignItems: "center", gap: 4 }}
          >
            <View
              style={{
                width: 32,
                height: 3,
                borderRadius: 2,
                backgroundColor:
                  activeTab === "history" ? "#F5A623" : "transparent",
                marginBottom: 4,
              }}
            />
            <Text style={{ fontSize: 22 }}>🔧</Text>
            <Text
              style={{
                color:
                  activeTab === "history" ? "#F5A623" : "rgba(255,255,255,0.4)",
                fontSize: 11,
                fontWeight: activeTab === "history" ? "700" : "400",
              }}
            >
              {t("history")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Language Modal */}
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
                backgroundColor: "rgba(0,0,0,0.6)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <TouchableWithoutFeedback onPress={() => {}}>
                <View
                  style={{
                    backgroundColor: "#1A2B3C",
                    borderRadius: 20,
                    padding: 24,
                    width: 280,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.1)",
                    gap: 16,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 18,
                      fontWeight: "800",
                      textAlign: "center",
                    }}
                  >
                    {t("language")}
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
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor:
                          lang === l ? "rgba(245,166,35,0.15)" : "#0D1B2A",
                        borderRadius: 14,
                        padding: 16,
                        borderWidth: 1,
                        borderColor:
                          lang === l
                            ? "rgba(245,166,35,0.4)"
                            : "rgba(255,255,255,0.08)",
                        gap: 12,
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>
                        {l === "id" ? "🇮🇩" : "🇬🇧"}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 15,
                            fontWeight: "600",
                          }}
                        >
                          {l === "id" ? "Indonesia" : "English"}
                        </Text>
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.4)",
                            fontSize: 12,
                          }}
                        >
                          {l === "id" ? "Bahasa Indonesia" : "English Language"}
                        </Text>
                      </View>
                      {lang === l && (
                        <Text style={{ color: "#F5A623", fontSize: 18 }}>
                          ✓
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Add/Edit Repair Sheet */}
        <AddRepairSheet
          visible={showAddSheet}
          vehicleId={selectedVehicleId}
          currentOdometer={selectedVehicle.currentOdometer}
          vehicleType={selectedVehicle.vehicleType}
          prefillServiceType={prefillServiceType}
          editEntry={editingRepair}
          onClose={() => {
            setShowAddSheet(false);
            setEditingRepair(null);
          }}
          onSave={handleAddRepair}
          onUpdate={handleUpdateRepair}
        />

        <FuelSheet
          visible={showFuelSheet}
          vehicleId={selectedVehicleId}
          currentOdometer={selectedVehicle?.currentOdometer || 0}
          onClose={() => setShowFuelSheet(false)}
          onSave={handleAddFuel}
        />

        {/* Vehicle Edit / Add Modal */}
        <VehicleEditModal
          visible={showVehicleModal}
          vehicle={editingVehicle}
          onClose={() => {
            setShowVehicleModal(false);
            setEditingVehicle(null);
          }}
          onSave={handleVehicleSave}
        />
      </SafeAreaView>
    </View>
  );
}

// Tire Log List Component
function TireLogList({
  tireLogs,
  onAdd,
  vehicleType,
}: {
  tireLogs: TireLog[];
  onAdd: () => void;
  vehicleType?: "car" | "motorcycle";
}) {
  const { t, lang } = useLanguage();

  const positionLabel = (p: TireLog["position"]) => {
    const map: Record<string, string> = {
      front: t("tireFront"),
      rear: t("tireRear"),
      front_left: t("tireFrontLeft"),
      front_right: t("tireFrontRight"),
      rear_left: t("tireRearLeft"),
      rear_right: t("tireRearRight"),
    };
    return map[p] || p;
  };

  function parseTireAge(code: string) {
    if (code.length !== 4) return null;
    const week = parseInt(code.substring(0, 2), 10);
    const yearSuffix = parseInt(code.substring(2, 4), 10);
    if (isNaN(week) || isNaN(yearSuffix) || week < 1 || week > 53) return null;
    const fullYear = yearSuffix <= 30 ? 2000 + yearSuffix : 1900 + yearSuffix;
    const prodDate = new Date(fullYear, 0, 1 + (week - 1) * 7);
    const diffMs = Date.now() - prodDate.getTime();
    const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4));
    return {
      years: Math.floor(totalMonths / 12),
      months: totalMonths % 12,
      isOld: Math.floor(totalMonths / 12) >= 3,
    };
  }

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>
          🛞 {t("tireLog")}
        </Text>
        <TouchableOpacity
          onPress={onAdd}
          activeOpacity={0.8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "rgba(245,166,35,0.15)",
            borderRadius: 10,
            paddingVertical: 7,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: "rgba(245,166,35,0.3)",
          }}
        >
          <Text style={{ color: "#F5A623", fontSize: 16, fontWeight: "700" }}>
            +
          </Text>
          <Text style={{ color: "#F5A623", fontSize: 12, fontWeight: "600" }}>
            {t("addTireLog")}
          </Text>
        </TouchableOpacity>
      </View>

      {tireLogs.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
          <Text style={{ fontSize: 32 }}>🛞</Text>
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
            {t("noTireLogs")}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10, paddingHorizontal: 20 }}>
          {[...tireLogs].reverse().map((log) => {
            const age = parseTireAge(log.productionCode);
            return (
              <View
                key={log.id}
                style={{
                  backgroundColor: "#1A2B3C",
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.06)",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: "rgba(78,205,196,0.1)",
                        borderWidth: 1,
                        borderColor: "rgba(78,205,196,0.2)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>🛞</Text>
                    </View>
                    <View>
                      <Text
                        style={{
                          color: "#4ECDC4",
                          fontSize: 13,
                          fontWeight: "700",
                        }}
                      >
                        {positionLabel(log.position)}
                      </Text>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.5)",
                          fontSize: 11,
                          marginTop: 1,
                        }}
                      >
                        {log.brand} {log.size}
                      </Text>
                    </View>
                  </View>
                  {age && (
                    <View
                      style={{
                        paddingVertical: 4,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        backgroundColor: age.isOld
                          ? "rgba(255,107,107,0.15)"
                          : "rgba(78,205,196,0.15)",
                        borderWidth: 1,
                        borderColor: age.isOld
                          ? "rgba(255,107,107,0.3)"
                          : "rgba(78,205,196,0.3)",
                      }}
                    >
                      <Text
                        style={{
                          color: age.isOld ? "#FF6B6B" : "#4ECDC4",
                          fontSize: 11,
                          fontWeight: "700",
                        }}
                      >
                        {age.isOld ? "⚠️ " : ""}
                        {age.years}
                        {t("years")} {age.months}
                        {t("months")}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(13,27,42,0.5)",
                      borderRadius: 8,
                      padding: 10,
                      gap: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.3)",
                        fontSize: 10,
                        letterSpacing: 1,
                      }}
                    >
                      {t("tireInstalledDate")}
                    </Text>
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {log.installedDate}
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(13,27,42,0.5)",
                      borderRadius: 8,
                      padding: 10,
                      gap: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.3)",
                        fontSize: 10,
                        letterSpacing: 1,
                      }}
                    >
                      ODOMETER
                    </Text>
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 12,
                        fontWeight: "600",
                        fontFamily: "SpaceMono",
                      }}
                    >
                      {log.installedOdometer.toLocaleString()} km
                    </Text>
                  </View>
                  {log.productionCode ? (
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: "rgba(13,27,42,0.5)",
                        borderRadius: 8,
                        padding: 10,
                        gap: 2,
                      }}
                    >
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.3)",
                          fontSize: 10,
                          letterSpacing: 1,
                        }}
                      >
                        DOT
                      </Text>
                      <Text
                        style={{
                          color: "#4ECDC4",
                          fontSize: 12,
                          fontWeight: "600",
                          fontFamily: "SpaceMono",
                        }}
                      >
                        {log.productionCode}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {log.notes ? (
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 12,
                      fontStyle: "italic",
                    }}
                  >
                    {log.notes}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// Notification helpers
async function scheduleOdometerNotif(
  vehicle: Vehicle,
  lang: string,
  t: (k: any) => string,
) {
  // Cek apakah di web, jika iya langsung stop/return agar tidak error
  if (Platform.OS === "web") return;

  const daysSince = Math.floor(
    (Date.now() - vehicle.lastOdometerUpdate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysSince >= 7) {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t("notifOdometerTitle"),
          body: t("notifOdometerBody"),
          sound: true,
        },
        trigger: null, // immediate
      });
    } catch (e) {
      console.log("Notification error:", e);
    }
  }
}

async function scheduleDocNotifs(
  vehicle: Vehicle,
  lang: string,
  t: (k: any) => string,
) {
  // Cegah error di browser Tempo
  if (Platform.OS === "web") return;

  const THRESHOLDS = [150, 90, 30]; // days before

  const scheduleForDate = async (
    dateStr: string | undefined,
    titleKey: string,
    bodyKey: string,
  ) => {
    if (!dateStr) return;
    const dueDate = new Date(dateStr);
    const now = new Date();
    const daysLeft = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    for (const thresh of THRESHOLDS) {
      if (daysLeft <= thresh && daysLeft > 0) {
        const body = (t(bodyKey as any) as string).replace(
          "{{days}}",
          String(daysLeft),
        );
        try {
          await Notifications.scheduleNotificationAsync({
            content: { title: t(titleKey as any), body, sound: true },
            trigger: null,
          });
        } catch (e) {
          console.log("Notification failed", e);
        }
        break;
      }
    }
  };

  await scheduleForDate(vehicle.taxDueDate, "notifTaxTitle", "notifTaxBody");
  await scheduleForDate(vehicle.stnkDueDate, "notifStnkTitle", "notifStnkBody");
}

export default function HomeScreen() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
