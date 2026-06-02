import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, StyleSheet, Switch } from 'react-native';
import { Vehicle } from '@/types/maintenance';
import { usePremium } from '@/context/PremiumContext'; 
import { LinearGradient } from 'expo-linear-gradient';

interface TaxCenterModalProps {
  visible: boolean;
  onClose: () => void;
  vehicle?: Vehicle;
}

// 🌐 MOCK DATA RULES (Sesuai Skema Tabel province_tax_rules di Supabase)
const PROVINCE_TAX_RULES: Record<string, any> = {
  'DKI Jakarta': { hasOpsen: false, pkbRate: 0.020, opsenRate: 0.0,  swdklljMotor: 35000, swdklljMobil: 143000, stnkMotor: 100000, stnkMobil: 200000, tnkbMotor: 60000, tnkbMobil: 100000, lateFeePercent: 0.02, maxLateMonth: 24, swdklljPenMotor: 32000, swdklljPenMobil: 100000 },
  'Jawa Barat':  { hasOpsen: true,  pkbRate: 0.012, opsenRate: 0.66, swdklljMotor: 35000, swdklljMobil: 143000, stnkMotor: 100000, stnkMobil: 200000, tnkbMotor: 60000, tnkbMobil: 100000, lateFeePercent: 0.02, maxLateMonth: 24, swdklljPenMotor: 32000, swdklljPenMobil: 100000 },
  'Banten':      { hasOpsen: true,  pkbRate: 0.012, opsenRate: 0.66, swdklljMotor: 35000, swdklljMobil: 143000, stnkMotor: 100000, stnkMobil: 200000, tnkbMotor: 60000, tnkbMobil: 100000, lateFeePercent: 0.02, maxLateMonth: 24, swdklljPenMotor: 32000, swdklljPenMobil: 100000 },
  'Jawa Tengah': { hasOpsen: true,  pkbRate: 0.012, opsenRate: 0.66, swdklljMotor: 35000, swdklljMobil: 143000, stnkMotor: 100000, stnkMobil: 200000, tnkbMotor: 60000, tnkbMobil: 100000, lateFeePercent: 0.02, maxLateMonth: 24, swdklljPenMotor: 32000, swdklljPenMobil: 100000 },
  'Jawa Timur':  { hasOpsen: true,  pkbRate: 0.012, opsenRate: 0.66, swdklljMotor: 35000, swdklljMobil: 143000, stnkMotor: 100000, stnkMobil: 200000, tnkbMotor: 60000, tnkbMobil: 100000, lateFeePercent: 0.02, maxLateMonth: 24, swdklljPenMotor: 32000, swdklljPenMobil: 100000 },
};
const PROVINCES = Object.keys(PROVINCE_TAX_RULES);

