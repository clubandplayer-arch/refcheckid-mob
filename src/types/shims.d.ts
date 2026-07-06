declare namespace React {
  type ReactNode = unknown;
}

declare module "react" {
  export type ReactNode = unknown;
  export type ErrorInfo = { componentStack?: string };
  export type ComponentProps<T> = T extends (props: infer P) => unknown ? P : Record<string, unknown>;
  export class Component<P = object, S = object> {
    constructor(props: P);
    props: P;
    state: S;
    setState(state: Partial<S> | S): void;
  }
  export interface Context<T> { Provider: (props: { value: T; children?: ReactNode }) => unknown }
  export function createContext<T>(defaultValue: T): Context<T>;
  export function useContext<T>(context: Context<T>): T;
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useRef<T>(initialValue: T): { current: T };
  export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((current: T) => T)) => void];
}

declare module "react/jsx-runtime" {
  export const jsx: unknown;
  export const jsxs: unknown;
  export const Fragment: unknown;
}

declare module "react-native" {
  export type StyleProp<T> = T | readonly unknown[] | null | undefined;
  export type ViewStyle = Record<string, unknown>;
  export type PressableStateCallbackType = { pressed: boolean };
  export const View: (props: Record<string, unknown>) => unknown;
  export const Text: (props: Record<string, unknown>) => unknown;
  export const TextInput: (props: Record<string, unknown>) => unknown;
  export const Pressable: (props: Record<string, unknown>) => unknown;
  export const StyleSheet: { create<T extends Record<string, unknown>>(styles: T): T };
}

declare module "@tanstack/react-query" {
  export class QueryClient {
    constructor(config?: unknown);
  }
  export function QueryClientProvider(props: { client: QueryClient; children?: React.ReactNode }): unknown;
}

declare module "expo-router" {
  export function Stack(props: Record<string, unknown>): unknown;
}

declare module "@testing-library/react-native" {
  export const fireEvent: { press: (element: unknown) => void };
  export function render(element: unknown): { getByText: (text: string) => unknown; getByTestId: (id: string) => unknown };
  export function waitFor(callback: () => void): Promise<void>;
}

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: (value: unknown) => { toBe: (expected: unknown) => void; toBeTruthy: () => void; toHaveBeenCalledTimes: (count: number) => void };
declare const jest: { fn: () => ((...args: unknown[]) => unknown) & { mock: unknown } };

declare const process: { env: Record<string, string | undefined> };
declare const afterEach: (fn: () => void) => void;
declare module "@testing-library/react-native/extend-expect" {}
