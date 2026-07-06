import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { theme } from "@/theme/theme";
type ToastContextValue = { showToast: (message: string) => void };
const ToastContext = createContext<ToastContextValue | undefined>(undefined);
export function ToastProvider({ children }: { children: React.ReactNode }) { const [message, setMessage] = useState<string | null>(null); const showToast = useCallback((next: string) => { setMessage(next); setTimeout(() => setMessage(null), 3000); }, []); const value = useMemo(() => ({ showToast }), [showToast]); return <ToastContext.Provider value={value}>{children}{message ? <View style={{ position: "absolute", left: 16, right: 16, bottom: 32, backgroundColor: theme.colors.text, padding: 14, borderRadius: 12 }}><Text style={{ color: "white" }}>{message}</Text></View> : null}</ToastContext.Provider>; }
export function useToast() { const ctx = useContext(ToastContext); if (!ctx) throw new Error("useToast must be used inside ToastProvider"); return ctx; }
