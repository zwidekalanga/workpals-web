export const queryKeys = {
  all: ["workpals"] as const,
  profile: () => [...queryKeys.all, "profile"] as const,
  reports: () => [...queryKeys.all, "reports"] as const,
  reportsList: () => [...queryKeys.reports(), "list"] as const,
};
