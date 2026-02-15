export const routes = {
  home: "/",
  dashboard: "/dashboard",
  account: "/account",
  subscription: "/subscription",
  cancelSubscription: "/subscription/cancel",
  report: "/report",
  contact: "/contact",
  authCallback: "/auth/callback",
  resetPassword: "/auth/reset-password",
} as const;

/** Authenticated dashboard nav items */
export const navItems = [
  { label: "Dashboard", href: routes.dashboard },
  { label: "Account", href: routes.account },
  { label: "Subscription", href: routes.subscription },
] as const;

/** Public landing page nav links (anchor sections + contact) */
export const publicNavLinks = [
  { label: "Home", href: "/" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQs", href: "/#faqs" },
  { label: "Contact us", href: routes.contact },
] as const;
