import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { NotificationItem } from '@/types/maintenance';
import { useLanguage } from '@/context/LanguageContext';

interface NotifCenterProps {
  visible: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
}

type FilterType = 'all' | 'system' | 'vehicle' | 'unread';

export default function NotifCenter({
  visible, onClose, notifications, onMarkAsRead, onMarkAllAsRead, onDelete
}: NotifCenterProps) {
  const { lang } = useLanguage();
  const [filter, setFilter] = useState<FilterType>('all');

  // Filter logika: GLOBAL UNTUK SEMUA KENDARAAN (Hanya filter tab saja)
  const filteredNotifs = notifications.filter(n => {
    if (filter === 'system' && n.type !== 'system') return false;
    if (filter === 'vehicle' && n.type !== 'vehicle') return false;
    if (filter === 'unread' && n.isRead) return false;
    return true;
  });

  // Dynamic Icon sesuai instruksi
  const getIcon = (notif: NotificationItem) => {
    if (notif.type === 'system') return '🔔';
    if (notif.badge === 'DELETE') return '🗑️';
    if (notif.badge === 'UPDATE') return '✏️';
    if (notif.source?.toLowerCase().includes('bensin') || notif.source?.toLowerCase().includes('fuel')) return '⛽';
    if (notif.source?.toLowerCase().includes('sparepart')) return '🔧';
    return '🛠️'; // Default service
  };

  // Dynamic Badge Color
  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case 'ADD': return '#4ECDC4'; // Hijau/Cyan
      case 'UPDATE': return '#2196F3'; // Biru
      case 'DELETE': return '#FF5252'; // Merah
      case 'ROLLBACK': return '#FF9800'; // Orange
      default: return '#F5A623'; // System
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
        <View style={{ height: '85%', backgroundColor: '#0D1B2A', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 }}>
          
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800' }}>
              {lang === 'id' ? 'Aktivitas & Notifikasi' : 'Activities & Notifications'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 15 }}>
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Filters */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={{ flexGrow: 0, marginBottom: 20, minHeight: 45 }} 
          >
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 2, alignItems: 'center' }}>
              {(['all', 'system', 'vehicle', 'unread'] as FilterType[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={{
                    // FIX 2: Gunakan tinggi fix dan border radius setengahnya = Oval Sempurna
                    height: 36, 
                    borderRadius: 18, 
                    paddingHorizontal: 20, 
                    backgroundColor: filter === f ? '#4ECDC4' : '#1A2B3C',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ 
                    color: filter === f ? '#0D1B2A' : '#FFF', 
                    fontWeight: '700', 
                    textTransform: 'capitalize'
                    // FIX 3: Hapus lineHeight yang tadi bikin gepeng
                  }}>
                    {f === 'unread' ? (lang === 'id' ? 'Belum Dibaca' : 'Unread') : 
                     f === 'vehicle' ? (lang === 'id' ? 'Kendaraan' : 'Vehicle') : 
                     f === 'system' ? 'Sistem' : (lang === 'id' ? 'Semua' : 'All')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 20 }}>
            <TouchableOpacity onPress={onMarkAllAsRead}>
              <Text style={{ color: '#F5A623', fontSize: 12, fontWeight: '700' }}>
                {lang === 'id' ? '✓ Tandai Semua Dibaca' : '✓ Mark All as Read'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* List */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {filteredNotifs.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                <Text style={{ fontSize: 50, marginBottom: 15 }}>📭</Text>
                <Text style={{ color: '#FFF', fontSize: 16 }}>{lang === 'id' ? 'Belum ada notifikasi.' : 'No notifications yet.'}</Text>
              </View>
            ) : (
              filteredNotifs.map(notif => (
                <TouchableOpacity
                  key={notif.id}
                  onPress={() => onMarkAsRead(notif.id)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: notif.isRead ? '#1A2B3C' : 'rgba(78,205,196,0.05)',
                    borderWidth: 1, borderColor: notif.isRead ? 'rgba(255,255,255,0.05)' : 'rgba(78,205,196,0.3)',
                    borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', gap: 15
                  }}
                >
                  {/* Icon Left */}
                  <View style={{ width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{getIcon(notif)}</Text>
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800', flex: 1, lineHeight: 22 }}>
                        {notif.title}
                      </Text>>
                      {notif.badge && (
                        <View style={{ backgroundColor: getBadgeColor(notif.badge), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8, alignSelf: 'flex-start' }}>
                          <Text style={{ color: '#FFF', fontSize: 9, fontWeight: 'bold', lineHeight: 12, textAlign: 'center' }}>
                            {notif.badge}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 20, marginBottom: 10 }}>
                      {notif.message}
                    </Text>

                    {/* Odometer Before/After Block (If available) */}
                    {(notif.oldOdometer !== undefined || notif.newOdometer !== undefined) && (
                      <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View>
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 'bold' }}>SEBELUM</Text>
                          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>{notif.oldOdometer?.toLocaleString('id-ID') || 0} km</Text>
                        </View>
                        <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>➔</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 'bold' }}>SESUDAH</Text>
                          <Text style={{ color: '#4ECDC4', fontSize: 12, fontWeight: '700' }}>{notif.newOdometer?.toLocaleString('id-ID') || 0} km</Text>
                        </View>
                      </View>
                    )}

                    {/* Footer: Vehicle Name & Time */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#00BCD4', fontSize: 10, fontWeight: '800' }}>
                        {notif.type === 'system' ? 'SISTEM' : `KENDARAAN • ${notif.vehicleName || '-'}`}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                        <TouchableOpacity onPress={() => onDelete(notif.id)}>
                          <Text style={{ color: '#FF5252', fontSize: 11, fontWeight: 'bold' }}>Hapus</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {!notif.isRead && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ECDC4', position: 'absolute', top: 16, right: 16 }} />
                  )}
                </TouchableOpacity>
              ))
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}