import React from 'react';
import { View, Text } from 'react-native';
import { Vehicle } from '@/types/maintenance';
import { useLanguage } from '@/context/LanguageContext';

interface DocumentHealthCardProps {
  vehicle: Vehicle;
}

function getDaysLeft(dateStr?: string): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function getStatusColor(days: number | null): string {
  if (days === null) return 'rgba(255,255,255,0.2)';
  if (days < 0) return '#FF6B6B';
  if (days <= 30) return '#FF6B6B';
  if (days <= 90) return '#F5A623';
  return '#4ECDC4';
}

function getStatusText(days: number | null, t: (k: any) => string): string {
  if (days === null) return '-';
  if (days < 0) return t('expired');
  return `${days} ${t('daysLeft')}`;
}

export default function DocumentHealthCard({ vehicle }: DocumentHealthCardProps) {
  const { t } = useLanguage();

  const taxDays = getDaysLeft(vehicle.taxDueDate);
  const stnkDays = getDaysLeft(vehicle.stnkDueDate);

  if (!vehicle.taxDueDate && !vehicle.stnkDueDate) return null;

  const taxColor = getStatusColor(taxDays);
  const stnkColor = getStatusColor(stnkDays);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <View style={{
      marginHorizontal: 20,
      backgroundColor: '#1A2B3C',
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
      gap: 14,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 16 }}>📋</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{t('documentHealth')}</Text>
      </View>

      {/* Documents */}
      <View style={{ gap: 10 }}>
        {vehicle.taxDueDate && (
          <DocRow
            icon="🏛️"
            label={t('taxExpiry')}
            date={formatDate(vehicle.taxDueDate)}
            statusText={getStatusText(taxDays, t)}
            statusColor={taxColor}
            days={taxDays}
          />
        )}
        {vehicle.stnkDueDate && (
          <DocRow
            icon="📄"
            label={t('stnkExpiry')}
            date={formatDate(vehicle.stnkDueDate)}
            statusText={getStatusText(stnkDays, t)}
            statusColor={stnkColor}
            days={stnkDays}
          />
        )}
      </View>
    </View>
  );
}

function DocRow({
  icon, label, date, statusText, statusColor, days,
}: {
  icon: string; label: string; date: string; statusText: string; statusColor: string; days: number | null;
}) {
  const isUrgent = days !== null && days <= 30;

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: isUrgent ? `${statusColor}15` : 'rgba(13,27,42,0.5)',
      borderRadius: 12, padding: 14, gap: 12,
      borderWidth: 1,
      borderColor: isUrgent ? `${statusColor}40` : 'rgba(255,255,255,0.04)',
    }}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 1 }}>{label}</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginTop: 2 }}>{date}</Text>
      </View>
      <View style={{
        paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8,
        backgroundColor: `${statusColor}20`,
        borderWidth: 1, borderColor: `${statusColor}50`,
      }}>
        <Text style={{ color: statusColor, fontSize: 11, fontWeight: '700' }}>{statusText}</Text>
      </View>
    </View>
  );
}
