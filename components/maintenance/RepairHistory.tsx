import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { RepairEntry } from '@/types/maintenance';
import { useLanguage } from '@/context/LanguageContext';

interface RepairHistoryProps {
  repairs: RepairEntry[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function extractReceipts(notes: string): { cleanNotes: string; receipts: string[] } {
  const match = notes.match(/\[receipts:(.*?)\]/);
  if (match) {
    return {
      cleanNotes: notes.replace(/\n?\[receipts:.*?\]/, '').trim(),
      receipts: match[1].split(',').filter(Boolean),
    };
  }
  return { cleanNotes: notes, receipts: [] };
}

export default function RepairHistory({ repairs }: RepairHistoryProps) {
  const { t, lang } = useLanguage();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...repairs].sort((a, b) => b.date.getTime() - a.date.getTime());

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
        <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>{t('repairHistory')}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{repairs.length} {t('records')}</Text>
      </View>

      {sorted.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
          <Text style={{ fontSize: 32 }}>🔧</Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{t('noRepairs')}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{t('tapPlusToAdd')}</Text>
        </View>
      )}

      <View style={{ gap: 8, paddingHorizontal: 20 }}>
        {sorted.map((repair) => {
          const isExpanded = expandedId === repair.id;
          const dateStr = repair.date.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          const { cleanNotes, receipts } = extractReceipts(repair.notes || '');

          return (
            <TouchableOpacity
              key={repair.id}
              onPress={() => setExpandedId(isExpanded ? null : repair.id)}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#1A2B3C',
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              {/* Header Row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  gap: 12,
                }}
              >
                {/* Icon */}
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: 'rgba(245,166,35,0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(245,166,35,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18 }}>🔧</Text>
                </View>

                {/* Details */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                    {repair.serviceType}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>
                    {dateStr} · {repair.odometer.toLocaleString()} {t('km')}
                  </Text>
                </View>

                {/* Cost */}
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ color: '#F5A623', fontSize: 14, fontWeight: '700' }}>
                    {formatCurrency(repair.cost)}
                  </Text>
                  <View
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      borderRadius: 4,
                      paddingVertical: 2,
                      paddingHorizontal: 6,
                    }}
                  >
                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                      {isExpanded ? '▲' : '▼'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Expanded Content */}
              {isExpanded && (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.06)',
                    padding: 16,
                    gap: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(13,27,42,0.6)',
                        borderRadius: 10,
                        padding: 12,
                        gap: 4,
                      }}
                    >
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1 }}>
                        {t('workshop').toUpperCase()}
                      </Text>
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '500' }}>
                        {repair.workshop}
                      </Text>
                    </View>
                    {repair.nextIntervalKm && (
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: 'rgba(13,27,42,0.6)',
                          borderRadius: 10,
                          padding: 12,
                          gap: 4,
                        }}
                      >
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1 }}>
                          NEXT INTERVAL
                        </Text>
                        <Text style={{ color: '#4ECDC4', fontSize: 13, fontWeight: '600', fontFamily: 'SpaceMono' }}>
                          +{repair.nextIntervalKm.toLocaleString()} {t('km')}
                        </Text>
                      </View>
                    )}
                  </View>

                  {cleanNotes ? (
                    <View
                      style={{
                        backgroundColor: 'rgba(13,27,42,0.6)',
                        borderRadius: 10,
                        padding: 12,
                        gap: 4,
                      }}
                    >
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1 }}>
                        {t('notes')}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20 }}>
                        {cleanNotes}
                      </Text>
                    </View>
                  ) : null}

                  {/* Receipt images */}
                  {receipts.length > 0 && (
                    <View
                      style={{
                        backgroundColor: 'rgba(13,27,42,0.6)',
                        borderRadius: 10,
                        padding: 12,
                        gap: 8,
                      }}
                    >
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1 }}>
                        {t('uploadReceipt').toUpperCase()}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {receipts.map((uri, idx) => (
                          <Image
                            key={idx}
                            source={{ uri }}
                            style={{ width: 80, height: 80, borderRadius: 8 }}
                            resizeMode="cover"
                          />
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
