import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@features/auth/presentation/hooks/useAuth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "@shared/infrastructure/theme/useTheme";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";

const registerSchema = z.object({
  username: z.string().min(3, "Mínimo 3 caracteres"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  role: z.enum(["cliente", "vendedor"]),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { register: signUp, isLoading, error } = useAuth();
  const { colors } = useTheme();
  const [secure, setSecure] = useState(true);
  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
    setValue,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "", role: "cliente" },
  });

  const role = watch("role");

  useEffect(() => {
    if (error) {
      setError("root", { message: error });
    }
  }, [error, setError]);

  const onSubmit = (data: RegisterForm) => {
    signUp(data);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons
            name="person-add-outline"
            size={64}
            color={colors.primary}
          />
          <Text style={[styles.title, { color: colors.text }]}>
            Crear cuenta
          </Text>
          <Text style={[styles.subtitle, { color: colors.placeholder }]}>
            Regístrate para comenzar
          </Text>
        </View>

        {errors.root && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text style={styles.error}>{errors.root.message}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          {/* Selector de Rol */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => setValue("role", "cliente")}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor:
                  role === "cliente" ? colors.inputBackground : colors.card,
              }}
            >
              <Text style={{ color: colors.text }}>Cliente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setValue("role", "vendedor")}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor:
                  role === "vendedor" ? colors.inputBackground : colors.card,
              }}
            >
              <Text style={{ color: colors.text }}>Vendedor</Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.card,
                borderColor: errors.username ? "#ef4444" : colors.border,
              },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={colors.placeholder}
              style={styles.inputIcon}
            />
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.inputBackground,
                    },
                  ]}
                  placeholder="Usuario (sin espacios)"
                  placeholderTextColor={colors.placeholder}
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="none"
                />
              )}
            />
          </View>
          {errors.username && (
            <Text style={[styles.fieldError, { color: "#ef4444" }]}>
              {errors.username.message}
            </Text>
          )}

          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.card,
                borderColor: errors.email ? "#ef4444" : colors.border,
              },
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={colors.placeholder}
              style={styles.inputIcon}
            />
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.inputBackground,
                    },
                  ]}
                  placeholder="Correo electrónico"
                  placeholderTextColor={colors.placeholder}
                  value={value}
                  onChangeText={onChange}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              )}
            />
          </View>
          {errors.email && (
            <Text style={[styles.fieldError, { color: "#ef4444" }]}>
              {errors.email.message}
            </Text>
          )}

          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.card,
                borderColor: errors.password ? "#ef4444" : colors.border,
              },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={colors.placeholder}
              style={styles.inputIcon}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.inputBackground,
                    },
                  ]}
                  placeholder="Contraseña (mín. 6 caracteres)"
                  placeholderTextColor={colors.placeholder}
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry={secure}
                />
              )}
            />
            <TouchableOpacity
              onPress={() => setSecure((s: boolean) => !s)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={secure ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={colors.placeholder}
              />
            </TouchableOpacity>
          </View>
          {errors.password && (
            <Text style={[styles.fieldError, { color: "#ef4444" }]}>
              {errors.password.message}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>Registrarse</Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color="#fff"
                style={styles.buttonIcon}
              />
            </>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/login" style={styles.link}>
          <Text style={{ color: colors.placeholder }}>¿Ya tienes cuenta? </Text>
          <Text style={[styles.linkHighlight, { color: colors.primary }]}>
            Inicia sesión
          </Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  error: {
    color: "#ef4444",
    fontSize: 14,
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    marginBottom: 16,
  },
  inputIcon: {
    marginLeft: 16,
  },
  eyeIcon: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    padding: 16,
    paddingLeft: 12,
    fontSize: 16,
    color: "#1f2937",
  },
  button: {
    backgroundColor: "#6366f1",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  link: {
    marginTop: 16,
    textAlign: "center",
    color: "#6b7280",
    fontSize: 14,
  },
  fieldError: {
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
  linkHighlight: {
    color: "#6366f1",
    fontWeight: "600",
  },
});
