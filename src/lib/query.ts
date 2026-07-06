import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  QueryFunction,
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { queryKeys } from "./api-client";

export { queryKeys };

export function useApiQuery<TData>(
  queryKey: QueryKey,
  queryFn: QueryFunction<TData, QueryKey>,
  options?: Omit<UseQueryOptions<TData, Error, TData, QueryKey>, "queryKey" | "queryFn">,
): UseQueryResult<TData, Error> {
  return useQuery<TData, Error, TData, QueryKey>({
    queryKey,
    queryFn,
    retry: 2,
    ...options,
  });
}

export function useApiMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables>,
): UseMutationResult<TData, Error, TVariables> {
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    retry: 1,
    ...options,
  });
}

export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  return (queryKey: QueryKey) => queryClient.invalidateQueries({ queryKey });
}
