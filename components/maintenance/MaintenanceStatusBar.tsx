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
  
  // 1. URUTKAN BERDASARKAN PRIORITAS (Overdue paling atas, lalu Approaching, lalu sisa KM)
  const nextReminder = [...reminders].sort((a, b) => {
    const getScore = (item: Reminder) => {
      if (item.status === 'overdue') return -100000;
      if (item.status === 'approaching') return -50000;
      return item.dueOdometer - currentOdometer;
    };
    return getScore(a) - getScore(b);
  })[0];

  if (!nextReminder) return null;

  // 2. HITUNG PROGRESS
  // Jika sudah overdue, progress bar harus penuh (100%)
  const isOverdue = nextReminder.status === 'overdue';
  const kmTraveled = currentOdometer - nextReminder.lastServiceOdometer;
  const progress = isOverdue ? 1 : Math.min(kmTraveled / nextReminder.intervalKm, 1);
  const kmRemaining = Math.max(nextReminder.dueOdometer - currentOdometer, 0);

  // 3. WARNA DINAMIS
  const barColor =
    isOverdue
      ? '#FF6B6B' // Merah jika telat
      : nextReminder.status === 'approaching'
      ? '#F5A623' // Oranye jika mendekati
      : '#4ECDC4'; // Hijau jika aman

  return (
    <View
      style={{
        marginHorizontal: 20,
        backgroundColor: '#1A2B3C',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: isOverdue ? 'rgba(255,107,107,0.2)' : 'rgba(255,255,255,0.06)',
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ color: isOverdue ? '#FF6B6B' : 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1.5, fontWeight: '800' }}>
            {isOverdue ? 'SERVICE OVERDUE' : 'NEXT SERVICE'}
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
            {isOverdue ? 'NOW' : `${kmRemaining.toLocaleString()}`}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
            {isOverdue ? 'action required' : 'km remaining'}
          </Text>
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
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
          Last {nextReminder.lastServiceOdometer.toLocaleString()} km
        </Text>
        <Text style={{ color: isOverdue ? 'rgba(255,107,107,0.5)' : 'rgba(255,255,255,0.3)', fontSize: 11 }}>
          {isOverdue ? 'Was due at' : 'Due at'} {nextReminder.dueOdometer.toLocaleString()} km
        </Text>
      </View>
    </View>
  );
}