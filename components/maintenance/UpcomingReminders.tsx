import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Reminder, Vehicle } from "@/types/maintenance";
import { useLanguage } from "@/context/LanguageContext";

interface UpcomingRemindersProps {
  reminders?: Reminder[];
  currentOdometer?: number;
  vehicle?: Vehicle;
  onAddReminder?: (serviceType: string) => void;
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

function getDocStatusColor(days: number | null): string {
  if (days === null) return "rgba(255,255,255,0.2)";
  if (days < 0) return "#FF6B6B";
  if (days <= 30) return "#FF6B6B";
  if (days <= 90) return "#F5A623";
  return "#4ECDC4";
}

const formatDocDate = (dateStr?: string, isId?: boolean) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString(isId ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const docStatusText = (days: number | null, t: any) => {
  if (days === null) return "-";
  if (days < 0) return t("expired") || "Expired";
  return `${days} ${t("daysLeft") || "hari lagi"}`;
};

// --- KOMPONEN UTAMA ---
export default function UpcomingReminders({
  reminders = [],
  currentOdometer = 0,
  vehicle,
  onAddReminder,
}: UpcomingRemindersProps) {
  const { t, lang } = useLanguage();
  const isId = lang === "id";
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // 1. Inisialisasi Data Dasar
  const safeReminders = Array.isArray(reminders) ? reminders : [];
  const taxDays = getDaysLeft(vehicle?.taxDueDate);
  const stnkDays = getDaysLeft(vehicle?.stnkDueDate);

  const STATUS_CONFIG: any = {
    safe: { color: "#4ECDC4", bg: "rgba(78,205,196,0.1)", label: t("onTrack"), border: "rgba(78,205,196,0.2)" },
    approaching: { color: "#F5A623", bg: "rgba(245,166,35,0.1)", label: t("approaching"), border: "rgba(245,166,35,0.2)" },
    overdue: { color: "#FF6B6B", bg: "rgba(255,107,107,0.1)", label: t("overdue"), border: "rgba(255,107,107,0.2)" },
  };

  // 2. Gabungkan Dokumen & Servis ke satu Array
  const allReminders = [
    ...(vehicle?.taxDueDate ? [{ 
      id: 'tax', type: 'doc', icon: "🏛️", label: isId ? "Pajak Tahunan" : "Annual Tax", 
      days: taxDays, date: formatDocDate(vehicle.taxDueDate, isId),
      statusColor: getDocStatusColor(taxDays), statusText: docStatusText(taxDays, t)
    }] : []),
    ...(vehicle?.stnkDueDate ? [{ 
      id: 'stnk', type: 'doc', icon: "📄", label: isId ? "STNK 5 Tahun" : "5-Year STNK", 
      days: stnkDays, date: formatDocDate(vehicle.stnkDueDate, isId),
      statusColor: getDocStatusColor(stnkDays), statusText: docStatusText(stnkDays, t)
    }] : []),
    ...safeReminders.map(r => ({ ...r, type: 'service' }))
  ];

  // 3. Sortir Berdasarkan Prioritas
  const sortedAll = [...allReminders].sort((a: any, b: any) => {
    const getScore = (item: any) => {
      if (item.type === 'doc') return item.days ?? 9999;
      if (item.status === 'overdue') return -10000;
      if (item.status === 'approaching') return 0;
      return (item.dueOdometer || 0) - currentOdometer;
    };
    return getScore(a) - getScore(b);
  });

  // 4. Filter Banner Urgent
  const urgentReminders = sortedAll.filter(r => 
    (r.type === 'doc' && r.days !== null && r.days <= 30) || 
    (r.type === 'service' && (r.status === 'overdue' || r.status === 'approaching'))
  );

  return (
    <View style={{ gap: 15 }}>
      {/* Header dengan Tombol Tambah Manual */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20 }}>
        <View style={{ gap: 2 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 }}>
            {isId ? "PERAWATAN PRIORITAS" : "PRIORITY MAINTENANCE"}
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
            + {isId ? "TAMBAH" : "ADD"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      <View style={{ gap: 10, paddingHorizontal: 20 }}>
  {sortedAll.map((item: any) => {
    // Tetap tampilkan kartu dokumen (Pajak/STNK) secara normal
    if (item.type === 'doc') {
      return (
        <DocReminderCard 
          key={item.id} 
          icon={item.icon} 
          label={item.label} 
          date={item.date} 
          days={item.days} 
          statusText={item.statusText} 
          statusColor={item.statusColor} 
        />
      );
    }

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
        {/* HEADER: Klik di sini untuk buka/tutup */}
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          <View style={{ 
            width: 40, height: 40, borderRadius: 12, backgroundColor: cfg.bg, 
            alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: cfg.border 
          }}>
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
              Target: {item.dueOdometer?.toLocaleString()} km
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: cfg.color, fontSize: 15, fontWeight: "800", fontFamily: "SpaceMono" }}>
              {kmRemaining > 0 ? `+${kmRemaining.toLocaleString()}` : "PERBAIKI SEGERA"}
            </Text>
            {/* Indikator Panah Toggle */}
            <View style={{ marginTop: 4, opacity: 0.3 }}>
              <Text style={{ color: 'white', fontSize: 10 }}>{isExpanded ? '▲' : '▼'}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* DETAIL: Hanya muncul jika kartu di-klik (Expanded) */}
        {isExpanded && (
          <View style={{ 
            marginTop: 16, 
            paddingTop: 16, 
            borderTopWidth: 1, 
            borderTopColor: 'rgba(255,255,255,0.05)',
            gap: 12
          }}>
            {/* Badge Status */}
            <View style={{ alignSelf: 'flex-start', backgroundColor: cfg.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
               <Text style={{ color: cfg.color, fontSize: 10, fontWeight: '800' }}>
                 {cfg.label.toUpperCase()} {kmRemaining < 0 ? (isId ? 'BUTUH PERHATIAN SEGERA' : 'SERVICE REQUIRED IMMEDIATELY') : ''}
               </Text>
            </View>

            {/* Tombol Aksi */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity 
                onPress={() => onEditReminder?.(item)}
                style={{ 
                  flex: 1, height: 38, backgroundColor: 'rgba(255,255,255,0.05)', 
                  borderRadius: 10, alignItems: 'center', justifyContent: 'center', 
                  flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' 
                }}
              >
                <Text style={{ fontSize: 14 }}>✏️</Text>
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>{isId ? "Ubah" : "Edit"}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => onDeleteReminder?.(item.id)}
                style={{ 
                  flex: 1, height: 38, backgroundColor: 'rgba(255,82,82,0.1)', 
                  borderRadius: 10, alignItems: 'center', justifyContent: 'center', 
                  flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: 'rgba(255,82,82,0.2)' 
                }}
              >
                <Text style={{ fontSize: 14 }}>🗑️</Text>
                <Text style={{ color: '#FF5252', fontWeight: '700', fontSize: 12 }}>{isId ? "Hapus" : "Delete"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  })}
</View>
    </View>
  );
}

// Sub-komponen Dokumen
function DocReminderCard({ icon, label, date, days, statusText, statusColor }: any) {
  const isUrgent = days !== null && days <= 90;
  return (
    <View style={{ borderRadius: 14, padding: 16, borderWidth: 1, borderColor: isUrgent ? `${statusColor}40` : "rgba(255,255,255,0.06)", flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: isUrgent ? `${statusColor}08` : "#1A2B3C" }}>
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
    </View>
  );
}