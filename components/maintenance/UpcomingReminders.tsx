import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Reminder } from '@/types/maintenance';
import { useLanguage } from '@/context/LanguageContext';

interface UpcomingRemindersProps {
  reminders: Reminder[];
  currentOdometer: number;
  onAddReminder?: (serviceType: string) => void;
}

export default function UpcomingReminders({
  reminders,
  currentOdometer,
  onAddReminder,
}: UpcomingRemindersProps) {
  const { t, lang } = useLanguage();

  const STATUS_CONFIG = {
    safe: { color: '#4ECDC4', bg: 'rgba(78,205,196,0.1)', label: t('onTrack'), border: 'rgba(78,205,196,0.2)' },
    approaching: { color: '#F5A623', bg: 'rgba(245,166,35,0.1)', label: t('approaching'), border: 'rgba(245,166,35,0.2)' },
    overdue: { color: '#FF6B6B', bg: 'rgba(255,107,107,0.1)', label: t('overdue'), border: 'rgba(255,107,107,0.2)' },
  };

  const sorted = [...reminders].sort((a, b) => {
    const order = { overdue: 0, approaching: 1, safe: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>{t('upcomingReminders')}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{reminders.length} {t('items')}</Text>
      </View>

      <View style={{ gap: 8, paddingHorizontal: 20 }}>
        {sorted.map((reminder) => {
          const cfg = STATUS_CONFIG[reminder.status];
          const kmRemaining = reminder.dueOdometer - currentOdometer;
          const formattedDate = reminder.dueDate.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          return (
            <TouchableOpacity
              key={reminder.id}
              onPress={() => onAddReminder?.(reminder.serviceType)}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#1A2B3C',
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: cfg.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}
            >
              {/* Status dot */}
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: cfg.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
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

              {/* Content */}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                  {reminder.serviceType}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  {t('due')} {formattedDate} · {reminder.dueOdometer.toLocaleString()} {t('km')}
                </Text>
              </View>

              {/* KM Badge */}
              <View
                style={{
                  backgroundColor: cfg.bg,
                  borderRadius: 10,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  alignItems: 'center',
                  minWidth: 70,
                }}
              >
                <Text
                  style={{
                    color: cfg.color,
                    fontSize: 13,
                    fontFamily: 'SpaceMono',
                    fontWeight: '700',
                  }}
                >
                  {kmRemaining > 0 ? `+${kmRemaining.toLocaleString()}` : 'NOW'}
                </Text>
                <Text style={{ color: cfg.color, fontSize: 9, opacity: 0.7, marginTop: 1 }}>
                  {cfg.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
