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
    <View style={{ gap: 10 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>
          {isId ? "🤖 REKOMENDASI PERAWATAN BERIKUTNYA" : "🤖 SMART RECOMMENDATIONS"}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
          {allReminders.length} {t("items")}
        </Text>
      </View>

      {/* Main List */}
      <View style={{ gap: 8, paddingHorizontal: 20 }}>
        {sortedAll.map((item: any) => {
          if (item.type === 'doc') {
            return (
              <DocReminderCard key={item.id} icon={item.icon} label={item.label} date={item.date} days={item.days} statusText={item.statusText} statusColor={item.statusColor} />
            );
          }

          const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.safe;
          const kmRemaining = (item.dueOdometer || 0) - currentOdometer;
          const isUrgent = item.status === "overdue" || item.status === "approaching";
          const formattedDate = item.dueDate instanceof Date 
            ? item.dueDate.toLocaleDateString(isId ? "id-ID" : "en-US", { month: "short", day: "numeric", year: "numeric" }) 
            : "-";

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onAddReminder?.(item.serviceType)}
              activeOpacity={0.8}
              style={{ backgroundColor: "#1A2B3C", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: isUrgent ? cfg.border : "rgba(255,255,255,0.06)", flexDirection: "row", alignItems: "center", gap: 14 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: cfg.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: cfg.border }}>
                 <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cfg.color }} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>{item.serviceType}</Text>
                  {isUrgent && (
                    <View style={{ backgroundColor: cfg.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: cfg.color, fontSize: 9, fontWeight: "800" }}>
                        {item.status === "overdue" ? (isId ? "MENDESAK" : "URGENT") : (isId ? "SEGERA" : "SOON")}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{t("due")} {formattedDate} · {item.dueOdometer?.toLocaleString()} {t("km")}</Text>
              </View>
              <View style={{ backgroundColor: cfg.bg, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, alignItems: "center", minWidth: 70 }}>
                 <Text style={{ color: cfg.color, fontSize: 13, fontWeight: "700" }}>{kmRemaining > 0 ? `+${kmRemaining.toLocaleString()}` : "NOW"}</Text>
                 <Text style={{ color: cfg.color, fontSize: 9, opacity: 0.7 }}>{cfg.label}</Text>
              </View>
            </TouchableOpacity>
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