export interface TierConfig {
  id: string;
  name: string;
  price: number;
  priceLabel: string;
  billingLabel: string;
  yearlyPrice?: number;
  yearlyPriceLabel?: string;
  yearlyBillingLabel?: string;
  analysesPerMonth: number;
  analysesLabel: string;
  features: string[];
  recommended?: boolean;
}

export const tiers: TierConfig[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    priceLabel: "Free",
    billingLabel: "",
    analysesPerMonth: 2,
    analysesLabel: "2 analyses per month",
    features: ["CV generation", "Apply Fixes", "CV preview & downloads"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 7,
    priceLabel: "$7",
    billingLabel: "/month",
    yearlyPrice: 74,
    yearlyPriceLabel: "$74",
    yearlyBillingLabel: "/year",
    analysesPerMonth: 30,
    analysesLabel: "30 analyses per month",
    features: [
      "CV generation",
      "Apply Fixes",
      "CV preview & downloads",
      "Unlimited report history",
    ],
  },
  {
    id: "lite",
    name: "Lite",
    price: 4,
    priceLabel: "$4",
    billingLabel: "/month",
    yearlyPrice: 42,
    yearlyPriceLabel: "$42",
    yearlyBillingLabel: "/year",
    analysesPerMonth: 10,
    analysesLabel: "10 analyses per month",
    features: [
      "CV generation",
      "Apply Fixes",
      "CV preview & downloads",
      "Unlimited report history",
    ],
    recommended: true,
  },
  {
    id: "booster",
    name: "Booster",
    price: 2,
    priceLabel: "$2",
    billingLabel: "/Once-off",
    analysesPerMonth: 2,
    analysesLabel: "2 analyses",
    features: [
      "CV generation",
      "Apply Fixes",
      "CV preview & downloads",
      "No subscription",
    ],
  },
];
