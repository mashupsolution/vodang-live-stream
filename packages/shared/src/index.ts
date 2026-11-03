import { z } from "zod";

export const actionSchema = z.enum([
  "meditate",
  "elixir",
  "sword",
  "tribulation",
  "vow",
]);
export type Action = z.infer<typeof actionSchema>;

export interface RealmTier {
  index: number;
  id: string;
  name: string;
  minTuVi: number;
  baseChance: number;
  color: string;
}

export const REALMS: readonly RealmTier[] = [
  {
    index: 0,
    id: "nhap-mon",
    name: "Đệ Tử Nhập Môn",
    minTuVi: 0,
    baseChance: 1,
    color: "#cbd5e1",
  },
  {
    index: 1,
    id: "ky-danh",
    name: "Ký Danh Đệ Tử",
    minTuVi: 10,
    baseChance: 0.95,
    color: "#6ee7b7",
  },
  {
    index: 2,
    id: "ngoai-mon",
    name: "Ngoại Môn Đệ Tử",
    minTuVi: 35,
    baseChance: 0.85,
    color: "#38bdf8",
  },
  {
    index: 3,
    id: "noi-mon",
    name: "Nội Môn Đệ Tử",
    minTuVi: 80,
    baseChance: 0.75,
    color: "#fbbf24",
  },
  {
    index: 4,
    id: "chan-truyen",
    name: "Chân Truyền Đệ Tử",
    minTuVi: 160,
    baseChance: 0.65,
    color: "#c084fc",
  },
  {
    index: 5,
    id: "chap-su",
    name: "Chấp Sự Đạo Trưởng",
    minTuVi: 280,
    baseChance: 0.55,
    color: "#fb7185",
  },
  {
    index: 6,
    id: "that-hiep",
    name: "Võ Đang Thất Hiệp",
    minTuVi: 450,
    baseChance: 0.5,
    color: "#34d399",
  },
  {
    index: 7,
    id: "truong-lao",
    name: "Chưởng Pháp Trưởng Lão",
    minTuVi: 700,
    baseChance: 0.45,
    color: "#fde047",
  },
  {
    index: 8,
    id: "thai-thuong",
    name: "Thái Thượng Trưởng Lão",
    minTuVi: 1050,
    baseChance: 0.4,
    color: "#e879f9",
  },
  {
    index: 9,
    id: "chuong-mon",
    name: "Chưởng Môn Chân Nhân",
    minTuVi: 1500,
    baseChance: 0.35,
    color: "#fef08a",
  },
] as const;

export function getRealm(index: number): RealmTier {
  const clamped = Math.max(0, Math.min(REALMS.length - 1, Math.floor(index)));
  return REALMS[clamped]!;
}

export function nextRealm(index: number): RealmTier | undefined {
  if (index < REALMS.length - 1) {
    return REALMS[index + 1];
  }
  return undefined;
}

export interface DonorTier {
  index: number;
  name: string;
  minPoints: number;
  color: string;
  tuViBonus: number;
}

// Ân Công ranks earned from lifetime gift points; index 0 means no rank yet.
export const DONOR_TIERS: readonly DonorTier[] = [
  {
    index: 0,
    name: "Khách Hương Khói",
    minPoints: 0,
    color: "#d6d3d1",
    tuViBonus: 0,
  },
  {
    index: 1,
    name: "Hộ Pháp Đồng",
    minPoints: 10,
    color: "#fcd34d",
    tuViBonus: 0.1,
  },
  {
    index: 2,
    name: "Ân Công Bạc",
    minPoints: 50,
    color: "#e2e8f0",
    tuViBonus: 0.2,
  },
  {
    index: 3,
    name: "Ân Công Kim",
    minPoints: 150,
    color: "#facc15",
    tuViBonus: 0.35,
  },
  {
    index: 4,
    name: "Chưởng Môn Ân Chủ",
    minPoints: 400,
    color: "#f0abfc",
    tuViBonus: 0.5,
  },
];

export function donorTierFor(points: number): DonorTier {
  let tier = DONOR_TIERS[0]!;
  for (const t of DONOR_TIERS) {
    if (points >= t.minPoints) tier = t;
  }
  return tier;
}

export interface DonorEntry {
  userId: string;
  userName: string;
  giftName: string;
  count: number;
  tier: number;
  at: number;
}

export interface CultivatorSummary {
  userId: string;
  userName: string;
  tuVi: number;
  realmIndex: number;
  realmName: string;
  bottlenecked: boolean;
  breakthroughChance: number;
}

const base = {
  id: z.string().min(1).max(200),
  timestamp: z.number().int().nonnegative(),
  source: z.enum(["mock", "tiktok", "replay"]),
  user: z.object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(60),
  }),
};

export const liveEventSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("join") }),
  z.object({ ...base, type: z.literal("share") }),
  z.object({
    id: base.id,
    timestamp: base.timestamp,
    source: base.source,
    type: z.literal("audience"),
    count: z.number().int().min(0).max(10000000),
  }),
  z.object({
    ...base,
    type: z.literal("comment"),
    text: z.string().min(1).max(500),
  }),
  z.object({
    ...base,
    type: z.literal("like"),
    count: z.number().int().min(1).max(100000),
  }),
  z.object({ ...base, type: z.literal("follow") }),
  z.object({
    ...base,
    type: z.literal("gift"),
    giftId: z.string().min(1).max(100),
    giftName: z.string().max(100),
    count: z.number().int().min(1).max(100000),
    streakId: z.string().min(1).max(200),
    final: z.boolean(),
  }),
]);
export type LiveEvent = z.infer<typeof liveEventSchema>;