export default function TaxCenterModal({ visible, onClose, vehicle }: TaxCenterModalProps) {
  const { isPremium } = usePremium();

  // --- STATE POPUP DISCLAIMER ---
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  useEffect(() => { if (visible) setShowDisclaimer(true); }, [visible]);

  // --- STATE KENDARAAN ---
  const [selectedProvince, setSelectedProvince] = useState(PROVINCES[0]);
  const [vehicleCategory, setVehicleCategory] = useState<'Motor' | 'Mobil'>('Motor');
  const [njkbValue, setNjkbValue] = useState(''); 
  const [isLimaTahunan, setIsLimaTahunan] = useState(false);

  // --- STATE MODE KALKULATOR ---
  const [isManualMode, setIsManualMode] = useState(false);

  // --- STATE INPUT MANUAL ---
  const [manualPkbPokok, setManualPkbPokok] = useState('');
  const [manualPkbDenda, setManualPkbDenda] = useState('');
  const [manualOpsenPokok, setManualOpsenPokok] = useState('');
  const [manualOpsenDenda, setManualOpsenDenda] = useState('');
  const [manualSwdklljPokok, setManualSwdklljPokok] = useState('');
  const [manualSwdklljDenda, setManualSwdklljDenda] = useState('');

  // --- STATE CUSTOM SIMULASI (FITUR PREMIUM) ---
  const [customDurVal, setCustomDurVal] = useState('8');
  const [customDurUnit, setCustomDurUnit] = useState<'Bulan' | 'Tahun'>('Bulan');

  // ====================================================================
  // 🚀 ENGINE KALKULATOR TANGGAL & DENDA PAJAK REAKTIF (DINAMIS DAN REAL-TIME)
  // ====================================================================
  const rule = PROVINCE_TAX_RULES[selectedProvince];
  const njkbNum = Number(njkbValue.replace(/[^0-9]/g, '')) || 0;

  // Fungsi internal untuk menghitung hari, denda, dan status visual secara bersamaan
  const calculateTaxState = (addMonths: number) => {
    if (!vehicle?.taxDueDate) {
      return {
        days: null, daysLate: 0, monthsLate: 0, totalLateMonths: addMonths,
        statusColor: "#4ECDC4", progressWidth: "0%", isLate: false
      };
    }

    const targetDate = new Date(vehicle.taxDueDate);
    const currentDate = new Date();
    
    targetDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);

    const timeDiff = targetDate.getTime() - currentDate.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    const daysLate = daysLeft < 0 ? Math.abs(daysLeft) : 0;
    const monthsLate = daysLate > 0 ? Math.ceil(daysLate / 30) : 0;
    const totalLateMonths = monthsLate + addMonths;
    const isLate = daysLate > 0 || addMonths > 0;

    // Hitung Parameter Visual Berdasarkan Sisa Hari untuk Pajak Saat Ini (addMonths === 0)
    let statusColor = "#4ECDC4";
    let progressPercent = 100;

    if (daysLeft < 0) {
      statusColor = "#FF5252"; // Terlambat (Merah)
      progressPercent = 0;
    } else if (daysLeft <= 30) {
      statusColor = "#FF8C00"; // Sangat Dekat (Oranye Gelap)
      progressPercent = (daysLeft / 30) * 100;
    } else if (daysLeft <= 90) {
      statusColor = "#F5A623"; // Mendekati (Oranye Terang)
      progressPercent = (daysLeft / 90) * 100;
    } else {
      progressPercent = Math.min((daysLeft / 365) * 100, 100);
    }

    return {
      days: daysLeft,
      daysLate,
      monthsLate,
      totalLateMonths,
      statusColor,
      progressWidth: `${progressPercent}%`,
      isLate
    };
  };

  // Ekstrak info waktu saat ini (0 bulan tambahan)
  const currentTaxInfo = calculateTaxState(0);
  const days = currentTaxInfo.days;
  const statusColor = currentTaxInfo.statusColor;
  const progressWidth = currentTaxInfo.progressWidth;

  // 1. Hitung Komponen Pokok Murni
  const pkbPokok = Math.round(njkbNum * rule.pkbRate);
  const opsenPkbPokok = rule.hasOpsen ? Math.round(pkbPokok * rule.opsenRate) : 0;
  const swdklljPokok = vehicleCategory === 'Motor' ? rule.swdklljMotor : rule.swdklljMobil;
  const pnbpStnk = isLimaTahunan ? (vehicleCategory === 'Motor' ? rule.stnkMotor : rule.stnkMobil) : 0;
  const pnbpTnkb = isLimaTahunan ? (vehicleCategory === 'Motor' ? rule.tnkbMotor : rule.tnkbMobil) : 0;

  // 2. Fungsi Pencari Struktur Denda Akumulasi Komprehensif
  const getDetailedTax = (addMonths: number) => {
    const timeState = calculateTaxState(addMonths);
    const boundedLateMonths = Math.min(timeState.totalLateMonths, rule.maxLateMonth);

    const dPkb = Math.round(pkbPokok * boundedLateMonths * rule.lateFeePercent);
    const dOpsen = rule.hasOpsen ? Math.round(opsenPkbPokok * boundedLateMonths * rule.lateFeePercent) : 0;
    const dSwdkllj = timeState.isLate ? (vehicleCategory === 'Motor' ? rule.swdklljPenMotor : rule.swdklljPenMobil) : 0;

    const totalPokok = pkbPokok + opsenPkbPokok + swdklljPokok + pnbpStnk + pnbpTnkb;
    const totalDenda = dPkb + dOpsen + dSwdkllj;
    
    return {
      pkbPokok, opsenPkbPokok, swdklljPokok, pnbpStnk, pnbpTnkb,
      dPkb, dOpsen, dSwdkllj, totalPokok, totalDenda,
      grandTotal: totalPokok + totalDenda,
      isMaxPenalty: timeState.totalLateMonths >= rule.maxLateMonth,
      calculatedMonthsLate: timeState.totalLateMonths
    };
  };

  let currentTax;

  if (!isManualMode) {
    currentTax = getDetailedTax(0);
  } else {
    // Parsing input manual (menghapus format Rupiah)
    const pPokok = Number(manualPkbPokok.replace(/[^0-9]/g, '')) || 0;
    const pDenda = Number(manualPkbDenda.replace(/[^0-9]/g, '')) || 0;
    const oPokok = Number(manualOpsenPokok.replace(/[^0-9]/g, '')) || 0;
    const oDenda = Number(manualOpsenDenda.replace(/[^0-9]/g, '')) || 0;
    const sPokok = Number(manualSwdklljPokok.replace(/[^0-9]/g, '')) || 0;
    const sDenda = Number(manualSwdklljDenda.replace(/[^0-9]/g, '')) || 0;

    const totalPokokManual = pPokok + oPokok + sPokok + pnbpStnk + pnbpTnkb; // PNBP STNK/Plat tetap otomatis berdasarkan toggle 5 tahunan
    const totalDendaManual = pDenda + oDenda + sDenda;

    currentTax = {
      pkbPokok: pPokok,
      opsenPkbPokok: oPokok,
      swdklljPokok: sPokok,
      pnbpStnk, // Ambil dari variabel yg sudah ada
      pnbpTnkb, // Ambil dari variabel yg sudah ada
      dPkb: pDenda,
      dOpsen: oDenda,
      dSwdkllj: sDenda,
      totalPokok: totalPokokManual,
      totalDenda: totalDendaManual,
      grandTotal: totalPokokManual + totalDendaManual,
      isMaxPenalty: false, // Override
      calculatedMonthsLate: currentTaxInfo.totalLateMonths
    };
  }

  // --- LOGIKA CUSTOM SIMULASI MASA DEPAN ---
  const rawDurNum = parseInt(customDurVal) || 0;
  const customMonthsAdd = customDurUnit === 'Tahun' ? rawDurNum * 12 : rawDurNum;
  
  let validationWarning = '';
  if (customDurVal === '') validationWarning = 'Masukkan durasi simulasi terlebih dahulu.';
  else if (customMonthsAdd < 1) validationWarning = 'Durasi minimal adalah 1 Bulan.';
  else if (customMonthsAdd > 120) validationWarning = 'Durasi simulasi maksimal 10 tahun.';

  const validCustomMonths = Math.min(Math.max(customMonthsAdd, 1), 120);
  const customTax = getDetailedTax(validCustomMonths);
  const diffTax = customTax.grandTotal - currentTax.grandTotal;
  // ====================================================================

  // Fungsi Placeholder Pencarian NJKB Masa Depan
  const handleSearchNJKBPlaceholder = () => {
    alert("Fitur Cari NJKB Otomatis berdasarkan Merk/Model/Tahun akan segera hadir pada update data cloud berikutnya!");
  };

  return (
    <Modal visible={visible} animationType="none" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        
        {/* 🚨 POPUP OVERLAY DISCLAIMER (LEGAL & AKURASI TRANSPARAN) */}
        {showDisclaimer && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(7, 18, 28, 0.94)', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: 20 }]}>
            <View style={{ backgroundColor: '#1A2B3C', width: '100%', maxWidth: 350, borderRadius: 24, padding: 25, borderWidth: 1, borderColor: '#F5A623', alignItems: 'center' }}>
              <View style={{ width: 60, height: 60, backgroundColor: 'rgba(245,166,35,0.1)', borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 15, borderWidth: 1, borderColor: 'rgba(245,166,35,0.3)' }}>
                <Text style={{ fontSize: 28 }}>⚖️</Text>
              </View>
              <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>Pernyataan & Sanggahan</Text>
              
              <ScrollView style={{ maxHeight: 180, marginBottom: 20 }} showsVerticalScrollIndicator={true}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 20, textAlign: 'justify' }}>
                  Fitur Pajak Kendaraan merupakan <Text style={{ color: '#FFF', fontWeight: 'bold' }}>simulasi dan estimasi</Text> berdasarkan data NJKB yang dimasukkan pengguna. Besaran pajak resmi tetap mengacu pada informasi Samsat daerah masing-masing.{"\n\n"}
                  <Text style={{ color: '#FF5252', fontWeight: 'bold' }}>Aplikasi tidak terafiliasi dengan Samsat, Bapenda, Kepolisian Republik Indonesia, maupun instansi pemerintah lainnya.</Text>{"\n\n"}
                  Hasil yang ditampilkan merupakan simulasi estimasi dan tidak dapat dijadikan dasar bukti pembayaran resmi di Samsat.
                </Text>
              </ScrollView>
              
              <TouchableOpacity activeOpacity={0.8} onPress={() => setShowDisclaimer(false)} style={{ backgroundColor: '#F5A623', width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}>
                <Text style={{ color: '#0D1B2A', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }}>SAYA MENGERTI</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold' }}>×</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Tax Center Indonesia</Text>
            {/* 🚀 BADGE REVISI: Mencegah persepsi identik dengan Samsat riil */}
            <View style={{ backgroundColor: 'rgba(78,205,196,0.15)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginTop: 4, borderWidth: 1, borderColor: 'rgba(78,205,196,0.3)' }}>
              <Text style={{ color: '#4ECDC4', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>BETA - ESTIMASI PAJAK KENDARAAN</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* CARD 1: STATUS & CARD INFORMASI NJKB */}
          <View style={[styles.card, { borderColor: `${statusColor}50` }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 }}>
              <View style={{ width: 45, height: 45, borderRadius: 12, backgroundColor: `${statusColor}20`, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>{vehicleCategory === 'Motor' ? '🏍️' : '🚗'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '800' }}>Pajak Kendaraan</Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                  {vehicle?.name || 'Kendaraan'} • <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{vehicle?.plateNumber || '-'}</Text>
                </Text>
              </View>
            </View>

            <View style={{ marginBottom: 15 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' }}>Sisa Waktu Pajak Tahunan</Text>
                <Text style={{ color: statusColor, fontWeight: '900', fontSize: 14 }}>
                  {days !== null ? (days < 0 ? `Terlambat ${Math.abs(days)} Hari` : `${days} Hari Lagi`) : '-'}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: progressWidth, backgroundColor: statusColor }]} />
              </View>
            </View>

            {/* 📊 CARD INFORMASI KENDARAAN */}
            <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 12, marginBottom: 10 }}>
              <Text style={{ color: '#4ECDC4', fontSize: 11, fontWeight: '800', marginBottom: 10, letterSpacing: 0.5 }}>📊 INFORMASI KENDARAAN</Text>
              <View style={styles.resultRow}><Text style={styles.infoLabel}>Provinsi Registrasi</Text><Text style={styles.infoVal}>{selectedProvince}</Text></View>
              <View style={styles.resultRow}><Text style={styles.infoLabel}>Jenis Kendaraan</Text><Text style={styles.infoVal}>{vehicleCategory}</Text></View>
              <View style={styles.resultRow}><Text style={styles.infoLabel}>Tahun Kendaraan</Text><Text style={styles.infoVal}>{vehicle?.year || 'Tahun -'}</Text></View>
              <View style={[styles.resultRow, { marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }]}><Text style={styles.infoLabel}>Estimasi NJKB</Text><Text style={{ color: '#F5A623', fontSize: 13, fontWeight: '800' }}>Rp {njkbNum.toLocaleString('id-ID')}</Text></View>
              <Text style={styles.helperTextNote}>*NJKB digunakan sebagai dasar simulasi perhitungan PKB. Nilai resmi dapat berbeda sesuai data Samsat daerah.</Text>
             </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12 }}>
              <View style={{ flex: 1, paddingRight: 4 }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }}>JATUH TEMPO PAJAK</Text>
                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                  {vehicle?.taxDueDate 
                    ? new Date(vehicle.taxDueDate.replace(/-/g, '/')).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) 
                    : '-'}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', paddingLeft: 4 }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }}>MASA BERLAKU STNK</Text>
                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                  {vehicle?.stnkDueDate 
                    ? new Date(vehicle.stnkDueDate.replace(/-/g, '/')).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) 
                    : '-'}
                </Text>
              </View>
            </View>
          </View>

          {/* CARD 2: PENGATURAN INPUT (REVISI LABEL & ATURAN 5 TAHUNAN) */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>⚙️ Mari Berhitung </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
  <TouchableOpacity 
    onPress={() => setIsManualMode(false)} 
    style={[styles.typeBtn, !isManualMode && styles.typeBtnActive]}>
    <Text style={[styles.typeBtnText, !isManualMode && styles.typeBtnTextActive]}>🤖 Otomatis</Text>
  </TouchableOpacity>
  
  <TouchableOpacity 
    onPress={() => setIsManualMode(true)} 
    style={[styles.typeBtn, isManualMode && styles.typeBtnActive]}>
    <Text style={[styles.typeBtnText, isManualMode && styles.typeBtnTextActive]}>✍️ Manual</Text>
  </TouchableOpacity>
</View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 15 }}>
              {PROVINCES.map(prov => (
                <TouchableOpacity key={prov} onPress={() => setSelectedProvince(prov)} style={[styles.chip, selectedProvince === prov && styles.chipActive]}>
                  <Text style={[styles.chipText, selectedProvince === prov && styles.chipTextActive]}>{prov}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
              <TouchableOpacity onPress={() => setVehicleCategory('Motor')} style={[styles.typeBtn, vehicleCategory === 'Motor' && styles.typeBtnActive]}><Text style={[styles.typeBtnText, vehicleCategory === 'Motor' && styles.typeBtnTextActive]}>🏍️ Motor</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setVehicleCategory('Mobil')} style={[styles.typeBtn, vehicleCategory === 'Mobil' && styles.typeBtnActive]}><Text style={[styles.typeBtnText, vehicleCategory === 'Mobil' && styles.typeBtnTextActive]}>🚙 Mobil</Text></TouchableOpacity>
            </View>
            
            {!isManualMode ? (
              <View style={{ marginBottom: 15 }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>NJKB (Nilai Jual Kendaraan Bermotor)</Text>
                <InputRupiah label="Rp" value={njkbValue} onChangeText={setNjkbValue} placeholder="Cth: 11.800.000" />
                <Text style={styles.inputHelperText}>NJKB digunakan sebagai dasar simulasi perhitungan PKB. Nilai resmi dapat berbeda sesuai data Samsat daerah.</Text>
              </View>
            ) : (
              <View style={{ gap: 10, marginBottom: 15 }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>Input Rincian Pajak Manual</Text>
                <InputRupiah label="PKB Pokok" value={manualPkbPokok} onChangeText={setManualPkbPokok} />
                <InputRupiah label="Denda PKB" value={manualPkbDenda} onChangeText={setManualPkbDenda} />
                <InputRupiah label="Opsen Pokok" value={manualOpsenPokok} onChangeText={setManualOpsenPokok} />
                <InputRupiah label="Denda Opsen" value={manualOpsenDenda} onChangeText={setManualOpsenDenda} />
                <InputRupiah label="SWDKLLJ Pokok" value={manualSwdklljPokok} onChangeText={setManualSwdklljPokok} />
                <InputRupiah label="Denda SWDKLLJ" value={manualSwdklljDenda} onChangeText={setManualSwdklljDenda} />
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 12 }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>Perpanjangan STNK 5 Tahunan</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 3, lineHeight: 15 }}>Menambahkan biaya penerbitan STNK dan TNKB (plat nomor) sesuai ketentuan PNBP.</Text>
              </View>
              <Switch value={isLimaTahunan} onValueChange={setIsLimaTahunan} trackColor={{ false: '#3E4C59', true: '#4ECDC4' }} thumbColor="#FFF" />
            </View>
          </View>

          {/* CARD EDUKASI BARU: BAGAIMANA SIMULASI DIHITUNG */}
          <View style={styles.card}>
            <Text style={{ color: '#4ECDC4', fontSize: 12, fontWeight: '800', marginBottom: 12 }}>💡 BAGAIMANA SIMULASI DIHITUNG?</Text>
            <View style={{ alignItems: 'center', gap: 3, paddingVertical: 10 }}>
              <Text style={styles.flowText}>NJKB (Nilai Jual Dasar)</Text>
              <Text style={styles.flowArrow}>↓</Text>
              <Text style={styles.flowText}>PKB (Pajak Kendaraan Bermotor Pokok)</Text>
              <Text style={styles.flowArrow}>↓</Text>
              <Text style={styles.flowText}>Opsen PKB {rule.hasOpsen ? `(${rule.opsenRate * 100}% dr PKB)` : '(Tidak Berlaku di DKI)'}</Text>
              <Text style={styles.flowArrow}>↓</Text>
              <Text style={styles.flowText}>SWDKLLJ (Sumbangan Wajib Jasa Raharja)</Text>
              <Text style={styles.flowArrow}>↓</Text>
              <Text style={styles.flowText}>PNBP {isLimaTahunan ? '(Biaya Cetak STNK & Plat Nomor Aktif)' : '(Hanya Berlaku Siklus 5 Tahunan)'}</Text>
              <Text style={styles.flowArrow}>↓</Text>
              <Text style={{ color: '#F5A623', fontWeight: 'bold', fontSize: 12, textAlign: 'center' }}>Total Estimasi Pajak</Text>
            </View>
            <Text style={[styles.helperTextNote, { marginTop: 15 }]}>*Perhitungan menggunakan pendekatan NJKB sebagai dasar simulasi. Besaran pajak resmi dapat berbeda sesuai data Samsat.</Text>
          </View>

          {/* WARNING CARD JIKA AKUMULASI DENDA MAKSIMAL */}
          {currentTax.isMaxPenalty && (
            <View style={styles.warningLimitCard}>
              <Text style={{ fontSize: 18, marginRight: 10 }}>⚠</Text>
              <Text style={{ color: '#F5A623', fontSize: 12, fontWeight: 'bold', flex: 1, lineHeight: 18 }}>
                Estimasi denda telah mencapai batas maksimum sesuai konfigurasi provinsi ({rule.maxLateMonth} Bulan). Keterlambatan lebih lama belum tentu menambah nominal denda.
              </Text>
            </View>
          )}

          {/* CARD 3: RINCIAN KOMPONEN PAJAK (REVISI DETAIL ASAL-USUL BIAYA) */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📋 Rincian Komponen Pajak</Text>
            <View style={{ gap: 8, marginTop: 12 }}>
              <View style={styles.resultRow}><Text style={styles.resultLabel}>NJKB Dasar</Text><Text style={styles.resultVal}>Rp {njkbNum.toLocaleString('id-ID')}</Text></View>
              <View style={styles.resultRow}><Text style={styles.resultLabel}>PKB Pokok ({rule.pkbRate * 100}%)</Text><Text style={styles.resultVal}>Rp {pkbPokok.toLocaleString('id-ID')}</Text></View>
              {rule.hasOpsen && <View style={styles.resultRow}><Text style={styles.resultLabel}>Opsen PKB</Text><Text style={styles.resultVal}>Rp {opsenPkbPokok.toLocaleString('id-ID')}</Text></View>}
              <View style={styles.resultRow}><Text style={styles.resultLabel}>SWDKLLJ Pokok</Text><Text style={styles.resultVal}>Rp {swdklljPokok.toLocaleString('id-ID')}</Text></View>
              
              {isLimaTahunan && (
                <View style={{ backgroundColor: 'rgba(78,205,196,0.05)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(78,205,196,0.2)', marginVertical: 4 }}>
                  <Text style={{ color: '#4ECDC4', fontSize: 11, fontWeight: '800', marginBottom: 6 }}>🔄 RINCIAN PNBP PERPANJANGAN STNK</Text>
                  <View style={styles.resultRow}><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>PNBP STNK Baru</Text><Text style={{ color: '#FFF', fontWeight: 'bold' }}>Rp {pnbpStnk.toLocaleString('id-ID')}</Text></View>
                  <View style={styles.resultRow}><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>PNBP TNKB (Plat)</Text><Text style={{ color: '#FFF', fontWeight: 'bold' }}>Rp {pnbpTnkb.toLocaleString('id-ID')}</Text></View>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, marginTop: 6 }}>*Biaya ini merupakan PNBP (Penerimaan Negara Bukan Pajak) untuk penerbitan STNK dan TNKB.</Text>
                </View>
              )}
              
                {currentTaxInfo.daysLate > 0 && (
                <View style={{ backgroundColor: 'rgba(255,82,82,0.08)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,82,82,0.25)', marginVertical: 4 }}>
                  <Text style={{ color: '#FF5252', fontSize: 11, fontWeight: '800', marginBottom: 6 }}>🚨 ESTIMASI DENDA KETERLAMBATAN ({currentTaxInfo.monthsLate} Bulan)</Text>
                  <View style={styles.resultRow}><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Denda PKB</Text><Text style={{ color: '#FF5252', fontWeight: 'bold' }}>Rp {currentTax.dPkb.toLocaleString('id-ID')}</Text></View>
                  {rule.hasOpsen && (
                    <View style={styles.resultRow}>
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Estimasi Denda Opsen PKB</Text>
                      <Text style={{ color: '#FF5252', fontWeight: 'bold' }}>Rp {currentTax.dOpsen.toLocaleString('id-ID')}</Text>
                    </View>
                  )}
                  <View style={styles.resultRow}><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Denda SWDKLLJ</Text><Text style={{ color: '#FF5252', fontWeight: 'bold' }}>Rp {currentTax.dSwdkllj.toLocaleString('id-ID')}</Text></View>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, marginTop: 6 }}>*Perhitungan denda opsen dapat berbeda pada masing-masing daerah.</Text>
                </View>
              )}

              <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', marginTop: 8, paddingTop: 8 }}>
                <View style={styles.resultRow}><Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Total Pokok Murni</Text><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Rp {currentTax.totalPokok.toLocaleString('id-ID')}</Text></View>
                <View style={styles.resultRow}><Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Total Denda Akumulasi</Text><Text style={{ color: '#FF5252', fontSize: 12, fontWeight: '600' }}>Rp {currentTax.totalDenda.toLocaleString('id-ID')}</Text></View>
              </View>
            </View>
            
            <View style={styles.totalBox}>
              <Text style={{ color: '#0D1B2A', fontSize: 14, fontWeight: '800' }}>TOTAL ESTIMASI BAYAR</Text>
              <Text style={{ color: '#0D1B2A', fontSize: 26, fontWeight: '900' }}>Rp {currentTax.grandTotal.toLocaleString('id-ID')}</Text>
            </View>
          </View>

          {/* CARD 4: 👑 FITUR PREMIUM (CUSTOM SIMULASI DENGAN DEEP SUB-KOMPONEN) */}
          <LinearGradient colors={['#1E293B', '#0F172A']} style={[styles.card, { borderWidth: 1, borderColor: isPremium ? '#F5A623' : 'rgba(255,255,255,0.1)' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={[styles.sectionTitle, { color: isPremium ? '#F5A623' : '#FFF', marginBottom: 0 }]}>
                {isPremium ? '👑 Prediksi Masa Depan (Custom)' : '🔒 Fitur Premium'}
              </Text>
            </View>
            
            {isPremium ? (
              <View style={{ gap: 15 }}>
                {/* QUICK SIMULATION BARS */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[1, 3, 6].map(m => (
                    <View key={m} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 10, alignItems: 'center' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>+{m} Bln</Text>
                      <Text style={{ color: '#FF5252', fontSize: 11, fontWeight: '900' }}>{getDetailedTax(m).grandTotal >= 1000000 ? `${(getDetailedTax(m).grandTotal/1000000).toFixed(1)}jt` : `${(getDetailedTax(m).grandTotal/1000).toFixed(0)}rb`}</Text>
                    </View>
                  ))}
                </View>

                {/* CUSTOM INPUT DURATION */}
                <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                  <Text style={{ color: '#FFF', fontSize: 13, fontWeight: 'bold', marginBottom: 10 }}>Custom Simulasi Denda</Text>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <TextInput 
                      style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', color: '#FFF', padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}
                      value={customDurVal} onChangeText={setCustomDurVal} keyboardType="numeric" maxLength={3} placeholder="0" placeholderTextColor="rgba(255,255,255,0.2)"
                    />
                    <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4 }}>
                      <TouchableOpacity onPress={() => setCustomDurUnit('Bulan')} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: customDurUnit === 'Bulan' ? '#F5A623' : 'transparent' }}>
                        <Text style={{ color: customDurUnit === 'Bulan' ? '#0D1B2A' : '#FFF', fontSize: 12, fontWeight: 'bold' }}>Bulan</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setCustomDurUnit('Tahun')} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: customDurUnit === 'Tahun' ? '#F5A623' : 'transparent' }}>
                        <Text style={{ color: customDurUnit === 'Tahun' ? '#0D1B2A' : '#FFF', fontSize: 12, fontWeight: 'bold' }}>Tahun</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {validationWarning !== '' && (
                    <Text style={{ color: '#FF5252', fontSize: 11, marginTop: 8, fontWeight: 'bold' }}>⚠ {validationWarning}</Text>
                  )}
                </View>

                {/* HASIL CUSTOM SIMULASI */}
                {validationWarning === '' && (
                  <>
                    {/* Proyeksi Rincian Struktur Detail Sesuai Revisi */}
                    <View style={{ backgroundColor: 'rgba(245,166,35,0.08)', borderRadius: 14, padding: 15, borderWidth: 1, borderColor: 'rgba(245,166,35,0.25)' }}>
                      <Text style={{ color: '#F5A623', fontSize: 12, fontWeight: '800', marginBottom: 12 }}>🔮 Jika Dibayar: {customDurVal} {customDurUnit} Lagi</Text>
                      
                      <View style={styles.premiumDetailRow}><Text style={styles.premiumDetailLabel}>PKB Pokok</Text><Text style={styles.premiumDetailVal}>Rp {customTax.pkbPokok.toLocaleString('id-ID')}</Text></View>
                      {rule.hasOpsen && <View style={styles.premiumDetailRow}><Text style={styles.premiumDetailLabel}>Opsen PKB Pokok</Text><Text style={styles.premiumDetailVal}>Rp {customTax.opsenPkbPokok.toLocaleString('id-ID')}</Text></View>}
                      <View style={styles.premiumDetailRow}><Text style={styles.premiumDetailLabel}>SWDKLLJ Pokok</Text><Text style={styles.premiumDetailVal}>Rp {customTax.swdklljPokok.toLocaleString('id-ID')}</Text></View>
                      {isLimaTahunan && (
                        <>
                          <View style={styles.premiumDetailRow}><Text style={styles.premiumDetailLabel}>PNBP STNK</Text><Text style={styles.premiumDetailVal}>Rp {customTax.pnbpStnk.toLocaleString('id-ID')}</Text></View>
                          <View style={styles.premiumDetailRow}><Text style={styles.premiumDetailLabel}>PNBP TNKB</Text><Text style={styles.premiumDetailVal}>Rp {customTax.pnbpTnkb.toLocaleString('id-ID')}</Text></View>
                        </>
                      )}
                      
                      <View style={[styles.premiumDetailRow, { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }]}><Text style={styles.premiumDetailLabel}>Denda PKB</Text><Text style={{ color: '#FF5252', fontSize: 12 }}>Rp {customTax.dPkb.toLocaleString('id-ID')}</Text></View>
                      {rule.hasOpsen && <View style={styles.premiumDetailRow}><Text style={styles.premiumDetailLabel}>Estimasi Denda Opsen</Text><Text style={{ color: '#FF5252', fontSize: 12 }}>Rp {customTax.dOpsen.toLocaleString('id-ID')}</Text></View>}
                      <View style={styles.premiumDetailRow}><Text style={styles.premiumDetailLabel}>Denda SWDKLLJ</Text><Text style={{ color: '#FF5252', fontSize: 12 }}>Rp {customTax.dSwdkllj.toLocaleString('id-ID')}</Text></View>
                      
                      <View style={styles.premiumTotalSummaryBox}>
                        <View style={styles.resultRow}><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Estimasi Komponen Pajak</Text><Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>Rp {customTax.totalPokok.toLocaleString('id-ID')}</Text></View>
                        <View style={styles.resultRow}><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Estimasi Denda Tertunda</Text><Text style={{ color: '#FF5252', fontWeight: 'bold', fontSize: 12 }}>Rp {customTax.totalDenda.toLocaleString('id-ID')}</Text></View>
                        <View style={[styles.resultRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }]}><Text style={{ color: '#FFF', fontSize: 13, fontWeight: 'bold' }}>Total Proyeksi Pembayaran</Text><Text style={{ color: '#F5A623', fontWeight: '900', fontSize: 15 }}>Rp {customTax.grandTotal.toLocaleString('id-ID')}</Text></View>
                      </View>
                    </View>

                    {/* Perbandingan Selisih Kerugian */}
                    <View style={{ backgroundColor: 'rgba(255,82,82,0.1)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,82,82,0.2)' }}>
                      <Text style={{ color: '#FF5252', fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>Perbandingan Konsekuensi Menunda</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Jika Dibayar Hari Ini</Text><Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>Rp {currentTax.grandTotal.toLocaleString('id-ID')}</Text></View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 }}><Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Jika {customDurVal} {customDurUnit} Lagi</Text><Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>Rp {customTax.grandTotal.toLocaleString('id-ID')}</Text></View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,82,82,0.2)' }}><Text style={{ color: '#FF5252', fontSize: 11, fontWeight: 'bold' }}>Kerugian Selisih Beban</Text><Text style={{ color: '#FF5252', fontSize: 12, fontWeight: '900' }}>+ Rp {diffTax.toLocaleString('id-ID')}</Text></View>
                    </View>

                    {/* Premium Smart Warning Max Penalty */}
                    {customTax.isMaxPenalty && (
                      <View style={[styles.warningLimitCard, { marginTop: 0 }]}>
                        <Text style={{ fontSize: 16, marginRight: 8 }}>⚠</Text>
                        <Text style={{ color: '#F5A623', fontSize: 11, fontWeight: 'bold', flex: 1 }}>
                          Denda sudah mencapai batas maksimum sesuai aturan daerah. Penundaan lebih lama tidak akan menaikkan denda PKB dasar.
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginBottom: 15, lineHeight: 18 }}>
                  Buka kunci Premium untuk melihat analisis breakdown asal-usul denda secara transparan hingga jangka waktu 10 Tahun ke depan.
                </Text>
              </View>
            )}
          </LinearGradient>

        </ScrollView>
      </View>
    </Modal>
  );
}

