import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Modal, 
  ActivityIndicator, ScrollView, Alert 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface ExportPdfModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ExportPdfModal({ visible, onClose }: ExportPdfModalProps) {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'summary' | 'detailed'>('summary');
  const [dateRange, setDateRange] = useState<'all' | 'this_year'>('all');
  
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');

  // Load Vehicles for Filter
  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem('garasi_vehicles').then(res => {
        if (res) setVehicles(JSON.parse(res));
      });
    }
  }, [visible]);

  // ==========================================
  // ENGINE: DATA GATHERING & PROCESSING
  // ==========================================
  const generatePDF = async () => {
    setLoading(true);
    try {
      // 1. Fetch Data (Async agar tidak freeze)
      const [repairsRaw, fuelRaw] = await Promise.all([
        AsyncStorage.getItem('garasi_repairs'),
        AsyncStorage.getItem('garasi_fuel_entries'),
      ]);

      let repairs = repairsRaw ? JSON.parse(repairsRaw) : [];
      let fuel = fuelRaw ? JSON.parse(fuelRaw) : [];

      // Gabungkan & Format Data
      let allActivities = [
        ...repairs.map((r: any) => ({ ...r, type: 'SERVICE', icon: '🛠️', title: r.serviceType })),
        ...fuel.map((f: any) => ({ ...f, type: 'FUEL', icon: '⛽', title: `Isi Bensin ${f.liters}L` }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Filter Data
      if (selectedVehicle !== 'all') {
        allActivities = allActivities.filter(a => a.vehicleId === selectedVehicle);
      }
      if (dateRange === 'this_year') {
        const currentYear = new Date().getFullYear();
        allActivities = allActivities.filter(a => new Date(a.date).getFullYear() === currentYear);
      }

      // 2. Kalkulasi Statistik
      const totalExpense = allActivities.reduce((sum, item) => sum + (item.cost || item.totalCost || 0), 0);
      const totalFuelCost = allActivities.filter(a => a.type === 'FUEL').reduce((sum, item) => sum + (item.totalCost || 0), 0);
      const totalServiceCost = allActivities.filter(a => a.type === 'SERVICE').reduce((sum, item) => sum + (item.cost || 0), 0);
      
      const vName = selectedVehicle === 'all' ? "Semua Kendaraan" : vehicles.find(v => v.id === selectedVehicle)?.name || "Kendaraan";
      const vPlate = selectedVehicle === 'all' ? "-" : vehicles.find(v => v.id === selectedVehicle)?.plateNumber || "-";
      const currentOdo = allActivities.length > 0 ? allActivities[0].odometer : 0;

      // Grouping per Bulan untuk Timeline
      const groupedByMonth: any = {};
      allActivities.forEach(item => {
        const monthYear = new Date(item.date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        if (!groupedByMonth[monthYear]) groupedByMonth[monthYear] = { items: [], total: 0 };
        groupedByMonth[monthYear].items.push(item);
        groupedByMonth[monthYear].total += (item.cost || item.totalCost || 0);
      });

      // 3. Bangun HTML Premium
      const htmlContent = buildHTML(vName, vPlate, currentOdo, totalExpense, totalFuelCost, totalServiceCost, groupedByMonth, reportType, allActivities);

      // 4. Render PDF
      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      
      // 5. Share/Download
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
      
      onClose();
    } catch (error) {
      Alert.alert("Error", "Gagal membuat PDF.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ENGINE: HTML GENERATOR (PREMIUM CSS)
  // ==========================================
  const buildHTML = (vName: string, vPlate: string, currentOdo: number, totalExp: number, fuelExp: number, servExp: number, grouped: any, mode: string, rawData: any[]) => {
    const formatRp = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // Render Timeline Compact
    let timelineHTML = '';
    for (const [month, data] of Object.entries(grouped)) {
      timelineHTML += `
        <div class="month-group">
          <div class="month-header">
            <h3>${month}</h3>
            <span class="month-total">${(data as any).items.length} Aktivitas | Total: ${formatRp((data as any).total)}</span>
          </div>
          <div class="timeline">
            ${(data as any).items.map((item: any) => `
              <div class="timeline-item">
                <div class="tl-icon">${item.icon}</div>
                <div class="tl-content">
                  <div class="tl-title">
                    <strong>${item.title}</strong>
                    <span class="badge badge-add">ADD</span>
                  </div>
                  <div class="tl-meta">
                    ${new Date(item.date).toLocaleDateString('id-ID')} &bull; ${item.odometer.toLocaleString('id-ID')} km
                  </div>
                </div>
                <div class="tl-cost">${formatRp(item.cost || item.totalCost || 0)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Render Tabel Detail (Hanya jika mode Detail)
    let detailTableHTML = '';
    if (mode === 'detailed') {
      detailTableHTML = `
        <div style="page-break-before: always;"></div>
        <h2 class="section-title">LAMPIRAN DETAIL TRANSAKSI</h2>
        <table class="detail-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Aktivitas</th>
              <th>Odometer</th>
              <th>Biaya</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rawData.map(item => `
              <tr>
                <td>${new Date(item.date).toLocaleDateString('id-ID')}</td>
                <td>${item.icon} ${item.title}</td>
                <td>${item.odometer.toLocaleString('id-ID')} km</td>
                <td>${formatRp(item.cost || item.totalCost || 0)}</td>
                <td><span class="badge badge-add">RECORDED</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    // CSS Bar Chart Sederhana & Aman (100% Offline)
    const fuelPct = totalExp > 0 ? Math.round((fuelExp / totalExp) * 100) : 0;
    const servPct = totalExp > 0 ? Math.round((servExp / totalExp) * 100) : 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @page { size: A4 portrait; margin: 0; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #f4f7f6; color: #1a2b3c; margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
          .page { padding: 40px 50px; box-sizing: border-box; background: #fff; min-height: 297mm; }
          
          /* Cover & Header */
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0d1b2a; padding-bottom: 20px; margin-bottom: 30px; }
          .brand h1 { margin: 0; color: #0d1b2a; font-size: 28px; letter-spacing: 1px; }
          .brand p { margin: 5px 0 0; color: #4ecdc4; font-weight: bold; font-size: 14px; }
          .doc-meta { text-align: right; color: #7f8c8d; font-size: 12px; }
          
          /* Vehicle Info Box */
          .vehicle-card { background: #0d1b2a; color: #fff; border-radius: 12px; padding: 25px; display: flex; justify-content: space-between; margin-bottom: 30px; }
          .v-info h2 { margin: 0 0 5px; font-size: 24px; color: #4ecdc4; }
          .v-info p { margin: 0; opacity: 0.8; font-size: 14px; }
          .v-stats { text-align: right; }
          .v-stats h3 { margin: 0 0 5px; font-size: 20px; font-family: monospace; }
          
          /* Summary Dashboard */
          .dashboard { display: flex; gap: 20px; margin-bottom: 30px; }
          .stat-card { flex: 1; background: #fff; border: 1px solid #e1e8ed; border-radius: 10px; padding: 20px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
          .stat-card span { display: block; font-size: 12px; color: #7f8c8d; text-transform: uppercase; font-weight: bold; margin-bottom: 8px; }
          .stat-card strong { font-size: 18px; color: #0d1b2a; }
          
          /* Simple Offline Chart */
          .chart-section { background: #fff; border: 1px solid #e1e8ed; border-radius: 10px; padding: 20px; margin-bottom: 30px; }
          .chart-section h3 { margin: 0 0 15px; font-size: 14px; color: #1a2b3c; }
          .bar-wrap { display: flex; align-items: center; margin-bottom: 10px; }
          .bar-label { width: 100px; font-size: 12px; font-weight: bold; color: #7f8c8d; }
          .bar-track { flex: 1; background: #e1e8ed; height: 12px; border-radius: 6px; overflow: hidden; margin: 0 15px; }
          .bar-fill.fuel { background: #4ecdc4; height: 100%; width: ${fuelPct}%; }
          .bar-fill.serv { background: #f5a623; height: 100%; width: ${servPct}%; }
          .bar-val { width: 90px; font-size: 12px; text-align: right; font-weight: bold; }

          /* Timeline */
          .section-title { font-size: 16px; color: #0d1b2a; border-bottom: 2px solid #4ecdc4; padding-bottom: 5px; margin-bottom: 20px; display: inline-block; }
          .month-group { margin-bottom: 30px; page-break-inside: avoid; }
          .month-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px; }
          .month-header h3 { margin: 0; color: #0d1b2a; font-size: 16px; }
          .month-total { font-size: 12px; font-weight: bold; color: #4ecdc4; }
          
          .timeline { border-left: 2px solid #e1e8ed; margin-left: 15px; padding-left: 20px; }
          .timeline-item { display: flex; align-items: center; margin-bottom: 15px; position: relative; }
          .tl-icon { position: absolute; left: -33px; background: #fff; border: 2px solid #e1e8ed; border-radius: 50%; width: 24px; height: 24px; text-align: center; line-height: 24px; font-size: 12px; }
          .tl-content { flex: 1; }
          .tl-title { font-size: 14px; color: #1a2b3c; display: flex; align-items: center; gap: 8px; }
          .tl-meta { font-size: 11px; color: #7f8c8d; margin-top: 3px; }
          .tl-cost { font-weight: bold; font-family: monospace; font-size: 14px; color: #f5a623; }

          /* Badges */
          .badge { padding: 3px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; letter-spacing: 0.5px; }
          .badge-add { background: rgba(78, 205, 196, 0.15); color: #2e9e96; border: 1px solid rgba(78, 205, 196, 0.3); }

          /* Detailed Table */
          .detail-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
          .detail-table th { background: #0d1b2a; color: #fff; padding: 10px; text-align: left; }
          .detail-table td { padding: 10px; border-bottom: 1px solid #eee; }
          .detail-table tr:nth-child(even) { background: #f9fbfb; }

          /* Footer */
          .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #bdc3c7; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="brand">
              <h1>GARASIKU</h1>
              <p>PREMIUM VEHICLE REPORT</p>
            </div>
            <div class="doc-meta">
              Generated: ${today}<br>
              Laporan: ${mode === 'summary' ? 'Ringkasan Eksekutif' : 'Detail Lengkap'}
            </div>
          </div>

          <div class="vehicle-card">
            <div class="v-info">
              <h2>${vName}</h2>
              <p>Plat Nomor: ${vPlate}</p>
            </div>
            <div class="v-stats">
              <h3>${currentOdo.toLocaleString('id-ID')} km</h3>
              <p>Current Odometer</p>
            </div>
          </div>

          <div class="dashboard">
            <div class="stat-card">
              <span>Total Pengeluaran</span>
              <strong>${formatRp(totalExp)}</strong>
            </div>
            <div class="stat-card">
              <span>Biaya Bensin</span>
              <strong>${formatRp(fuelExp)}</strong>
            </div>
            <div class="stat-card">
              <span>Biaya Servis</span>
              <strong>${formatRp(servExp)}</strong>
            </div>
          </div>

          <div class="chart-section">
            <h3>Komposisi Pengeluaran</h3>
            <div class="bar-wrap">
              <div class="bar-label">⛽ Bensin</div>
              <div class="bar-track"><div class="bar-fill fuel"></div></div>
              <div class="bar-val">${fuelPct}%</div>
            </div>
            <div class="bar-wrap">
              <div class="bar-label">🛠️ Servis</div>
              <div class="bar-track"><div class="bar-fill serv"></div></div>
              <div class="bar-val">${servPct}%</div>
            </div>
          </div>

          <h2 class="section-title">TIMELINE AKTIVITAS</h2>
          ${timelineHTML || '<p style="color:#7f8c8d; font-size:12px;">Belum ada aktivitas tercatat.</p>'}

          ${detailTableHTML}

          <div class="footer">
            Dokumen ini di-generate secara otomatis oleh aplikasi GarasiKu v2.1.0.<br>
            © ${new Date().getFullYear()} GarasiKu App. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Export ke PDF</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
          </View>

          <Text style={styles.label}>Tipe Laporan</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={() => setReportType('summary')} style={[styles.btnOption, reportType === 'summary' && styles.btnActive]}>
              <Text style={[styles.txtOption, reportType === 'summary' && styles.txtActive]}>Ringkasan</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setReportType('detailed')} style={[styles.btnOption, reportType === 'detailed' && styles.btnActive]}>
              <Text style={[styles.txtOption, reportType === 'detailed' && styles.txtActive]}>Detail Lengkap</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Pilih Kendaraan</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15, flexGrow: 0 }}>
            <TouchableOpacity onPress={() => setSelectedVehicle('all')} style={[styles.btnOption, selectedVehicle === 'all' && styles.btnActive, { marginRight: 10 }]}>
              <Text style={[styles.txtOption, selectedVehicle === 'all' && styles.txtActive]}>Semua</Text>
            </TouchableOpacity>
            {vehicles.map(v => (
              <TouchableOpacity key={v.id} onPress={() => setSelectedVehicle(v.id)} style={[styles.btnOption, selectedVehicle === v.id && styles.btnActive, { marginRight: 10 }]}>
                <Text style={[styles.txtOption, selectedVehicle === v.id && styles.txtActive]}>{v.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Periode</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={() => setDateRange('all')} style={[styles.btnOption, dateRange === 'all' && styles.btnActive]}>
              <Text style={[styles.txtOption, dateRange === 'all' && styles.txtActive]}>Semua Waktu</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDateRange('this_year')} style={[styles.btnOption, dateRange === 'this_year' && styles.btnActive]}>
              <Text style={[styles.txtOption, dateRange === 'this_year' && styles.txtActive]}>Tahun Ini</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={generatePDF} style={styles.btnExport} disabled={loading}>
            {loading ? <ActivityIndicator color="#0D1B2A" /> : <Text style={styles.btnExportTxt}>Generate & Download PDF</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#162431', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  close: { color: 'rgba(255,255,255,0.5)', fontSize: 20, fontWeight: 'bold' },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  btnOption: { flex: 1, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center' },
  btnActive: { borderColor: '#4ECDC4', backgroundColor: 'rgba(78,205,196,0.1)' },
  txtOption: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  txtActive: { color: '#4ECDC4', fontWeight: '800' },
  btnExport: { backgroundColor: '#4ECDC4', padding: 16, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  btnExportTxt: { color: '#0D1B2A', fontWeight: '900', fontSize: 15 }
});