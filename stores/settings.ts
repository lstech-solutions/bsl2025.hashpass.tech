import { atom } from 'jotai';
import { useAtom } from 'jotai';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';

export type ThemeMode = 'light' | 'dark' | 'system';

export type Settings = {
  notifications: boolean;
  biometrics: boolean;
  language: string;
};

const storage = createJSONStorage<Settings>(() => ({
  async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error reading settings:', error);
      return null;
    }
  },
  setItem(key, value) {
    return AsyncStorage.setItem(key, JSON.stringify(value));
  },
  removeItem(key) {
    return AsyncStorage.removeItem(key);
  },
}));

const defaultSettings: Settings = {
  notifications: true,
  biometrics: false,
  language: 'en',
};

export const settingsAtom = atomWithStorage<Settings>(
  'settings',
  defaultSettings,
  storage
);

export const getSettings = (get: any): Settings => {
  try {
    const settings = get(settingsAtom);
    return { ...defaultSettings, ...settings };
  } catch (error) {
    console.error('Error getting settings:', error);
    return defaultSettings;
  }
};

export const getSettingsAsync = async (get: any): Promise<Settings> => {
  try {
    const settings = await get(settingsAtom);
    return { ...defaultSettings, ...settings };
  } catch (error) {
    console.error('Error getting settings:', error);
    return defaultSettings;
  }
};

export const notificationsAtom = atom(
  (get) => getSettings(get).notifications,
  async (get, set, update: boolean) => {
    const settings = await getSettingsAsync(get);
    const newSettings = { ...settings, notifications: update };
    set(settingsAtom, newSettings);
  }
);

export const biometricsAtom = atom(
  (get) => getSettings(get).biometrics,
  async (get, set, update: boolean) => {
    const settings = await getSettingsAsync(get);
    const newSettings = { ...settings, biometrics: update };
    set(settingsAtom, newSettings);
  }
);

export const languageAtom = atom(
  (get) => getSettings(get).language,
  async (get, set, update: string) => {
    const settings = await getSettingsAsync(get);
    const newSettings = { ...settings, language: update };
    set(settingsAtom, newSettings);
  }
);

export const resetSettings = () => {
  settingsAtom.onMount = (set) => {
    set(defaultSettings);
  };
};



export const useSettings = () => {
  const [notifications, setNotifications] = useAtom(notificationsAtom);
  const [biometrics, setBiometrics] = useAtom(biometricsAtom);
  const [language, setLanguage] = useAtom(languageAtom);

  return {
    notifications,
    setNotifications,
    biometrics,
    setBiometrics,
    language,
    setLanguage,
  };
};