// --- SUB KOMPONEN INPUT ---
const InputRupiah = ({ label, value, onChangeText, placeholder }: any) => {
  const formatUang = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    return raw ? parseInt(raw).toLocaleString('id-ID') : '';
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', height: 50 }}>
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 'bold' }}>{label}</Text>
      <TextInput style={{ color: '#4ECDC4', fontSize: 15, fontWeight: 'bold', flex: 1, textAlign: 'right' }} keyboardType="numeric" placeholder={placeholder || "0"} placeholderTextColor="rgba(255,255,255,0.2)" value={formatUang(value)} onChangeText={onChangeText} />
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#1A2B3C', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  closeBtn: { padding: 5 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  scrollContent: { padding: 15, paddingBottom: 100 },
  card: { backgroundColor: '#1A2B3C', borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  progressTrack: { height: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  progressBar: { height: '100%', borderRadius: 4 },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  totalBox: { marginTop: 18, backgroundColor: '#4ECDC4', padding: 20, borderRadius: 16, alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chipActive: { backgroundColor: 'rgba(78,205,196,0.1)', borderColor: '#4ECDC4' },
  chipText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 'bold' },
  chipTextActive: { color: '#4ECDC4' },
  typeBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  typeBtnActive: { backgroundColor: 'rgba(245,166,35,0.1)', borderColor: '#F5A623' },
  typeBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 'bold' },
  typeBtnTextActive: { color: '#F5A623' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  resultLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  resultVal: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  inputHelperText: { color: 'rgba(255,255,255,0.35)', fontSize: 10.5, marginTop: 6, lineHeight: 15, paddingHorizontal: 2 },
  helperTextNote: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontStyle: 'italic', lineHeight: 14, textAlign: 'justify' },
  infoLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  infoVal: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  flowText: { color: '#FFF', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  flowArrow: { color: 'rgba(255,255,255,0.3)', fontSize: 14, marginVertical: 2, textAlign: 'center' },
  placeholderSearchCard: { backgroundColor: '#132230', borderRadius: 16, padding: 16, marginBottom: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(78,205,196,0.3)', flexDirection: 'row', alignItems: 'center', gap: 10 },
  comingSoonBadge: { backgroundColor: 'rgba(245,166,35,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(245,166,35,0.25)' },
  comingSoonText: { color: '#F5A623', fontSize: 10, fontWeight: 'bold' },
  warningLimitCard: { backgroundColor: 'rgba(245,166,35,0.08)', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(245,166,35,0.3)', flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  premiumDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  premiumDetailLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 11.5 },
  premiumDetailVal: { color: '#FFF', fontSize: 11.5, fontWeight: '600' },
  premiumTotalSummaryBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', gap: 3 }
});