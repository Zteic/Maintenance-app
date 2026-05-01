import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, SafeAreaView, Image,
  ScrollView, TextInput, Alert, StatusBar, Share,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { loadUserProfile, saveUserProfile, loadVehicles, loadRepairs } from "@/utils/storage";
import { UserProfile, Vehicle, RepairEntry } from "@/types/maintenance";
import { MOCK_VEHICLES, MOCK_REPAIRS } from "@/data/mockData";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function buildPdfHtml(vehicles: Vehicle[], repairs: RepairEntry[], lang: string): string {
  const isId = lang === 'id';
  let html = `<html><head><meta charset="utf-8"><style>
    body{font-family:sans-serif;background:#fff;color:#111;padding:24px}
    h1{color:#0D1B2A;font-size:24px;margin-bottom:4px}
    h2{color:#F5A623;font-size:18px;margin-top:24px;border-bottom:2px solid #F5A623;padding-bottom:6px}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
    th{background:#0D1B2A;color:#fff;padding:8px 10px;text-align:left}
    td{padding:8px 10px;border-bottom:1px solid #eee}
    tr:nth-child(even){background:#f9f9f9}
    .badge{display:inline-block;background:#F5A623;color:#0D1B2A;border-radius:4px;padding:2px 8px;font-weight:bold;font-size:11px}
  </style></head><body>
  <h1>🚗 GarasiKu — ${isId ? 'Riwayat Servis' : 'Service History'}</h1>
  <p style="color:#666;font-size:12px">${isId ? 'Diekspor' : 'Exported'}: ${new Date().toLocaleDateString()}</p>`;

  for (const v of vehicles) {
    const vRepairs = repairs.filter(r => r.vehicleId === v.id);
    const total = vRepairs.reduce((s, r) => s + r.cost, 0);
    html += `<h2>${v.name} — ${v.year} ${v.brand} ${v.model}</h2>
    <p><strong>${isId ? 'Plat' : 'Plate'}:</strong> ${v.plateNumber} &nbsp;|&nbsp; 
    <strong>Odometer:</strong> ${v.currentOdometer.toLocaleString()} km &nbsp;|&nbsp;
    <strong>${isId ? 'Total Biaya' : 'Total Cost'}:</strong> ${formatCurrency(total)}</p>`;

    if (vRepairs.length === 0) {
      html += `<p style="color:#999">${isId ? 'Belum ada catatan servis.' : 'No service records.'}</p>`;
    } else {
      html += `<table><tr>
        <th>${isId ? 'Tanggal' : 'Date'}</th>
        <th>${isId ? 'Jenis Servis' : 'Service'}</th>
        <th>${isId ? 'Bengkel' : 'Workshop'}</th>
        <th>Odometer</th>
        <th>${isId ? 'Biaya' : 'Cost'}</th>
        <th>${isId ? 'Catatan' : 'Notes'}</th>
      </tr>`;
      const sorted = [...vRepairs].sort((a, b) => b.date.getTime() - a.date.getTime());
      for (const r of sorted) {
        const noteClean = r.notes.replace(/\n?\[receipts:.*?\]/g, '').trim();
        html += `<tr>
          <td>${r.date.toLocaleDateString()}</td>
          <td><span class="badge">${r.serviceType}</span></td>
          <td>${r.workshop}</td>
          <td>${r.odometer.toLocaleString()} km</td>
          <td>${formatCurrency(r.cost)}</td>
          <td style="font-size:11px;color:#555">${noteClean || '-'}</td>
        </tr>`;
      }
      html += `</table>`;
    }
  }

  html += `</body></html>`;
  return html;
}

export default function ProfileScreen() {
  return (
    <LanguageProvider>
      <ProfileContent />
    </LanguageProvider>
  );
}

