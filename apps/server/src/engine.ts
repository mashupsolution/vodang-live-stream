import { randomUUID } from "node:crypto";
import {
  defaultSettings,
  actionLabels,
  REALMS,
  DONOR_TIERS,
  donorTierFor,
  getRealm,
  nextRealm,
  type Action,
  type Announcement,
  type AdminSnapshot,
  type ConnectorStatus,
  type DonorEntry,
  type CultivatorSummary,
  type GiftMapping,
  type LiveEvent,
  type LeaderboardEntry,
  type Prayer,
  type Settings,
  type Snapshot,
  type Visitor,
  nextHeartGoal,
} from "../../../packages/shared/src/index.ts";
import { Store } from "./store.ts";

export interface CultivatorRecord {
  userId: string;
  userName: string;
  tuVi: number;
  realmIndex: number;
  pityBonus: number;
  hoPhapBonus: number;
  breakthroughs: number;
  donorPoints: number;
  donorTier: number;
  updatedAt: number;
}

const MAX_VISIBLE = 40;
const MAX_POOL = 500;

interface DurableState {
  version: 1;
  seq: number;
  progress: number;
  milestones: number[];
  totals: Snapshot["totals"];
  settings: Settings;
  visitors: Visitor[];
  ceremonies: Snapshot["ceremonies"];
  recent: Snapshot["recent"];
  prayers: Prayer[];
  mappings: GiftMapping[];
  cultivators: Record<string, CultivatorRecord>;
  cooldowns: Record<string, number>;
  streaks: Record<string, number>;
  announcements: Announcement[];
  thankedStreaks: Record<string, boolean>;
  followThanks: Record<string, number>;
  audience: Snapshot["audience"];
  shareThanks: Record<string, number>;
  lastSharePrompt: number;
  lastAudienceCelebration: number | null;
  prayerId: number;
  session: {
    id: string;
    startedAt: number;
    source: "mock" | "tiktok";
    gifts: Record<string, LeaderboardEntry>;
    participation: Record<string, LeaderboardEntry>;
    recentDonors: DonorEntry[];
  };
  prayerCredits: Record<
    string,
    {
      userId: string;
      userName: string;
      sessionId: string;
      source: LiveEvent["source"];
    }
  >;
}

const defaultMappings: GiftMapping[] = [
  {
    giftId: "mock-linh-thach",
    name: "Lệnh Bài Võ Đang",
    action: "meditate",
    intensity: 1,
    points: 10,
  },
  {
    giftId: "mock-tien-dan",
    name: "Thái Cực Bát Quái Bàn",
    action: "elixir",
    intensity: 2,
    points: 25,
  },
  {
    giftId: "mock-phi-kiem",
    name: "Chân Vũ Thần Kiếm",
    action: "sword",
    intensity: 3,
    points: 50,
  },
  {
    giftId: "5655",
    name: "Hoa Hồng",
    action: "meditate",
    intensity: 1,
    points: 1,
  },
  {
    giftId: "5487",
    name: "Tim Ngón Tay",
    action: "meditate",
    intensity: 1,
    points: 5,
  },
  {
    giftId: "5660",
    name: "Bánh Vòng",
    action: "elixir",
    intensity: 2,
    points: 30,
  },
];

const tiktokGiftIds = new Set(["5655", "5487", "5660"]);

const initial = (now: number): DurableState => ({
  version: 1,
  seq: 0,
  progress: 0,
  milestones: [],
  totals: {
    visits: 0,
    meditate: 0,
    elixir: 0,
    sword: 0,
    breakthroughs: 0,
    likes: 0,
  },
  settings: { ...defaultSettings },
  visitors: [],
  ceremonies: [],
  recent: [],
  prayers: [],
  mappings: [...defaultMappings],
  cultivators: {},
  cooldowns: {},
  streaks: {},
  announcements: [],
  thankedStreaks: {},
  followThanks: {},
  audience: { current: null, peak: 0, milestones: [], updatedAt: null },
  shareThanks: {},
  lastSharePrompt: now,
  lastAudienceCelebration: null,
  prayerId: 0,
  session: {
    id: randomUUID(),
    startedAt: now,
    source: "mock",
    gifts: {},
    participation: {},
    recentDonors: [],
  },
  prayerCredits: {},
});

export class Engine {
  private state: DurableState;
  connector: ConnectorStatus = {
    mode: "mock",
    state: "connected",
    detail: "Mô phỏng cục bộ",
    attempt: 0,
  };
  onChange = () => {};
  /** Set by the server-side Simulator so every admin tab sees the same state. */
  simulating = false;

