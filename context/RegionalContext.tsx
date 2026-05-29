import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RegionalContextType {
  currency: string;
  distanceUnit: string;
  volumeUnit: string;
  setCurrency: (c: string) => void;
  setDistanceUnit: (d: string) => void;
  setVolumeUnit: (v: string) => void;
}

const RegionalContext = createContext<RegionalContextType>({} as RegionalContextType);

export function RegionalProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState("IDR");
  const [distanceUnit, setDistanceUnitState] = useState("km");
  const [volumeUnit, setVolumeUnitState] = useState("L");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const c = await AsyncStorage.getItem('garasi_currency');
        const d = await AsyncStorage.getItem('garasi_distance');
        const v = await AsyncStorage.getItem('garasi_volume');
        if (c) setCurrencyState(c);
        if (d) setDistanceUnitState(d);
        if (v) setVolumeUnitState(v);
      } catch (e) {
        console.error("Gagal memuat regional", e);
      }
    };
    loadSettings();
  }, []);

  const setCurrency = (c: string) => { setCurrencyState(c); AsyncStorage.setItem('garasi_currency', c); };
  const setDistanceUnit = (d: string) => { setDistanceUnitState(d); AsyncStorage.setItem('garasi_distance', d); };
  const setVolumeUnit = (v: string) => { setVolumeUnitState(v); AsyncStorage.setItem('garasi_volume', v); };

  return (
    <RegionalContext.Provider value={{ currency, distanceUnit, volumeUnit, setCurrency, setDistanceUnit, setVolumeUnit }}>
      {children}
    </RegionalContext.Provider>
  );
}

export const useRegional = () => useContext(RegionalContext);