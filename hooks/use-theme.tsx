import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: typeof Colors.light;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const Colors = {
  light: {
    text: '#1f2937',
    background: '#fafafa',
    card: '#ffffff',
    border: '#e5e7eb',
    inputBackground: '#ffffff',
    placeholder: '#9ca3af',
    error: '#ef4444',
    success: '#10b981',
    primary: '#6366f1',
    icon: '#6b7280',
    header: '#ffffff',
  },
  dark: {
    text: '#f9fafb',
    background: '#111827',
    card: '#1f2937',
    border: '#374151',
    inputBackground: '#1f2937',
    placeholder: '#6b7280',
    error: '#f87171',
    success: '#34d399',
    primary: '#818cf8',
    icon: '#9ca3af',
    header: '#1f2937',
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    AsyncStorage.getItem('theme').then((savedTheme: string | null) => {
      if (savedTheme) {
        setTheme(savedTheme as Theme);
      } else {
        setTheme(systemColorScheme || 'light');
      }
    });
  }, [systemColorScheme]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    await AsyncStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors: Colors[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
