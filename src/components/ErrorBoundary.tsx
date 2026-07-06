import React from "react";
import { Text, View } from "react-native";
import { Button } from "./Primitives";
type State = { error: Error | null };
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> { state: State = { error: null }; static getDerivedStateFromError(error: Error): State { return { error }; } render() { if (this.state.error) return <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 12 }}><Text style={{ fontSize: 22, fontWeight: "700" }}>Qualcosa è andato storto</Text><Text>{this.state.error.message}</Text><Button title="Riprova" onPress={() => this.setState({ error: null })} /></View>; return this.props.children; } }
