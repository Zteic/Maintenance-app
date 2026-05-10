import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, Modal, Dimensions, Platform } from 'react-native';
import { RepairEntry } from '@/types/maintenance';
import { useLanguage } from '@/context/LanguageContext';

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

const MONTH_NAMES_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const REPAIR_ICONS: any = {
  airFilter: require('../../assets/images/air-filter.png'),
  battery: require('../../assets/images/battery.png'),
  sparkPlug: require('../../assets/images/spark-plug.png'),
  brakePad: require('../../assets/images/brake-pad.png'),
  coolant: require('../../assets/images/Coolant.png'),
  engineOil: require('../../assets/images/engine-oil.png'),
  tire: require('../../assets/images/Tire.png'),
  caliper: require('../../assets/images/caliper.png'),
  gearOil: require('../../assets/images/gear-oil.png'),
  shock: require('../../assets/images/Shockbreaker.png'),
  vanbelt: require('../../assets/images/vanbelt.png'),
};

const getRepairIcon = (serviceType: string) => {
  if (!serviceType) return null;
  const type = serviceType.toLowerCase();

  if (type.includes('oli gardan') || type.includes('gear oil')) return REPAIR_ICONS.gearOil;
  if (type.includes('oli') || type.includes('oil')) return REPAIR_ICONS.engineOil;

  if (type.includes('ban') || type.includes('tire')) return REPAIR_ICONS.tire;

  if (type.includes('kaliper') || type.includes('pala babi') || type.includes('caliper')) return REPAIR_ICONS.caliper;
  if (type.includes('rem') || type.includes('brake') || type.includes('kampas')) return REPAIR_ICONS.brakePad;

  if (type.includes('skok') || type.includes('shock') || type.includes('skok') || type.includes('absorber')) return REPAIR_ICONS.shock;

  if (type.includes('vanbelt') || type.includes('v-belt') || type.includes('belt') || type.includes('timing belt')) return REPAIR_ICONS.vanbelt;

  if (type.includes('aki') || type.includes('battery')) return REPAIR_ICONS.battery;
  if (type.includes('busi') || type.includes('spark')) return REPAIR_ICONS.sparkPlug;
  if (type.includes('filter') || type.includes('air filter')) return REPAIR_ICONS.airFilter;
  if (type.includes('radiator') || type.includes('coolant')) return REPAIR_ICONS.coolant;

  return null; 
};

interface RepairHistoryProps {
  repairs: RepairEntry[];
  onEdit?: (entry: RepairEntry) => void;
  onDelete?: (id: string) => void;
}

