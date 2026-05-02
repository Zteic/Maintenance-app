import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { NotificationItem } from '@/types/maintenance';

interface NotifCenterProps {
  visible: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkAllRead: () => void;
  lang: string;
}

export default function NotifCenter({ visible, notifications, onClose, onMarkAllRead, lang }: NotifCenterProps) {
  const isId = lang === 'id';
  const sorted = [...notifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const timeAgo = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return isId ? 'Baru saja' : 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} ${isId ? 'menit lalu' : 'min ago'}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${isId ? 'jam lalu' : 'hr ago'}`;
    return `${Math.floor(diff / 86400)} ${isId ? 'hari lalu' : 'days ago'}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-start', paddingTop: 100, paddingHorizontal: 16 }}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={{ backgroundColor: '#1A2B3C', borderRadius: 20, maxHeight: 400, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>🔔 {isId ? 'Notifikasi' : 'Notifications'}</Text>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  {notifications.some(n => !n.read) && (
                    <TouchableOpacity onPress={onMarkAllRead}>
                      <Text style={{ color: '#F5A623', fontSize: 12, fontWeight: '600' }}>{isId ? 'Tandai baca' : 'Mark all read'}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={onClose} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {sorted.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
                    <Text style={{ fontSize: 32 }}>🔕</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                      {isId ? 'Tidak ada notifikasi' : 'No notifications'}
                    </Text>
                  </View>
                ) : (
                  sorted.map((notif) => (
                    <View key={notif.id} style={{
                      padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
                      backgroundColor: notif.read ? 'transparent' : 'rgba(245,166,35,0.05)',
                      flexDirection: 'row', gap: 12, alignItems: 'flex-start',
                    }}>
                      {!notif.read && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F5A623', marginTop: 5 }} />}
                      {notif.read && <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 5 }} />}
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: notif.read ? '400' : '600' }}>{notif.title}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 18 }}>{notif.body}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>{timeAgo(notif.timestamp)}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
