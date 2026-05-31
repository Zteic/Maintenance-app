import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback } from "react-native";
import { Reminder, Vehicle } from "@/types/maintenance";
import { useLanguage } from "@/context/LanguageContext";
import { useRegional } from "@/context/RegionalContext";
import UpdateTaxStatusModal from "./UpdateTaxStatusModal";

interface UpcomingRemindersProps {
  reminders?: Reminder[];
  currentOdometer?: number;
  vehicle?: Vehicle;
  onAddReminder?: (serviceType: string) => void;
  onEditReminder?: (item: Reminder) => void;
  onDeleteReminder?: (id: string) => void;
  onEditVehicle?: () => void;
  onRefreshVehicle?: (newTax?: string, newStnk?: string) => void; // 🚀 SEHAT: Gunakan callback khusus ini, bukan onDeleteReminder!
}

// --- FUNGSI HELPER (DI LUAR KOMPONEN) ---
function getDaysLeft(dateStr?: string): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// 🚀 SUNTIKAN 3: Aturan Warna Baru (Merah, Oranye, Kuning, Hijau)
function getDocStatusColor(days: number | null): string {
  if (days === null) return "rgba(255,255,255,0.2)";
  if (days < 0) return "#FF5252"; // Merah (Sudah Jatuh Tempo)
  if (days <= 30) return "#FF8C00"; // Oranye (Kurang dari 30 Hari)
  if (days <= 90) return "#F5A623"; // Kuning (Kurang dari 90 Hari)
  return "#4ECDC4"; // Hijau (Aman)
}

const formatDocDate = (dateStr?: string, isId?: boolean) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString(isId ? "id-ID" : "en-US", {
    day: "numeric",
    month: "long", // Diubah ke long agar formatnya "12 Juli 2026"
    year: "numeric",
  });
};

// 🚀 SUNTIKAN 4: Aturan Teks Status Baru
const docStatusText = (days: number | null, t: any) => {
  if (days === null) return "-";
  if (days < 0) return `Terlambat ${Math.abs(days)} Hari`;
  if (days === 0) return "Jatuh Tempo Hari Ini";
  if (days <= 30) return `Segera Perpanjang (${days} Hari)`;
  return `${days} Hari Lagi`;
};

