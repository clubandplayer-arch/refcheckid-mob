import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "@/lib/theme";

type ToastTone = "success" | "error" | "info";
interface ToastMessage {
  id: string;
  message: string;
  tone: ToastTone;
}
interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [messages, setMessages] = useState<readonly ToastMessage[]>([]);
  const counter = useRef(0);
  const timeouts = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const active = timeouts.current;
    return () => {
      active.forEach(clearTimeout);
      active.clear();
    };
  }, []);
  const value = useMemo<ToastContextValue>(
    () => ({
      notify(message, tone = "info") {
        counter.current += 1;
        const id = `${Date.now()}-${counter.current}`;
        setMessages((current) => [...current, { id, message, tone }]);
        const timeout = setTimeout(() => {
          timeouts.current.delete(timeout);
          setMessages((current) => current.filter((toast) => toast.id !== id));
        }, 3500);
        timeouts.current.add(timeout);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="none" style={styles.container}>
        {messages.map((toast) => (
          <View key={toast.id} style={[styles.toast, toneStyles[toast.tone]]}>
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error("useToast must be used inside ToastProvider.");
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    bottom: spacing.lg,
    gap: spacing.sm,
    left: spacing.lg,
    position: "absolute",
    right: spacing.lg,
    zIndex: 50,
  },
  text: { color: colors.white, fontSize: 14 },
  toast: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
});

const toneStyles = StyleSheet.create({
  error: { backgroundColor: colors.danger },
  info: { backgroundColor: colors.toastInfo },
  success: { backgroundColor: colors.success },
});
