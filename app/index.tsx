import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import { Vehicle, RepairEntry, Reminder } from "@/types/maintenance";
import { MOCK_VEHICLES, MOCK_REPAIRS, MOCK_REMINDERS } from "@/data/mockData";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import VehicleSwitcher from "@/components/maintenance/VehicleSwitcher";
import VehicleProfileCard from "@/components/maintenance/VehicleProfileCard";
import MaintenanceStatusBar from "@/components/maintenance/MaintenanceStatusBar";
import UpcomingReminders from "@/components/maintenance/UpcomingReminders";
import RepairHistory from "@/components/maintenance/RepairHistory";
import AddRepairSheet from "@/components/maintenance/AddRepairSheet";
import RecommendationBanner from "@/components/maintenance/RecommendationBanner";
import VehicleEditModal from "@/components/maintenance/VehicleEditModal";

type TabType = "home" | "history";

function AppContent() {
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();

  const [vehicles, setVehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
  const [repairs, setRepairs] = useState<RepairEntry[]>(MOCK_REPAIRS);
  const [reminders, setReminders] = useState<Reminder[]>(MOCK_REMINDERS);
  const [selectedVehicleId, setSelectedVehicleId] = useState(MOCK_VEHICLES[0].id);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [prefillServiceType, setPrefillServiceType] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showLangModal, setShowLangModal] = useState(false);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId)!;
  const vehicleRepairs = repairs.filter(
    (r) => r.vehicleId === selectedVehicleId,
  );
  const vehicleReminders = reminders.filter(
    (r) => r.vehicleId === selectedVehicleId,
  );

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

  const handleRecommendationTap = (serviceType: string) => {
    setPrefillServiceType(serviceType);
    setShowAddSheet(true);
  };

  const handleVehicleSave = (
    data: Omit<Vehicle, "id" | "currentOdometer" | "lastOdometerUpdate"> & { currentOdometer?: number },
  ) => {
    if (editingVehicle) {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === editingVehicle.id
            ? { ...v, name: data.name, brand: data.brand, model: data.model, year: data.year, plateNumber: data.plateNumber, photoUrl: data.photoUrl, color: data.color }
            : v,
        ),
      );
    } else {
      const newVehicle: Vehicle = {
        id: `v${Date.now()}`,
        name: data.name,
        brand: data.brand,
        model: data.model,
        year: data.year,
        plateNumber: data.plateNumber,
        photoUrl: data.photoUrl,
        color: data.color,
        currentOdometer: data.currentOdometer ?? 0,
        lastOdometerUpdate: new Date(),
      };
      setVehicles((prev) => [...prev, newVehicle]);
      setSelectedVehicleId(newVehicle.id);
    }
    setEditingVehicle(null);
  };

  const openEditVehicle = () => {
    setEditingVehicle(selectedVehicle);
    setShowVehicleModal(true);
  };

  const openAddVehicle = () => {
    setEditingVehicle(null);
    setShowVehicleModal(true);
  };

  const totalCost = vehicleRepairs.reduce((sum, r) => sum + r.cost, 0);

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
            {/* Language Toggle */}
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
              <Text style={{ fontSize: 14 }}>{lang === "id" ? "🇮🇩" : "🇬🇧"}</Text>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "600" }}>
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
              <View style={{ flexDirection: "row", marginHorizontal: 20, gap: 12 }}>
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
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 1 }}>
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
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 1 }}>
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

              <UpcomingReminders
                reminders={vehicleReminders}
                currentOdometer={selectedVehicle.currentOdometer}
                onAddReminder={handleRecommendationTap}
              />
            </>
          )}

          {activeTab === "history" && (
            <RepairHistory repairs={vehicleRepairs} />
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
          {/* Overview Tab */}
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
                backgroundColor: activeTab === "home" ? "#F5A623" : "transparent",
                marginBottom: 4,
              }}
            />
            <Text style={{ fontSize: 22 }}>🏠</Text>
            <Text
              style={{
                color: activeTab === "home" ? "#F5A623" : "rgba(255,255,255,0.4)",
                fontSize: 11,
                fontWeight: activeTab === "home" ? "700" : "400",
              }}
            >
              {t("overview")}
            </Text>
          </TouchableOpacity>

          {/* FAB center */}
          <TouchableOpacity
            onPress={() => {
              setPrefillServiceType(undefined);
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
              marginHorizontal: 20,
            }}
          >
            <Text style={{ color: "#0D1B2A", fontSize: 28, fontWeight: "700", lineHeight: 32 }}>
              +
            </Text>
          </TouchableOpacity>

          {/* History Tab */}
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
                backgroundColor: activeTab === "history" ? "#F5A623" : "transparent",
                marginBottom: 4,
              }}
            />
            <Text style={{ fontSize: 22 }}>🔧</Text>
            <Text
              style={{
                color: activeTab === "history" ? "#F5A623" : "rgba(255,255,255,0.4)",
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
                  <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "800", textAlign: "center" }}>
                    {t("language")}
                  </Text>

                  <TouchableOpacity
                    onPress={() => { setLang("id"); setShowLangModal(false); }}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: lang === "id" ? "rgba(245,166,35,0.15)" : "#0D1B2A",
                      borderRadius: 14,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: lang === "id" ? "rgba(245,166,35,0.4)" : "rgba(255,255,255,0.08)",
                      gap: 12,
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>🇮🇩</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>Indonesia</Text>
                      <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Bahasa Indonesia</Text>
                    </View>
                    {lang === "id" && <Text style={{ color: "#F5A623", fontSize: 18 }}>✓</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => { setLang("en"); setShowLangModal(false); }}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: lang === "en" ? "rgba(245,166,35,0.15)" : "#0D1B2A",
                      borderRadius: 14,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: lang === "en" ? "rgba(245,166,35,0.4)" : "rgba(255,255,255,0.08)",
                      gap: 12,
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>🇬🇧</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>English</Text>
                      <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>English Language</Text>
                    </View>
                    {lang === "en" && <Text style={{ color: "#F5A623", fontSize: 18 }}>✓</Text>}
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Add Repair Sheet */}
        <AddRepairSheet
          visible={showAddSheet}
          vehicleId={selectedVehicleId}
          currentOdometer={selectedVehicle.currentOdometer}
          prefillServiceType={prefillServiceType}
          onClose={() => setShowAddSheet(false)}
          onSave={handleAddRepair}
        />

        {/* Vehicle Edit / Add Modal */}
        <VehicleEditModal
          visible={showVehicleModal}
          vehicle={editingVehicle}
          onClose={() => { setShowVehicleModal(false); setEditingVehicle(null); }}
          onSave={handleVehicleSave}
        />
      </SafeAreaView>
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

