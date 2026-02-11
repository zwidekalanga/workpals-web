export const routes = {
  home: '/',
  dashboard: '/dashboard',
  account: '/account',
  subscription: '/subscription',
  authCallback: '/auth/callback',
  resetPassword: '/auth/reset-password',
} as const

export const navItems = [
  { label: 'Dashboard', href: routes.dashboard },
  { label: 'Account', href: routes.account },
  { label: 'Subscription', href: routes.subscription },
] as const