function ProfileContent() {
  const { t, lang } = useLanguage();
  const [profile, setProfile] = useState<UserProfile>({ name: "Pengguna", email: "user@example.com" });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  useEffect(() => {
    loadUserProfile().then((p) => {
      if (p) setProfile(p);
    });
  }, []);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(lang === 'id' ? 'Izin Diperlukan' : 'Permission Required',
        lang === 'id' ? 'Diperlukan izin akses galeri.' : 'Gallery access permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const updated = { ...profile, photoUri: result.assets[0].uri };
      setProfile(updated);
      saveUserProfile(updated);
    }
  };

  const handleSaveProfile = () => {
    const updated = { ...profile, name: editName.trim() || profile.name, email: editEmail.trim() || profile.email };
    setProfile(updated);
    saveUserProfile(updated);
    setEditing(false);
  };

  const handleExportPdf = async () => {
    try {
      const vehicles = (await loadVehicles()) ?? MOCK_VEHICLES;
      const repairs = (await loadRepairs()) ?? MOCK_REPAIRS;
      const html = buildPdfHtml(vehicles, repairs, lang);
      await Share.share({
        title: `GarasiKu - ${t('exportPdf')}`,
        message: lang === 'id'
          ? `=== GarasiKu Riwayat Servis ===\nDiekspor: ${new Date().toLocaleDateString()}\n\n` +
            vehicles.map(v => {
              const r = repairs.filter(x => x.vehicleId === v.id);
              return `🚗 ${v.name} (${v.plateNumber})\n` + r.map(x =>
                `  • ${x.date.toLocaleDateString()} - ${x.serviceType} - ${formatCurrency(x.cost)} - ${x.workshop}`
              ).join('\n');
            }).join('\n\n')
          : `=== GarasiKu Service History ===\nExported: ${new Date().toLocaleDateString()}\n\n` +
            vehicles.map(v => {
              const r = repairs.filter(x => x.vehicleId === v.id);
              return `🚗 ${v.name} (${v.plateNumber})\n` + r.map(x =>
                `  • ${x.date.toLocaleDateString()} - ${x.serviceType} - ${formatCurrency(x.cost)} - ${x.workshop}`
              ).join('\n');
            }).join('\n\n'),
      });
    } catch (e) {
      Alert.alert('Error', 'Could not export service history.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0D1B2A" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "800" }}>{t('myProfile')}</Text>
        </View>

        {/* Avatar Section */}
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.85} style={{ position: 'relative' }}>
            <View style={{
              width: 110, height: 110, borderRadius: 55,
              backgroundColor: "#1A2B3C", borderWidth: 2.5, borderColor: "#F5A623",
              justifyContent: "center", alignItems: "center", overflow: 'hidden',
            }}>
              {profile.photoUri ? (
                <Image source={{ uri: profile.photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <Text style={{ fontSize: 50 }}>👤</Text>
              )}
            </View>
            <View style={{
              position: 'absolute', bottom: 2, right: 2,
              backgroundColor: '#F5A623', borderRadius: 14,
              width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
              borderWidth: 2, borderColor: '#0D1B2A',
            }}>
              <Text style={{ fontSize: 14 }}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 10 }}>
            {t('changePhoto')}
          </Text>
        </View>

        {/* Profile Card */}
        <View style={{ marginHorizontal: 20, backgroundColor: "#1A2B3C", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 16 }}>
          {!editing ? (
            <>
              <View style={{ gap: 4 }}>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: 1 }}>{t('userName')}</Text>
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>{profile.name}</Text>
              </View>
              <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.05)" }} />
              <View style={{ gap: 4 }}>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: 1 }}>{t('email')}</Text>
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>{profile.email}</Text>
              </View>
              <TouchableOpacity
                onPress={() => { setEditName(profile.name); setEditEmail(profile.email); setEditing(true); }}
                activeOpacity={0.8}
                style={{ paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(245,166,35,0.1)', borderWidth: 1, borderColor: 'rgba(245,166,35,0.25)', alignItems: 'center' }}
              >
                <Text style={{ color: '#F5A623', fontSize: 14, fontWeight: '600' }}>✏️ {t('editProfile')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={{ gap: 8 }}>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: 1 }}>{t('userName')}</Text>
                <TextInput
                  value={editName} onChangeText={setEditName}
                  style={{ backgroundColor: '#0D1B2A', borderRadius: 10, padding: 12, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: 1 }}>{t('email')}</Text>
                <TextInput
                  value={editEmail} onChangeText={setEditEmail}
                  keyboardType="email-address" autoCapitalize="none"
                  style={{ backgroundColor: '#0D1B2A', borderRadius: 10, padding: 12, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => setEditing(false)} activeOpacity={0.8} style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#0D1B2A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveProfile} activeOpacity={0.85} style={{ flex: 2, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F5A623', alignItems: 'center' }}>
                  <Text style={{ color: '#0D1B2A', fontSize: 14, fontWeight: '800' }}>{t('saveProfile')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Export PDF */}
        <View style={{ marginHorizontal: 20, marginTop: 16 }}>
          <TouchableOpacity
            onPress={handleExportPdf}
            activeOpacity={0.85}
            style={{
              backgroundColor: "#1A2B3C", borderRadius: 16, padding: 20,
              borderWidth: 1, borderColor: 'rgba(245,166,35,0.2)',
              flexDirection: 'row', alignItems: 'center', gap: 16,
            }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(245,166,35,0.15)', borderWidth: 1, borderColor: 'rgba(245,166,35,0.3)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22 }}>📤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{t('exportPdf')}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>{t('exportPdfDesc')}</Text>
            </View>
            <Text style={{ color: '#F5A623', fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
