import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { usePremium } from '@/context/PremiumContext';

interface GateProps {
  children: React.ReactNode;
  featureName: string;
  featureDescription: string;
  onLockedPress: (name: string, desc: string) => void;
}

export default function PremiumGateWrapper({ children, featureName, featureDescription, onLockedPress }: GateProps) {
  const { isPremium } = usePremium();

  // Poin 9: Jika status pengguna sudah PREMIUM, buka akses penuh tanpa hambatan
  if (isPremium) {
    return <>{children}</>;
  }

  // Poin 4: Jika pengguna FREE, tampilkan pratinjau interaktif yang terkunci
  return (
    <View style={styles.gateContainer}>
      {/* Lapisan transparan untuk menangkap ketukan jari pada fitur terproteksi */}
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => onLockedPress(featureName, featureDescription)}
        style={styles.absoluteOverlay}
      />
      
      {/* Memberikan efek visual redup yang elegan, rapi, dan tidak mengganggu */}
      <View style={styles.blurredContent}>
        {children}
      </View>
      
      {/* Poin 3: Indikator Badge PRO / ADVANCED Eksklusif */}
      <View style={styles.proBadge}>
        <Text style={styles.proBadgeText}>🔒 PRO</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gateContainer: { position: 'relative', overflow: 'hidden' },
  absoluteOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
  blurredContent: { opacity: 0.45 },
  proBadge: { 
    position: 'absolute', 
    top: 12, 
    right: 12, 
    backgroundColor: 'rgba(245, 166, 35, 0.15)', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6, 
    borderWidth: 0.5, 
    borderColor: '#F5A623',
    zIndex: 11
  },
  proBadgeText: { color: '#F5A623', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }
});