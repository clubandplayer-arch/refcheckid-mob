import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { roleRedirects } from "@/components/auth/auth-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { AuthError, authenticateWithPassword, type AuthDiagnostics } from "@/lib/auth-client";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { colors, spacing } from "@/lib/theme";
import { useSession } from "@/lib/session";

const isDevelopment = process.env.NODE_ENV !== "production";

const errorMessages = {
  ACCOUNT_DISABLED: "Account disabilitato.",
  INVALID_CREDENTIALS: "Credenziali errate.",
  USER_NOT_FOUND: "Utente inesistente.",
} as const;

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<AuthDiagnostics | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useSession();
  const { notify } = useToast();

  async function handleSubmit() {
    const validationError = validate(email, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    const loginUrl = `${getApiBaseUrl()}/auth/login`;
    const safePayload = { email };

    console.log("[RefCheckID][Auth][LoginRequest]", { payload: safePayload, url: loginUrl });

    setIsSubmitting(true);
    try {
      const session = await authenticateWithPassword({ email, password });
      setDiagnostics(null);
      setError(null);
      login(session);
      notify("Accesso eseguito", "success");
      router.push(roleRedirects[session.user.role]);
    } catch (submitError) {
      logLoginError(submitError, loginUrl, safePayload);
      const message = getLoginErrorMessage(submitError);
      setDiagnostics(submitError instanceof AuthError ? submitError.diagnostics : null);
      setError(message);
      notify(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card style={styles.card}>
      <View>
        <Text style={styles.kicker}>RefCheckID</Text>
        <Text style={styles.title}>Accesso operativo</Text>
        <Text style={styles.description}>
          Accedi con email e password. Il ruolo operativo viene recuperato automaticamente dal backend.
        </Text>
      </View>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <Input
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="nome@dominio.it"
            value={email}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordField}>
            <Input
              autoComplete="current-password"
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry={!isPasswordVisible}
              style={styles.passwordInput}
              value={password}
            />
            <Pressable
              accessibilityLabel={isPasswordVisible ? "Nascondi password" : "Mostra password"}
              accessibilityRole="button"
              onPress={() => setIsPasswordVisible((current) => !current)}
              style={styles.passwordToggle}
            >
              <Text style={styles.passwordToggleIcon}>{isPasswordVisible ? "🙈" : "👁️"}</Text>
            </Pressable>
          </View>
        </View>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            {diagnostics ? <Text style={styles.diagnostics}>{JSON.stringify(diagnostics, null, 2)}</Text> : null}
          </View>
        ) : null}
        <Button disabled={isSubmitting} onPress={() => void handleSubmit()}>
          ACCEDI
        </Button>
      </View>
    </Card>
  );
}

function getLoginErrorMessage(submitError: unknown): string {
  const fallbackMessage = submitError instanceof AuthError ? errorMessages[submitError.code] : "Accesso non riuscito.";
  if (!isDevelopment || !(submitError instanceof Error) || !submitError.message) return fallbackMessage;
  return `${fallbackMessage} ${submitError.message}`;
}

function logLoginError(submitError: unknown, url: string, payload: { email: string }): void {
  const diagnostics = submitError instanceof AuthError ? submitError.diagnostics : null;
  console.error("[RefCheckID][Auth][LoginError]", {
    body: diagnostics?.responseBody ?? null,
    errorMessage: submitError instanceof Error ? submitError.message : String(submitError),
    payload,
    stack: submitError instanceof Error ? submitError.stack : null,
    status: diagnostics?.status ?? null,
    url: diagnostics?.url ?? url,
  });
}

function validate(email: string, password: string): string | null {
  if (!email.includes("@")) return "Inserisci un indirizzo email valido";
  if (password.length < 1) return "Inserisci la password";
  return null;
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg, width: "100%" },
  description: { color: colors.mutedForeground, fontSize: 14, marginTop: spacing.xs },
  diagnostics: { color: colors.danger, fontFamily: "monospace", fontSize: 11, marginTop: spacing.sm },
  errorBox: { backgroundColor: "#fee2e2", borderRadius: 8, padding: spacing.md },
  errorText: { color: colors.danger, fontSize: 14 },
  field: { gap: spacing.xs },
  form: { gap: spacing.md },
  kicker: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  label: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  passwordField: { position: "relative" },
  passwordInput: { paddingRight: 56 },
  passwordToggle: { alignItems: "center", bottom: 0, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.md, position: "absolute", right: 0, top: 0 },
  passwordToggleIcon: { color: colors.mutedForeground, fontSize: 20 },
  title: { color: colors.foreground, fontSize: 24, fontWeight: "700", marginTop: spacing.xs },
});