  constructor(
    readonly store: Store,
    readonly now: () => number = Date.now,
    readonly rng: () => number = Math.random,
  ) {
    this.state = store.load<DurableState>() ?? initial(this.now());
    this.state.session ??= {
      id: randomUUID(),
      startedAt: this.now(),
      source: "mock",
      gifts: {},
      participation: {},
      recentDonors: [],
    };
    this.state.session.recentDonors ??= [];
    this.state.prayerCredits ??= {};
    this.state.settings = { ...defaultSettings, ...this.state.settings };
    this.state.announcements ??= [];
    this.state.thankedStreaks ??= {};
    this.state.followThanks ??= {};
    this.state.audience ??= {
      current: null,
      peak: 0,
      milestones: [],
      updatedAt: null,
    };
    this.state.audience.current = null;
    this.state.audience.updatedAt = null;
    this.state.shareThanks ??= {};
    this.state.lastSharePrompt ??= this.state.session.startedAt;
    this.state.lastAudienceCelebration ??= null;
    this.state.cultivators ??= {};
    this.state.totals ??= {
      visits: 0,
      meditate: 0,
      elixir: 0,
      sword: 0,
      breakthroughs: 0,
      likes: 0,
    };
    this.state.totals.visits ??= 0;
    this.state.totals.meditate ??= 0;
    this.state.totals.elixir ??= 0;
    this.state.totals.sword ??= 0;
    this.state.totals.breakthroughs ??= 0;
    this.state.totals.likes ??= 0;

    if (!this.state.mappings?.length) {
      this.state.mappings = [...defaultMappings];
    }
    for (const gift of defaultMappings) {
      if (
        tiktokGiftIds.has(gift.giftId) &&
        !this.state.mappings.some((m) => m.giftId === gift.giftId)
      ) {
        this.state.mappings.push({ ...gift });
      }
    }
    for (const c of Object.values(this.state.cultivators)) {
      c.tuVi ??= 0;
      c.realmIndex ??= 0;
      c.pityBonus ??= 0;
      c.hoPhapBonus ??= 0;
      c.breakthroughs ??= 0;
      c.donorPoints ??= 0;
      c.donorTier ??= donorTierFor(c.donorPoints).index;
      c.updatedAt ??= this.now();
    }
    if (this.state.version !== 1)
      throw new Error("Unsupported database version");
    store.save(this.state);
  }

  private cultivator(user: { id: string; name: string }): CultivatorRecord {
    const s = this.state,
      now = this.now();
    let c = s.cultivators[user.id];
    if (!c) {
      c = {
        userId: user.id,
        userName: user.name,
        tuVi: 0,
        realmIndex: 0,
        pityBonus: 0,
        hoPhapBonus: 0,
        breakthroughs: 0,
        donorPoints: 0,
        donorTier: 0,
        updatedAt: now,
      };
      s.cultivators[user.id] = c;
    }
    c.userName = user.name;
    c.updatedAt = now;
    return c;
  }

  private syncVisitor(userId: string, c: CultivatorRecord) {
    const v = this.state.visitors.find((vis) => vis.id === userId);
    if (v) {
      v.realmIndex = c.realmIndex;
      v.realmName = getRealm(c.realmIndex).name;
      v.tuVi = c.tuVi;
      v.donorTier = c.donorTier;
    }
  }

  private cooldownMs(c: CultivatorRecord) {
    const base = this.state.settings.cooldownSeconds * 1000;
    return c.donorTier >= 3 ? Math.floor(base / 2) : base;
  }

  private practiceGain(c: CultivatorRecord) {
    return Math.round(5 * (1 + DONOR_TIERS[c.donorTier]!.tuViBonus));
  }

  private topRealms(): CultivatorSummary[] {
    return Object.values(this.state.cultivators)
      .sort(
        (a, b) =>
          b.realmIndex - a.realmIndex ||
          b.tuVi - a.tuVi ||
          a.userId.localeCompare(b.userId, "en"),
      )
      .slice(0, 5)
      .map((c) => {
        const next = nextRealm(c.realmIndex);
        const bottlenecked = !!next && c.tuVi >= next.minTuVi;
        const breakthroughChance = next
          ? Math.min(
              1,
              Number(
                (next.baseChance + c.pityBonus + c.hoPhapBonus).toFixed(4),
              ),
            )
          : 1;
        return {
          userId: c.userId,
          userName: c.userName,
          tuVi: c.tuVi,
          realmIndex: c.realmIndex,
          realmName: getRealm(c.realmIndex).name,
          bottlenecked,
          breakthroughChance,
        };
      });
  }

