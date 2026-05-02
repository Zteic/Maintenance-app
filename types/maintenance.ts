export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  photoUrl: string;
  currentOdometer: number;
  lastOdometerUpdate: Date;
  color: string;
  vehicleType?: 'car' | 'motorcycle';
  taxDueDate?: string; // YYYY-MM-DD pajak tahunan
  stnkDueDate?: string; // YYYY-MM-DD STNK 5 tahunan
}

export interface TireLog {
  id: string;
  vehicleId: string;
  position: 'front' | 'rear' | 'front_left' | 'front_right' | 'rear_left' | 'rear_right';
  brand: string;
  size: string;
  productionCode: string; // 4-digit e.g. "2423"
  installedDate: string;
  installedOdometer: number;
  notes?: string;
}

export interface RepairEntry {
  id: string;
  vehicleId: string;
  serviceType: string;
  date: Date;
  odometer: number;
  cost: number;
  workshop: string;
  notes: string;
  nextIntervalKm: number;
  nextServiceDate?: Date;
  // Tire info (only when serviceType involves tire replacement)
  tireInfo?: {
    position: 'front' | 'rear';
    brand: string;
    size: string;
    productionCode: string;
  };
}

export interface Reminder {
  id: string;
  vehicleId: string;
  serviceType: string;
  dueDate: Date;
  dueOdometer: number;
  status: 'safe' | 'approaching' | 'overdue';
  intervalKm: number;
  lastServiceOdometer: number;
}

export interface FuelEntry {
  id: string;
  vehicleId: string;
  date: string; // YYYY-MM-DD
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  odometer: number;
  notes?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
}

export type ServiceType = string;

export interface UserProfile {
  name: string;
  email: string;
  photoUri?: string;
}
