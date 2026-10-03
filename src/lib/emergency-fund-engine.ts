import { z } from "zod";

export const emergencyFundInputSchema = z.object({
  essentialMonthlyExpenses: z.number().int().positive(),
  primaryIncomeSource: z.enum([
    "employee",
    "civil_servant",
    "professional",
    "freelancer",
    "contract_worker",
    "micro_business",
    "business_owner",
    "commission_sales",
    "seasonal_worker",
    "full_time_trader",
    "full_time_investor",
    "retiree",
    "rental_income",
    "royalty_ip",
    "multiple_sources",
    "other",
  ]),
  incomeStability: z.enum(["very_stable", "stable", "fluctuating", "irregular"]),
  dependentBand: z.enum(["0", "1-2", "3+"]),
  debtStatus: z.enum(["none", "mandatory", "high_interest"]),
  currentLiquidReserve: z.number().int().nonnegative(),
  physicalGoldValue: z.number().int().nonnegative().default(0),
  goldValuationDate: z.string().optional(),
});

export type EmergencyFundInput = z.input<typeof emergencyFundInputSchema>;
export type EmergencyFundLevel =
  "critical" | "vulnerable" | "near_target" | "resilient" | "strong_reserve";

export const DEFAULT_EMERGENCY_FUND_CONFIG = {
  targetMonths: { min: 3, max: 6 },
  riskRules: {
    incomeStability: { very_stable: 0, stable: 0, fluctuating: 1, irregular: 2 },
    dependents: { "0": 0, "1-2": 1, "3+": 2 },
    debt: { none: 0, mandatory: 1, high_interest: 2 },
  },
  targetMapping: [
    { from: 0, to: 1, months: 3 },
    { from: 2, to: 2, months: 4 },
    { from: 3, to: 3, months: 5 },
    { from: 4, to: 6, months: 6 },
  ],
  staleAfterDays: 90,
} as const;

export type EmergencyFundResult = {
  riskScore: number;
  targetMonths: number;
  targetFund: number;
  currentLiquidReserve: number;
  monthsCovered: number;
  coveragePercent: number;
  coverageBasisPoints: number;
  fundingGap: number;
  excessReserve: number;
  physicalGoldValue: number;
  goldEquivalentMonths: number;
  level: EmergencyFundLevel;
  flags: string[];
  breakdown: { incomeRisk: number; dependentRisk: number; debtRisk: number; sourceRisk: number };
};

const levelFor = (basisPoints: bigint): EmergencyFundLevel => {
  if (basisPoints < 5000n) return "critical";
  if (basisPoints < 7500n) return "vulnerable";
  if (basisPoints < 10000n) return "near_target";
  if (basisPoints < 12500n) return "resilient";
  return "strong_reserve";
};

const round2 = (value: bigint, denominator: bigint) => Number((value * 100n) / denominator) / 100;

export function computeEmergencyFund(rawInput: EmergencyFundInput): EmergencyFundResult {
  const input = emergencyFundInputSchema.parse(rawInput);
  const incomeRisk = DEFAULT_EMERGENCY_FUND_CONFIG.riskRules.incomeStability[input.incomeStability];
  const dependentRisk = DEFAULT_EMERGENCY_FUND_CONFIG.riskRules.dependents[input.dependentBand];
  const debtRisk = DEFAULT_EMERGENCY_FUND_CONFIG.riskRules.debt[input.debtStatus];
  const riskScore = incomeRisk + dependentRisk + debtRisk;
  const targetMonths =
    DEFAULT_EMERGENCY_FUND_CONFIG.targetMapping.find(
      (item) => riskScore >= item.from && riskScore <= item.to,
    )?.months ?? 6;
  const expenses = BigInt(input.essentialMonthlyExpenses);
  const reserve = BigInt(input.currentLiquidReserve);
  const gold = BigInt(input.physicalGoldValue);
  const target = expenses * BigInt(targetMonths);
  const coverageBasisPoints = target === 0n ? 0n : (reserve * 10000n) / target;
  const flags = [
    ...(input.debtStatus === "high_interest" ? ["HIGH_INTEREST_DEBT"] : []),
    ...(input.essentialMonthlyExpenses > 100_000_000 ? ["EXPENSE_VERIFY"] : []),
    ...(reserve >= target ? ["RESERVE_EXCEEDS_TARGET"] : []),
  ];
  return {
    riskScore,
    targetMonths,
    targetFund: Number(target),
    currentLiquidReserve: Number(reserve),
    monthsCovered: round2(reserve, expenses),
    coveragePercent: Number(coverageBasisPoints) / 100,
    coverageBasisPoints: Number(coverageBasisPoints),
    fundingGap: Number(target > reserve ? target - reserve : 0n),
    excessReserve: Number(reserve > target ? reserve - target : 0n),
    physicalGoldValue: Number(gold),
    goldEquivalentMonths: round2(gold, expenses),
    level: levelFor(coverageBasisPoints),
    flags,
    breakdown: { incomeRisk, dependentRisk, debtRisk, sourceRisk: 0 },
  };
}

export const levelCopy: Record<EmergencyFundLevel, { label: string; description: string }> = {
  critical: {
    label: "Kritis",
    description: "Dana likuid Anda masih jauh di bawah target darurat pribadi Anda.",
  },
  vulnerable: {
    label: "Rentan",
    description: "Sudah ada penyangga, tetapi target belum tercapai.",
  },
  near_target: {
    label: "Mendekati Target",
    description: "Dana darurat Anda hampir mencapai target.",
  },
  resilient: { label: "Tangguh", description: "Target dana darurat Anda sudah tercapai." },
  strong_reserve: {
    label: "Cadangan Kuat",
    description: "Dana likuid Anda melebihi target darurat.",
  },
};

export const primaryIncomeOptions = [
  ["employee", "Karyawan"],
  ["civil_servant", "ASN"],
  ["professional", "Profesional"],
  ["freelancer", "Freelancer"],
  ["contract_worker", "Kontrak"],
  ["micro_business", "Usaha mikro"],
  ["business_owner", "Pemilik bisnis"],
  ["commission_sales", "Komisi"],
  ["seasonal_worker", "Musiman"],
  ["full_time_trader", "Trader penuh waktu"],
  ["full_time_investor", "Investor penuh waktu"],
  ["retiree", "Pensiunan"],
  ["rental_income", "Sewa"],
  ["royalty_ip", "Royalti"],
  ["multiple_sources", "Beberapa sumber"],
  ["other", "Lainnya"],
] as const;
