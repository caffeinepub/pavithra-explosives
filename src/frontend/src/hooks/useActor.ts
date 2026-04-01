import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";

const ACTOR_QUERY_KEY = "actor";

export function useActor() {
  const queryClient = useQueryClient();

  const actorQuery = useQuery<backendInterface>({
    queryKey: [ACTOR_QUERY_KEY],
    queryFn: async () => {
      // Always use anonymous actor — this app uses password-based auth,
      // not Internet Identity. Calling _initializeAccessControlWithSecret
      // with a stale/empty II session was causing permanent failures.
      return await createActorWithConfig();
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * (attempt + 1), 5000),
    enabled: true,
  });

  // When the actor becomes available, invalidate dependent queries
  useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
      queryClient.refetchQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching,
  };
}