export default function RepairHistory({ repairs = [], onEdit, onDelete }: RepairHistoryProps) {
  const [deleteRepairId, setDeleteRepairId] = useState<string | null>(null);
  const { t, lang } = useLanguage();
  const isId = lang === 'id';
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [fullPhoto, setFullPhoto] = useState<string | null>(null);

  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const monthNames = isId ? MONTH_NAMES_ID : MONTH_NAMES_EN;

  const repairDatesInMonth = new Set(
    repairs.filter((r) => {
      const d = r.date instanceof Date ? r.date : new Date(r.date);
      return d.getMonth() === calMonth && d.getFullYear() === calYear;
    }).map((r) => (r.date instanceof Date ? r.date : new Date(r.date)).getDate())
  );

  const sorted = [...repairs].sort((a, b) => {
    const dA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
    const dB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
    return dB - dA;
  });
  

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 30 }}>
  {/* ROW 1: Judul dan Tombol Add */}
  <View style={{ 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10
  }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ fontSize: 20 }}>🛠️</Text>
      <Text style={{ 
        color: '#FFFFFF', 
        fontSize: 18, 
        fontWeight: '800',
        letterSpacing: 0.5 
      }}>
        {isId ? "Riwayat Perbaikan" : "Repair History"}
      </Text>
    </View>
  </View>

  {/* ROW 2: Statistik Tanggal */}
  <View style={{ paddingHorizontal: 22, marginTop: 8 }}>
    <Text style={{ 
      color: 'rgba(255, 255, 255, 0.3)', 
      fontSize: 10, 
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1
    }}>
      {isId ? "CATATAN DARI" : "STATS FROM"}: {new Date().toISOString().split('T')[0]}
    </Text>
  </View>
  {sorted.map((repair) => {
    const { cleanNotes, receipts } = extractReceipts(repair.notes || '');
    const isExpanded = expandedId === repair.id;
    const customIcon = getRepairIcon(repair.serviceType);
    const actualDate = repair.date instanceof Date ? repair.date : new Date(repair.date);
    const dateStr = actualDate.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

    return (
      <View key={repair.id} style={{ backgroundColor: '#1A2B3C', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',marginBottom: 8 }}>
        <TouchableOpacity 
          onPress={() => setExpandedId(isExpanded ? null : repair.id)} 
          activeOpacity={0.9} 
          style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            paddingVertical: 12,
            paddingHorizontal: 16 
          }}
        >
          {/* Ikon Box */}
          <View style={{ 
  width: 45, // Ukuran sedikit diperbesar agar PNG terlihat jelas
  height: 45, 
  borderRadius: 12, 
  backgroundColor: 'rgba(255,255,255,0.03)', 
  alignItems: 'center', 
  justifyContent: 'center', 
  borderWidth: 1, 
  borderColor: 'rgba(255,255,255,0.05)' 
}}>
  {customIcon ? (
    <Image 
      source={customIcon} 
      style={{ width: 26, height: 26 }} 
      resizeMode="contain" 
    />
  ) : (
    <Text style={{ fontSize: 20 }}>🔧</Text>
  )}
</View>

          {/* Judul & Meta */}
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{repair.serviceType}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>
              {dateStr} • {repair.odometer.toLocaleString()} km
            </Text>
          </View>

          {/* Harga & Indikator */}
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#F5A623', fontSize: 14, fontWeight: '800', fontFamily: 'SpaceMono' }}>{formatCurrency(repair.cost)}</Text>
            <View style={{ marginTop: 8, opacity: 0.3 }}>
              <Text style={{ color: 'white', fontSize: 10 }}>{isExpanded ? '▲' : '▼'}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* DETAIL EXPANDED (Sesuai Gambar Kamu) */}
        {isExpanded && (
          <View style={{ padding: 18, paddingTop: 0, gap: 15 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* Bengkel */}
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 12 }}>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>BENGKEL</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 13 }}>{repair.workshop || '-'}</Text>
              </View>
              {/* Next Interval */}
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 12 }}>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>NEXT INTERVAL</Text>
                <Text style={{ color: '#4ECDC4', fontSize: 13, fontWeight: '700' }}>+{repair.nextIntervalKm?.toLocaleString() || '0'} km</Text>
              </View>
            </View>

            {/* KHUSUS INFO BAN (Hanya muncul jika ServiceType mengandung kata 'Ban') */}
{repair.serviceType.toLowerCase().includes('ban') && (
  <View style={{ 
    backgroundColor: 'rgba(255,255,255,0.02)', // Background tipis transparan
    borderRadius: 16, 
    padding: 16, 
    marginTop: 10,
    borderWidth: 1, 
    borderColor: 'rgba(78,205,196,0.2)' // Border teal halus
  }}>
    {/* Header: Info Ban */}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <Text style={{ fontSize: 14 }}>⚙️</Text>
      <Text style={{ color: '#4ECDC4', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 }}>
        {isId ? "Info Ban" : "Tire Info"}
      </Text>
    </View>

    <View style={{ gap: 16 }}>
      {/* 1. Posisi Ban */}
      <View>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5 }}>
          POSISI BAN
        </Text>
        <View style={{ 
          alignSelf: 'flex-start', 
          backgroundColor: 'rgba(78,205,196,0.15)', 
          paddingHorizontal: 30, // Dibuat lebar seperti tombol
          paddingVertical: 10, 
          borderRadius: 12, 
          borderWidth: 1.5, 
          borderColor: '#4ECDC4' 
        }}>
          <Text style={{ color: '#4ECDC4', fontSize: 14, fontWeight: '800' }}>
            {isId 
        ? (repair.tirePosition === 'front' ? 'Depan' : 'Belakang') 
        : (repair.tirePosition === 'front' ? 'Front' : 'Rear')}
          </Text>
        </View>
      </View>

      {/* 2. Merek & Ukuran (Dibuat Bersebelahan) */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5 }}>
            MEREK BAN
          </Text>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 10 }}>
             <Text style={{ color: '#FFF', fontSize: 14 }}>{repair.tireBrand || '-'}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5 }}>
            UKURAN
          </Text>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 10 }}>
            <Text style={{ color: '#FFF', fontSize: 14 }}>{repair.tireSize || '-'}</Text>
          </View>
        </View>
      </View>

      {/* 3. DOT / Kode Produksi */}
      <View>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5 }}>
          DOT / KODE PRODUKSI
        </Text>
        <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 12 }}>
          <Text style={{ 
            color: '#4ECDC4', 
            fontSize: 16, 
            fontWeight: '800', 
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            letterSpacing: 2
          }}>
            {repair.productionCode || 'N/A'}
          </Text>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, marginTop: 6 }}>
          mis. 2423 = minggu 24, tahun 2023
        </Text>
      </View>
    </View>
  </View>
)}

            {/* Catatan */}
            <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 12 }}>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>CATATAN</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 18 }}>
            {cleanNotes || 'Tidak ada catatan'}
          </Text>
        </View>

            {receipts.length > 0 && (
    <View style={{ marginTop: 12, gap: 8 }}>
    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' }}>BUKTI NOTA</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {receipts.length > 0 && (
  <View style={{ alignItems: 'flex-end', marginTop: 5 }}>
    <TouchableOpacity
      onPress={() => setFullPhoto(receipts[0])} // Mengambil gambar pertama
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(78,205,196,0.1)',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(78,205,196,0.3)',
      }}
    >
      <Text style={{ fontSize: 14, marginRight: 8 }}>📸</Text>
      <Text style={{ color: '#4ECDC4', fontSize: 12, fontWeight: '700' }}>
        Lihat Struk
      </Text>
    </TouchableOpacity>
  </View>
)}
    </View>
  </View>
)}

            {/* Tombol Aksi - Dibuat 2 Kolom Sejajar */}
