import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vehicle, RepairEntry, Reminder, TireLog, UserProfile, FuelEntry, NotificationItem } from '@/types/maintenance';

const KEYS = {
  VEHICLES: 'garasi_vehicles',
  REPAIRS: 'garasi_repairs',
  REMINDERS: 'garasi_reminders',
  TIRE_LOGS: 'garasi_tire_logs',
  SELECTED_VEHICLE: 'garasi_selected_vehicle',
  USER_PROFILE: 'garasi_user_profile',
  FUEL_ENTRIES: 'garasi_fuel_entries',
  NOTIFICATIONS: 'garasi_notifications',
  CUSTOM_SERVICE_TYPES: 'garasi_custom_service_types',
  FUEL_STATS_RESET_DATE: 'garasi_fuel_stats_reset_date',
};

// Helpers to serialize/deserialize dates
function serializeVehicle(v: Vehicle): any {
  return { ...v, lastOdometerUpdate: v.lastOdometerUpdate.toISOString() };
}

function deserializeVehicle(v: any): Vehicle {
  return { ...v, lastOdometerUpdate: new Date(v.lastOdometerUpdate) };
}

function serializeRepair(r: RepairEntry): any {
  return {
    ...r,
    date: r.date.toISOString(),
    nextServiceDate: r.nextServiceDate ? r.nextServiceDate.toISOString() : undefined,
  };
}

function deserializeRepair(r: any): RepairEntry {
  return {
    ...r,
    date: new Date(r.date),
    nextServiceDate: r.nextServiceDate ? new Date(r.nextServiceDate) : undefined,
  };
}

function serializeReminder(r: Reminder): any {
  return { ...r, dueDate: r.dueDate.toISOString() };
}

function deserializeReminder(r: any): Reminder {
  return { ...r, dueDate: new Date(r.dueDate) };
}

// Vehicles
// Cari fungsi loadVehicles dan ganti isinya menjadi seperti ini:
export async function loadVehicles(): Promise<Vehicle[] | null> {
  try {
    const rawVehicles = await AsyncStorage.getItem(KEYS.VEHICLES);
    if (!rawVehicles) return null;
    
    let vehicles = JSON.parse(rawVehicles).map(deserializeVehicle);

    // Ambil data pendukung untuk sinkronisasi Odometer
    const rawRepairs = await AsyncStorage.getItem(KEYS.REPAIRS);
    const rawFuel = await AsyncStorage.getItem(KEYS.FUEL_ENTRIES);
    
    const repairs = rawRepairs ? JSON.parse(rawRepairs) : [];
    const fuel = rawFuel ? JSON.parse(rawFuel) : [];

    // Lakukan pembaruan Odometer untuk setiap kendaraan
    return vehicles.map((v: Vehicle) => {
      // Kumpulkan semua inputan odometer dari riwayat servis dan BBM untuk kendaraan ini
      const repairOdos = repairs
        .filter((r: any) => r.vehicleId === v.id)
        .map((r: any) => r.odometer || 0);

      const fuelOdos = fuel
        .filter((f: any) => f.vehicleId === v.id)
        .map((f: any) => f.odometer || 0);

      // Cari angka tertinggi antara odometer kendaraan saat ini, data servis, dan data BBM
      const maxOdometer = Math.max(
        v.currentOdometer,
        ...repairOdos,
        ...fuelOdos
      );

      return {
        ...v,
        currentOdometer: maxOdometer
      };
    });
  } catch (error) {
    console.error("Error syncing odometer:", error);
    return null;
  }
}

export async function saveVehicles(vehicles: Vehicle[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.VEHICLES, JSON.stringify(vehicles.map(serializeVehicle)));
  } catch {}
}

// Repairs
export async function loadRepairs(): Promise<RepairEntry[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.REPAIRS);
    if (!raw) return null;
    return JSON.parse(raw).map(deserializeRepair);
  } catch { return null; }
}

export async function saveRepairs(repairs: RepairEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.REPAIRS, JSON.stringify(repairs.map(serializeRepair)));
  } catch {}
}

// Reminders
export async function loadReminders(): Promise<Reminder[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.REMINDERS);
    if (!raw) return null;
    return JSON.parse(raw).map(deserializeReminder);
  } catch { return null; }
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.REMINDERS, JSON.stringify(reminders.map(serializeReminder)));
  } catch {}
}

// Tire Logs
export async function loadTireLogs(): Promise<TireLog[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.TIRE_LOGS);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export async function saveTireLogs(logs: TireLog[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.TIRE_LOGS, JSON.stringify(logs));
  } catch {}
}

// Selected Vehicle
export async function loadSelectedVehicleId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.SELECTED_VEHICLE);
  } catch { return null; }
}

export async function saveSelectedVehicleId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SELECTED_VEHICLE, id);
  } catch {}
}

// User Profile
export async function loadUserProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER_PROFILE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
  } catch {}
}

// Fuel Entries
export async function loadFuelEntries(): Promise<FuelEntry[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.FUEL_ENTRIES);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export async function saveFuelEntries(entries: FuelEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.FUEL_ENTRIES, JSON.stringify(entries));
  } catch {}
}

// Notifications
export async function loadNotifications(): Promise<NotificationItem[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.NOTIFICATIONS);
    if (!raw) return null;
    const items = JSON.parse(raw);
    return items.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }));
  } catch { return null; }
}

export async function saveNotifications(items: NotificationItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(
      items.map(n => ({ ...n, timestamp: n.timestamp.toISOString() }))
    ));
  } catch {}
}

// Custom Service Types
export async function loadCustomServiceTypes(): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CUSTOM_SERVICE_TYPES);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export async function saveCustomServiceTypes(types: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.CUSTOM_SERVICE_TYPES, JSON.stringify(types));
  } catch {}
}

// Fuel Stats Reset Date
export async function loadFuelStatsResetDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.FUEL_STATS_RESET_DATE);
  } catch { return null; }
}

export async function saveFuelStatsResetDate(date: string | null): Promise<void> {
  try {
    if (date === null) {
      await AsyncStorage.removeItem(KEYS.FUEL_STATS_RESET_DATE);
    } else {
      await AsyncStorage.setItem(KEYS.FUEL_STATS_RESET_DATE, date);
    }
  } catch {}
}

export async function syncVehicleOdometer(vehicleId: string): Promise<void> {
  const vehicles = await loadVehicles();
  if (vehicles) {
    await saveVehicles(vehicles);
  }
}