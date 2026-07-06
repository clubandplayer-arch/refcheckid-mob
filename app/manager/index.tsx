import { Text, View } from "react-native";
import { AuthGuard } from "@/navigation/AuthGuard";
import { EmptyState, styles } from "@/components/Primitives";
export default function Manager() { return <AuthGuard role="manager"><View style={{ padding: 16 }}><Text style={styles.title}>Area Dirigente</Text><EmptyState title="Wave 1 completata" message="Dashboard Manager esclusa dalla Wave 1: il routing protetto è attivo." /></View></AuthGuard>; }