<View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
  
  {/* Tombol Edit Perbaikan */}
  <TouchableOpacity 
    onPress={() => onEdit?.(repair)}
    activeOpacity={0.7}
    style={{ 
      flex: 1, 
      height: 45, 
      backgroundColor: 'rgba(245,166,35,0.1)', 
      borderRadius: 12, 
      borderWidth: 1, // Perbaikan dari borderWeight
      borderColor: 'rgba(245,166,35,0.2)', 
      alignItems: 'center', 
      justifyContent: 'center', 
      flexDirection: 'row', 
      gap: 8 
    }}
  >
    <Text>✏️</Text>
    <Text style={{ color: '#F5A623', fontWeight: '700', fontSize: 13 }}>
      {isId ? "Edit Perbaikan" : "Edit Repair"}
    </Text>
  </TouchableOpacity>

  {/* Tombol Hapus Perbaikan */}
  <TouchableOpacity 
    onPress={() => setDeleteRepairId(repair.id)}
    activeOpacity={0.7}
    style={{ 
      flex: 1, 
      height: 45, 
      backgroundColor: 'rgba(255,82,82,0.1)', 
      borderRadius: 12, 
      borderWidth: 1, 
      borderColor: 'rgba(255,82,82,0.2)', 
      alignItems: 'center', 
      justifyContent: 'center', 
      flexDirection: 'row', 
      gap: 8 
    }}
  >
    <Text>🗑️</Text>
    <Text style={{ color: '#FF5252', fontWeight: '700', fontSize: 13 }}>
      {isId ? "Hapus" : "Delete"}
    </Text>
  </TouchableOpacity>
</View>
          </View>
        )}
      </View>
    );
  })}

{/* MODAL */}
  <Modal 
    visible={!!fullPhoto} 
    transparent={true} 
    animationType="fade"
    onRequestClose={() => setFullPhoto(null)}
  >
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
      <TouchableOpacity 
        style={{ position: 'absolute', top: 50, right: 20, zIndex: 1 }}
        onPress={() => setFullPhoto(null)}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>✕ Tutup</Text>
      </TouchableOpacity>

      {fullPhoto && (
        <Image 
          source={{ uri: fullPhoto }} 
          style={{ width: SCREEN_WIDTH * 0.95, height: SCREEN_HEIGHT * 0.8 }} 
          resizeMode="contain" 
        />
      )}
      
      <TouchableOpacity 
        style={{ position: 'absolute', width: '100%', height: '100%', zIndex: -1 }} 
        onPress={() => setFullPhoto(null)} 
      />
    </View>
  </Modal>

  {/* Modal Konfirmasi Hapus Riwayat Servis */}
  <Modal visible={!!deleteRepairId} transparent animationType="fade">
    <View style={{ 
    flex: 1, 
    backgroundColor: 'rgba(7, 18, 28, 0.95)', 
    justifyContent: 'center', 
    alignItems: 'center' 
    }}>
    <View style={{ 
      width: '85%', 
      backgroundColor: '#162431', 
      borderRadius: 32, 
      padding: 30,
      alignItems: 'center'
    }}>
      {/* Visual Indicator */}
      <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 25 }} />

      <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 10 }}>
        {isId ? "Hapus Riwayat?" : "Delete History?"}
      </Text>
      
      <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: 14, lineHeight: 22, marginBottom: 35 }}>
        {isId 
          ? "Data perbaikan/servis ini akan dihapus permanen dari riwayat kendaraan." 
          : "This maintenance record will be permanently removed from your vehicle history."}
      </Text>

      <View style={{ width: '100%', gap: 12 }}>
        <TouchableOpacity 
  onPress={() => {
    if (deleteRepairId) {
      // Ganti handleConfirmDelete menjadi onDelete
      onDelete(deleteRepairId); 
      setDeleteRepairId(null);
    }
  }}
          activeOpacity={0.8}
          style={{ 
            width: '100%', 
            paddingVertical: 16, 
            borderRadius: 20, 
            backgroundColor: '#FF5252',
            alignItems: 'center'
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>
            {isId ? "Ya, Hapus Riwayat" : "Yes, Delete History"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setDeleteRepairId(null)}
          activeOpacity={0.6}
          style={{ 
            width: '100%', 
            paddingVertical: 16, 
            borderRadius: 20, 
            alignItems: 'center' 
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 15 }}>
            {isId ? "Batal" : "Cancel"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

</View>
  );
}