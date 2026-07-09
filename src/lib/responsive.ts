import { useWindowDimensions } from "react-native";

export const breakpoints = {
  compact: 0,
  medium: 600,
  expanded: 840,
} as const;

export type WindowSizeClass = keyof typeof breakpoints;

export function getWindowSizeClass(width: number): WindowSizeClass {
  if (width >= breakpoints.expanded) return "expanded";
  if (width >= breakpoints.medium) return "medium";
  return "compact";
}

export function useWindowSizeClass(): WindowSizeClass {
  const { width } = useWindowDimensions();
  return getWindowSizeClass(width);
}

export function useIsTabletLayout(): boolean {
  return useWindowSizeClass() !== "compact";
}

export function useResponsiveValue<T>(values: {
  compact: T;
  expanded?: T;
  medium?: T;
}): T {
  const sizeClass = useWindowSizeClass();
  if (sizeClass === "expanded" && values.expanded !== undefined) return values.expanded;
  if (sizeClass === "medium" && values.medium !== undefined) return values.medium;
  return values.compact;
}
