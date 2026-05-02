import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { FuelEntry } from '@/types/maintenance';
import { useLanguage } from '@/context/LanguageContext';

interface FuelLogProps {
  fuelEntries: FuelEntry[];
  onAdd: () => void;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export default function FuelLog({ fuelEntries, onAdd }: FuelLogProps) {
  const { lang } = useLanguage();
  const isId = lang === 'id';

  const sorted = [...fuelEntries].sort((a, b) => b.date.localeCompare(a.date));

  // Calculate efficiency between consecutive entries
  const efficiencies: { km: number; liters: number; kmPerL: number; costPerKm: number; date: string }[] = [];
  const sortedAsc = [...fuelEntries].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = sortedAsc[i - 1];
    const curr = sortedAsc[i];
    const kmDiff = curr.odometer - prev.odometer;
    if (kmDiff > 0 && curr.liters > 0) {
      efficiencies.push({
        km: kmDiff,
        liters: curr.liters,
        kmPerL: kmDiff / curr.liters,
        costPerKm: (curr.totalCost) / kmDiff,
        date: curr.date,
      });
    }
  }

  const avgKmPerL = efficiencies.length > 0
    ? efficiencies.reduce((s, e) => s + e.kmPerL, 0) / efficiencies.length
    : null;

  const lastEff = efficiencies.length > 0 ? efficiencies[efficiencies.length - 1] : null;
  const prevEff = efficiencies.length > 1 ? efficiencies[efficiencies.length - 2] : null;

  const trendLabel = () => {
    if (!lastEff || !prevEff) return null;
    if (lastEff.kmPerL > prevEff.kmPerL * 1.05) return { text: isId ? '📈 Lebih Irit' : '📈 More Efficient', color: '#4ECDC4' };
    if (lastEff.kmPerL < prevEff.kmPerL * 0.95) return { text: isId ? '📉 Lebih Boros' : '📉 Less Efficient', color: '#FF6B6B' };
    return { text: isId ? '➡️ Stabil' : '➡️ Stable', color: '#F5A623' };
  };
  const trend = trendLabel();

  const totalFuelCost = fuelEntries.reduce((s, e) => s + e.totalCost, 0);
  const totalLiters = fuelEntries.reduce((s, e) => s + e.liters, 0);

  return (
    <View style={{ gap: 12 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>⛽ {isId ? 'Catatan BBM' : 'Fuel Log'}</Text>
        <TouchableOpacity onPress={onAdd} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(78,205,196,0.15)', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(78,205,196,0.3)' }}>
          <Text style={{ color: '#4ECDC4', fontSize: 16, fontWeight: '700' }}>+</Text>
          <Text style={{ color: '#4ECDC4', fontSize: 12, fontWeight: '600' }}>{isId ? 'Isi BBM' : 'Add Fuel'}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      {fuelEntries.length > 0 && (
        <View style={{ marginHorizontal: 20, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: '#1A2B3C', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(78,205,196,0.15)', gap: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1 }}>{isId ? 'RATA-RATA' : 'AVG EFFICIENCY'}</Text>
              <Text style={{ color: '#4ECDC4', fontSize: 18, fontWeight: '800', fontFamily: 'SpaceMono' }}>
                {avgKmPerL ? avgKmPerL.toFixed(1) : '-'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>km/liter</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#1A2B3C', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(245,166,35,0.15)', gap: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1 }}>{isId ? 'TOTAL BBM' : 'TOTAL FUEL'}</Text>
              <Text style={{ color: '#F5A623', fontSize: 18, fontWeight: '800', fontFamily: 'SpaceMono' }}>
                {totalLiters.toFixed(1)}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>liter</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: '#1A2B3C', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1 }}>{isId ? 'TOTAL BIAYA BBM' : 'TOTAL FUEL COST'}</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'SpaceMono' }}>
                {formatCurrency(totalFuelCost)}
              </Text>
            </View>
            {trend && (
              <View style={{ flex: 1, backgroundColor: '#1A2B3C', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 4, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: trend.color, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>{trend.text}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{isId ? 'Tren terakhir' : 'Latest trend'}</Text>
              </View>
            )}
          </View>

          {/* Efficiency Bar Chart (last 5 entries) */}
          {efficiencies.length > 1 && (
            <View style={{ backgroundColor: '#1A2B3C', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 10 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1 }}>{isId ? 'TREN EFISIENSI (KM/L)' : 'EFFICIENCY TREND (KM/L)'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 50 }}>
                {efficiencies.slice(-6).map((e, i) => {
                  const max = Math.max(...efficiencies.slice(-6).map(x => x.kmPerL));
                  const pct = max > 0 ? (e.kmPerL / max) : 0;
                  const isLast = i === Math.min(efficiencies.length, 6) - 1;
                  return (
                    <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, fontFamily: 'SpaceMono' }}>{e.kmPerL.toFixed(1)}</Text>
                      <View style={{ flex: 1, width: '100%', justifyContent: 'flex-end' }}>
                        <View style={{ height: Math.max(pct * 30, 4), borderRadius: 4, backgroundColor: isLast ? '#4ECDC4' : 'rgba(78,205,196,0.4)' }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Entry List */}
      {sorted.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
          <Text style={{ fontSize: 32 }}>⛽</Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{isId ? 'Belum ada catatan BBM' : 'No fuel records yet'}</Text>
        </View>
      ) : (
        <View style={{ gap: 8, paddingHorizontal: 20 }}>
          {sorted.map((entry, idx) => {
            const effIdx = efficiencies.findIndex(e => e.date === entry.date);
            const eff = effIdx >= 0 ? efficiencies[effIdx] : null;
            return (
              <View key={entry.id} style={{ backgroundColor: '#1A2B3C', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(78,205,196,0.1)', borderWidth: 1, borderColor: 'rgba(78,205,196,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18 }}>⛽</Text>
                    </View>
                    <View>
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>{entry.liters.toFixed(1)} L</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 1 }}>{entry.date} · {entry.odometer.toLocaleString()} km</Text>
                    </View>
                  </View>
                  <Text style={{ color: '#F5A623', fontSize: 14, fontWeight: '700', fontFamily: 'SpaceMono' }}>{formatCurrency(entry.totalCost)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1, backgroundColor: 'rgba(13,27,42,0.5)', borderRadius: 8, padding: 10, gap: 2 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: 1 }}>{isId ? 'HARGA/L' : 'PRICE/L'}</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600', fontFamily: 'SpaceMono' }}>{formatCurrency(entry.pricePerLiter)}</Text>
                  </View>
                  {eff && (
                    <View style={{ flex: 1, backgroundColor: 'rgba(13,27,42,0.5)', borderRadius: 8, padding: 10, gap: 2 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: 1 }}>KM/LITER</Text>
                      <Text style={{ color: '#4ECDC4', fontSize: 12, fontWeight: '700', fontFamily: 'SpaceMono' }}>{eff.kmPerL.toFixed(1)}</Text>
                    </View>
                  )}
                  {eff && (
                    <View style={{ flex: 1, backgroundColor: 'rgba(13,27,42,0.5)', borderRadius: 8, padding: 10, gap: 2 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: 1 }}>{isId ? 'BIAYA/KM' : 'COST/KM'}</Text>
                      <Text style={{ color: '#F5A623', fontSize: 12, fontWeight: '600', fontFamily: 'SpaceMono' }}>{formatCurrency(eff.costPerKm)}</Text>
                    </View>
                  )}
                </View>
                {entry.notes ? <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontStyle: 'italic' }}>{entry.notes}</Text> : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
