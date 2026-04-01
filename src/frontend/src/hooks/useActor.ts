import { useQuery } from "@tanstack/react-query";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";

export function useActor() {
  const actorQuery = useQuery<backendInterface>({
    queryKey: ["actor-anon"],
    queryFn: async () => {
      // Always use anonymous actor — no Internet Identity needed for this app
      return await createActorWithConfig();
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * (attempt + 1), 5000),
  });

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching,
  };
}
