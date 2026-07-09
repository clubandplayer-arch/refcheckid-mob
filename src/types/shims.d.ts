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
  export const Image: (props: Record<string, unknown>) => unknown;
  export const Modal: (props: Record<string, unknown>) => unknown;
  export const Pressable: (props: Record<string, unknown>) => unknown;
  export const KeyboardAvoidingView: (props: Record<string, unknown>) => unknown;
  export const ScrollView: (props: Record<string, unknown>) => unknown;
  export const StatusBar: (props: Record<string, unknown>) => unknown;
  export const Platform: { OS: string };
  export const StyleSheet: { create<T extends Record<string, unknown>>(styles: T): T };
  export function useWindowDimensions(): { width: number; height: number; scale: number; fontScale: number };
}

declare module "react-native-safe-area-context" {
  export const SafeAreaView: (props: Record<string, unknown>) => unknown;
  export function useSafeAreaInsets(): { bottom: number; left: number; right: number; top: number };
}

declare module "@tanstack/react-query" {
  export type QueryKey = readonly unknown[];
  export type QueryFunction<TData, TQueryKey extends QueryKey = QueryKey> = (context: { queryKey: TQueryKey }) => Promise<TData> | TData;
  export interface UseQueryOptions<TData, TError, TSelected = TData, TQueryKey extends QueryKey = QueryKey> {
    queryKey?: TQueryKey;
    queryFn?: QueryFunction<TData, TQueryKey>;
    retry?: number | boolean;
    enabled?: boolean;
    select?: (data: TData) => TSelected;
    staleTime?: number;
  }
  export interface UseQueryResult<TData, TError> {
    data: TData | undefined;
    error: TError | null;
    isError: boolean;
    isLoading: boolean;
    isFetching: boolean;
    refetch: () => Promise<unknown>;
  }
  export interface UseMutationOptions<TData, TError, TVariables> {
    retry?: number | boolean;
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: TError, variables: TVariables) => void;
  }
  export interface UseMutationResult<TData, TError, TVariables> {
    data: TData | undefined;
    error: TError | null;
    isError: boolean;
    isPending: boolean;
    mutate: (variables: TVariables) => void;
    mutateAsync: (variables: TVariables) => Promise<TData>;
  }
  export class QueryClient {
    constructor(config?: unknown);
    invalidateQueries(filters?: { queryKey?: QueryKey }): Promise<void>;
  }
  export function QueryClientProvider(props: { client: QueryClient; children?: React.ReactNode }): unknown;
  export function useQuery<TData, TError = Error, TSelected = TData, TQueryKey extends QueryKey = QueryKey>(options: UseQueryOptions<TData, TError, TSelected, TQueryKey>): UseQueryResult<TSelected, TError>;
  export function useMutation<TData, TError = Error, TVariables = void>(options: UseMutationOptions<TData, TError, TVariables> & { mutationFn: (variables: TVariables) => Promise<TData> }): UseMutationResult<TData, TError, TVariables>;
  export function useQueryClient(): QueryClient;
}

declare module "expo-router" {
  export function Stack(props: Record<string, unknown>): unknown;
  export function Redirect(props: Record<string, unknown>): unknown;
  export const router: { push: (href: string) => void; replace: (href: string) => void };
}

declare module "@testing-library/react-native" {
  export const fireEvent: { press: (element: unknown) => void };
  export function render(element: unknown): { getByText: (text: string) => unknown; getByTestId: (id: string) => unknown };
  export function waitFor(callback: () => void): Promise<void>;
}

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: (value: unknown) => { toBe: (expected: unknown) => void; toBeTruthy: () => void; toHaveBeenCalledTimes: (count: number) => void };
declare const jest: { fn: (implementation?: (...args: unknown[]) => unknown) => ((...args: unknown[]) => unknown) & { mock: unknown }; mock: (moduleName: string, factory?: () => unknown, options?: { virtual?: boolean }) => void };

declare const process: { env: Record<string, string | undefined> };
declare const afterEach: (fn: () => void) => void;
declare module "@testing-library/react-native/extend-expect" {}


declare module "expo-image-picker" {
  export const MediaType: { Images: "images" };
  export function requestCameraPermissionsAsync(): Promise<{ granted?: boolean }>;
  export function requestMediaLibraryPermissionsAsync(): Promise<{ granted?: boolean }>;
  export function launchCameraAsync(options: Record<string, unknown>): Promise<{ canceled?: boolean; assets?: readonly Record<string, unknown>[] | null }>;
  export function launchImageLibraryAsync(options: Record<string, unknown>): Promise<{ canceled?: boolean; assets?: readonly Record<string, unknown>[] | null }>;
}
