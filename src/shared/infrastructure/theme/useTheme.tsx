import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: typeof Colors.light;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const Colors = {
  light: {
    text: "#0f172a",
    background: "#f0f9ff",
    card: "#ffffff",
    border: "#cbd5e1",
    inputBackground: "#ffffff",
    placeholder: "#64748b",
    error: "#ef4444",
    success: "#10b981",
    primary: "#0d9488",
    icon: "#64748b",
    header: "#ccfbf1",
    secondary: "#14b8a6",
    accent: "#2dd4bf",
  },
  dark: {
    text: "#f1f5f9",
    background: "#0f172a",
    card: "#1e293b",
    border: "#334155",
    inputBackground: "#1e293b",
    placeholder: "#64748b",
    error: "#f87171",
    success: "#34d399",
    primary: "#14b8a6",
    icon: "#94a3b8",
    header: "#134e4a",
    secondary: "#0d9488",
    accent: "#5eead4",
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    try {
      AsyncStorage.getItem("theme")
        .then((savedTheme: string | null) => {
          if (savedTheme) {
            setTheme(savedTheme as Theme);
          } else {
            setTheme(systemColorScheme || "light");
          }
        })
        .catch(() => {
          setTheme(systemColorScheme || "light");
        });
    } catch {
      setTheme(systemColorScheme || "light");
    }
  }, [systemColorScheme]);

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem("theme", newTheme);
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, colors: Colors[theme] }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
