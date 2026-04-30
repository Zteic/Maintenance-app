import React, { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'id' | 'en';

const translations = {
  en: {
    appTagline: 'AUTO PULSE',
    appName: 'GarasiKu',
    overview: 'Overview',
    history: 'History',
    totalSpent: 'TOTAL SPENT',
    servicesDone: 'SERVICES DONE',
    records: 'records',
    upcomingReminders: 'Upcoming Reminders',
    items: 'items',
    onTrack: 'ON TRACK',
    approaching: 'APPROACHING',
    overdue: 'OVERDUE',
    logRepair: 'Log Repair',
    saveRepairLog: 'SAVE REPAIR LOG',
    serviceType: 'SERVICE TYPE',
    date: 'DATE',
    odometer: 'ODOMETER (KM)',
    cost: 'COST (IDR)',
    workshop: 'WORKSHOP',
    nextInterval: 'NEXT SERVICE INTERVAL (KM)',
    notes: 'NOTES',
    notesPlaceholder: 'Add notes or observations...',
    workshopPlaceholder: 'Workshop name',
    uploadReceipt: 'Upload Receipt / Struk',
    tapToUpdate: 'TAP TO UPDATE',
    lastUpdated: 'Last updated',
    today: 'today',
    daysAgo: 'days ago',
    dayAgo: 'day ago',
    addVehicle: 'Add Vehicle',
    editVehicle: 'Edit Vehicle',
    vehicleName: 'VEHICLE NAME',
    brand: 'BRAND',
    model: 'MODEL',
    year: 'YEAR',
    plateNumber: 'PLATE NUMBER',
    photoUrl: 'PHOTO URL',
    save: 'SAVE',
    cancel: 'Cancel',
    language: 'Language',
    english: 'English',
    indonesian: 'Indonesian',
    settings: 'Settings',
    addVehicleTitle: 'Add New Vehicle',
    editVehicleTitle: 'Edit Vehicle',
    repairHistory: 'Repair History',
    noRepairs: 'No repair records yet',
    tapPlusToAdd: 'Tap + to log your first service',
    km: 'km',
    due: 'Due',
    update: 'UPDATE',
    vehicleNamePlaceholder: 'e.g. My Car',
    brandPlaceholder: 'e.g. Toyota',
    modelPlaceholder: 'e.g. Avanza',
    yearPlaceholder: 'e.g. 2022',
    platePlaceholder: 'e.g. B 1234 XYZ',
    photoUrlPlaceholder: 'https://...',
    initialOdometer: 'INITIAL ODOMETER (KM)',
    accentColor: 'ACCENT COLOR',
  },
  id: {
    appTagline: 'AUTO PULSE',
    appName: 'GarasiKu',
    overview: 'Ikhtisar',
    history: 'Riwayat',
    totalSpent: 'TOTAL BIAYA',
    servicesDone: 'SERVIS SELESAI',
    records: 'catatan',
    upcomingReminders: 'Pengingat Mendatang',
    items: 'item',
    onTrack: 'AMAN',
    approaching: 'MENDEKATI',
    overdue: 'TERLAMBAT',
    logRepair: 'Catat Perbaikan',
    saveRepairLog: 'SIMPAN CATATAN',
    serviceType: 'JENIS SERVIS',
    date: 'TANGGAL',
    odometer: 'ODOMETER (KM)',
    cost: 'BIAYA (IDR)',
    workshop: 'BENGKEL',
    nextInterval: 'INTERVAL SERVIS BERIKUTNYA (KM)',
    notes: 'CATATAN',
    notesPlaceholder: 'Tambah catatan atau observasi...',
    workshopPlaceholder: 'Nama bengkel',
    uploadReceipt: 'Upload Struk / Kwitansi',
    tapToUpdate: 'KETUK UNTUK UPDATE',
    lastUpdated: 'Terakhir diperbarui',
    today: 'hari ini',
    daysAgo: 'hari lalu',
    dayAgo: 'hari lalu',
    addVehicle: 'Tambah Kendaraan',
    editVehicle: 'Edit Kendaraan',
    vehicleName: 'NAMA KENDARAAN',
    brand: 'MEREK',
    model: 'MODEL',
    year: 'TAHUN',
    plateNumber: 'NOMOR PLAT',
    photoUrl: 'URL FOTO',
    save: 'SIMPAN',
    cancel: 'Batal',
    language: 'Bahasa',
    english: 'English',
    indonesian: 'Indonesia',
    settings: 'Pengaturan',
    addVehicleTitle: 'Tambah Kendaraan Baru',
    editVehicleTitle: 'Edit Kendaraan',
    repairHistory: 'Riwayat Perbaikan',
    noRepairs: 'Belum ada catatan perbaikan',
    tapPlusToAdd: 'Ketuk + untuk mencatat servis pertama',
    km: 'km',
    due: 'Jatuh tempo',
    update: 'PERBARUI',
    vehicleNamePlaceholder: 'mis. Mobil Saya',
    brandPlaceholder: 'mis. Toyota',
    modelPlaceholder: 'mis. Avanza',
    yearPlaceholder: 'mis. 2022',
    platePlaceholder: 'mis. B 1234 XYZ',
    photoUrlPlaceholder: 'https://...',
    initialOdometer: 'ODOMETER AWAL (KM)',
    accentColor: 'WARNA AKSEN',
  },
};

type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'id',
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('id');
  const t = (key: TranslationKey): string => translations[lang][key] ?? key;
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
