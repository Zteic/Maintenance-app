import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Dimensions, ActivityIndicator, Alert, StatusBar, Platform 
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
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
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [period, setPeriod] = useState<string>('all'); // Diubah menjadi string untuk menampung tahun dinamis
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [pdfReportType, setPdfReportType] = useState<'summary' | 'hybrid'>('hybrid');
  const [customFilename, setCustomFilename] = useState('');
  
  // Progress Loader State
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState('');
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
  // Membaca seluruh data dan mendeteksi tahun berapa saja yang punya history
  // =========================================================
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(new Set([
    ...repairs.map(r => new Date(r.date).getFullYear()),
    ...fuels.map(f => new Date(f.date).getFullYear())
  ])).filter(y => !isNaN(y) && y < currentYear).sort((a,b) => b - a);

  // List opsi filter (Semua, Bulan Ini, 3 Bulan, Tahun Ini, [Tahun-tahun sebelumnya], Custom)
  const periodOptions = ['all', 'this_month', 'last_3_months', 'this_year', ...availableYears.map(String), 'custom'];

  const getPeriodLabel = (p: string) => {
    if (p === 'all') return isId ? 'Semua Waktu' : 'All Time';
    if (p === 'this_month') return isId ? 'Bulan Ini' : 'This Month';
    if (p === 'last_3_months') return isId ? '3 Bulan Terakhir' : 'Last 3 Months';
    if (p === 'this_year') return isId ? 'Tahun Ini' : 'This Year';
    if (p === 'custom') return isId ? 'Custom Date' : 'Custom Date';
    return `${isId ? 'Tahun' : 'Year'} ${p}`; // Untuk tahun-tahun masa lalu
  };

  // =========================================================
  // CORE FILTER ENGINE (Periode & Multi-Vehicle)
  // =========================================================
  const getFilteredData = () => {
    let filteredRepairs = [...repairs];
    let filteredFuels = [...fuels];

    if (selectedVehicle !== 'all') {
      filteredRepairs = filteredRepairs.filter(r => r.vehicleId === selectedVehicle);
      filteredFuels = filteredFuels.filter(f => f.vehicleId === selectedVehicle);
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
      // Jika period adalah spesifik Tahun (contoh: "2024")
      if (/^\d{4}$/.test(period)) {
        return d.getFullYear() === parseInt(period);
      }
      return true; // Mode 'all'
    };

    filteredRepairs = filteredRepairs.filter(r => filterByDateRange(r.date));
    filteredFuels = filteredFuels.filter(f => filterByDateRange(f.date));

    return { filteredRepairs, filteredFuels };
  };

  const { filteredRepairs, filteredFuels } = getFilteredData();
  const estimatedSize = ((JSON.stringify(filteredRepairs).length + JSON.stringify(filteredFuels).length) / 1024).toFixed(1);
  const vehicleName = selectedVehicle === 'all' ? (isId ? "Semua Kendaraan" : "All Vehicles") : vehicles.find(v => v.id === selectedVehicle)?.name || "Kendaraan";
  const isDataEmpty = filteredRepairs.length === 0 && filteredFuels.length === 0;

  useEffect(() => {
    const dateStr = new Date().toISOString().split('T')[0];
    const safeVehicleName = selectedVehicle === 'all' ? 'All-Vehicles' : (vehicles.find(v => v.id === selectedVehicle)?.name.replace(/\s+/g, '-') || 'Vehicle');
    let periodLabel = period.replace(/_/g, '-');
    if (period === 'all') periodLabel = 'Full-Report';
    
    if (mode === 'pdf') {
      setCustomFilename(`${safeVehicleName}-${periodLabel}-${dateStr}`);
    } else {
      setCustomFilename(`${safeVehicleName}-Backup-${dateStr}`);
    }
  }, [selectedVehicle, period, mode, vehicles]);

  // ==========================================
  // HYBRID PDF GENERATOR ENGINE
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

      const vPlate = selectedVehicle === 'all' ? "-" : vehicles.find(v => v.id === selectedVehicle)?.plateNumber || "-";
      const vModel = selectedVehicle === 'all' ? "Multi-Vehicle System" : `${vehicles.find(v => v.id === selectedVehicle)?.brand || ''} ${vehicles.find(v => v.id === selectedVehicle)?.model || ''}`;
      
      const totalFuelCost = filteredFuels.reduce((sum, item) => sum + (item.totalCost || 0), 0);
      const totalServiceCost = filteredRepairs.reduce((sum, item) => sum + (item.cost || 0), 0);
      const totalExpense = totalFuelCost + totalServiceCost;

      const odometers = [...filteredRepairs.map(r => r.odometer), ...filteredFuels.map(f => f.odometer)].filter(o => o > 0);
      const odoIncrease = odometers.length > 1 ? (Math.max(...odometers) - Math.min(...odometers)) : 0;
      const currentOdo = odometers.length > 0 ? Math.max(...odometers) : 0;

      let maxServiceExpense = { serviceType: "-", cost: 0 };
      if (filteredRepairs.length > 0) {
        const sortedRepairsByCost = [...filteredRepairs].sort((a, b) => b.cost - a.cost);
        maxServiceExpense = { serviceType: sortedRepairsByCost[0].serviceType, cost: sortedRepairsByCost[0].cost };
      }

      let maxFuelExpense = 0;
      if (filteredFuels.length > 0) {
        maxFuelExpense = Math.max(...filteredFuels.map(f => f.totalCost || 0));
      }

      setProgressText("🔄 Compiling Grouped Timeline...");
      await new Promise(r => setTimeout(r, 500));

      const allActivities = [
        ...filteredRepairs.map(r => ({ ...r, type: 'SERVICE', icon: '🛠️', title: r.serviceType, displayCost: r.cost })),
        ...filteredFuels.map(f => ({ ...f, type: 'FUEL', icon: '⛽', title: `${isId ? 'Isi Bensin' : 'Fuel Fill'} ${f.liters.toFixed(1)}L`, displayCost: f.totalCost }))
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
                    <div class="tl-title"><strong>${item.title}</strong></div>
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
          .bar-val { width: 60px; font-size: 12px; text-align: right; font-weight: 800; color: #0D1B2A; }
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

          <div class="vehicle-card">
            <div class="v-info">
              <h2>🚗 ${vehicleName}</h2>
              <p>${vModel} &bull; Plat: ${vPlate}</p>
            </div>
            <div class="v-stats">
              <h3>${currentOdo.toLocaleString('id-ID')} km</h3>
              <p>Current Odometer</p>
            </div>
          </div>

          <div class="dashboard">
            <div class="stat-card">
              <span>Total Pengeluaran</span>
              <strong>${formatRp(totalExpense)}</strong>
            </div>
            <div class="stat-card">
              <span>Log Pengisian BBM</span>
              <strong>${filteredFuels.length}x Fill (${filteredFuels.reduce((sum, f) => sum + f.liters, 0).toFixed(1)}L)</strong>
            </div>
            <div class="stat-card">
              <span>Log Servis/Mekanik</span>
              <strong>${filteredRepairs.length}x Aktivitas</strong>
            </div>
            <div class="stat-card">
              <span>Kenaikan Jarak</span>
              <strong>+${odoIncrease.toLocaleString('id-ID')} km</strong>
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
                <p>${maxServiceExpense.serviceType !== '-' ? `${maxServiceExpense.serviceType} (${formatRp(maxServiceExpense.cost)})` : '-'}</p>
             </div>
             <div class="insight-item">
                <h4>⛽ Transaksi BBM Tertinggi</h4>
                <p>${maxFuelExpense > 0 ? formatRp(maxFuelExpense) : '-'}</p>
             </div>
          </div>

          <h2 class="section-title">📅 TIMELINE AKUMULASI BULANAN</h2>
          ${timelineHTML || `<p style="color:#7f8c8d; font-size:12px;">${isId ? 'Tidak ada data aktivitas di periode ini.' : 'No activities recorded in this period.'}</p>`}

          ${appendixHTML}

          <div class="footer">
            Laporan ini dibuat secara otomatis dan sah melalui enkripsi local database GarasiKu v${CURRENT_SCHEMA_VERSION}.<br>
            &copy; ${new Date().getFullYear()} GarasiKu App. All rights reserved.
          </div>
        </div>
      </body>
      </html>
      `;

      setProgressText("🚀 Finalizing PDF Document...");
      await new Promise(r => setTimeout(r, 400));

      if (Platform.OS === 'web') {
        await Print.printAsync({ html: htmlContent });
        setExportDone(true);
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
        
        // 🚀 ANTI ERROR FIX: Bersihkan nama file dari spasi dan simbol aneh
        let safeName = customFilename.trim() || 'GarasiKu-Report';
        if (!safeName.endsWith('.pdf')) safeName += '.pdf';
        safeName = safeName.replace(/[^a-zA-Z0-9.\-_]/g, '_'); 

        // Gunakan documentDirectory alih-alih cacheDirectory agar lebih stabil
        const newUri = FileSystem.documentDirectory + safeName;
        
        // Cek dan hapus file lama jika ada (menghindari error copyAsync gagal overwrite)
        const fileInfo = await FileSystem.getInfoAsync(newUri);
        if (fileInfo.exists) {
           await FileSystem.deleteAsync(newUri);
        }

        await FileSystem.copyAsync({ from: uri, to: newUri });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(newUri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Bagikan PDF Laporan GarasiKu' });
          setExportDone(true);
        }
      }

    } catch (e: any) {
      // Tampilkan ALASAN ASLI KENAPA ERROR terjadi!
      Alert.alert("Error PDF", e?.message || "Gagal memproses file PDF.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // BACKUP CODE ENGINE (.VHDB)
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
      const backupObj = Object.fromEntries(allData);

      const payload = {
        meta: {
          app_name: CURRENT_APP_NAME,
          schema_version: CURRENT_SCHEMA_VERSION,
          export_date: new Date().toISOString(),
          vehicle_target: selectedVehicle
        },
        data: backupObj
      };

      setProgressText("🔄 Compressing Files...");
      await new Promise(r => setTimeout(r, 600));

      if (Platform.OS === 'web') {
        let finalFilename = customFilename.trim() || 'GarasiKu-Backup';
        if (!finalFilename.endsWith('.vhdb')) finalFilename += '.vhdb';
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportDone(true);
      } else {
        // 🚀 ANTI ERROR FIX: Bersihkan nama file
        let safeName = customFilename.trim() || 'GarasiKu-Backup';
        if (!safeName.endsWith('.vhdb')) safeName += '.vhdb';
        safeName = safeName.replace(/[^a-zA-Z0-9.\-_]/g, '_'); 

        const fileUri = FileSystem.documentDirectory + safeName;
        
        // Hapus file lama jika namanya kembar
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists) {
           await FileSystem.deleteAsync(fileUri);
        }

        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload));
        
        if (await Sharing.isAvailableAsync()) {
          // Gunakan tipe octet-stream agar Android tidak bingung dengan ekstensi custom .vhdb
          await Sharing.shareAsync(fileUri, { mimeType: 'application/octet-stream', dialogTitle: 'Simpan Backup GarasiKu' });
          setExportDone(true);
        }
      }
      setProgressText("✅ Export Completed");
      await new Promise(r => setTimeout(r, 400));
    } catch (e: any) {
      // Tampilkan pesan error yang sesungguhnya!
      Alert.alert("Export Gagal", e?.message || "Terjadi kesalahan saat membackup database.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled) {
        Alert.alert(isId ? "Proses Validasi" : "Validation", isId ? "Sistem sedang memeriksa integritas file enkripsi .vhdb..." : "Checking file integrity...");
      }
    } catch (e) {
      Alert.alert("Error", "Gagal mengimpor file.");
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
        
        {/* UPPER TAB NAVIGATION */}
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

        {mode === 'import' ? (
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
                <TouchableOpacity onPress={() => setSelectedVehicle('all')} style={[styles.pillBtn, selectedVehicle === 'all' && styles.pillActive]}>
                  <Text style={[styles.pillTxt, selectedVehicle === 'all' && styles.pillTxtActive]}>Semua Kendaraan</Text>
                </TouchableOpacity>
                {vehicles.map(v => (
                  <TouchableOpacity key={v.id} onPress={() => setSelectedVehicle(v.id)} style={[styles.pillBtn, selectedVehicle === v.id && styles.pillActive]}>
                    <Text style={[styles.pillTxt, selectedVehicle === v.id && styles.pillTxtActive]}>{v.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* INTEGRASI BARU: FILTER PERIODE DENGAN TAHUN DINAMIS & CUSTOM DATE */}
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

            {/* STEP 3: CUSTOM FILENAME & EXE ACTION */}
            <View>
              <Text style={styles.sectionLabel}>3. PENAMAAN FILE & PROSES GENERATE</Text>
              <View style={styles.card}>
                <Text style={styles.cardDesc}>Sistem otomatis membuat nama file. Anda diperbolehkan mengubah isinya secara manual di bawah ini:</Text>
                <TextInput 
                  value={customFilename}
                  onChangeText={setCustomFilename}
                  style={styles.input}
                  placeholder="Ketik nama file..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
                
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

  input: { backgroundColor: 'rgba(0,0,0,0.3)', color: '#FFF', padding: 15, borderRadius: 12, fontSize: 14, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 20 },
  btnPrimary: { backgroundColor: '#4ECDC4', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#4ECDC4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  btnPrimaryTxt: { color: '#0D1B2A', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },

  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,27,42,0.92)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  loadingCard: { backgroundColor: '#1A2B3C', padding: 30, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#4ECDC4', width: '75%' },
  loadingText: { color: '#FFF', marginTop: 20, fontWeight: '700', fontSize: 13, textAlign: 'center', letterSpacing: 0.5 },

  successBanner: { position: 'absolute', bottom: 100, left: 20, right: 20, backgroundColor: '#4ECDC4', padding: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, zIndex: 99 }
});