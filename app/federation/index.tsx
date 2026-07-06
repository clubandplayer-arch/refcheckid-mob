import { Text, View } from "react-native";
import { AuthGuard } from "@/navigation/AuthGuard";
import { EmptyState, styles } from "@/components/Primitives";
export default function Federation() { return <AuthGuard role="federation"><View style={{ padding: 16 }}><Text style={styles.title}>Area Federazione</Text><EmptyState title="Wave 1 completata" message="Federazione esclusa dalla Wave 1: il routing protetto è attivo." /></View></AuthGuard>; }
