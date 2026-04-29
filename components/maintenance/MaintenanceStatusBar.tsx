import React from 'react';
import { View, Text } from 'react-native';
import { Reminder } from '@/types/maintenance';

interface MaintenanceStatusBarProps {
  reminders: Reminder[];
  currentOdometer: number;
  accentColor: string;
}

export default function MaintenanceStatusBar({
  reminders,
  currentOdometer,
  accentColor,
}: MaintenanceStatusBarProps) {
  const nextReminder = reminders
    .filter((r) => r.status !== 'overdue')
    .sort((a, b) => a.dueOdometer - b.dueOdometer)[0];

  if (!nextReminder) return null;

  const kmTraveled = currentOdometer - nextReminder.lastServiceOdometer;
  const progress = Math.min(kmTraveled / nextReminder.intervalKm, 1);
  const kmRemaining = Math.max(nextReminder.dueOdometer - currentOdometer, 0);

  const barColor =
    nextReminder.status === 'overdue'
      ? '#FF6B6B'
      : nextReminder.status === 'approaching'
      ? '#F5A623'
      : '#4ECDC4';

  return (
    <View
      style={{
        marginHorizontal: 20,
        backgroundColor: '#1A2B3C',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1.5 }}>
            NEXT SERVICE
          </Text>
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginTop: 2 }}>
            {nextReminder.serviceType}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{
              color: barColor,
              fontSize: 20,
              fontFamily: 'SpaceMono',
              fontWeight: '700',
            }}
          >
            {kmRemaining > 0 ? `${kmRemaining.toLocaleString()}` : '0'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>km remaining</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View
        style={{
          height: 8,
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${progress * 100}%`,
            backgroundColor: barColor,
            borderRadius: 4,
            shadowColor: barColor,
            shadowOpacity: 0.6,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
          Last service at {nextReminder.lastServiceOdometer.toLocaleString()} km
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
          Due at {nextReminder.dueOdometer.toLocaleString()} km
        </Text>
      </View>
    </View>
  );
}