export const zeroTtsVoices = [
  "maichi",
  "baotrang",
  "giahuy",
  "hamy",
  "huuduc",
  "kimoanh",
  "quangminh",
  "tiendat",
] as const;
export const narratorVoiceSchema = z.enum([
  "vi-VN-NamMinhNeural",
  "vi-VN-HoaiMyNeural",
  ...zeroTtsVoices.map(
    (v) => `zerotts-${v}` as `zerotts-${(typeof zeroTtsVoices)[number]}`,
  ),
]);
export type NarratorVoice = z.infer<typeof narratorVoiceSchema>;

export const settingsSchema = z.object({
  cooldownSeconds: z.number().int().min(0).max(300),
  camera: z.enum(["wide", "close"]),
  autoCamera: z.boolean(),
  ambientVolume: z.number().min(0).max(1),
  ceremonyVolume: z.number().min(0).max(1),
  narratorEnabled: z.boolean().default(true),
  welcomeEnabled: z.boolean().default(true),
  narratorVolume: z.number().min(0).max(1).default(0.85),
  narratorVoice: narratorVoiceSchema.default("vi-VN-NamMinhNeural"),
});
export type Settings = z.infer<typeof settingsSchema>;

export const defaultSettings: Settings = {
  cooldownSeconds: 10,
  camera: "wide",
  autoCamera: false,
  ambientVolume: 0.45,
  ceremonyVolume: 0.45,
  narratorEnabled: true,
  welcomeEnabled: true,
  narratorVolume: 0.85,
  narratorVoice: "vi-VN-NamMinhNeural",
};

export const tiktokUsernameSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/^@/, ""))
  .pipe(z.string().regex(/^([\w.]{1,64})?$/));

// signApiKey: omitted keeps the stored key, "" or null clears it.
export const tiktokConfigInputSchema = z.object({
  username: tiktokUsernameSchema,
  signApiKey: z.string().trim().max(200).nullable().optional(),
});
export interface TikTokConfig {
  username: string;
  hasSignKey: boolean;
}

export const mappingSchema = z.object({
  giftId: z.string().min(1).max(100),
  name: z.string().min(1).max(60),
  action: actionSchema,
  intensity: z.number().int().min(1).max(3),
  points: z.number().int().min(1).max(1000),
});
export type GiftMapping = z.infer<typeof mappingSchema>;

export interface Prayer {
  id: number;
  userName: string;
  text: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}

export interface Visitor {
  id: string;
  name: string;
  slot: number;
  variant: number;
  joinedAt: number;
  action: Action | null;
  actionAt: number;
  expiresAt: number;
  realmIndex: number;
  realmName: string;
  tuVi: number;
  donorTier?: number;
}

export interface Ceremony {
  id: string;
  action:
    | Action
    | "tribulation-success"
    | "tribulation-fail"
    | "milestone"
    | "like"
    | "follow"
    | "audience-milestone"
    | "share"
    | "donor-tier";
  name: string;
  userId?: string;
  realmName?: string;
  intensity: number;
  count: number;
  at: number;
}

export interface EventRecord {
  id: string;
  type: LiveEvent["type"];
  userName: string;
  source: LiveEvent["source"];
  at: number;
  result: string;
  giftId?: string;
}

export interface ConnectorStatus {
  mode: "mock" | "tiktok";
  state: "connected" | "connecting" | "disconnected" | "error";
  detail: string;
  attempt: number;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  score: number;
}

export interface Announcement {
  id: string;
  at: number;
  sessionId: string;
  kind:
    | "gift"
    | "follow"
    | "welcome"
    | "share"
    | "audience-milestone"
    | "share-prompt"
    | "breakthrough"
    | "tier-up";
  text: string;
  userName?: string;
  giftName?: string;
  count?: number;
  tier?: number;
}

export interface Snapshot {
  announcements: Announcement[];
  audience: {
    current: number | null;
    peak: number;
    milestones: number[];
    updatedAt: number | null;
  };
  session: {
    id: string;
    startedAt: number;
    source: "mock" | "tiktok";
    gifts: LeaderboardEntry[];
    participation: LeaderboardEntry[];
    recentDonors: DonorEntry[];
    hearts: { count: number; goal: number };
  };
  seq: number;
  serverTime: number;
  progress: number;
  milestones: number[];
  totals: {
    visits: number;
    meditate: number;
    elixir: number;
    sword: number;
    breakthroughs: number;
    likes: number;
  };
  realms: CultivatorSummary[];
  settings: Settings;
  visitors: Visitor[];
  visitorOverflow: number;
  ceremonies: Ceremony[];
  prayers: Prayer[];
  recent: EventRecord[];
  connector: ConnectorStatus;
}

export interface AdminSnapshot extends Snapshot {
  simulating?: boolean;
  mappings: GiftMapping[];
  pendingPrayers: Prayer[];
}

export type SocketMessage = {
  type: "snapshot";
  state: Snapshot | AdminSnapshot;
};

export const actionLabels: Record<Action, string> = {
  meditate: "Luyện quyền",
  elixir: "Diễn kiếm",
  sword: "Lễ vật",
  tribulation: "Đột phá",
  vow: "Môn quy",
};

export function nextMilestone(progress: number) {
  return progress < 100
    ? 100
    : progress < 250
      ? 250
      : progress < 500
        ? 500
        : (Math.floor(progress / 500) + 1) * 500;
}

export function nextHeartGoal(hearts: number) {
  return hearts < 100 ? 100 : hearts < 500 ? 500 : (Math.floor(hearts / 1000) + 1) * 1000;
}