  snapshot(admin = false): Snapshot | AdminSnapshot {
    const s = this.state,
      now = this.now();
    const publicState: Snapshot = {
      audience: {
        ...s.audience,
        current:
          s.audience.updatedAt !== null && now - s.audience.updatedAt < 30000
            ? s.audience.current
            : null,
        milestones: [...s.audience.milestones],
      },
      announcements: s.announcements
        .filter(
          (a) =>
            a.sessionId === s.session.id && now - a.at < 30000 && now >= a.at,
        )
        .map((a) => ({ ...a })),
      session: {
        ...s.session,
        gifts: this.top(s.session.gifts),
        participation: this.top(s.session.participation),
        recentDonors: s.session.recentDonors.slice(-8).map((d) => ({ ...d })),
        hearts: {
          count: s.followThanks["likes:count"] ?? 0,
          goal: nextHeartGoal(s.followThanks["likes:count"] ?? 0),
        },
      },
      seq: s.seq,
      serverTime: now,
      progress: s.progress,
      milestones: [...s.milestones],
      totals: { ...s.totals },
      realms: this.topRealms(),
      settings: { ...s.settings },
      visitors: this.rankVisitors(now)
        .slice(0, MAX_VISIBLE)
        .map((v, slot) => ({ ...v, slot })),
      visitorOverflow: Math.max(
        0,
        s.visitors.filter((v) => v.expiresAt > now).length - MAX_VISIBLE,
      ),
      ceremonies: s.ceremonies
        .filter((c) => now - c.at < 12000)
        .map((c) => ({ ...c })),
      prayers: s.prayers
        .filter((p) => p.status === "approved")
        .slice(-10)
        .map((p) => ({ ...p })),
      recent: admin ? s.recent.map((r) => ({ ...r })) : [],
      connector: { ...this.connector },
    };
    return admin
      ? {
          ...publicState,
          simulating: this.simulating,
          mappings: structuredClone(s.mappings),
          pendingPrayers: s.prayers
            .filter((p) => p.status === "pending")
            .map((p) => ({ ...p })),
        }
      : publicState;
  }

  announcement(id: string): Announcement | undefined {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      return undefined;
    return this.snapshot().announcements.find((a) => a.id === id);
  }

  private announce(
    kind: Announcement["kind"],
    text: string,
    extra: Partial<Omit<Announcement, "id" | "at" | "sessionId" | "kind" | "text">> = {},
  ) {
    const now = this.now();
    this.state.announcements = this.state.announcements
      .filter(
        (a) => now - a.at < 30000 && a.sessionId === this.state.session.id,
      )
      .slice(-23);
    this.state.announcements.push({
      id: randomUUID(),
      at: now,
      sessionId: this.state.session.id,
      kind,
      text,
      ...extra,
    });
  }

  private safeName(name: string) {
    return (
      [
        ...name
          .normalize("NFC")
          .replace(/[^\p{L}\p{N}\s]/gu, " ")
          .replace(/\s+/g, " ")
          .trim(),
      ]
        .slice(0, 40)
        .join("")
        .trim() || "đồng đạo"
    );
  }

  private top(board: Record<string, LeaderboardEntry>): LeaderboardEntry[] {
    return Object.values(board)
      .sort(
        (a, b) => b.score - a.score || a.userId.localeCompare(b.userId, "en"),
      )
      .slice(0, 5)
      .map((entry) => ({ ...entry }));
  }

