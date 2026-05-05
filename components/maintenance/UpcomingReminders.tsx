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

export default function UpcomingReminders({
  reminders = [],
  currentOdometer = 0,
  vehicle,
  onAddReminder,
}: UpcomingRemindersProps) {
  const { t, lang } = useLanguage();
  const isId = lang === "id";

  if (!reminders) return null;

  const STATUS_CONFIG: any = {
    safe: {
      color: "#4ECDC4",
      bg: "rgba(78,205,196,0.1)",
      label: t("onTrack"),
      border: "rgba(78,205,196,0.2)",
    },
    approaching: {
      color: "#F5A623",
      bg: "rgba(245,166,35,0.1)",
      label: t("approaching"),
      border: "rgba(245,166,35,0.2)",
    },
    overdue: {
      color: "#FF6B6B",
      bg: "rgba(255,107,107,0.1)",
      label: t("overdue"),
      border: "rgba(255,107,107,0.2)",
    },
  };

  const safeReminders = Array.isArray(reminders) ? reminders : [];

  // Sort: overdue first, then approaching, then safe
  const sorted = [...safeReminders].sort((a, b) => {
    const order: any = { overdue: 0, approaching: 1, safe: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  const taxDays = getDaysLeft(vehicle?.taxDueDate);
  const stnkDays = getDaysLeft(vehicle?.stnkDueDate);
  const hasDocHealth = vehicle && (vehicle.taxDueDate || vehicle.stnkDueDate);

  const formatDocDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString(isId ? "id-ID" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const docStatusText = (days: number | null) => {
    if (days === null) return "-";
    if (days < 0) return t("expired") || "Expired";
    return `${days} ${t("daysLeft") || "hari lagi"}`;
  };

  // Smart recommendations: urgent reminders (overdue or approaching)
  const urgentReminders = sorted.filter(
    (r) => r.status === "overdue" || r.status === "approaching"
  );

  const totalItems =
    sorted.length +
    (vehicle?.taxDueDate ? 1 : 0) +
    (vehicle?.stnkDueDate ? 1 : 0);

  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>
          {isId ? "Pengingat & Rekomendasi" : "Reminders & Recommendations"}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
          {totalItems} {t("items")}
        </Text>
      </View>

      {/* Smart Recommendations Banner - urgent items */}
      {urgentReminders.length > 0 && (
        <View style={{ paddingHorizontal: 20, gap: 6 }}>
          <Text
            style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: 9,
              letterSpacing: 1.5,
              fontWeight: "700",
            }}
          >
            🤖 SMART RECOMMENDATIONS
          </Text>
          {urgentReminders.map((reminder) => {
            const isOverdue = reminder.status === "overdue";
            const color = isOverdue ? "#FF6B6B" : "#F5A623";
            const bg = isOverdue
              ? "rgba(255,107,107,0.08)"
              : "rgba(245,166,35,0.08)";
            const border = isOverdue
              ? "rgba(255,107,107,0.3)"
              : "rgba(245,166,35,0.3)";
            const kmDiff = (reminder.dueOdometer || 0) - currentOdometer;
            const label = isOverdue
              ? isId
                ? `${reminder.serviceType} sudah terlambat!`
                : `${reminder.serviceType} is overdue!`
              : isId
              ? `${reminder.serviceType} dalam ${Math.abs(kmDiff).toLocaleString()} km lagi`
              : `${reminder.serviceType} in ${Math.abs(kmDiff).toLocaleString()} km`;

            return (
              <TouchableOpacity
                key={`rec-${reminder.id}`}
                onPress={() => onAddReminder?.(reminder.serviceType)}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: bg,
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: border,
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: color,
                    shadowColor: color,
                    shadowOpacity: 0.9,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 0 },
                  }}
                />
                <Text
                  style={{
                    color: color,
                    fontSize: 12,
                    fontWeight: "700",
                    flex: 1,
                  }}
                >
                  {label}
                </Text>
                <Text style={{ color: color, fontSize: 14 }}>→</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={{ gap: 8, paddingHorizontal: 20 }}>
        {/* Doc health reminders */}
        {hasDocHealth && vehicle.taxDueDate && (
          <DocReminderCard
            icon="🏛️"
            label={isId ? "Pajak Tahunan" : "Annual Tax"}
            date={formatDocDate(vehicle.taxDueDate)}
            days={taxDays}
            statusText={docStatusText(taxDays)}
            statusColor={getDocStatusColor(taxDays)}
          />
        )}
        {hasDocHealth && vehicle.stnkDueDate && (
          <DocReminderCard
            icon="📄"
            label={isId ? "STNK 5 Tahun" : "5-Year STNK"}
            date={formatDocDate(vehicle.stnkDueDate)}
            days={stnkDays}
            statusText={docStatusText(stnkDays)}
            statusColor={getDocStatusColor(stnkDays)}
          />
        )}

        {sorted.map((reminder) => {
          const cfg = STATUS_CONFIG[reminder.status] || STATUS_CONFIG.safe;
          const kmRemaining = (reminder.dueOdometer || 0) - currentOdometer;
          const formattedDate =
            reminder.dueDate instanceof Date
              ? reminder.dueDate.toLocaleDateString(isId ? "id-ID" : "en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "-";

          const isUrgent =
            reminder.status === "overdue" || reminder.status === "approaching";

          return (
            <TouchableOpacity
              key={reminder.id}
              onPress={() => onAddReminder?.(reminder.serviceType)}
              activeOpacity={0.8}
              style={{
                backgroundColor: "#1A2B3C",
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: isUrgent ? cfg.border : "rgba(255,255,255,0.06)",
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: cfg.bg,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: cfg.border,
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: cfg.color,
                    shadowColor: cfg.color,
                    shadowOpacity: 0.8,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 0 },
                  }}
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    {reminder.serviceType}
                  </Text>
                  {isUrgent && (
                    <View
                      style={{
                        backgroundColor: cfg.bg,
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{
                          color: cfg.color,
                          fontSize: 9,
                          fontWeight: "800",
                        }}
                      >
                        {reminder.status === "overdue"
                          ? isId
                            ? "MENDESAK"
                            : "URGENT"
                          : isId
                          ? "SEGERA"
                          : "SOON"}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                  {t("due")} {formattedDate} ·{" "}
                  {reminder.dueOdometer?.toLocaleString()} {t("km")}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: cfg.bg,
                  borderRadius: 10,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  alignItems: "center",
                  minWidth: 70,
                }}
              >
                <Text
                  style={{
                    color: cfg.color,
                    fontSize: 13,
                    fontFamily: "SpaceMono",
                    fontWeight: "700",
                  }}
                >
                  {kmRemaining > 0
                    ? `+${kmRemaining.toLocaleString()}`
                    : "NOW"}
                </Text>
                <Text
                  style={{
                    color: cfg.color,
                    fontSize: 9,
                    opacity: 0.7,
                    marginTop: 1,
                  }}
                >
                  {cfg.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {sorted.length === 0 && !hasDocHealth && (
          <View style={{ alignItems: "center", paddingVertical: 30, gap: 8 }}>
            <Text style={{ fontSize: 28 }}>🔔</Text>
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
              {isId
                ? "Tidak ada pengingat mendatang"
                : "No upcoming reminders"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Sub-component DocReminderCard (Sama seperti sebelumnya)
function DocReminderCard({
  icon,
  label,
  date,
  days,
  statusText,
  statusColor,
}: any) {
  const isUrgent = days !== null && days <= 90;
  return (
    <View
      style={{
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: isUrgent ? `${statusColor}40` : "rgba(255,255,255,0.06)",
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: isUrgent ? `${statusColor}08` : ("#1A2B3C" as any),
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: `${statusColor}15`,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: `${statusColor}30`,
        }}
      >
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
          {label}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
          {date}
        </Text>
      </View>
      <View
        style={{
          backgroundColor: `${statusColor}20`,
          borderRadius: 10,
          paddingVertical: 6,
          paddingHorizontal: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: statusColor, fontSize: 12, fontWeight: "700" }}>
          {statusText}
        </Text>
      </View>
    </View>
  );
}
