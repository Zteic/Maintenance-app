import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Reminder } from '@/types/maintenance';

interface RecommendationBannerProps {
  reminders: Reminder[];
  currentOdometer: number;
  onTap: (serviceType: string) => void;
}

export default function RecommendationBanner({
  reminders,
  currentOdometer,
  onTap,
}: RecommendationBannerProps) {
  const urgent = reminders.filter(
    (r) => r.status === 'overdue' || r.status === 'approaching'
  );

  if (urgent.length === 0) return null;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1.5 }}>
          SMART RECOMMENDATIONS
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
      >
        {urgent.map((reminder) => {
          const isOverdue = reminder.status === 'overdue';
          const color = isOverdue ? '#FF6B6B' : '#F5A623';
          const bg = isOverdue ? 'rgba(255,107,107,0.1)' : 'rgba(245,166,35,0.1)';
          const border = isOverdue ? 'rgba(255,107,107,0.3)' : 'rgba(245,166,35,0.3)';
          const kmDiff = reminder.dueOdometer - currentOdometer;
          const label = isOverdue
            ? `${reminder.serviceType} is overdue`
            : `${reminder.serviceType} due in ${Math.abs(kmDiff).toLocaleString()} km`;

          return (
            <TouchableOpacity
              key={reminder.id}
              onPress={() => onTap(reminder.serviceType)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: bg,
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: border,
                gap: 10,
                maxWidth: 260,
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
                  fontSize: 13,
                  fontWeight: '600',
                  flex: 1,
                  flexWrap: 'wrap',
                }}
              >
                {label}
              </Text>
              <Text style={{ color: color, fontSize: 14, opacity: 0.8 }}>→</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
