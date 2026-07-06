import type { StyleProp } from "react-native";

export function cn<TStyle>(...inputs: readonly StyleProp<TStyle>[]): StyleProp<TStyle> {
  return inputs.filter(Boolean) as StyleProp<TStyle>;
}