  private score(
    board: Record<string, LeaderboardEntry>,
    user: { id: string; name: string },
    points: number,
  ) {
    const entry = Object.hasOwn(board, user.id)
      ? board[user.id]
      : { userId: user.id, userName: user.name, score: 0 };
    entry.userName = user.name;
    entry.score += points;
    Object.defineProperty(board, user.id, {
      value: entry,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }

  newSession(source = this.connector.mode) {
    this.commit(() => {
      this.state.audience = {
        current: null,
        peak: 0,
        milestones: [],
        updatedAt: null,
      };
      this.state.shareThanks = {};
      this.state.lastSharePrompt = this.now();
      this.state.lastAudienceCelebration = null;
      this.state.announcements = [];
      this.state.thankedStreaks = {};
      this.state.followThanks = {};
      this.state.session = {
        id: randomUUID(),
        startedAt: this.now(),
        source,
        gifts: {},
        participation: {},
        recentDonors: [],
      };
    });
  }

  /** Drop simulated disciples from the temple floor; scores and tu vi stay. */
  clearDemo() {
    this.commit(() => {
      this.state.visitors = this.state.visitors.filter(
        (v) => !v.id.startsWith("demo:"),
      );
    });
  }

  /** Fresh scoreboards and no simulated disciples; real viewers are untouched. */
  resetDemo() {
    this.newSession("mock");
    this.commit(() => {
      const s = this.state;
      s.visitors = s.visitors.filter((v) => !v.id.startsWith("demo:"));
      for (const id of Object.keys(s.cultivators))
        if (id.startsWith("demo:")) delete s.cultivators[id];
      for (const key of Object.keys(s.cooldowns))
        if (key.startsWith("viewer:demo:")) delete s.cooldowns[key];
    });
  }

  hasDemoVisitors() {
    const now = this.now();
    return this.state.visitors.some(
      (v) => v.id.startsWith("demo:visitor:") && v.expiresAt > now,
    );
  }

  private commit(fn: () => void) {
    const previous = structuredClone(this.state);
    try {
      this.store.transaction(() => {
        fn();
        this.state.seq++;
        this.store.save(this.state);
      });
    } catch (error) {
      this.state = previous;
      throw error;
    }
    this.onChange();
  }

  private ceremony(
    action: Snapshot["ceremonies"][number]["action"],
    name: string,
    intensity: number,
    count = 1,
    userId?: string,
    realmName?: string,
  ) {
    this.state.ceremonies.push({
      id: randomUUID(),
      action,
      name,
      intensity,
      count,
      at: this.now(),
      ...(userId !== undefined ? { userId } : {}),
      ...(realmName !== undefined ? { realmName } : {}),
    });
    this.state.ceremonies = this.state.ceremonies
      .filter((c) => this.now() - c.at < 12000)
      .slice(-16);
  }

  /** Highest donor tier, realm and tu vi first; earlier joiners win ties. */
  private rankVisitors(now: number) {
    return this.state.visitors
      .filter((v) => v.expiresAt > now)
      .sort(
        (a, b) =>
          (b.donorTier ?? 0) - (a.donorTier ?? 0) ||
          b.realmIndex - a.realmIndex ||
          b.tuVi - a.tuVi ||
          a.joinedAt - b.joinedAt ||
          (a.id < b.id ? -1 : 1),
      );
  }

  private hashVariant(id: string) {
    let h = 0;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h % 3;
  }

  private visitor(event: Exclude<LiveEvent, { type: "audience" }>): Visitor {
    const s = this.state,
      now = this.now();
    s.visitors = s.visitors.filter((v) => v.expiresAt > now);
    let visitor = s.visitors.find((v) => v.id === event.user.id);
    const c = this.cultivator(event.user);
    if (!visitor) {
      if (s.visitors.length >= MAX_POOL) {
        const lowest = this.rankVisitors(now).pop()!;
        s.visitors = s.visitors.filter((v) => v !== lowest);
      }
      const slot = 0;
      visitor = {
        id: event.user.id,
        name: event.user.name,
        slot,
        variant: this.hashVariant(event.user.id),
        joinedAt: now,
        action: null,
        actionAt: 0,
        expiresAt: now + 120000,
        realmIndex: c.realmIndex,
        realmName: getRealm(c.realmIndex).name,
        tuVi: c.tuVi,
        donorTier: c.donorTier,
      };
      s.visitors.push(visitor);
      s.totals.visits++;
    }
    visitor.name = event.user.name;
    visitor.expiresAt = now + 120000;
    visitor.realmIndex = c.realmIndex;
    visitor.realmName = getRealm(c.realmIndex).name;
    visitor.tuVi = c.tuVi;
    visitor.donorTier = c.donorTier;
    return visitor;
  }

  ingest(event: LiveEvent) {
    if (this.store.hasEvent(event.id)) return { result: "duplicate" };
    if (event.type === "audience" || event.type === "share") {
      let result = "ignored";
      this.commit(() => {
        const s = this.state,
          now = this.now();
        if (event.source === s.session.source) {
          if (event.type === "audience") {
            const previousPeak = s.audience.peak;
            s.audience.current = event.count;
            s.audience.updatedAt = now;
            s.audience.peak = Math.max(previousPeak, event.count);
            const candidates = [100, 250, 500].filter(
              (n) => n > previousPeak && n <= event.count,
            );
            const last = Math.floor(event.count / 1000) * 1000;
            for (
              let n = Math.max(
                1000,
                Math.floor(previousPeak / 1000 + 1) * 1000,
                last - 63000,
              );
              n <= last;
              n += 1000
            )
              candidates.push(n);
            if (candidates.length) {
              s.audience.milestones = [
                ...s.audience.milestones,
                ...candidates,
              ].slice(-64);
              const milestone = candidates.at(-1)!;
              this.ceremony(
                "audience-milestone",
                `Hội tụ ${milestone} đệ tử đồng đạo`,
                milestone === 100 ? 1 : milestone < 1000 ? 2 : 3,
                milestone,
              );
              this.announce(
                "audience-milestone",
                `Võ Đang Kim Đỉnh hội tụ ${milestone} đệ tử cùng đàm đạo luận kiếm.`,
              );
              s.lastAudienceCelebration = now;
            }
            result = "audience";
          } else {
            this.ceremony("share", event.user.name, 1);
            const key = JSON.stringify([event.source, event.user.id]);
            if (
              s.shareThanks[key] === undefined ||
              now - s.shareThanks[key] >= 60000
            ) {
              s.shareThanks[key] = now;
              this.announce(
                "share",
                `Võ Đang Sơn đa tạ đệ tử ${this.safeName(event.user.name)} đã truyền âm triệu tập đồng đạo.`,
              );
            }
            const keys = Object.keys(s.shareThanks);
            if (keys.length > 20000)
              for (const key of keys.slice(0, keys.length - 20000))
                delete s.shareThanks[key];
            result = "share";
          }
        }
        this.store.record(event, result, now);
      });
      return { result };
    }

    let result = "received";
    this.commit(() => {
      const s = this.state,
        now = this.now();
      const visitor = this.visitor(event);
      const c = this.cultivator(event.user);
      let action: Action | undefined,
        count = 1,
        points = 1,
        intensity = 1;

      if (event.type === "comment") {
        const [command, ...words] = event.text.trim().split(/\s+/);
        const normalizedCommand = command.toLowerCase();

        if (
          normalizedCommand === "!phapbao" ||
          normalizedCommand === "!linhdan" ||
          normalizedCommand === "!lephap" ||
          normalizedCommand === "!quatang" ||
          normalizedCommand === "!lenhbai" ||
          normalizedCommand === "!le"
        ) {
          result = "gift-required";
        } else if (
          normalizedCommand === "!tu" ||
          normalizedCommand === "!tuluyen" ||
          normalizedCommand === "!quyen" ||
          normalizedCommand === "!luyenquyen" ||
          normalizedCommand === "!thaicuc" ||
          normalizedCommand === "!vancong"
        ) {
          action = "meditate";
        } else if (
          normalizedCommand === "!dan" ||
          normalizedCommand === "!linhkhi" ||
          normalizedCommand === "!kiem" ||
          normalizedCommand === "!dienkiem" ||
          normalizedCommand === "!kiemphap" ||
          normalizedCommand === "!datoa" ||
          normalizedCommand === "!ngodao"
        ) {
          action = "elixir";
        } else if (
          normalizedCommand === "!dokiep" ||
          normalizedCommand === "!dotpha" ||
          normalizedCommand === "!thiluyen" ||
          normalizedCommand === "!vuotai"
        ) {
          action = "tribulation";
        } else if (
          normalizedCommand === "!daotam" ||
          normalizedCommand === "!nguyen" ||
          normalizedCommand === "!loithe" ||
          normalizedCommand === "!monquy" ||
          normalizedCommand === "!the"
        ) {
          action = "vow";
        } else {
          result = "ignored";
        }

        if (action) {
          // Pre-cooldown validation
          if (action === "vow" && !words.join(" ").trim()) {
            action = undefined;
            result = "empty-prayer";
          } else if (action === "tribulation") {
            const next = nextRealm(c.realmIndex);
            if (!next) {
              action = undefined;
              result = "max-realm";
            } else if (c.tuVi < next.minTuVi) {
              action = undefined;
              result = "insufficient-tuvi";
            }
          }
        }

        if (action) {
          const cooldownKey = `viewer:${event.user.id}`;
          if (
            s.cooldowns[cooldownKey] !== undefined &&
            now - s.cooldowns[cooldownKey] < this.cooldownMs(c)
          ) {
            action = undefined;
            result = "cooldown";
          } else {
            s.cooldowns[cooldownKey] = now;
            if (action === "vow") {
              if (
                s.prayers.filter((p) => p.status === "pending").length >= 200
              ) {
                action = undefined;
                result = "prayer-queue-full";
              } else {
                s.prayers.push({
                  id: ++s.prayerId,
                  userName: event.user.name,
                  text: [...words.join(" ")].slice(0, 240).join(""),
                  status: "pending",
                  createdAt: now,
                });
                s.prayerCredits[String(s.prayerId)] = {
                  userId: event.user.id,
                  userName: event.user.name,
                  sessionId: s.session.id,
                  source: event.source,
                };
                visitor.action = "vow";
                visitor.actionAt = now;
                this.ceremony(
                  "vow",
                  event.user.name,
                  1,
                  1,
                  event.user.id,
                  getRealm(c.realmIndex).name,
                );
                s.progress += 1;
                result = "pending-approval";
                this.checkMilestones(s.progress - 1, s.progress);
                action = undefined; // handled directly
              }
            } else if (action === "meditate") {
              c.tuVi += this.practiceGain(c);
              this.syncVisitor(event.user.id, c);
              s.progress += 1;
              s.totals.meditate += 1;
              if (event.source === s.session.source)
                this.score(s.session.participation, event.user, 1);
              visitor.action = "meditate";
              visitor.actionAt = now;
              this.ceremony(
                "meditate",
                event.user.name,
                1,
                1,
                event.user.id,
                getRealm(c.realmIndex).name,
              );
              result = "meditate";
              this.checkMilestones(s.progress - 1, s.progress);
              action = undefined;
            } else if (action === "elixir") {
              c.tuVi += this.practiceGain(c);
              this.syncVisitor(event.user.id, c);
              s.progress += 1;
              s.totals.elixir += 1;
              if (event.source === s.session.source)
                this.score(s.session.participation, event.user, 1);
              visitor.action = "elixir";
              visitor.actionAt = now;
              this.ceremony(
                "elixir",
                event.user.name,
                1,
                1,
                event.user.id,
                getRealm(c.realmIndex).name,
              );
              result = "elixir";
              this.checkMilestones(s.progress - 1, s.progress);
              action = undefined;
            } else if (action === "tribulation") {
              const next = nextRealm(c.realmIndex)!;
              const chance = Math.min(
                1,
                next.baseChance + c.pityBonus + c.hoPhapBonus,
              );
              const passed = this.rng() < chance;
              visitor.action = "tribulation";
              visitor.actionAt = now;
              if (passed) {
                c.realmIndex = next.index;
                c.pityBonus = 0;
                c.hoPhapBonus = 0;
                c.breakthroughs++;
                this.syncVisitor(event.user.id, c);
                s.totals.breakthroughs += 1;
                s.progress += 5;
                if (event.source === s.session.source)
                  this.score(s.session.participation, event.user, 2);
                this.ceremony(
                  "tribulation-success",
                  event.user.name,
                  next.index >= 3 ? 3 : 2,
                  1,
                  event.user.id,
                  next.name,
                );
                if (next.index >= 3 && event.source === s.session.source) {
                  this.announce(
                    "breakthrough",
                    "Chúc mừng đệ tử " +
                      this.safeName(event.user.name) +
                      " vượt qua thiên kiếp, đột phá cảnh giới " +
                      next.name +
                      ".",
                  );
                }
                result = "tribulation-success";
                this.checkMilestones(s.progress - 5, s.progress);
              } else {
                c.pityBonus = Math.min(
                  0.65,
                  Number((c.pityBonus + 0.2).toFixed(4)),
                );
                s.progress += 1;
                if (event.source === s.session.source)
                  this.score(s.session.participation, event.user, 1);
                this.ceremony(
                  "tribulation-fail",
                  event.user.name,
                  2,
                  1,
                  event.user.id,
                  getRealm(c.realmIndex).name,
                );
                result = "tribulation-fail";
                this.checkMilestones(s.progress - 1, s.progress);
              }
              action = undefined;
            }
          }
        }
      } else if (event.type === "gift") {
        const key = JSON.stringify([
          event.source,
          event.user.id,
          event.giftId,
          event.streakId,
        ]);
        count = Math.max(0, event.count - (s.streaks[key] ?? 0));
        s.streaks[key] = Math.max(event.count, s.streaks[key] ?? 0);
        const live = event.source === s.session.source;
        const mapping = s.mappings.find((m) => m.giftId === event.giftId);
        const giftLabel = event.giftName.trim() || mapping?.name || "lễ vật";
        const thank = () => {
          if (!event.final || !live || s.thankedStreaks[key]) return;
          s.thankedStreaks[key] = true;
          const tier = DONOR_TIERS[c.donorTier]!;
          const rank = tier.index > 0 ? `, phong ${tier.name}` : "";
          this.announce(
            "gift",
            `Võ Đang Sơn đa tạ hiệp sĩ ${this.safeName(event.user.name)} đã ban tặng ${s.streaks[key]} ${giftLabel}${rank}. Phúc đức vô lượng.`,
            {
              userName: this.safeName(event.user.name),
              giftName: giftLabel,
              count: s.streaks[key],
              tier: tier.index,
            },
          );
        };
        if (!count) {
          result = "streak-already-counted";
          thank();
        } else {
          action = mapping?.action ?? "elixir";
          points = mapping?.points ?? 1;
          intensity = mapping?.intensity ?? 1;

          if (live) this.score(s.session.gifts, event.user, points * count);

          const previousTier = c.donorTier;
          c.donorPoints += points * count;
          c.donorTier = donorTierFor(c.donorPoints).index;
          if (live) {
            s.session.recentDonors.push({
              userId: event.user.id,
              userName: this.safeName(event.user.name),
              giftName: giftLabel,
              count,
              tier: c.donorTier,
              at: now,
            });
            s.session.recentDonors = s.session.recentDonors.slice(-20);
          }
          const tierBonus = 1 + DONOR_TIERS[c.donorTier]!.tuViBonus;

          c.tuVi += Math.round(points * 3 * count * tierBonus);
          c.hoPhapBonus = Math.min(
            1,
            Number((c.hoPhapBonus + 0.15 * intensity * count).toFixed(4)),
          );

          // Instant Hộ Pháp Breakthrough (intensity >= 2)
          let realmsGained = 0;
          if (intensity >= 2) {
            while (
              nextRealm(c.realmIndex) &&
              c.tuVi >= nextRealm(c.realmIndex)!.minTuVi
            ) {
              const next = nextRealm(c.realmIndex)!;
              c.realmIndex = next.index;
              c.pityBonus = 0;
              c.hoPhapBonus = 0;
              c.breakthroughs++;
              s.totals.breakthroughs++;
              realmsGained++;
            }
          }

          if (realmsGained > 0) {
            const currentRealm = getRealm(c.realmIndex);
            this.ceremony(
              "tribulation-success",
              event.user.name,
              3,
              count,
              event.user.id,
              currentRealm.name,
            );
            if (c.realmIndex >= 3 && event.source === s.session.source) {
              this.announce(
                "breakthrough",
                "Chúc mừng đệ tử " +
                  this.safeName(event.user.name) +
                  " vượt qua thiên kiếp, đột phá cảnh giới " +
                  currentRealm.name +
                  ".",
              );
            }
          }

          this.syncVisitor(event.user.id, c);
          visitor.action = action;
          visitor.actionAt = now;
          s.progress += points * count;
          if (action === "meditate") s.totals.meditate += count;
          else if (action === "elixir") s.totals.elixir += count;
          else if (action === "sword") s.totals.sword += count;

          this.ceremony(
            action,
            event.user.name,
            intensity,
            count,
            event.user.id,
            getRealm(c.realmIndex).name,
          );
          if (c.donorTier > previousTier) {
            const tier = DONOR_TIERS[c.donorTier]!;
            this.ceremony(
              "donor-tier",
              event.user.name,
              tier.index,
              count,
              event.user.id,
              tier.name,
            );
            if (live)
              this.announce(
                "tier-up",
                `Chúc mừng hiệp sĩ ${this.safeName(event.user.name)} được phong ${tier.name}. Linh khí tăng ${Math.round(tier.tuViBonus * 100)} phần trăm.`,
                { userName: this.safeName(event.user.name), tier: tier.index },
              );
          }
          thank();
          result = action;
          this.checkMilestones(s.progress - points * count, s.progress);
          action = undefined;
        }
      } else if (event.type === "like") {
        s.totals.likes += event.count;
        this.ceremony("like", event.user.name, 1, event.count, event.user.id);
        // Heart goal per LIVE: 100, 500, then every 1000 hearts feed the sect formation once.
        const liveLikes = (s.followThanks["likes:count"] =
          (s.followThanks["likes:count"] ?? 0) + event.count);
        // Every 10 hearts from one viewer earns +1 tinh tấn on this LIVE's board.
        if (event.source === s.session.source) {
          const ukey = JSON.stringify(["likes", event.user.id]);
          const before = s.followThanks[ukey] ?? 0;
          s.followThanks[ukey] = before + event.count;
          const earned =
            Math.floor(s.followThanks[ukey] / 10) - Math.floor(before / 10);
          if (earned > 0) this.score(s.session.participation, event.user, earned);
        }
        const lastGoal = s.followThanks["likes:goal"] ?? 0;
        const goal =
          liveLikes >= 1000
            ? Math.floor(liveLikes / 1000) * 1000
            : [500, 100].find((n) => liveLikes >= n) ?? 0;
        if (event.source === s.session.source && goal > lastGoal) {
          s.followThanks["likes:goal"] = goal;
          const before = s.progress;
          s.progress += 5;
          this.checkMilestones(before, s.progress);
          this.ceremony("milestone", `Vạn tâm hộ trận · ${goal} tim`, 2, goal);
          this.announce(
            "audience-milestone",
            `Đa tạ chư vị đạo hữu đã thả ${goal} trái tim hộ trì Chân Vũ Trận, linh khí tăng thêm.`,
          );
        }
      } else if (event.type === "join") {
        // Greet each viewer once per LIVE session, at most one greeting per 12 s.
        const key = JSON.stringify(["welcome", event.source, event.user.id]);
        if (
          s.settings.welcomeEnabled &&
          event.source === s.session.source &&
          s.followThanks[key] === undefined
        ) {
          s.followThanks[key] = now;
          if (now - (s.followThanks["welcome:last"] ?? -Infinity) >= 12000) {
            s.followThanks["welcome:last"] = now;
            this.announce(
              "welcome",
              `Chào mừng đạo hữu ${this.safeName(event.user.name)} ghé thăm Võ Đang Sơn.`,
            );
          }
        }
      } else if (event.type === "follow") {
        this.ceremony("follow", event.user.name, 1, 1, event.user.id);
        const key = JSON.stringify([event.source, event.user.id]);
        if (
          event.source === s.session.source &&
          (s.followThanks[key] === undefined ||
            now - s.followThanks[key] >= 30000)
        ) {
          s.followThanks[key] = now;
          this.announce(
            "follow",
            `Chào mừng đệ tử ${this.safeName(event.user.name)} bái nhập Võ Đang Sơn tu luyện.`,
          );
        }
      }

      // Memory bounds
      for (const map of [
        s.cooldowns,
        s.streaks,
        s.thankedStreaks,
        s.followThanks,
      ]) {
        const keys = Object.keys(map);
        if (keys.length > 20000)
          for (const key of keys.slice(0, keys.length - 20000)) delete map[key];
      }

      const cultKeys = Object.keys(s.cultivators);
      if (cultKeys.length > 20000) {
        const sortedKeys = cultKeys.sort((a, b) => {
          const ca = s.cultivators[a],
            cb = s.cultivators[b];
          return ca.realmIndex - cb.realmIndex || ca.updatedAt - cb.updatedAt;
        });
        for (const k of sortedKeys.slice(0, sortedKeys.length - 20000)) {
          delete s.cultivators[k];
        }
      }

      s.prayers = s.prayers
        .filter((p) => p.status === "pending")
        .concat(s.prayers.filter((p) => p.status !== "pending").slice(-500))
        .sort((a, b) => a.id - b.id);
      s.recent = [
        {
          id: event.id,
          type: event.type,
          userName: event.user.name,
          source: event.source,
          at: now,
          result,
          ...(event.type === "gift" ? { giftId: event.giftId } : {}),
        },
        ...s.recent,
      ].slice(0, 40);
      this.store.record(event, result, now);
    });
    return { result };
  }

  private checkMilestones(previousProgress: number, currentProgress: number) {
    const s = this.state;
    const crossed = [100, 250, 500];
    const latestRepeat = Math.floor(currentProgress / 500) * 500;
    if (latestRepeat >= 1000 && latestRepeat > previousProgress)
      crossed.push(latestRepeat);
    const newMilestones = crossed.filter(
      (n) =>
        n > previousProgress &&
        n <= currentProgress &&
        !s.milestones.includes(n),
    );
    s.milestones.push(...newMilestones);
    s.milestones = [
      ...s.milestones.filter((n) => n <= 500),
      ...s.milestones.filter((n) => n > 500).slice(-64),
    ];
    if (newMilestones.length)
      this.ceremony(
        "milestone",
        `Linh mạch khai mở · ${newMilestones.at(-1)}`,
        3,
      );
  }

  updateSettings(settings: Settings) {
    this.commit(() => {
      this.state.settings = settings;
    });
  }

  updateMappings(mappings: GiftMapping[]) {
    this.commit(() => {
      this.state.mappings = mappings;
    });
  }

  moderate(id: number, status: "approved" | "rejected") {
    const prayer = this.state.prayers.find(
      (p) => p.id === id && p.status === "pending",
    );
    if (!prayer) return false;
    this.commit(() => {
      prayer.status = status;
      const credit = this.state.prayerCredits[String(id)];
      if (status === "approved" && credit) {
        if (
          credit.sessionId === this.state.session.id &&
          credit.source === this.state.session.source
        ) {
          this.score(
            this.state.session.participation,
            { id: credit.userId, name: credit.userName },
            1,
          );
        }
        const cult = this.cultivator({
          id: credit.userId,
          name: credit.userName,
        });
        cult.tuVi += 5;
        this.syncVisitor(credit.userId, cult);
      }
      delete this.state.prayerCredits[String(id)];
    });
    return true;
  }

  tick() {
    const s = this.state,
      now = this.now();
    if (
      this.connector.state !== "connected" ||
      this.connector.mode !== s.session.source ||
      s.audience.current === null ||
      s.audience.current <= 0 ||
      s.audience.updatedAt === null ||
      now - s.audience.updatedAt >= 30000 ||
      now - s.lastSharePrompt < 300000 ||
      (s.lastAudienceCelebration !== null &&
        now - s.lastAudienceCelebration < 20000)
    )
      return;
    this.commit(() => {
      this.state.lastSharePrompt = now;
      const n = (this.state.followThanks["prompt:count"] =
        (this.state.followThanks["prompt:count"] ?? 0) + 1);
      this.announce(
        "share-prompt",
        n % 2 === 0
          ? "Chư vị đạo hữu chỉ xem cũng góp sức được, xin chạm màn hình thả tim để nuôi dưỡng Chân Vũ Trận."
          : "Mời chư vị đạo hữu chia sẻ truyền âm để hội tụ linh khí cho tông môn.",
      );
    });
  }

  setConnector(status: ConnectorStatus) {
    const changedMode = this.state.session.source !== status.mode;
    this.connector = status;
    if (changedMode) this.newSession(status.mode);
    else
      this.commit(() => {
        if (status.state !== "connected") {
          this.state.audience.current = null;
          this.state.audience.updatedAt = null;
        }
      });
  }

  replay(limit: number) {
    const events = this.store.replayEvents(limit),
      prefix = randomUUID();
    for (const event of events)
      this.ingest({
        ...event,
        id: `${prefix}:${event.id}`.slice(0, 200),
        source: "replay",
        timestamp: this.now(),
        ...(event.type === "gift"
          ? { streakId: `${prefix}:${event.streakId}`.slice(0, 200) }
          : {}),
      });
    return events.length;
  }
}
export { actionLabels };
