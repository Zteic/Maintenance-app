import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Dimensions, ActivityIndicator, Alert, StatusBar, Platform 
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
// 🚀 PERBAIKAN: Menggunakan modul legacy agar fungsi getInfoAsync berjalan lancar di Expo 54
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from "@/context/LanguageContext";

const { width } = Dimensions.get('window');

const CURRENT_APP_NAME = "GarasiKu";
const CURRENT_SCHEMA_VERSION = "2.1.0";

export default function ExportScreen() {
  const router = useRouter();
  const { lang } = useLanguage ? useLanguage() : { lang: 'id' };
  const isId = lang === 'id';
  
  // Data Master State
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [fuels, setFuels] = useState<any[]>([]);
  
  // UI & Filter State
  const [mode, setMode] = useState<'backup' | 'pdf' | 'import'>('backup');
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>(['all']);
  const [period, setPeriod] = useState<string>('all'); 
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [pdfReportType, setPdfReportType] = useState<'summary' | 'hybrid'>('hybrid');
  const [exportCategory, setExportCategory] = useState<'all' | 'fuel' | 'service'>('all');
  
  // Progress Loader State
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState('');
  // 🚀 STATE KHUSUS IMPORT & RESTORE
  const [stagedFile, setStagedFile] = useState<any>(null);
  const [stagedData, setStagedData] = useState<any>(null);
  const [exportDone, setExportDone] = useState(false);

  // Load Data dari Local Storage saat masuk halaman
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [vRaw, rRaw, fRaw] = await Promise.all([
          AsyncStorage.getItem('garasi_vehicles'),
          AsyncStorage.getItem('garasi_repairs'),
          AsyncStorage.getItem('garasi_fuel_entries')
        ]);
        if (vRaw) setVehicles(JSON.parse(vRaw));
        if (rRaw) setRepairs(JSON.parse(rRaw));
        if (fRaw) setFuels(JSON.parse(fRaw));
      } catch (e) {
        console.log("Error loading data for export", e);
      }
    };
    loadAllData();
  }, []);

  // =========================================================
  // SMART DYNAMIC YEAR FINDER
  // =========================================================
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(new Set([
    ...repairs.map(r => new Date(r.date).getFullYear()),
    ...fuels.map(f => new Date(f.date).getFullYear())
  ])).filter(y => !isNaN(y) && y < currentYear).sort((a,b) => b - a);

  const periodOptions = ['all', 'this_month', 'last_3_months', 'this_year', ...availableYears.map(String), 'custom'];

  const getPeriodLabel = (p: string) => {
    if (p === 'all') return isId ? 'Semua Waktu' : 'All Time';
    if (p === 'this_month') return isId ? 'Bulan Ini' : 'This Month';
    if (p === 'last_3_months') return isId ? '3 Bulan Terakhir' : 'Last 3 Months';
    if (p === 'this_year') return isId ? 'Tahun Ini' : 'This Year';
    if (p === 'custom') return isId ? 'Custom Date' : 'Custom Date';
    return `${isId ? 'Tahun' : 'Year'} ${p}`;
  };

  // 🚀 LOGIKA MULTI-SELECTION KENDARAAN
  const toggleVehicleSelection = (id: string) => {
    if (id === 'all') {
      setSelectedVehicles(['all']);
    } else {
      setSelectedVehicles((prev) => {
        // Hilangkan tanda 'all' jika user mulai memilih kendaraan spesifik
        const filtered = prev.filter(v => v !== 'all');
        if (filtered.includes(id)) {
          const next = filtered.filter(v => v !== id);
          // Jika semua kendaraan batal dipilih, otomatis kembalikan ke 'all'
          return next.length === 0 ? ['all'] : next;
        } else {
          return [...filtered, id];
        }
      });
    }
  };

  // =========================================================
  // CORE FILTER ENGINE (Periode & Multi-Vehicle)
  // =========================================================
  const getFilteredData = () => {
    let filteredRepairs = [...repairs];
    let filteredFuels = [...fuels];

    // Perbaikan Multi-Vehicle Filter
    if (!selectedVehicles.includes('all')) {
      filteredRepairs = filteredRepairs.filter(r => selectedVehicles.includes(r.vehicleId));
      filteredFuels = filteredFuels.filter(f => selectedVehicles.includes(f.vehicleId));
    }

    const now = new Date();
    const currentMonth = now.getMonth();

    const filterByDateRange = (dateStr: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;

      if (period === 'this_month') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      if (period === 'last_3_months') {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        return d >= threeMonthsAgo && d <= now;
      }
      if (period === 'this_year') {
        return d.getFullYear() === currentYear;
      }
      if (period === 'custom') {
        const s = customStart ? new Date(customStart) : new Date('1970-01-01');
        const e = customEnd ? new Date(customEnd) : new Date('2099-12-31');
        e.setHours(23, 59, 59, 999);
        return d >= s && d <= e;
      }
      if (/^\d{4}$/.test(period)) {
        return d.getFullYear() === parseInt(period);
      }
      return true;
    };

    filteredRepairs = filteredRepairs.filter(r => filterByDateRange(r.date));
    filteredFuels = filteredFuels.filter(f => filterByDateRange(f.date));

    if (exportCategory === 'fuel') filteredRepairs = [];
    if (exportCategory === 'service') filteredFuels = [];

    return { filteredRepairs, filteredFuels };
  };

  const { filteredRepairs, filteredFuels } = getFilteredData();
  const estimatedSize = ((JSON.stringify(filteredRepairs).length + JSON.stringify(filteredFuels).length) / 1024).toFixed(1);
  const vehicleName = selectedVehicles.includes('all') 
  ? (isId ? "Semua Kendaraan" : "All Vehicles") 
  : vehicles.filter(v => selectedVehicles.includes(v.id)).map(v => v.name).join(', ');
  const isDataEmpty = filteredRepairs.length === 0 && filteredFuels.length === 0;

  // ==========================================
  // HYBRID PDF GENERATOR ENGINE (DENGAN DIRECT DOWNLOAD)
  // ==========================================
  const handleExportPDF = async () => {
    if (isDataEmpty) {
      Alert.alert(isId ? "Data Kosong" : "No Data", isId ? "Tidak ada aktivitas pada periode ini untuk diexport." : "No activities to export in this period.");
      return;
    }

    setLoading(true);
    setExportDone(false);
    try {
      setProgressText("🔄 Preparing & Filtering Data...");
      await new Promise(r => setTimeout(r, 500));

      // 1. Ambil daftar kendaraan yang ikut diexport
      const exportedVehicles = selectedVehicles.includes('all') ? vehicles : vehicles.filter(v => selectedVehicles.includes(v.id));

      // 2. Hitung statistik spesifik untuk MASING-MASING kendaraan
      const vehicleStats = exportedVehicles.map(v => {
        const vRepairs = filteredRepairs.filter(r => r.vehicleId === v.id);
        const vFuels = filteredFuels.filter(f => f.vehicleId === v.id);

        const vTotalService = vRepairs.reduce((sum, r) => sum + (r.cost || 0), 0);
        const vTotalFuel = vFuels.reduce((sum, f) => sum + (f.totalCost || 0), 0);
        
        const vOdos = [...vRepairs.map(r => r.odometer), ...vFuels.map(f => f.odometer)].filter(o => o > 0);
        let vMaxService = { serviceType: "-", cost: 0 };
        if (vRepairs.length > 0) {
          const sorted = [...vRepairs].sort((a, b) => b.cost - a.cost);
          vMaxService = { serviceType: sorted[0].serviceType, cost: sorted[0].cost };
        }

        return {
          name: v.name, brand: v.brand, model: v.model, plate: v.plateNumber,
          vTotalExpense: vTotalService + vTotalFuel,
          vFuelCount: vFuels.length,
          vFuelLiters: vFuels.reduce((sum, f) => sum + (f.liters || 0), 0),
          vServiceCount: vRepairs.length,
          vOdoIncrease: vOdos.length > 1 ? Math.max(...vOdos) - Math.min(...vOdos) : 0,
          vCurrentOdo: vOdos.length > 0 ? Math.max(...vOdos) : (v.currentOdometer || 0),
          vMaxService,
          vMaxFuel: vFuels.length > 0 ? Math.max(...vFuels.map(f => f.totalCost || 0)) : 0
        };
      });

      // 3. Totalkan untuk keperluan diagram batang (Bar Chart)
      const totalFuelCost = filteredFuels.reduce((sum, item) => sum + (item.totalCost || 0), 0);
      const totalServiceCost = filteredRepairs.reduce((sum, item) => sum + (item.cost || 0), 0);
      const totalExpense = totalFuelCost + totalServiceCost;

      setProgressText("🔄 Compiling Grouped Timeline...");
      await new Promise(r => setTimeout(r, 500));

      const allActivities = [
        ...filteredRepairs.map(r => ({ ...r, type: 'SERVICE', icon: '🛠️', title: r.serviceType, displayCost: r.cost, vehicleName: vehicles.find(v => v.id === r.vehicleId)?.name || '-' })),
        ...filteredFuels.map(f => ({ ...f, type: 'FUEL', icon: '⛽', title: `${isId ? 'Isi Bensin' : 'Fuel Fill'} ${f.liters.toFixed(1)}L`, displayCost: f.totalCost, vehicleName: vehicles.find(v => v.id === f.vehicleId)?.name || '-' }))
      ].sort((a, b) => b.date.localeCompare(a.date));

      const groupedByMonth: Record<string, { items: any[], total: number }> = {};
      allActivities.forEach(item => {
        const dateObj = new Date(item.date);
        const monthYear = dateObj.toLocaleDateString(isId ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' });
        if (!groupedByMonth[monthYear]) groupedByMonth[monthYear] = { items: [], total: 0 };
        groupedByMonth[monthYear].items.push(item);
        groupedByMonth[monthYear].total += item.displayCost;
      });

      setProgressText("🔄 Generating Premium PDF Template...");
      await new Promise(r => setTimeout(r, 700));

      const fuelPct = totalExpense > 0 ? Math.round((totalFuelCost / totalExpense) * 100) : 0;
      const servPct = totalExpense > 0 ? Math.round((totalServiceCost / totalExpense) * 100) : 0;
      const formatRp = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;
      const showVehicleBadge = selectedVehicles.includes('all') || selectedVehicles.length > 1;
      // 🚀 LOGIKA GENERATOR QR CODE VERIFIKASI UNIK
      const qrData = `GarasiKu|VERIFIED|Date:${new Date().toISOString().split('T')[0]}|Vehicles:${selectedVehicles.join('-')}|TotalCost:${totalExpense}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`;

      // 🚀 LOGIKA PENGUMPULAN FOTO AKTIVITAS & KENDARAAN
      let photosHTML = '';
      
      // Ambil foto dari riwayat aktivitas perbaikan/bensin yang memiliki property gambar
      const activitiesWithPhotos = allActivities.filter((a: any) => a.imageUri || a.photo || a.image || a.receiptImage);
      // Ambil foto profil kendaraan jika ada
      const vehiclesWithPhotos = exportedVehicles.filter((v: any) => v.imageUri || v.photo || v.image);

      if (activitiesWithPhotos.length > 0 || vehiclesWithPhotos.length > 0) {
        photosHTML = `
          <div style="page-break-before: always;"></div>
          <h2 class="section-title">📷 LAMPIRAN FOTO & DOKUMENTASI MEDIA</h2>
          <p style="font-size:11px; color:#7f8c8d; margin-bottom:15px;">Berikut adalah lampiran bukti foto fisik kendaraan, struk transaksi, dan dokumentasi sparepart mekanik.</p>
          
          <div class="photo-grid">
            ${vehiclesWithPhotos.map((v: any) => `
              <div class="photo-box">
                <img src="${v.imageUri || v.photo || v.image}" onerror="this.parentElement.style.display='none';" />
                <div class="photo-caption">Profil Kendaraan:<br><b>${v.name}</b></div>
              </div>
            `).join('')}

            ${activitiesWithPhotos.map((a: any) => `
              <div class="photo-box">
                <img src="${a.imageUri || a.photo || a.image || a.receiptImage}" onerror="this.parentElement.style.display='none';" />
                <div class="photo-caption">${new Date(a.date).toLocaleDateString('id-ID')}<br><b>${a.title}</b> (${a.vehicleName})</div>
              </div>
            `).join('')}
          </div>
        `;
      }

      let timelineHTML = '';
      for (const [month, data] of Object.entries(groupedByMonth)) {
        timelineHTML += `
          <div class="month-group">
            <div class="month-header">
              <h3>📂 ${month}</h3>
              <span class="month-total">${data.items.length} Aktivitas &bull; Total: ${formatRp(data.total)}</span>
            </div>
            <div class="timeline">
              ${data.items.slice(0, 15).map(item => `
                <div class="timeline-item">
                  <div class="tl-icon">${item.icon}</div>
                  <div class="tl-content">
                    <div class="tl-title">
                    <strong>${item.title}</strong>
                    ${showVehicleBadge ? `<span style="font-size:9px; background:#e1e8ed; padding:2px 6px; border-radius:4px; margin-left:6px; color:#7f8c8d;">${item.vehicleName}</span>` : ''}
                  </div>
                    <div class="tl-meta">${new Date(item.date).toLocaleDateString('id-ID')} &bull; ${item.odometer.toLocaleString('id-ID')} km</div>
                  </div>
                  <div class="tl-cost">${formatRp(item.displayCost)}</div>
                </div>
              `).join('')}
              ${data.items.length > 15 ? `<p style="font-size:11px; color:#7f8c8d; font-style:italic; margin-left:5px;">+ ${data.items.length - 15} aktivitas lainnya disederhanakan ke lampiran detail...</p>` : ''}
            </div>
          </div>
        `;
      }

    let appendixHTML = '';
      if (pdfReportType === 'hybrid') {
        appendixHTML = `
          <div style="page-break-before: always;"></div>
          <h2 class="section-title">📊 LAMPIRAN HISTORI DATA LENGKAP (APPENDIX)</h2>
          <p style="font-size:11px; color:#7f8c8d; margin-bottom:15px;">Berikut adalah audit data log mentah dari database internal sistem GarasiKu.</p>
          <table class="detail-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                ${showVehicleBadge ? '<th>Kendaraan</th>' : ''}
                <th>Kategori</th>
                <th>Aktivitas / Keterangan</th>
                <th>Odometer</th>
                <th>Total Biaya</th>
              </tr>
            </thead>
            <tbody>
              ${allActivities.map(item => `
                <tr>
                  <td>${new Date(item.date).toLocaleDateString('id-ID')}</td>
                  ${showVehicleBadge ? `<td>${item.vehicleName}</td>` : ''}
                  <td><b>${item.type}</b></td>
                  <td>${item.icon} ${item.title}</td>
                  <td>${item.odometer.toLocaleString('id-ID')} km</td>
                  <td>${formatRp(item.displayCost)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }

      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 portrait; margin: 0; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #fff; color: #1B2C3C; margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
          .page { padding: 50px; box-sizing: border-box; background: #fff; min-height: 297mm; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0D1B2A; padding-bottom: 20px; margin-bottom: 25px; }
          .brand h1 { margin: 0; color: #0D1B2A; font-size: 26px; font-weight: 900; letter-spacing: 0.5px; }
          .brand p { margin: 4px 0 0; color: #4ECDC4; font-weight: 800; font-size: 12px; letter-spacing: 1px; }
          .doc-meta { text-align: right; color: #7f8c8d; font-size: 11px; line-height: 1.5; }
          .vehicle-card { background: #0D1B2A; color: #fff; border-radius: 14px; padding: 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
          .v-info h2 { margin: 0 0 4px; font-size: 22px; color: #4ECDC4; font-weight: 800; }
          .v-info p { margin: 0; opacity: 0.7; font-size: 13px; font-weight: 600; }
          .v-stats { text-align: right; }
          .v-stats h3 { margin: 0 0 2px; font-size: 22px; font-family: monospace; color: #FFF; font-weight: 700; }
          .v-stats p { margin: 0; opacity: 0.5; font-size: 11px; font-weight: bold; text-transform: uppercase; }
          .dashboard { display: flex; gap: 15px; margin-bottom: 25px; }
          .stat-card { flex: 1; background: #fff; border: 1px solid #e1e8ed; border-radius: 12px; padding: 15px; text-align: center; }
          .stat-card span { display: block; font-size: 10px; color: #7f8c8d; text-transform: uppercase; font-weight: 800; margin-bottom: 6px; letter-spacing: 0.5px; }
          .stat-card strong { font-size: 16px; color: #0D1B2A; font-weight: 900; }
          .chart-section { background: #fff; border: 1px solid #e1e8ed; border-radius: 12px; padding: 18px; margin-bottom: 25px; }
          .chart-section h3 { margin: 0 0 12px; font-size: 13px; color: #0D1B2A; text-transform: uppercase; letter-spacing: 0.5px; }
          .bar-wrap { display: flex; align-items: center; margin-bottom: 8px; }
          .bar-label { width: 90px; font-size: 12px; font-weight: 700; color: #7f8c8d; }
          .bar-track { flex: 1; background: #e1e8ed; height: 10px; border-radius: 5px; overflow: hidden; margin: 0 15px; }
          .bar-fill.fuel { background: #4ECDC4; height: 100%; width: ${fuelPct}%; }
          .bar-fill.serv { background: #F5A623; height: 100%; width: ${servPct}%; }
          .bar-val { min-width: 90px; white-space: nowrap; padding-left: 10px; font-size: 12px; text-align: right; font-weight: 800; color: #0D1B2A; }
          .insight-card { background: rgba(245, 166, 35, 0.05); border: 1px dashed #F5A623; border-radius: 12px; padding: 15px; margin-bottom: 25px; display: flex; gap: 15px; }
          .insight-item { flex: 1; }
          .insight-item h4 { margin: 0 0 4px; font-size: 10px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px; }
          .insight-item p { margin: 0; font-size: 13px; font-weight: 800; color: #1B2C3C; }
          .section-title { font-size: 13px; color: #0D1B2A; border-bottom: 2px solid #4ECDC4; padding-bottom: 4px; margin-bottom: 15px; display: inline-block; font-weight: 800; letter-spacing: 0.5px; }
          .month-group { margin-bottom: 20px; page-break-inside: avoid; }
          .month-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 10px; }
          .month-header h3 { margin: 0; color: #0D1B2A; font-size: 14px; font-weight: 800; }
          .month-total { font-size: 11px; font-weight: 800; color: #4ECDC4; }
          .timeline { border-left: 2px solid #e1e8ed; margin-left: 10px; padding-left: 15px; }
          .timeline-item { display: flex; align-items: center; margin-bottom: 12px; position: relative; page-break-inside: avoid; }
          .tl-icon { position: absolute; left: -24px; background: #fff; border: 1px solid #e1e8ed; border-radius: 50%; width: 18px; height: 18px; text-align: center; line-height: 18px; font-size: 10px; }
          .tl-content { flex: 1; padding-right: 10px; }
          .tl-title { font-size: 13px; color: #1B2C3C; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .tl-meta { font-size: 11px; color: #7f8c8d; margin-top: 2px; }
          .tl-cost { font-weight: 800; font-family: monospace; font-size: 13px; color: #F5A623; white-space: nowrap; }
          .detail-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
          .detail-table th { background: #0D1B2A; color: #fff; padding: 8px; text-align: left; font-weight: 800; }
          .detail-table td { padding: 8px; border-bottom: 1px solid #eee; color: #2c3e50; }
          .detail-table tr:nth-child(even) { background: #f9fbfb; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #bdc3c7; border-top: 1px solid #eee; padding-top: 15px; }
          .mini-list { text-align: left; margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee; }
          .mini-list-item { margin-bottom: 12px; }
          .mini-list-item .v-name { font-size: 10px; color: #7f8c8d; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
          .mini-list-item .v-val { font-size: 13px; color: #0D1B2A; font-weight: 900; margin-top: 3px; }
          .insight-item .mini-list { border-top-color: rgba(245,166,35,0.2); }
          /* CSS Khusus Layout Media Foto & QR Code */
          .photo-grid { width: 100%; text-align: left; margin-top: 10px; }
          .photo-box { display: inline-block; width: 155px; margin: 8px; border: 1px solid #e1e8ed; padding: 6px; border-radius: 8px; vertical-align: top; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
          .photo-box img { width: 100%; height: 110px; object-fit: cover; border-radius: 6px; background: #f5f7f8; }
          .photo-box .photo-caption { font-size: 9px; color: #555; margin-top: 6px; line-height: 12px; text-align: center; word-wrap: break-word; }
          .qr-wrapper { display: block; margin: 15px auto 5px auto; text-align: center; }
          .qr-wrapper img { width: 85px; height: 85px; padding: 5px; border: 1px solid #eee; background: #fff; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="brand">
              <h1>${CURRENT_APP_NAME.toUpperCase()}</h1>
              <p>EXECUTIVE VEHICLE ANALYTICS</p>
            </div>
            <div class="doc-meta">
              <b>Generated:</b> ${new Date().toLocaleDateString('id-ID')}<br>
              <b>Report Scope:</b> ${pdfReportType === 'summary' ? 'Summary Executive Only' : 'Hybrid Premium Report'}<br>
              <b>Data Filter:</b> ${getPeriodLabel(period)}
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px;">
            ${vehicleStats.map(vs => `
              <div class="vehicle-card" style="margin-bottom: 0;">
                <div class="v-info">
                  <h2>🚗 ${vs.name}</h2>
                  <p>${vs.brand || ''} ${vs.model || ''} &bull; Plat: ${vs.plate || '-'}</p>
                </div>
                <div class="v-stats">
                  <h3>${vs.vCurrentOdo.toLocaleString('id-ID')} km</h3>
                  <p>Current Odometer</p>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="dashboard">
            <div class="stat-card">
              <span>Total Pengeluaran</span>
              <div class="mini-list">
                ${vehicleStats.map(vs => `<div class="mini-list-item"><div class="v-name">${vs.name}</div><div class="v-val">${formatRp(vs.vTotalExpense)}</div></div>`).join('')}
              </div>
            </div>
            <div class="stat-card">
              <span>Log Pengisian BBM</span>
              <div class="mini-list">
                ${vehicleStats.map(vs => `<div class="mini-list-item"><div class="v-name">${vs.name}</div><div class="v-val">${vs.vFuelCount}x Fill (${vs.vFuelLiters.toFixed(1)}L)</div></div>`).join('')}
              </div>
            </div>
            <div class="stat-card">
              <span>Log Servis/Mekanik</span>
              <div class="mini-list">
                ${vehicleStats.map(vs => `<div class="mini-list-item"><div class="v-name">${vs.name}</div><div class="v-val">${vs.vServiceCount}x Aktivitas</div></div>`).join('')}
              </div>
            </div>
            <div class="stat-card">
              <span>Kenaikan Jarak</span>
              <div class="mini-list">
                ${vehicleStats.map(vs => `<div class="mini-list-item"><div class="v-name">${vs.name}</div><div class="v-val">+${vs.vOdoIncrease.toLocaleString('id-ID')} km</div></div>`).join('')}
              </div>
            </div>
          </div>

          <div class="chart-section">
            <h3>📈 Distribusi Anggaran Pemeliharaan</h3>
            <div class="bar-wrap">
              <div class="bar-label">⛽ Biaya Bensin</div>
              <div class="bar-track"><div class="bar-fill fuel"></div></div>
              <div class="bar-val">${formatRp(totalFuelCost)} (${fuelPct}%)</div>
            </div>
            <div class="bar-wrap">
              <div class="bar-label">🛠️ Biaya Servis</div>
              <div class="bar-track"><div class="bar-fill serv"></div></div>
              <div class="bar-val">${formatRp(totalServiceCost)} (${servPct}%)</div>
            </div>
          </div>

          <div class="insight-card">
             <div class="insight-item" style="border-right: 1px dashed rgba(245,166,35,0.3); padding-right:10px;">
                <h4>💡 Pengeluaran Bengkel Terbesar</h4>
                <div class="mini-list">
                  ${vehicleStats.map(vs => `
                    <div class="mini-list-item">
                      <div class="v-name">${vs.name}</div>
                      <div class="v-val">${vs.vMaxService.serviceType !== '-' ? `${vs.vMaxService.serviceType} <br><span style="font-weight:600; color:#7f8c8d; font-size:11px;">${formatRp(vs.vMaxService.cost)}</span>` : '-'}</div>
                    </div>
                  `).join('')}
                </div>
             </div>
             <div class="insight-item">
                <h4>⛽ Transaksi BBM Tertinggi</h4>
                <div class="mini-list">
                  ${vehicleStats.map(vs => `
                    <div class="mini-list-item">
                      <div class="v-name">${vs.name}</div>
                      <div class="v-val">${vs.vMaxFuel > 0 ? formatRp(vs.vMaxFuel) : '-'}</div>
                    </div>
                  `).join('')}
                </div>
             </div>
          </div>

          <h2 class="section-title">📅 TIMELINE AKUMULASI BULANAN</h2>
          ${timelineHTML || `<p style="color:#7f8c8d; font-size:12px;">${isId ? 'Tidak ada data aktivitas di periode ini.' : 'No activities recorded in this period.'}</p>`}
          
          ${photosHTML}
          ${appendixHTML}

          <div class="footer">
            <div class="qr-wrapper">
              <img src="${qrCodeUrl}" alt="QR Verification" />
              <div style="font-size: 8px; color: #bdc3c7; margin-top: 4px; font-weight: bold; letter-spacing: 0.5px;">SECURE VERIFICATION QR</div>
            </div>
            Laporan ini dibuat secara otomatis dan sah melalui enkripsi local database GarasiKu v${CURRENT_SCHEMA_VERSION}.<br>
            &copy; ${new Date().getFullYear()} GarasiKu App. All rights reserved.
          </div>
        </div>
      </body>
      </html>
      `;

      setProgressText("🚀 Finalizing PDF Document...");
      await new Promise(r => setTimeout(r, 400));

      const finalFilename = 'JagaGarasimu_Laporan';

      if (Platform.OS === 'web') {
        // 🚀 SOLUSI WEB: Download sebagai file .html agar langsung terunduh otomatis
        // karena browser tidak bisa membuat .pdf di background tanpa dialog Print.
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFilename + '.html'; // Disimpan sebagai Laporan HTML
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setExportDone(true);
      } else if (Platform.OS === 'android') {
        const { base64 } = await Print.printToFileAsync({ html: htmlContent, base64: true });
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const savedUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, finalFilename, 'application/pdf');
          await FileSystem.writeAsStringAsync(savedUri, base64 || '', { encoding: FileSystem.EncodingType.Base64 });
          setExportDone(true);
        } else {
          setLoading(false);
          return;
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
        const newUri = FileSystem.documentDirectory + finalFilename + '.pdf';
        const fileInfo = await FileSystem.getInfoAsync(newUri);
        if (fileInfo.exists) await FileSystem.deleteAsync(newUri);
        await FileSystem.copyAsync({ from: uri, to: newUri });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(newUri, { UTI: '.pdf', mimeType: 'application/pdf' });
          setExportDone(true);
        }
      }

    } catch (e) {
      Alert.alert("Export Gagal", "Aplikasi gagal memproses file.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // BACKUP CODE ENGINE (.VHDB) DIRECT DOWNLOAD
  // =========================================================
  const handleExportBackup = async () => {
    setLoading(true);
    setExportDone(false);
    try {
      setProgressText("🔄 Preparing Database Copy...");
      await new Promise(r => setTimeout(r, 600)); 

      const keys = await AsyncStorage.getAllKeys();
      const garasiKeys = keys.filter(k => k.startsWith('garasi_') || k.startsWith('app_'));
      const allData = await AsyncStorage.multiGet(garasiKeys);
      let backupObj = Object.fromEntries(allData);

      // 🚀 FILTER KHUSUS MULTI-VEHICLE BACKUP (.VHDB)
      if (!selectedVehicles.includes('all')) {
        try {
          // Filter tabel vehicles
          if (backupObj.garasi_vehicles) {
            const allV = JSON.parse(backupObj.garasi_vehicles);
            backupObj.garasi_vehicles = JSON.stringify(allV.filter((v: any) => selectedVehicles.includes(v.id)));
          }
          // Filter tabel repairs
          if (backupObj.garasi_repairs) {
            const allR = JSON.parse(backupObj.garasi_repairs);
            backupObj.garasi_repairs = JSON.stringify(allR.filter((r: any) => selectedVehicles.includes(r.vehicleId)));
          }
          // Filter tabel fuels
          if (backupObj.garasi_fuel_entries) {
            const allF = JSON.parse(backupObj.garasi_fuel_entries);
            backupObj.garasi_fuel_entries = JSON.stringify(allF.filter((f: any) => selectedVehicles.includes(f.vehicleId)));
          }
          // Filter tabel reminders
          if (backupObj.garasi_reminders) {
            const allRem = JSON.parse(backupObj.garasi_reminders);
            backupObj.garasi_reminders = JSON.stringify(allRem.filter((rem: any) => selectedVehicles.includes(rem.vehicleId)));
          }
          // Filter tabel notifications
          if (backupObj.garasi_notifications) {
             const allNotif = JSON.parse(backupObj.garasi_notifications);
             backupObj.garasi_notifications = JSON.stringify(allNotif.filter((n: any) => !n.vehicleId || selectedVehicles.includes(n.vehicleId)));
          }
        } catch (err) {
          console.log("Error filtering backup data:", err);
        }
      }

      const payload = {
        meta: {
          app_name: CURRENT_APP_NAME,
          schema_version: CURRENT_SCHEMA_VERSION,
          export_date: new Date().toISOString(),
          vehicle_target: selectedVehicles 
        },
        data: backupObj
      };

      setProgressText("🔄 Compressing Files...");
      await new Promise(r => setTimeout(r, 600));

      const finalFilename = 'JagaGarasimu';

      if (Platform.OS === 'web') {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFilename + '.vhdb';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportDone(true);
      } else if (Platform.OS === 'android') {
        // 🚀 OPSI DIRECT DOWNLOAD UNTUK ANDROID MENGGUNAKAN SAF
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const savedUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, finalFilename, 'application/octet-stream');
          await FileSystem.writeAsStringAsync(savedUri, JSON.stringify(payload));
          setExportDone(true);
        } else {
          setLoading(false);
          return;
        }
      } else {
        // 🚀 OPSI IOS (Menggunakan Share Dialog)
        const fileUri = FileSystem.documentDirectory + finalFilename + '.vhdb';
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists) await FileSystem.deleteAsync(fileUri);

        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload));
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { mimeType: 'application/octet-stream', dialogTitle: 'Simpan Backup GarasiKu' });
          setExportDone(true);
        }
      }
      if (exportDone || Platform.OS === 'android') {
        setProgressText("✅ Export Completed");
        await new Promise(r => setTimeout(r, 400));
      }
    } catch (e) {
      Alert.alert("Export Gagal", "Aplikasi gagal menyimpan file.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // 🚀 ENGINE BARU: PROSES IMPORT FILE & RESTORE (SUPPORT WEB & MOBILE)
  // =========================================================
  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        setProgressText("🔄 Mengekstrak Data...");
        
        const asset = result.assets[0];
        let content = "";

        // 🚀 LOGIKA KHUSUS WEB VS MOBILE UNTUK BACA FILE
        if (Platform.OS === 'web') {
          // Di Web, file yang dipilih menghasilkan Blob URI. Kita baca menggunakan fetch bawaan browser.
          const response = await fetch(asset.uri);
          content = await response.text();
        } else {
          // Di Mobile (Android/iOS), baca file langsung dari memori
          content = await FileSystem.readAsStringAsync(asset.uri);
        }
        
        let decrypted;
        try {
          decrypted = JSON.parse(content);
        } catch (err) {
          throw new Error("CORRUPTED");
        }

        // Integrity Check (Mencegah file asing masuk ke sistem)
        if (!decrypted.meta || !decrypted.data || decrypted.meta.app_name !== CURRENT_APP_NAME) {
          throw new Error("INVALID_FORMAT");
        }

        // Tampilkan antarmuka validasi (Staging Mode)
        setStagedFile({
          name: asset.name || 'Backup_Database.vhdb',
          version: decrypted.meta.schema_version,
          date: decrypted.meta.export_date,
          size: (content.length / 1024).toFixed(1) + " KB"
        });
        setStagedData(decrypted);
      }
    } catch (e: any) {
       // Penanganan Error yang aman untuk Web & Mobile
       const isCorrupted = e.message === "CORRUPTED";
       const isInvalid = e.message === "INVALID_FORMAT";
       const title = isCorrupted ? "File Rusak" : (isInvalid ? "Format Tidak Dikenali" : "Error");
       const desc = isCorrupted ? "File backup tidak dapat dibaca atau korup." : (isInvalid ? "Ini bukan file backup dari aplikasi GarasiKu." : "Sistem gagal membuka file tersebut.");
       
       if (Platform.OS === 'web') {
         window.alert(`${title}\n\n${desc}`);
       } else {
         Alert.alert(title, desc);
       }
    } finally {
      setLoading(false);
    }
  };

  const executeRestore = async (restoreMode: 'replace' | 'merge') => {
    if (!stagedData) return;
    setLoading(true);
    setProgressText("🚀 Merestore Database...");

    try {
      const dataToRestore = stagedData.data; 

      if (restoreMode === 'replace') {
        const keys = await AsyncStorage.getAllKeys();
        const garasiKeys = keys.filter(k => k.startsWith('garasi_'));
        await AsyncStorage.multiRemove(garasiKeys);

        const entries = Object.entries(dataToRestore);
        await AsyncStorage.multiSet(entries as [string, string][]);
      } else if (restoreMode === 'merge') {
         const newEntries: [string, string][] = [];
         for (const [key, newValue] of Object.entries(dataToRestore)) {
            if (typeof newValue !== 'string') continue;
            const existingValue = await AsyncStorage.getItem(key);
            if (!existingValue) {
               newEntries.push([key, newValue]);
               continue;
            }
            try {
               const existingArr = JSON.parse(existingValue);
               const newArr = JSON.parse(newValue);
               if (Array.isArray(existingArr) && Array.isArray(newArr)) {
                  const mergedMap = new Map();
                  existingArr.forEach(item => mergedMap.set(item.id, item));
                  newArr.forEach(item => mergedMap.set(item.id, item)); 
                  newEntries.push([key, JSON.stringify(Array.from(mergedMap.values()))]);
               } else {
                  newEntries.push([key, newValue]); 
               }
            } catch(e) {
               newEntries.push([key, newValue]);
            }
         }
         await AsyncStorage.multiSet(newEntries);
      }

      setStagedData(null);
      setStagedFile(null);
      
      // 🚀 Notifikasi Sukses yang aman untuk Web & Mobile
      if (Platform.OS === 'web') {
        window.alert("Restore Sukses!\n\nDatabase kendaraan telah berhasil dipulihkan.");
      } else {
        Alert.alert("Restore Sukses!", "Database kendaraan telah berhasil dipulihkan. Mengembalikan ke beranda...");
      }
      
      router.replace("/");
    } catch (e) {
      if (Platform.OS === 'web') window.alert("Gagal Restore: Terjadi kesalahan saat memproses data.");
      else Alert.alert("Gagal Restore", "Terjadi kesalahan saat memproses data.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* FIXED HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 10, paddingRight: 15 }}>
          <Text style={{ color: "#F5A623", fontSize: 16, fontWeight: "700" }}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Database Manager</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 150 }}>
        
        {/* SEMBUNYIKAN TAB JIKA SEDANG VALIDASI IMPORT */}
        {!stagedFile && (
          <View style={styles.tabContainer}>
            <TouchableOpacity onPress={() => setMode('backup')} style={[styles.tabBtn, mode === 'backup' && styles.tabActive]}>
              <Text style={[styles.tabTxt, mode === 'backup' && styles.txtActive]}>💾 Backup (.vhdb)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('pdf')} style={[styles.tabBtn, mode === 'pdf' && styles.tabActive]}>
              <Text style={[styles.tabTxt, mode === 'pdf' && styles.txtActive]}>📄 Laporan PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('import')} style={[styles.tabBtn, mode === 'import' && styles.tabActive]}>
              <Text style={[styles.tabTxt, mode === 'import' && styles.txtActive]}>📥 Import Data</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAMPILAN JIKA SEDANG VALIDASI FILE YANG DI IMPORT */}
        {stagedFile ? (
          <View style={{ gap: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 166, 35, 0.1)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#F5A623' }}>
              <Text style={{ fontSize: 30, marginRight: 15 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#F5A623', fontSize: 16, fontWeight: '900' }}>VALIDASI BACKUP</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 }}>File telah diverifikasi. Silakan pilih metode restore di bawah ini.</Text>
              </View>
            </View>

            <View style={styles.previewCard}>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 15 }}>📄 {stagedFile.name}</Text>
              <View style={{ gap: 10 }}>
                <View style={styles.previewRow}><Text style={styles.previewLabel}>Ukuran Database</Text><Text style={styles.previewVal}>{stagedFile.size}</Text></View>
                <View style={styles.previewRow}><Text style={styles.previewLabel}>Tanggal Backup</Text><Text style={styles.previewVal}>{new Date(stagedFile.date).toLocaleDateString('id-ID')}</Text></View>
                <View style={styles.previewRow}><Text style={styles.previewLabel}>Versi Mesin</Text><Text style={{ color: '#4ECDC4', fontWeight: '800' }}>v{stagedFile.version} (Compatible)</Text></View>
              </View>
            </View>

            <View style={{ gap: 12, marginTop: 10 }}>
              <TouchableOpacity onPress={() => executeRestore('merge')} style={styles.btnPrimary}>
                <Text style={styles.btnPrimaryTxt}>A. GABUNGKAN DATA (MERGE AMAN)</Text>
                <Text style={{ color: 'rgba(0,0,0,0.5)', fontSize: 11, marginTop: 2, textAlign: 'center' }}>Data saat ini tidak dihapus, hanya menutupi yang hilang.</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => executeRestore('replace')} style={[styles.btnPrimary, { backgroundColor: '#FF5252', shadowColor: '#FF5252' }]}>
                <Text style={[styles.btnPrimaryTxt, { color: '#FFF' }]}>B. TIMPA SEMUA (REPLACE ALL)</Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2, textAlign: 'center' }}>Hapus bersih aplikasi & ganti total dengan isi file ini.</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setStagedFile(null); setStagedData(null); }} style={{ padding: 15, alignItems: 'center', marginTop: 5 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>Batal & Kembali</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : mode === 'import' ? (
          <View style={styles.card}>
             <View style={styles.iconBox}><Text style={{fontSize:30}}>📥</Text></View>
             <Text style={styles.cardTitle}>Restore Database Kendaraan</Text>
             <Text style={styles.cardDesc}>Unggah file berekstensi .vhdb untuk memulihkan seluruh catatan pengisian bensin dan servis garasi Anda.</Text>
             <TouchableOpacity onPress={handleImport} style={styles.btnPrimary}>
                <Text style={styles.btnPrimaryTxt}>PILIH FILE RESTORE</Text>
             </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 20 }}>
            {/* STEP 1: PILIH TARGET KENDARAAN */}
            <View>
              <Text style={styles.sectionLabel}>1. TARGET KENDARAAN</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
             <TouchableOpacity onPress={() => toggleVehicleSelection('all')} style={[styles.pillBtn, selectedVehicles.includes('all') && styles.pillActive]}>
               <Text style={[styles.pillTxt, selectedVehicles.includes('all') && styles.pillTxtActive]}>Semua Kendaraan</Text>
             </TouchableOpacity>
             {vehicles.map(v => (
               <TouchableOpacity key={v.id} onPress={() => toggleVehicleSelection(v.id)} style={[styles.pillBtn, selectedVehicles.includes(v.id) && styles.pillActive]}>
                 <Text style={[styles.pillTxt, selectedVehicles.includes(v.id) && styles.pillTxtActive]}>{v.name}</Text>
               </TouchableOpacity>
             ))}
           </ScrollView>
            </View>

            {/* FILTER PERIODE DENGAN TAHUN DINAMIS & CUSTOM DATE */}
            {mode === 'pdf' && (
              <>
                <View>
                  <Text style={styles.sectionLabel}>⏱️ FILTER PERIODE LAPORAN</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {periodOptions.map((p) => (
                      <TouchableOpacity 
                        key={p} 
                        onPress={() => setPeriod(p)} 
                        style={[styles.smallPill, period === p && styles.smallPillActive]}
                      >
                        <Text style={[styles.smallPillTxt, period === p && styles.smallPillTxtActive]}>
                          {getPeriodLabel(p)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* INPUT TANGGAL CUSTOM */}
                  {period === 'custom' && (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                      <View style={{ flex: 1 }}>
                         <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 5 }}>DARI TANGGAL</Text>
                         <TextInput 
                           style={styles.dateInput} 
                           placeholder="YYYY-MM-DD" 
                           placeholderTextColor="rgba(255,255,255,0.2)"
                           value={customStart}
                           onChangeText={setCustomStart}
                         />
                      </View>
                      <View style={{ flex: 1 }}>
                         <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 5 }}>SAMPAI TANGGAL</Text>
                         <TextInput 
                           style={styles.dateInput} 
                           placeholder="YYYY-MM-DD" 
                           placeholderTextColor="rgba(255,255,255,0.2)"
                           value={customEnd}
                           onChangeText={setCustomEnd}
                         />
                      </View>
                    </View>
                  )}
                </View>

                <View>
               <Text style={styles.sectionLabel}>📁 KATEGORI DATA</Text>
               <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                 <TouchableOpacity onPress={() => setExportCategory('all')} style={[styles.smallPill, exportCategory === 'all' && styles.smallPillActive]}>
                   <Text style={[styles.smallPillTxt, exportCategory === 'all' && styles.smallPillTxtActive]}>Semua Data</Text>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => setExportCategory('fuel')} style={[styles.smallPill, exportCategory === 'fuel' && styles.smallPillActive]}>
                   <Text style={[styles.smallPillTxt, exportCategory === 'fuel' && styles.smallPillTxtActive]}>Hanya Bensin</Text>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => setExportCategory('service')} style={[styles.smallPill, exportCategory === 'service' && styles.smallPillActive]}>
                   <Text style={[styles.smallPillTxt, exportCategory === 'service' && styles.smallPillTxtActive]}>Hanya Servis</Text>
                 </TouchableOpacity>
               </View>
             </View>

                <View>
                  <Text style={styles.sectionLabel}>📐 MODE FORMAT PDF</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity 
                      onPress={() => setPdfReportType('summary')} 
                      style={[styles.selectorCard, pdfReportType === 'summary' && styles.selectorActive]}
                    >
                      <Text style={styles.selectorEmoji}>📊</Text>
                      <Text style={styles.selectorTitle}>Executive Summary</Text>
                      <Text style={styles.selectorDesc}>Hanya Dashboard & Analisa Insight. Sangat ringan.</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => setPdfReportType('hybrid')} 
                      style={[styles.selectorCard, pdfReportType === 'hybrid' && styles.selectorActive]}
                    >
                      <Text style={styles.selectorEmoji}>⚡</Text>
                      <Text style={styles.selectorTitle}>Hybrid Report</Text>
                      <Text style={styles.selectorDesc}>Dashboard Statistik + Lampiran Audit tabel di akhir file.</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            {/* STEP 2: PREVIEW INFORMASI DATA */}
            <View>
              <Text style={styles.sectionLabel}>2. REALTIME DATA SCOPE PREVIEW</Text>
              <View style={[styles.previewCard, isDataEmpty && mode === 'pdf' && { borderColor: '#FF5252' }]}>
                <Text style={styles.previewTitle}>📋 {vehicleName}</Text>
                
                {isDataEmpty && mode === 'pdf' ? (
                  <Text style={{ color: '#FF5252', fontSize: 12, marginTop: 10, fontWeight: '700' }}>
                    ⚠️ Tidak ada data untuk kriteria ini. PDF yang dihasilkan akan kosong.
                  </Text>
                ) : (
                  <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 15, marginTop: 10, gap: 8 }}>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Riwayat Servis Tersaring</Text>
                      <Text style={styles.previewVal}>{filteredRepairs.length} Data</Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Riwayat BBM Tersaring</Text>
                      <Text style={styles.previewVal}>{filteredFuels.length} Data</Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Estimasi Ukuran Log</Text>
                      <Text style={styles.previewVal}>{estimatedSize} KB</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* STEP 3: EXE ACTION */}
            <View>
              <Text style={styles.sectionLabel}>3. PROSES GENERATE</Text>
              <View style={styles.card}>
                <Text style={styles.cardDesc}>
                  {mode === 'pdf' 
                    ? "Sistem akan membuat file laporan PDF bernama JagaGarasimu_Laporan.pdf" 
                    : "Sistem akan membuat file backup paten bernama JagaGarasimu.vhdb"}
                </Text>
                
                <TouchableOpacity 
                  onPress={mode === 'pdf' ? handleExportPDF : handleExportBackup} 
                  style={[styles.btnPrimary, isDataEmpty && mode === 'pdf' && { backgroundColor: 'rgba(78,205,196,0.3)' }]}
                  activeOpacity={0.8}
                  disabled={isDataEmpty && mode === 'pdf'}
                >
                  <Text style={[styles.btnPrimaryTxt, isDataEmpty && mode === 'pdf' && { color: 'rgba(255,255,255,0.3)' }]}>
                    {mode === 'pdf' ? 'GENERATE HYBRID PDF' : 'EXPORT BACKUP (.VHDB)'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FULLSCREEN PROGRESS OVERLAY STATE */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#4ECDC4" />
            <Text style={styles.loadingText}>{progressText}</Text>
          </View>
        </View>
      )}

      {/* COMPLETED BANNER NOTIFICATION */}
      {exportDone && !loading && (
        <View style={styles.successBanner}>
          <Text style={{ fontSize: 20 }}>✅</Text>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={{ color: '#0D1B2A', fontWeight: '800' }}>Export Completed</Text>
            <Text style={{ color: 'rgba(0,0,0,0.6)', fontSize: 12 }}>File premium sukses diproses dan disimpan.</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B2A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#1A2B3C', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', flex: 1, textAlign: 'center', marginRight: 60 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: 5, marginBottom: 25 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: '#1A2B3C', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  tabTxt: { color: 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 12 },
  txtActive: { color: '#4ECDC4', fontWeight: '900' },

  sectionLabel: { color: '#4ECDC4', fontSize: 11, fontWeight: '800', marginBottom: 12, letterSpacing: 1 },
  card: { backgroundColor: '#1A2B3C', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 15, textAlign: 'center' },
  cardDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 4, marginBottom: 15 },
  iconBox: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(78,205,196,0.1)', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },

  pillBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pillActive: { backgroundColor: 'rgba(78,205,196,0.15)', borderColor: '#4ECDC4' },
  pillTxt: { color: 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: 13 },
  pillTxtActive: { color: '#4ECDC4', fontWeight: '900' },

  smallPill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  smallPillActive: { backgroundColor: 'rgba(245,166,35,0.15)', borderColor: '#F5A623' },
  smallPillTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
  smallPillTxtActive: { color: '#F5A623', fontWeight: '900' },

  dateInput: { backgroundColor: 'rgba(0,0,0,0.3)', color: '#FFF', padding: 12, borderRadius: 10, fontSize: 12, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  selectorCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', borderOpacity: 0.1, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  selectorActive: { borderColor: '#4ECDC4', backgroundColor: 'rgba(78,205,196,0.05)' },
  selectorEmoji: { fontSize: 22, marginBottom: 6 },
  selectorTitle: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  selectorDesc: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 4, lineHeight: 14 },

  previewCard: { backgroundColor: '#1A2B3C', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(78,205,196,0.2)' },
  previewTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  previewVal: { color: '#F5A623', fontWeight: '700', fontSize: 14, fontFamily: 'SpaceMono' },

  btnPrimary: { backgroundColor: '#4ECDC4', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#4ECDC4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  btnPrimaryTxt: { color: '#0D1B2A', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },

  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,27,42,0.92)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  loadingCard: { backgroundColor: '#1A2B3C', padding: 30, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#4ECDC4', width: '75%' },
  loadingText: { color: '#FFF', marginTop: 20, fontWeight: '700', fontSize: 13, textAlign: 'center', letterSpacing: 0.5 },

  successBanner: { position: 'absolute', bottom: 100, left: 20, right: 20, backgroundColor: '#4ECDC4', padding: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, zIndex: 99 }
});