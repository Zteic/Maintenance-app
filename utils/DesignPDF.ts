// utils/DesignPDF.tsx

interface PdfTemplateProps {
  filteredRepairs: any[];
  filteredFuels: any[];
  filteredTaxes: any[]; // <--- TAMBAHKAN INI
  includeTaxInPdf: boolean;
  vehicles: any[];
  selectedVehicles: string[];
  pdfReportType: 'summary' | 'hybrid';
  period: string;
  isId: boolean;
  getPeriodLabel: (p: string) => string;
  CURRENT_APP_NAME: string;
  CURRENT_SCHEMA_VERSION: string;
}

export const generatePdfTemplate = ({
  filteredRepairs,
  filteredFuels,
  filteredTaxes, // <--- TAMBAHKAN INI
  includeTaxInPdf,
  vehicles,
  selectedVehicles,
  pdfReportType,
  period,
  isId,
  getPeriodLabel,
  CURRENT_APP_NAME,
  CURRENT_SCHEMA_VERSION
}: PdfTemplateProps): string => {

  const taxesToInclude = includeTaxInPdf ? filteredTaxes : []; // <--- TAMBAHKAN Variabel Ini
  
  const currentYear = new Date().getFullYear();
  const exportedVehicles = selectedVehicles.includes('all') 
    ? vehicles 
    : vehicles.filter(v => selectedVehicles.includes(v.id));

  // 1. KUMPULKAN STATISTIK KENDARAAN
  const vehicleStats = exportedVehicles.map(v => {
    const vRepairs = filteredRepairs.filter(r => r.vehicleId === v.id);
    const vFuels = filteredFuels.filter(f => f.vehicleId === v.id);
    const vTaxes = taxesToInclude.filter(t => t.vehicle_id === v.id); // <--- TAMBAHKAN INI

    const vTotalService = vRepairs.reduce((sum, r) => sum + (r.cost || 0), 0);
    const vTotalFuel = vFuels.reduce((sum, f) => sum + (f.totalCost || 0), 0);
    const vTotalTax = vTaxes.reduce((sum, t) => sum + (t.total_pembayaran || 0), 0);
    
    const vOdos = [...vRepairs.map(r => r.odometer), ...vFuels.map(f => f.odometer)].filter(o => o > 0);
    let vMaxService = { serviceType: "-", cost: 0 };
    if (vRepairs.length > 0) {
      const sorted = [...vRepairs].sort((a, b) => b.cost - a.cost);
      vMaxService = { serviceType: sorted[0].serviceType, cost: sorted[0].cost };
    }

    return {
      name: v.name, brand: v.brand, model: v.model, plate: v.plateNumber,
      vTotalExpense: vTotalService + vTotalFuel + vTotalTax,
      vFuelCount: vFuels.length,
      vFuelLiters: vFuels.reduce((sum, f) => sum + (f.liters || 0), 0),
      vServiceCount: vRepairs.length,
      vOdoIncrease: vOdos.length > 1 ? Math.max(...vOdos) - Math.min(...vOdos) : 0,
      vCurrentOdo: vOdos.length > 0 ? Math.max(...vOdos) : (v.currentOdometer || 0),
      vMaxService,
      vMaxFuel: vFuels.length > 0 ? Math.max(...vFuels.map(f => f.totalCost || 0)) : 0
    };
  });

  const totalFuelCost = filteredFuels.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  const totalServiceCost = filteredRepairs.reduce((sum, item) => sum + (item.cost || 0), 0);
  const totalTaxCost = taxesToInclude.reduce((sum, item) => sum + (item.total_pembayaran || 0), 0); // <--- TAMBAHKAN INI
  const totalExpense = totalFuelCost + totalServiceCost + totalTaxCost;

  // 2. KUMPULKAN TIMELINE AKTIVITAS BULANAN
  const allActivities = [
    ...filteredRepairs.map(r => ({ ...r, type: 'SERVICE', icon: '🛠️', title: r.serviceType, displayCost: r.cost, vehicleName: vehicles.find(v => v.id === r.vehicleId)?.name || '-' })),
    ...filteredFuels.map(f => ({ ...f, type: 'FUEL', icon: '⛽', title: `${isId ? 'Isi Bensin' : 'Fuel Fill'} ${f.liters.toFixed(1)}L`, displayCost: f.totalCost, vehicleName: vehicles.find(v => v.id === f.vehicleId)?.name || '-' })), // <--- TAMBAHKAN KOMA DI UJUNG BARIS INI
    // TAMBAHKAN BLOK PAJAK INI:
    ...taxesToInclude.map(t => ({ 
      ...t, 
      date: t.payment_date, 
      odometer: 0, 
      type: 'TAX', 
      icon: '🏛️', 
      title: t.payment_type === 'five_year_stnk' ? 'Pajak & STNK 5 Tahunan' : 'Pajak Tahunan', 
      displayCost: t.total_pembayaran, 
      vehicleName: vehicles.find(v => v.id === t.vehicle_id)?.name || '-' 
    }))
  ].sort((a, b) => b.date.localeCompare(a.date));

  const groupedByMonth: Record<string, { items: any[], total: number }> = {};
  allActivities.forEach(item => {
    const dateObj = new Date(item.date);
    const monthYear = dateObj.toLocaleDateString(isId ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' });
    if (!groupedByMonth[monthYear]) groupedByMonth[monthYear] = { items: [], total: 0 };
    groupedByMonth[monthYear].items.push(item);
    groupedByMonth[monthYear].total += item.displayCost;
  });

  const fuelPct = totalExpense > 0 ? Math.round((totalFuelCost / totalExpense) * 100) : 0;
  const servPct = totalExpense > 0 ? Math.round((totalServiceCost / totalExpense) * 100) : 0;
  const taxPct = totalExpense > 0 ? Math.round((totalTaxCost / totalExpense) * 100) : 0; // <--- TAMBAHKAN INI
  const formatRp = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;
  const showVehicleBadge = selectedVehicles.includes('all') || selectedVehicles.length > 1;
  
  const qrData = `GarasiKu|VERIFIED|Date:${new Date().toISOString().split('T')[0]}|Vehicles:${selectedVehicles.join('-')}|TotalCost:${totalExpense}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`;

  // 3. LAMPIRAN MEDIA FOTO
  let photosHTML = '';
  const activitiesWithPhotos = allActivities.filter((a: any) => a.imageUri || a.photo || a.image || a.receiptImage);
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

  // 4. SUSUN TIMELINE KE HTML
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

  const reportId = `VHDB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateNow = new Date();
  const footerTimestamp = `${dateNow.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} • ${dateNow.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
  
  const isMultiVehicle = selectedVehicles.includes('all') || selectedVehicles.length > 1;
  const vehicleFooterLabel = isMultiVehicle 
    ? "Multi Vehicle Report" 
    : (exportedVehicles.length === 1 ? `${exportedVehicles[0].name} • ${exportedVehicles[0].plate || exportedVehicles[0].plateNumber || '-'}` : "Multi Vehicle Report");

  const runningFooterHTML = `
    <tfoot class="report-footer">
      <tr>
        <td style="padding-top: 20px; background-color: #fff;">
          <div class="footer-wrapper">
            <div class="f-left">
              <div class="f-id">Report ID: ${reportId}</div>
              <div class="f-veh">${vehicleFooterLabel}</div>
            </div>
            <div class="f-center">
              <div class="f-title">Official Vehicle Analytics Report</div>
              <div style="font-size: 8px; margin-top: 2px;">Generated automatically by GarasiKu<br>${footerTimestamp}</div>
            </div>
            <div class="f-right">
              <span class="page-num"></span>
            </div>
          </div>
        </td>
      </tr>
    </tfoot>
  `;

  let appendixHTML = '';
  if (pdfReportType === 'hybrid') {
    appendixHTML = `
      <div style="page-break-before: always; break-before: page;"></div>
      <table class="report-wrapper">
        <thead class="report-header">
          <tr>
            <td>
              <div class="compact-header">
                <div class="ch-left">
                  <span class="ch-brand">GARASIKU</span>
                  <span class="ch-sub">Executive Vehicle Analytics</span>
                </div>
                <div class="ch-center">LAMPIRAN HISTORY DATA LENGKAP (APPENDIX)</div>
                <div class="ch-right"></div>
              </div>
            </td>
          </tr>
        </thead>
        <tbody class="report-body">
          <tr>
            <td>
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
            </td>
          </tr>
        </tbody>
        ${runningFooterHTML}
      </table>
    `;
  }

  // RETURN STRING HTML PENUH
  return `
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
      .bar-fill.tax { background: #9B59B6; height: 100%; width: ${taxPct}%; }
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
      .photo-grid { width: 100%; text-align: left; margin-top: 10px; }
      .photo-box { display: inline-block; width: 155px; margin: 8px; border: 1px solid #e1e8ed; padding: 6px; border-radius: 8px; vertical-align: top; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
      .photo-box img { width: 100%; height: 110px; object-fit: cover; border-radius: 6px; background: #f5f7f8; }
      .photo-box .photo-caption { font-size: 9px; color: #555; margin-top: 6px; line-height: 12px; text-align: center; word-wrap: break-word; }
      .qr-wrapper { display: block; margin: 15px auto 5px auto; text-align: center; }
      .qr-wrapper img { width: 85px; height: 85px; padding: 5px; border: 1px solid #eee; background: #fff; border-radius: 6px; }

      table.report-wrapper { width: 100%; border-collapse: collapse; page-break-inside: auto; }
      thead.report-header { display: table-header-group; }
      thead.report-header td { padding-top: 50px; } 
      tbody.report-body { display: table-row-group; }
      
      body { counter-reset: page; }
      tfoot.report-footer { display: table-footer-group; }
      tfoot.report-footer td { padding-bottom: 50px; }
      
      .footer-wrapper {
        margin-top: 15px;
        padding-top: 8px;
        border-top: 1px solid rgba(0,0,0,0.08);
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 9px;
        color: #7f8c8d;
      }
      .f-left { text-align: left; line-height: 1.4; width: 33%; }
      .f-center { text-align: center; line-height: 1.4; width: 33%; opacity: 0.85; }
      .f-right { text-align: right; line-height: 1.4; width: 33%; }
      .f-id { font-weight: 800; color: #0D1B2A; }
      .f-veh { font-size: 8px; font-weight: 700; text-transform: uppercase; margin-top: 1px; color: #7f8c8d; }
      .f-title { font-weight: 800; color: #0D1B2A; letter-spacing: 0.3px; font-size: 9px; }
      
      .page-num::before { 
        counter-increment: page; 
        content: "Page " counter(page); 
        font-weight: 800; 
        color: #0D1B2A; 
      }
      
      .final-verification { text-align: center; font-size: 10px; color: #bdc3c7; padding-top: 30px; page-break-inside: avoid; }
      .compact-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #0D1B2A; padding-bottom: 8px; margin-bottom: 20px; width: 100%; }
      .ch-left { text-align: left; flex: 1; }
      .ch-brand { font-size: 13px; font-weight: 900; color: #0D1B2A; letter-spacing: 0.5px; display: block; }
      .ch-sub { font-size: 8px; color: #4ECDC4; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
      .ch-center { text-align: center; flex: 1; font-size: 10px; font-weight: 800; color: #0D1B2A; letter-spacing: 0.5px; text-transform: uppercase; }
      .ch-right { text-align: right; flex: 1; font-size: 10px; color: #7f8c8d; font-weight: 700; }
    </style>
  </head>
  <body>
    <div class="page">
      <table class="report-wrapper">
        <tbody class="report-body">
          <tr>
            <td>
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

              <div style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 12px; margin-bottom: 25px; width: 100%;">
                ${vehicleStats.map(vs => `
                  <div class="vehicle-card" style="margin-bottom: 0; background: transparent !important; border: 1px solid rgba(0, 0, 0, 0.25); border-radius: 12px; padding: 12px 15px; flex: 1; min-width: 200px; display: flex; justify-content: space-between; align-items: center;">
                    <div class="v-info">
                      <h2 style="font-size: 16px; margin: 0 0 2px 0; color: #000000;"> ${vs.name}</h2>
                      <p style="font-size: 11px; margin: 0; color: #000000; opacity: 0.6;">${vs.brand || ''} ${vs.model || ''} &bull; ${vs.plate || '-'}</p>
                    </div>
                    <div class="v-stats">
                      <h3 style="font-size: 16px; margin: 0; color: #4ECDC4; font-family: monospace;">${vs.vCurrentOdo.toLocaleString('id-ID')} km</h3>
                      <p style="font-size: 9px; margin: 0; color: #000000; opacity: 0.5; text-transform: uppercase; font-weight: bold;">Odometer</p>
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
            </td>
          </tr>
        </tbody>
        ${runningFooterHTML}
      </table>

      <div style="page-break-before: always; break-before: page;"></div>
      
      <table class="report-wrapper">
        <thead class="report-header">
          <tr>
            <td>
              <div class="compact-header">
                <div class="ch-left">
                  <span class="ch-brand">GARASIKU</span>
                  <span class="ch-sub">Executive Vehicle Analytics</span>
                </div>
                <div class="ch-center">TIMELINE AKUMULASI BULANAN</div>
                <div class="ch-right"></div>
              </div>
            </td>
          </tr>
        </thead>
        <tbody class="report-body">
          <tr>
            <td>
              ${timelineHTML || `<p style="color:#7f8c8d; font-size:12px;">${isId ? 'Tidak ada data aktivitas di periode ini.' : 'No activities recorded in this period.'}</p>`}
              ${photosHTML}
            </td>
          </tr>
        </tbody>
        ${runningFooterHTML}
      </table>

      ${appendixHTML}

      <div style="page-break-before: always; break-before: page;"></div>
      <div class="final-verification">
        <div class="qr-wrapper">
          <img src="${qrCodeUrl}" alt="QR Verification" />
          <div style="font-size: 8px; color: #bdc3c7; margin-top: 4px; font-weight: bold; letter-spacing: 0.5px;">SECURE VERIFICATION QR</div>
        </div>
        <b style="color: #0D1B2A; letter-spacing: 1px; font-size: 11px;">ENCRYPTED VERIFICATION NOTICE</b><br>
        <span style="font-size: 10px; color: #7f8c8d; line-height: 1.6; display: block; margin-top: 8px;">
          Laporan ini dibuat secara otomatis dan sah melalui enkripsi local database GarasiKu v${CURRENT_SCHEMA_VERSION}.<br>
          &copy; ${new Date().getFullYear()} GarasiKu App. All rights reserved.
        </span>
      </div>
    </div>
  </body>
  </html>
  `;
};