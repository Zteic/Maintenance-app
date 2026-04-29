import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Vehicle, RepairEntry, Reminder } from '@/types/maintenance';
import { MOCK_VEHICLES, MOCK_REPAIRS, MOCK_REMINDERS } from '@/data/mockData';
import VehicleSwitcher from '@/components/maintenance/VehicleSwitcher';
import VehicleProfileCard from '@/components/maintenance/VehicleProfileCard';
import MaintenanceStatusBar from '@/components/maintenance/MaintenanceStatusBar';
import UpcomingReminders from '@/components/maintenance/UpcomingReminders';
import RepairHistory from '@/components/maintenance/RepairHistory';
import AddRepairSheet from '@/components/maintenance/AddRepairSheet';
import RecommendationBanner from '@/components/maintenance/RecommendationBanner';
import MaintenanceCalendar from '@/components/maintenance/MaintenanceCalendar';

type TabType = 'home' | 'history' | 'calendar';

export default function HomeScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
  const [repairs, setRepairs] = useState<RepairEntry[]>(MOCK_REPAIRS);
  const [reminders, setReminders] = useState<Reminder[]>(MOCK_REMINDERS);
  const [selectedVehicleId, setSelectedVehicleId] = useState(MOCK_VEHICLES[0].id);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [prefillServiceType, setPrefillServiceType] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<TabType>('home');

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId)!;
  const vehicleRepairs = repairs.filter((r) => r.vehicleId === selectedVehicleId);
  const vehicleReminders = reminders.filter((r) => r.vehicleId === selectedVehicleId);

  const handleOdometerUpdate = (newValue: number) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === selectedVehicleId
          ? { ...v, currentOdometer: newValue, lastOdometerUpdate: new Date() }
          : v
      )
    );
    setReminders((prev) =>
      prev.map((r) => {
        if (r.vehicleId !== selectedVehicleId) return r;
        const kmRemaining = r.dueOdometer - newValue;
        const thresholdKm = r.intervalKm * 0.15;
        let status: Reminder['status'] = 'safe';
        if (kmRemaining <= 0) status = 'overdue';
        else if (kmRemaining <= thresholdKm) status = 'approaching';
        return { ...r, status };
      })
    );
  };

  const handleAddRepair = (entry: Omit<RepairEntry, 'id'>) => {
    const newRepair: RepairEntry = { ...entry, id: `r${Date.now()}` };
    setRepairs((prev) => [...prev, newRepair]);
    const nextOdometer = entry.odometer + entry.nextIntervalKm;
    const newReminder: Reminder = {
      id: `rem${Date.now()}`,
      vehicleId: entry.vehicleId,
      serviceType: entry.serviceType,
      dueDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      dueOdometer: nextOdometer,
      status: nextOdometer - selectedVehicle.currentOdometer <= 0 ? 'overdue' : 'safe',
      intervalKm: entry.nextIntervalKm,
      lastServiceOdometer: entry.odometer,
    };
    setReminders((prev) => {
      const filtered = prev.filter(
        (r) => !(r.vehicleId === entry.vehicleId && r.serviceType === entry.serviceType)
      );
      return [...filtered, newReminder];
    });
  };

  const handleRecommendationTap = (serviceType: string) => {
    setPrefillServiceType(serviceType);
    setShowAddSheet(true);
  };

  const totalCost = vehicleRepairs.reduce((sum, r) => sum + r.cost, 0);

  const TABS: { key: TabType; label: string; icon: string }[] = [
    { key: 'home', label: 'Overview', icon: '🏠' },
    { key: 'history', label: 'History', icon: '🔧' },
    { key: 'calendar', label: 'Calendar', icon: '📅' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#0D1B2A' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 8,
          }}
        >
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 2, fontWeight: '600' }}>
              VEHICLE TRACKER
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 }}>
              My Garage
            </Text>
          </View>
          <View
            style={{
              backgroundColor: '#1A2B3C',
              borderRadius: 14,
              padding: 12,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <Text style={{ fontSize: 18 }}>🔔</Text>
          </View>
        </View>

        {/* Vehicle Switcher */}
        <VehicleSwitcher
          vehicles={vehicles}
          selectedId={selectedVehicleId}
          onSelect={setSelectedVehicleId}
        />

        {/* Tab Navigation */}
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: 20,
            marginBottom: 16,
            backgroundColor: '#1A2B3C',
            borderRadius: 14,
            padding: 4,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                borderRadius: 11,
                backgroundColor: activeTab === tab.key ? '#0D1B2A' : 'transparent',
                gap: 6,
                borderWidth: activeTab === tab.key ? 1 : 0,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Text style={{ fontSize: 13 }}>{tab.icon}</Text>
              <Text
                style={{
                  color: activeTab === tab.key ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                  fontSize: 12,
                  fontWeight: activeTab === tab.key ? '700' : '400',
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 20, paddingBottom: 100 }}
        >
          {activeTab === 'home' && (
            <>
              <VehicleProfileCard vehicle={selectedVehicle} onOdometerUpdate={handleOdometerUpdate} />

              {/* Stats Row */}
              <View style={{ flexDirection: 'row', marginHorizontal: 20, gap: 12 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#1A2B3C',
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.06)',
                    gap: 4,
                  }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1 }}>TOTAL SPENT</Text>
                  <Text style={{ color: '#F5A623', fontSize: 14, fontWeight: '700', fontFamily: 'SpaceMono' }}>
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalCost)}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#1A2B3C',
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.06)',
                    gap: 4,
                  }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1 }}>SERVICES DONE</Text>
                  <Text style={{ color: '#4ECDC4', fontSize: 14, fontWeight: '700', fontFamily: 'SpaceMono' }}>
                    {vehicleRepairs.length} records
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

          {activeTab === 'history' && <RepairHistory repairs={vehicleRepairs} />}
          {activeTab === 'calendar' && <MaintenanceCalendar repairs={vehicleRepairs} />}
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity
          onPress={() => { setPrefillServiceType(undefined); setShowAddSheet(true); }}
          activeOpacity={0.85}
          style={{
            position: 'absolute',
            bottom: 32,
            right: 24,
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#F5A623',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#F5A623',
            shadowOpacity: 0.5,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 10,
          }}
        >
          <Text style={{ color: '#0D1B2A', fontSize: 28, fontWeight: '700', lineHeight: 32 }}>+</Text>
        </TouchableOpacity>

        {/* Add Repair Sheet */}
        <AddRepairSheet
          visible={showAddSheet}
          vehicleId={selectedVehicleId}
          currentOdometer={selectedVehicle.currentOdometer}
          prefillServiceType={prefillServiceType}
          onClose={() => setShowAddSheet(false)}
          onSave={handleAddRepair}
        />
      </SafeAreaView>
    </View>
  );
}
