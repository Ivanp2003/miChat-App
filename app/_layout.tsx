import { useAuthStore } from "@features/auth/presentation/store/authStore";
import { AppWriteAuthRepository } from "@features/infrastructure/repositories/AppWriteAuthRepository";
import { ThemeProvider } from "@shared/infrastructure/theme/useTheme";
import { ErrorBoundary } from "@shared/presentation/components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});
const authRepo = new AppWriteAuthRepository();

function AuthGuard() {
  const { user, setUser } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Restaurar sesión desde AppWrite al iniciar la app
    authRepo
      .getCurrentUser()
      .then(setUser)
      .catch(() => {
        // Si no hay sesión (guest), no hacer nada
        setUser(null);
      });
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) router.replace("/(auth)/login");
    if (user && inAuth) router.replace("/(app)");
  }, [user, segments, isMounted]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <AuthGuard />
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
