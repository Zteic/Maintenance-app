import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vehicle, RepairEntry, Reminder, TireLog, UserProfile } from '@/types/maintenance';

const KEYS = {
  VEHICLES: 'garasi_vehicles',
  REPAIRS: 'garasi_repairs',
  REMINDERS: 'garasi_reminders',
  TIRE_LOGS: 'garasi_tire_logs',
  SELECTED_VEHICLE: 'garasi_selected_vehicle',
  USER_PROFILE: 'garasi_user_profile',
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
export async function loadVehicles(): Promise<Vehicle[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.VEHICLES);
    if (!raw) return null;
    return JSON.parse(raw).map(deserializeVehicle);
  } catch { return null; }
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
