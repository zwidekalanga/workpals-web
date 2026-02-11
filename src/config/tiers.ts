export interface TierConfig {
  id: string
  name: string
  price: number
  priceLabel: string
  analysesPerMonth: number
  features: string[]
  recommended?: boolean
}

export const tiers: TierConfig[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    analysesPerMonth: 2,
    features: ['CV generation', 'Apply Fixes', 'CV preview & downloads'],
  },
  {
    id: 'lite',
    name: 'Lite',
    price: 3,
    priceLabel: '$3/mo',
    analysesPerMonth: 10,
    features: ['CV generation', 'Apply Fixes', 'CV preview & downloads', 'Unlimited report history'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 6,
    priceLabel: '$6/mo',
    analysesPerMonth: 30,
    features: ['CV generation', 'Apply Fixes', 'CV preview & downloads', 'Unlimited report history'],
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 11,
    priceLabel: '$11/mo',
    analysesPerMonth: -1,
    features: ['CV generation', 'Apply Fixes', 'CV preview & downloads', 'Unlimited report history'],
  },
]
