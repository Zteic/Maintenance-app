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

export type ServiceType =
  | 'Oil Change'
  | 'Tire Rotation'
  | 'Brake Inspection'
  | 'Air Filter'
  | 'Spark Plugs'
  | 'Transmission Service'
  | 'Coolant Flush'
  | 'Battery Check'
  | 'AC Service'
  | 'General Inspection'
  | 'Other';
