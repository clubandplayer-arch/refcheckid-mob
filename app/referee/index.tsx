import { Text, View } from "react-native";
import { AuthGuard } from "@/navigation/AuthGuard";
import { EmptyState, styles } from "@/components/Primitives";
export default function Referee() { return <AuthGuard role="referee"><View style={{ padding: 16 }}><Text style={styles.title}>Area Arbitro</Text><EmptyState title="Wave 1 completata" message="Workflow arbitro escluso dalla Wave 1: il routing protetto è attivo." /></View></AuthGuard>; }