// --- KOMPONEN UTAMA ---
export default function UpcomingReminders({
  reminders = [],
  currentOdometer = 0,
  vehicle,
  onAddReminder,
  onEditReminder,
  onDeleteReminder,
  onEditVehicle,
  onOpenTaxCenter,
}: UpcomingRemindersProps) {
  const { t, lang } = useLanguage();
  const { currency } = useRegional(); // Ambil data mata uang IDR/Lainnya
  const isId = lang === "id";
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Modal fallback lama (dibiarkan dulu untuk jaga-jaga jika onOpenTaxCenter belum dikirim)
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedTaxType, setSelectedTaxType] = useState<"annual" | "five_year" | null>(null); 
  
  // 1. Inisialisasi Data Dasar
  const safeReminders = Array.isArray(reminders) ? reminders : [];
  const taxDays = getDaysLeft(vehicle?.taxDueDate);
  const stnkDays = getDaysLeft(vehicle?.stnkDueDate);
  
  const STATUS_CONFIG: any = {
    safe: { color: "#4ECDC4", bg: "rgba(78,205,196,0.1)", label: isId ? "AMAN" : "SAFE", border: "rgba(78,205,196,0.2)" },
    approaching: { color: "#F5A623", bg: "rgba(245,166,35,0.1)", label: isId ? "BUTUH PERHATIAN" : "NEEDS ATTENTION", border: "rgba(245,166,35,0.2)" },
    overdue: { color: "#FF5252", bg: "rgba(255,82,82,0.1)", label: isId ? "PERBAIKI SEGERA" : "REPAIR NOW", border: "rgba(255,82,82,0.2)" },
    routine: { color: "#4ECDC4", bg: "rgba(78,205,196,0.1)", label: isId ? "JADWAL RUTIN" : "ROUTINE", border: "rgba(78,205,196,0.2)" }
  };

  // 🚀 SUNTIKAN 5: Saring Dokumen HANYA JIKA MATA UANG IDR
  const docReminders = currency === 'IDR' ? [
    ...(vehicle?.taxDueDate ? [{ 
      id: 'tax', type: 'doc', icon: "🚗", label: "Pajak Tahunan", 
      days: taxDays, date: formatDocDate(vehicle.taxDueDate, isId),
      statusColor: getDocStatusColor(taxDays), statusText: docStatusText(taxDays, t)
    }] : []),
    ...(vehicle?.stnkDueDate ? [{ 
      id: 'stnk', type: 'doc', icon: "📄", label: "STNK 5 Tahun", 
      days: stnkDays, date: formatDocDate(vehicle.stnkDueDate, isId),
      statusColor: getDocStatusColor(stnkDays), statusText: docStatusText(stnkDays, t)
    }] : [])
  ] : [];

  // Gabungkan dengan reminder servis biasa
  const allReminders = [
    ...docReminders,
    ...safeReminders.map(r => ({ ...r, type: 'service' }))
  ];

  // Sortir Berdasarkan Prioritas Waktu/KM
  const sortedAll = [...allReminders].sort((a: any, b: any) => {
    const getScore = (item: any) => {
      if (item.type === 'doc') return item.days ?? 9999;
      if (item.status === 'overdue') return -10000;
      if (item.status === 'approaching') return 0;
      return (item.dueOdometer || 0) - currentOdometer;
    };
    return getScore(a) - getScore(b);
  });

  return (
    <View style={{ gap: 15 }}>
      {/* Header dengan Tombol Tambah Manual */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20 }}>
        <View style={{ gap: 2 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 }}>
            {isId ? "⏰ PERAWATAN PRIORITAS" : "⏰ PRIORITY MAINTENANCE"}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
            {allReminders.length} {isId ? "Item aktif" : "Active items"}
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => onAddReminder?.("")}
          style={{ backgroundColor: '#4ECDC4', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}
        >
          <Text style={{ color: '#1A2B3C', fontWeight: '900', fontSize: 12 }}>
            {isId ? "TAMBAH" : "ADD"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      <View style={{ gap: 10, paddingHorizontal: 20 }}>
        {sortedAll.map((item: any) => {
          if (item.type === 'doc') {
            const isWarning = item.days !== null && item.days <= 90;
            return (
              <DocReminderCard 
                key={item.id} 
                icon={isWarning && item.id === 'stnk' ? '⚠️' : item.days !== null && item.days < 0 ? '🚨' : item.icon} 
                label={item.label} 
                date={item.date} 
                days={item.days} 
                statusText={item.statusText} 
                statusColor={item.statusColor} 
                onPress={() => setSelectedTaxType(item.id === "stnk" ? "five_year" : "annual")} // 🏛️ UBAH JADI BARIS INI
                />
            );
          }

          // RENDER KARTU SERVIS BIASA
          const isExpanded = expandedId === item.id;
          const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.safe;
          const kmRemaining = (item.dueOdometer || 0) - currentOdometer;
          const isUrgent = item.status === "overdue" || item.status === "approaching";

          return (
            <View 
              key={item.id}
              style={{ 
                backgroundColor: "#1A2B3C", 
                borderRadius: 16, 
                padding: 16, 
                borderWidth: 1, 
                borderColor: isUrgent ? cfg.border : "rgba(255,255,255,0.05)" 
              }}
            >
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => setExpandedId(isExpanded ? null : item.id)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: cfg.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: cfg.border }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cfg.color }} />
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>{item.serviceType}</Text>
                    {isUrgent && (
                      <View style={{ backgroundColor: cfg.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: cfg.color, fontSize: 9, fontWeight: "900" }}>!</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                    {item.status === "routine" 
                      ? `Rutin: Setiap ${item.repeatNum} ${item.repeatUnit === 'week' ? 'Minggu' : item.repeatUnit === 'month' ? 'Bulan' : 'Tahun'}`
                      : `Target: ${item.dueOdometer?.toLocaleString()} km`
                    }
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: item.status === "routine" ? "#4ECDC4" : item.status === "overdue" ? "#FF5252" : "#F5A623", fontSize: 13, fontWeight: "800", letterSpacing: 0.5 }}>
                    {item.status === "routine" ? "JADWAL RUTIN" : "PERBAIKI SEGERA"}
                  </Text>
                  <View style={{ marginTop: 4, opacity: 0.3 }}>
                    <Text style={{ color: 'white', fontSize: 10 }}>{isExpanded ? '▲' : '▼'}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', gap: 12 }}>
                  <View style={{ alignSelf: 'flex-start', backgroundColor: cfg.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ color: cfg.color, fontSize: 10, fontWeight: '800' }}>
                      {cfg.label.toUpperCase()} {kmRemaining < 0 ? (isId ? 'BUTUH PERHATIAN SEGERA' : 'SERVICE REQUIRED IMMEDIATELY') : ''}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity 
                      onPress={() => onEditReminder?.(item)}
                      activeOpacity={0.7}
                      style={{ flex: 1, height: 38, backgroundColor: 'rgba(78,205,196,0.1)', borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: 'rgba(78,205,196,0.3)' }}
                    >
                      <Text style={{ fontSize: 14 }}>✅</Text>
                      <Text style={{ color: '#4ECDC4', fontWeight: '800', fontSize: 11 }}>{isId ? "SUDAH SERVIS" : "MARK DONE"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => onDeleteReminder?.(item.id)}
                      activeOpacity={0.7}
                      style={{ flex: 1, height: 38, backgroundColor: 'rgba(255,82,82,0.1)', borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: 'rgba(255,82,82,0.2)' }}
                    >
                      <Text style={{ fontSize: 14 }}>🗑️</Text>
                      <Text style={{ color: '#FF5252', fontWeight: '700', fontSize: 11 }}>{isId ? "HAPUS" : "DELETE"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* --- MODAL FALLBACK LAMA (Akan dipanggil jika Tax Center belum aktif) --- */}
      <Modal visible={showDocModal} transparent animationType="none" onRequestClose={() => setShowDocModal(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowDocModal(false)} style={{ flex: 1, backgroundColor: 'rgba(7, 18, 28, 0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableWithoutFeedback>
            <View style={{ width: '85%', backgroundColor: '#162431', borderRadius: 32, padding: 30, alignItems: 'center' }}>
              <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 25 }} />
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 10, textAlign: 'center' }}>{isId ? "Pembaruan Dokumen" : "Document Update"}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: 14, lineHeight: 22, marginBottom: 35 }}>
                {isId ? "Untuk memperbarui tanggal jatuh tempo Pajak atau STNK, Anda perlu mengakses menu Edit Profil Kendaraan." : "To update the Tax or STNK due date, you need to access the Edit Vehicle Profile menu."}
              </Text>
              <View style={{ width: '100%', gap: 12 }}>
                <TouchableOpacity onPress={() => { setShowDocModal(false); if (onEditVehicle) onEditVehicle(); }} activeOpacity={0.8} style={{ width: '100%', paddingVertical: 16, borderRadius: 20, backgroundColor: '#F5A623', alignItems: 'center' }}>
                  <Text style={{ color: '#0D1B2A', fontWeight: '800', fontSize: 16 }}>{isId ? "Edit Kendaraan Sekarang" : "Edit Vehicle Now"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDocModal(false)} activeOpacity={0.6} style={{ width: '100%', paddingVertical: 16, borderRadius: 20, alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 15 }}>{isId ? "Mungkin Nanti" : "Maybe Later"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* 🏛️ FIX REAKTIF: MODAL UPDATE STATUS PAJAK & STNK CLOUD */}
      {selectedTaxType !== null && vehicle && (
        <UpdateTaxStatusModal
          visible={selectedTaxType !== null}
          initialType={selectedTaxType} 
          vehicle={vehicle}
          onClose={() => setSelectedTaxType(null)}
          onSuccess={(newTaxDate?: string, newStnkDate?: string) => {
            console.log("==========================================================");
            console.log("⚡ [Upcoming Reminders] Sukses update data pajak di cloud!");
            console.log("📦 Mengirim data tanggal baru ke dashboard engine...");
            console.log("==========================================================");

            setSelectedTaxType(null); 

            if (typeof onRefreshVehicle === "function") {
              onRefreshVehicle(newTaxDate, newStnkDate);
            }
          }}
        />
      )}
    </View>
  );
}

// Sub-komponen Dokumen (Gaya tetap utuh)
function DocReminderCard({ icon, label, date, days, statusText, statusColor, onPress }: any) {
  const isUrgent = days !== null && days <= 90;
  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={onPress}
      style={{ borderRadius: 14, padding: 16, borderWidth: 1, borderColor: isUrgent ? `${statusColor}40` : "rgba(255,255,255,0.06)", flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: isUrgent ? `${statusColor}08` : "#1A2B3C" }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${statusColor}15`, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: `${statusColor}30` }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>{label}</Text>
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{date}</Text>
      </View>
      <View style={{ backgroundColor: `${statusColor}20`, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, alignItems: "center" }}>
        <Text style={{ color: statusColor, fontSize: 12, fontWeight: "700" }}>{statusText}</Text>
      </View>
    </TouchableOpacity>
  );
}