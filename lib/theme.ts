import { DefaultTheme, DarkTheme } from '@react-navigation/native';

export type ThemeType = 'light' | 'dark' | 'system';

export const lightColors = {
  ...DefaultTheme.colors,
  primary: '#9E7FFF',
  background: '#FFFFFF',
  card: '#F8F9FA',
  text: '#212529',
  border: '#E9ECEF',
  notification: '#FF6B6B',
};

export const darkColors = {
  ...DarkTheme.colors,
  primary: '#9E7FFF',
  background: '#121212',
  card: '#1E1E1E',
  text: '#F8F9FA',
  border: '#2D2D2D',
  notification: '#FF6B6B',
};

export type ThemeColors = typeof lightColors;
