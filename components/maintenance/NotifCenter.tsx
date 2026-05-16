// components/maintenance/NotifCenter.tsx
import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { NotificationItem } from '@/types/maintenance';
import { useLanguage } from '@/context/LanguageContext';

interface NotifCenterProps {
  visible: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  selectedVehicleId: string;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
}

type FilterType = 'all' | 'system' | 'vehicle' | 'unread';

export default function NotifCenter({
  visible, onClose, notifications, selectedVehicleId, onMarkAsRead, onMarkAllAsRead, onDelete
}: NotifCenterProps) {
  const { lang } = useLanguage();
  const [filter, setFilter] = useState<FilterType>('all');

  // Filter logika: Sesuaikan dengan kendaraan yang aktif & jenis filter
  const filteredNotifs = notifications.filter(n => {
    // 1. Pastikan notifikasi kendaraan cocok dengan kendaraan yang sedang dipilih
    if (n.type === 'vehicle' && n.vehicleId !== selectedVehicleId) return false;
    
    // 2. Terapkan filter tab
    if (filter === 'system' && n.type !== 'system') return false;
    if (filter === 'vehicle' && n.type !== 'vehicle') return false;
    if (filter === 'unread' && n.isRead) return false;
    
    return true;
  });

  const getIcon = (type: string, title: string) => {
    if (type === 'system') return '📢';
    if (title.toLowerCase().includes('hapus')) return '🗑️';
    if (title.toLowerCase().includes('oli') || title.toLowerCase().includes('service')) return '🛠️';
    if (title.toLowerCase().includes('kilometer') || title.toLowerCase().includes('odometer')) return '⏱️';
    return '🏍️';
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
        <View style={{ 
          height: '85%', backgroundColor: '#0D1B2A', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 
        }}>
          
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800' }}>
              {lang === 'id' ? 'Notifikasi' : 'Notifications'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 15 }}>
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['all', 'system', 'vehicle', 'unread'] as FilterType[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={{
                    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
                    backgroundColor: filter === f ? '#4ECDC4' : '#1A2B3C',
                  }}
                >
                  <Text style={{ 
                    color: filter === f ? '#0D1B2A' : '#FFF', 
                    fontWeight: '700', textTransform: 'capitalize' 
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
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 15 }}>
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
                <Text style={{ color: '#FFF', fontSize: 16 }}>
                  {lang === 'id' ? 'Belum ada notifikasi.' : 'No notifications yet.'}
                </Text>
              </View>
            ) : (
              filteredNotifs.map(notif => (
                <TouchableOpacity
                  key={notif.id}
                  onPress={() => onMarkAsRead(notif.id)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: notif.isRead ? '#1A2B3C' : 'rgba(78,205,196,0.1)',
                    borderWidth: 1, borderColor: notif.isRead ? 'rgba(255,255,255,0.05)' : 'rgba(78,205,196,0.3)',
                    borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', gap: 15
                  }}
                >
                  <View style={{ 
                    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.2)', 
                    alignItems: 'center', justifyContent: 'center' 
                  }}>
                    <Text style={{ fontSize: 18 }}>{getIcon(notif.type, notif.title)}</Text>
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>{notif.title}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                        {new Date(notif.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 18 }}>
                      {notif.message}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                      <Text style={{ color: notif.type === 'system' ? '#F5A623' : '#4ECDC4', fontSize: 10, fontWeight: '700' }}>
                        {notif.type === 'system' ? 'SISTEM' : 'KENDARAAN'}
                      </Text>
                      <TouchableOpacity onPress={() => onDelete(notif.id)}>
                        <Text style={{ color: '#FF5252', fontSize: 12 }}>Hapus</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {!notif.isRead && (
                    <View style={{ width: 10, height: 10, borderRadius: 4, backgroundColor: '#4ECDC4', position: 'absolute', top: 16, left: 16 }} />
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