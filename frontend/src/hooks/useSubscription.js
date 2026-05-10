import { useQuery } from "@tanstack/react-query";
import { subscriptionApi } from "../api/index.js";
import { useAuthStore } from "../stores/authStore.js";

export function useSubscription() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  const { data, isLoading, error } = useQuery({
    queryKey: ["subscription-my"],
    queryFn: subscriptionApi.getMy,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const sub = data?.data;
  const effectivePlan = sub?.effectivePlan || "free";
  const featureKeys   = sub?.featureKeys  || [];
  const limits        = sub?.limits       || { products: 50, users: 1 };
  const status        = sub?.status       || "active";

  return {
    subscription: sub,
    isLoading,
    error,
    effectivePlan,
    status,
    featureKeys,
    limits,
    hasFeature: (key) => featureKeys.includes(key),
    isExpired:  () => status === "expired",
  };
}
