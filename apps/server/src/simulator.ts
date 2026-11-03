import { randomUUID } from "node:crypto";
import type { LiveEvent } from "../../../packages/shared/src/index.ts";
import type { Engine } from "./engine.ts";

const DEFAULT_DISCIPLES = 50;
const MAX_DISCIPLES = 500;
const TICK_MS = 1800;
const AUDIENCE_REFRESH_MS = 10000;

const names = [
  "Vân Tiêu", "Thanh Huyền", "Lăng Phong", "Diệp Trần", "Hàn Lập",
  "Bạch Tiểu Thuần", "Tô Minh", "Lạc Tuyết", "Tiêu Viêm", "Lâm Động",
  "Mộ Dung", "Sở Hưu", "Tần Vũ", "Phương Hàn", "Chu Nhất", "Ngu Cơ",
  "Chân Cơ", "Vân Triệt", "Cố Trường Ca", "Thần Hạo", "Bắc Huyền",
  "Vô Cực", "Tử Huyên", "Minh Nguyệt",
];
const commands = ["!tu", "!dan", "!dokiep"];

/** Server-owned demo traffic so Stop is authoritative for every admin tab. */
export class Simulator {
  private timer?: ReturnType<typeof setTimeout>;
  private index = 0;
  private lastAudienceAt = 0;
  private giftId = "mock-linh-thach";
  private giftName = "Linh Thạch";
  private disciples = DEFAULT_DISCIPLES;

  constructor(
    private engine: Engine,
    private now: () => number = Date.now,
  ) {}

  get running() {
    return this.engine.simulating;
  }

  start(giftId?: string, giftName?: string, disciples?: number) {
    if (giftId) this.giftId = giftId;
    if (giftName) this.giftName = giftName;
    if (this.running) return;
    this.disciples = Number.isFinite(disciples)
      ? Math.min(MAX_DISCIPLES, Math.max(1, Math.floor(disciples!)))
      : DEFAULT_DISCIPLES;
    this.engine.simulating = true;
    this.index = 0;
    this.engine.onChange();
    this.schedule(0);
  }

  /** Stop emitting and take the simulated disciples off the temple floor. */
  stop() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.engine.simulating = false;
    this.engine.clearDemo();
  }

  setGift(giftId: string, giftName: string) {
    this.giftId = giftId;
    this.giftName = giftName;
  }

  /** Emit one step; exposed so tests need no timers. */
  step() {
    if (!this.running) return;
    const at = this.now();
    // Rejoin only when the floor is empty (first run or after Stop/expiry).
    if (!this.engine.hasDemoVisitors()) {
      for (let slot = 0; slot < this.disciples; slot++)
        this.emit({ type: "join" }, this.nameFor(slot), `demo:visitor:${slot}`);
    }
    const n = this.index++;
    const slot = n % this.disciples;
    const user = this.nameFor(slot);
    const id = `demo:visitor:${slot}`;
    if (n % 4 === 0)
      this.emit(
        {
          type: "gift",
          giftId: this.giftId,
          giftName: this.giftName,
          count: 1,
          streakId: randomUUID(),
          final: true,
        },
        user,
        id,
      );
    else
      this.emit({ type: "comment", text: commands[n % 3]! }, user, id);
    // The audience figure fades after 30 s unless refreshed; keep it alive.
    const current = this.engine.snapshot().audience.current;
    if (current !== null && at - this.lastAudienceAt >= AUDIENCE_REFRESH_MS) {
      this.lastAudienceAt = at;
      this.engine.ingest({
        id: randomUUID(),
        timestamp: at,
        source: "mock",
        type: "audience",
        count: current,
      } as LiveEvent);
    }
  }

  /** Stable name per slot; later laps get a number so names stay distinct. */
  private nameFor(slot: number) {
    const lap = Math.floor(slot / names.length);
    return `${names[slot % names.length]}${lap ? ` ${lap + 1}` : ""}`;
  }

  private emit(extra: Record<string, unknown>, name: string, userId: string) {
    this.engine.ingest({
      id: randomUUID(),
      timestamp: this.now(),
      source: "mock",
      user: { id: userId, name },
      ...extra,
    } as LiveEvent);
  }

  private schedule(delay: number) {
    this.timer = setTimeout(() => {
      try {
        this.step();
      } catch (error) {
        console.error("Tu Tien simulator stopped:", error);
        this.stop();
        return;
      }
      if (this.running) this.schedule(TICK_MS);
    }, delay);
    this.timer.unref();
  }
}
