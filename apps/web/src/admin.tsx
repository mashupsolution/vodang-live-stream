import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clapperboard,
  Compass,
  Copy,
  Flame,
  Gift,
  Heart,
  LayoutDashboard,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Users,
  Volume2,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  actionLabels,
  defaultSettings,
  type Action,
  type AdminSnapshot,
  type GiftMapping,
  type TikTokConfig,
  type LiveEvent,
  type Settings,
} from "../../../packages/shared/src/index.ts";
import { api } from "./api";
import { TempleView } from "./TempleView";
import { AdminLeaderboards } from "./Leaderboard";
import { useTemple } from "./useTemple";

type Tab = "control" | "prayers" | "gifts" | "settings";

const icons: Record<Action, typeof Sparkles> = {
  meditate: Sparkles,
  elixir: Flame,
  sword: Compass,
  tribulation: Zap,
  vow: Heart,
};

const commands: Record<Action, string> = {
  meditate: "!tu",
  elixir: "!dan",
  sword: "!phapbao",
  tribulation: "!dokiep",
  vow: "!daotam",
};

function makeEvent(
  type: LiveEvent["type"],
  name: string,
  extra: Record<string, unknown> = {},
  userId?: string,
) {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    source: "mock",
    type,
    user: { id: userId ?? `demo:${name}`, name },
    ...extra,
  };
}

const resultLabels: Record<string, string> = {
  meditate: "Luyện quyền",
  elixir: "Diễn kiếm",
  sword: "Lễ vật",
  tribulation: "Đột phá",
  vow: "Môn quy",
  "tribulation-success": "Đột phá thành công",
  "tribulation-fail": "Thí luyện chưa thành",
  "donor-tier": "Phong Ân Công",
  "insufficient-tuvi": "Chưa đủ đạo hạnh",
  "max-realm": "Đã đạt Chưởng Môn Chân Nhân",
  received: "Bái sư",
  cooldown: "Đang hồi chân khí",
  ignored: "Bình luận",
  "pending-approval": "Chờ duyệt môn quy",
  "empty-prayer": "Chưa có lời thề",
  "streak-already-counted": "Chuỗi đã ghi nhận",
  "prayer-queue-full": "Hàng chờ môn quy đầy",
  "gift-required": "Cần dâng lễ vật LIVE",
};

export function Admin() {
  const { client, state: raw, connected } = useTemple(true);
  const state = raw as AdminSnapshot | undefined;

  const [tab, setTab] = useState<Tab>("control");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const running = state?.simulating ?? false;
  const [simResetArmed, setSimResetArmed] = useState(false);
  const [sessionResetArmed, setSessionResetArmed] = useState(false);

  const [narratorStatus, setNarratorStatus] = useState<{
    available: boolean;
    voice: string;
    detail: string;
    provider?: "edge" | "native" | "zerotts" | "unavailable";
  }>();

  const [name, setName] = useState("Vân Tiêu");
  const [prayer, setPrayer] = useState(
    "Nhất niệm phong thiên, vấn đỉnh trường sinh",
  );
  const [giftId, setGiftId] = useState("mock-linh-thach");
  const [count, setCount] = useState(1);
  const [audienceCount, setAudienceCount] = useState(1000);
  const simCountValid =
    Number.isInteger(audienceCount) &&
    audienceCount >= 1 &&
    audienceCount <= 1000000;

  const [draft, setDraft] = useState<Settings>(defaultSettings);
  const [mappings, setMappings] = useState<GiftMapping[]>([]);
  const [fps, setFps] = useState(0);
  const draftDirty = useRef(false);

  const [tiktok, setTiktok] = useState<TikTokConfig>({
    username: "",
    hasSignKey: false,
  });
  const [tiktokUser, setTiktokUser] = useState("");
  const [tiktokKey, setTiktokKey] = useState("");

  const obsUrl = `${location.origin}/overlay`;

  useEffect(() => {
    const timer = setInterval(
      () => setFps(Math.round(window.__TEMPLE_STATS__?.fps ?? 0)),
      1200,
    );
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () =>
      void api<{
        available: boolean;
        voice: string;
        detail: string;
        provider?: "edge" | "native" | "zerotts" | "unavailable";
      }>("narrator", undefined, "GET")
        .then((status) => {
          if (active) setNarratorStatus(status);
        })
        .catch((error) => {
          if (active)
            setNarratorStatus({
              available: false,
              voice: "",
              detail: (error as Error).message,
            });
        });
    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [state?.settings.narratorVoice]);

  useEffect(() => {
    let active = true;
    void api<TikTokConfig>("tiktok", undefined, "GET")
      .then((config) => {
        if (!active) return;
        setTiktok(config);
        setTiktokUser(config.username);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function saveTikTok(clearKey = false) {
    const config = await api<TikTokConfig>(
      "tiktok",
      {
        username: tiktokUser,
        ...(clearKey
          ? { signApiKey: null }
          : tiktokKey
            ? { signApiKey: tiktokKey }
            : {}),
      },
      "PUT",
    );
    setTiktok(config);
    setTiktokUser(config.username);
    setTiktokKey("");
  }

  useEffect(() => {
    if (state && !draftDirty.current) setDraft(state.settings);
  }, [JSON.stringify(state?.settings)]);

  useEffect(() => {
    if (state) {
      setMappings(state.mappings);
      setGiftId((current) =>
        state.mappings.some((m) => m.giftId === current)
          ? current
          : (state.mappings[0]?.giftId ?? ""),
      );
    }
  }, [JSON.stringify(state?.mappings)]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  async function run(task: () => Promise<unknown>, success?: string) {
    setBusy(true);
    setError("");
    try {
      await task();
      if (success) setToast(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendAction(action: Action) {
    const result = await api<{ result: string }>(
      "events",
      makeEvent("comment", name, {
        text: `${commands[action]}${action === "vow" ? ` ${prayer}` : ""}`,
      }),
    );
    setToast(
      result.result === "cooldown"
        ? `Đạo hữu đang hồi chân khí (${state?.settings.cooldownSeconds ?? 10}s).`
        : result.result === "pending-approval"
          ? "Đã gửi lời thề vào hàng chờ khắc bia đạo tâm."
          : result.result === "insufficient-tuvi"
            ? "Chưa đủ tu vi để độ kiếp."
            : result.result === "max-realm"
              ? "Đã đạt đỉnh Chân Tiên."
              : `${actionLabels[action]} · Đã phát`,
    );
  }

  async function updateCamera(camera: Settings["camera"]) {
    if (state) await api("settings", { ...state.settings, camera }, "PUT");
  }

  const setSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    draftDirty.current = true;
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const mutateMapping = (
    index: number,
    key: keyof GiftMapping,
    value: string | number,
  ) =>
    setMappings((old) =>
      old.map((m, i) => (i === index ? { ...m, [key]: value } : m)),
    );

  const navigation: [Tab, string, typeof Sparkles, string][] = [
    ["control", "Phòng điều khiển", LayoutDashboard, "Phòng điều khiển"],
    ["prayers", "Môn quy", MessageCircle, "Lời cầu nguyện (Môn quy)"],
    ["gifts", "Lễ vật", Gift, "Quà tặng"],
    ["settings", "Cài đặt", SlidersHorizontal, "Cài đặt"],
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/admin">
          <span className="brand-icon">
            <Sparkles size={28} strokeWidth={1.5} />
          </span>
          <span>
            Võ Đang<small>Võ Đang Phái LIVE</small>
          </span>
        </a>
        <nav aria-label="Điều hướng quản trị">
          {navigation.map(([id, label, Icon, ariaLabel]) => (
            <button
              key={id}
              className={tab === id ? "nav-item active" : "nav-item"}
              onClick={() => setTab(id)}
              aria-label={ariaLabel}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "prayers" && !!state?.pendingPrayers.length && (
                <b>{state.pendingPrayers.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Sparkles size={24} />
          <p>
            Võ Đang Kim Đỉnh.
            <br />
            Vạn kiếm quy tông.
          </p>
          <span>Chân khí môn phái đồng lòng tụ hội.</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="live-status">
            <span
              className={`indicator ${state?.connector.state ?? "disconnected"}`}
            />
            <span className="status-name">
              {state?.connector.mode === "tiktok"
                ? "TikTok LIVE"
                : "Mô phỏng Võ Đang Kim Đỉnh"}
            </span>
            <span className="tag">
              {state?.connector.mode === "tiktok"
                ? !connected
                  ? "Mất kết nối máy chủ"
                  : {
                      connected: "Đã kết nối",
                      connecting: "Đang kết nối",
                      disconnected: "Mất kết nối",
                      error: "Lỗi kết nối",
                    }[state.connector.state]
                : "Cục bộ"}
            </span>
          </div>
          <div className="topbar-actions">
            <a
              className="button secondary"
              href="/game"
              target="_blank"
              rel="noreferrer"
            >
              Mở giao diện xem <ArrowUpRight size={15} />
            </a>
            <a
              className="button secondary"
              href="/overlay"
              target="_blank"
              rel="noreferrer"
            >
              Nguồn OBS <ArrowUpRight size={15} />
            </a>
          </div>
        </header>

        {error && (
          <div className="banner error" role="alert">
            <span>{error}</span>
            <button
              aria-label="Đóng thông báo lỗi"
              onClick={() => setError("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {toast && (
          <div className="toast" role="status">
            <Check size={17} />
            {toast}
          </div>
        )}

        {tab === "control" && (
          <>
            <div className="workspace-toolbar">
              <div className="section-title">
                <span className="status-dot" />
                <h2>Võ Đang Sơn</h2>
                <span className="subtle">9:16 · 1080 × 1920</span>
              </div>
              <div className="segmented" aria-label="Góc nhìn">
                <button
                  className={
                    state?.settings.camera === "wide" ? "selected" : ""
                  }
                  disabled={!connected || busy}
                  onClick={() => void run(() => updateCamera("wide"))}
                >
                  Toàn cảnh
                </button>
                <button
                  className={
                    state?.settings.camera === "close" ? "selected" : ""
                  }
                  disabled={!connected || busy}
                  onClick={() => void run(() => updateCamera("close"))}
                >
                  Cận cảnh
                </button>
              </div>
            </div>
            <div className="control-grid">
              <section className="preview-column" aria-label="Xem trước">
                <div className="preview-frame">
                  <TempleView client={client} state={state} preview />
                </div>
                <div className="preview-footer">
                  <span>
                    <span className="status-dot" />
                    Xem trước · Không phát âm thanh
                  </span>
                  <span>{fps ? `${fps} FPS` : "Đang tải…"}</span>
                </div>
                <button
                  className="obs-link"
                  onClick={() => {
                    setTab("settings");
                    void navigator.clipboard
                      ?.writeText(obsUrl)
                      .then(() => setToast("Đã sao chép địa chỉ nguồn OBS."))
                      .catch(() =>
                        setToast("Địa chỉ nguồn OBS có trong Cài đặt."),
                      );
                  }}
                >
                  <Clapperboard size={16} />
                  Lấy đường dẫn cho OBS
                  <ArrowUpRight size={15} />
                </button>
              </section>
              <div className="operator-column">
                <section className="panel simulator">
                  <div className="panel-heading">
                    <h2>Tương tác thử</h2>
                    <span className="tag">Cục bộ</span>
                  </div>
                  <p className="description">
                    Gửi tương tác tu vi hoặc ban linh bảo để chứng kiến tiên
                    cảnh chuyển động.
                  </p>
                  <fieldset disabled={!connected || busy}>
                    <label className="field-label" htmlFor="viewer-name">
                      Tên đạo hữu
                    </label>
                    <input
                      id="viewer-name"
                      aria-label="Tên khách"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={60}
                      placeholder="Nhập tên đạo hữu"
                      required
                    />
                    <div className="action-grid">
                      {(
                        [
                          "meditate",
                          "elixir",
                          "sword",
                          "tribulation",
                        ] as Action[]
                      ).map((action) => {
                        const Icon = icons[action];
                        return (
                          <button
                            key={action}
                            className={`action-button ${action}`}
                            disabled={!name.trim()}
                            onClick={() => void run(() => sendAction(action))}
                            aria-label={`${actionLabels[action]} ${commands[action]}`}
                          >
                            <Icon size={25} strokeWidth={1.5} />
                            <strong>{actionLabels[action]}</strong>
                            <code>{commands[action]}</code>
                          </button>
                        );
                      })}
                    </div>
                    <div className="gift-row">
                      <label>
                        Chọn linh bảo
                        <select
                          aria-label="Chọn quà tặng"
                          value={giftId}
                          onChange={(e) => setGiftId(e.target.value)}
                        >
                          {(state?.mappings ?? []).map((m) => (
                            <option key={m.giftId} value={m.giftId}>
                              {m.name} · +{m.points}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="count-field">
                        Số lượng
                        <input
                          aria-label="Số lượng quà"
                          type="number"
                          min="1"
                          max="1000"
                          value={count}
                          onChange={(e) => setCount(e.target.valueAsNumber)}
                        />
                      </label>
                      <button
                        className="button secondary gift-send"
                        disabled={
                          !giftId ||
                          !name.trim() ||
                          !Number.isInteger(count) ||
                          count < 1 ||
                          count > 1000
                        }
                        onClick={() =>
                          void run(
                            () =>
                              api(
                                "events",
                                makeEvent("gift", name, {
                                  giftId,
                                  giftName:
                                    state?.mappings.find(
                                      (m) => m.giftId === giftId,
                                    )?.name ?? giftId,
                                  count,
                                  streakId: crypto.randomUUID(),
                                  final: true,
                                }),
                              ),
                            "Đã dâng lễ vật mô phỏng.",
                          )
                        }
                      >
                        <Gift size={17} />
                        Gửi quà
                      </button>
                    </div>
                    <label className="field-label" htmlFor="prayer-text">
                      Lời thề môn quy
                    </label>
                    <div className="prayer-input">
                      <textarea
                        id="prayer-text"
                        aria-label="Lời cầu nguyện"
                        rows={2}
                        value={prayer}
                        onChange={(e) => setPrayer(e.target.value)}
                        maxLength={240}
                      />
                      <button
                        aria-label="Gửi lời cầu nguyện"
                        disabled={!prayer.trim() || !name.trim()}
                        onClick={() => void run(() => sendAction("vow"))}
                      >
                        <Send size={18} />
                      </button>
                    </div>
                    <span className="field-hint">
                      <ShieldCheck size={13} />
                      Lời thề môn quy chỉ lưu lại sau khi chưởng môn phê chuẩn.
                    </span>
                    <div className="audience-simulator">
                      <label htmlFor="mock-audience-count">
                        Người xem đồng thời · mô phỏng
                      </label>
                      <div>
                        <input
                          id="mock-audience-count"
                          aria-label="Người xem đồng thời mô phỏng"
                          type="number"
                          min="0"
                          max="1000000"
                          step="1"
                          value={audienceCount}
                          onChange={(e) =>
                            setAudienceCount(e.target.valueAsNumber)
                          }
                        />
                        <button
                          className="button secondary"
                          disabled={
                            !connected ||
                            busy ||
                            state?.connector.mode === "tiktok" ||
                            !Number.isInteger(audienceCount) ||
                            audienceCount < 0 ||
                            audienceCount > 1000000
                          }
                          onClick={() =>
                            void run(
                              () =>
                                api("events", {
                                  id: crypto.randomUUID(),
                                  timestamp: Date.now(),
                                  source: "mock",
                                  type: "audience",
                                  count: audienceCount,
                                }),
                              "Đã cập nhật số người xem mô phỏng.",
                            )
                          }
                        >
                          Cập nhật người xem
                        </button>
                        <button
                          className="button secondary"
                          disabled={
                            !connected ||
                            busy ||
                            state?.connector.mode === "tiktok" ||
                            !name.trim()
                          }
                          onClick={() =>
                            void run(
                              () => api("events", makeEvent("share", name)),
                              "Đã gửi lượt triệu tập đồng đạo mô phỏng.",
                            )
                          }
                        >
                          Thử chia sẻ
                        </button>
                      </div>
                      <small>
                        {state?.connector.mode === "tiktok"
                          ? "Chỉ là sự kiện mô phỏng; đã tắt khi TikTok LIVE đang kết nối."
                          : "Mỗi người xem là một đệ tử (sân hiện tối đa 40, phần dư được đếm thêm). Chạy mô phỏng dùng số này."}
                      </small>
                    </div>
                  </fieldset>
                  <div className="demo-control">
                    <button
                      className="button primary"
                      disabled={
                        !connected ||
                        busy ||
                        state?.connector.mode === "tiktok" ||
                        (!running && !simCountValid)
                      }
                      onClick={() =>
                        void run(
                          () =>
                            api("simulator", {
                              running: !running,
                              giftId,
                              viewers: simCountValid ? audienceCount : undefined,
                            }),
                          running
                            ? "Đã dừng mô phỏng."
                            : "Đã chạy mô phỏng.",
                        )
                      }
                    >
                      {running ? <Pause size={17} /> : <Play size={17} />}
                      {running ? "Dừng mô phỏng" : "Chạy mô phỏng"}
                    </button>
                    {!simResetArmed ? (
                      <button
                        className="button secondary"
                        disabled={
                          !connected ||
                          busy ||
                          state?.connector.mode === "tiktok"
                        }
                        onClick={() => setSimResetArmed(true)}
                      >
                        <RotateCcw size={16} /> Đặt lại mô phỏng
                      </button>
                    ) : (
                      <span
                        className="session-confirm"
                        role="group"
                        aria-label="Xác nhận đặt lại mô phỏng"
                      >
                        <button
                          className="button primary"
                          disabled={!connected || busy}
                          onClick={() =>
                            void run(
                              () => api("simulator/reset"),
                              "Đã đặt lại số liệu mô phỏng.",
                            ).then(() => setSimResetArmed(false))
                          }
                        >
                          Xác nhận đặt lại
                        </button>
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={() => setSimResetArmed(false)}
                        >
                          Hủy
                        </button>
                      </span>
                    )}
                    <span>
                      {running
                        ? `${(state?.visitors.length ?? 0) + (state?.visitorOverflow ?? 0)} đệ tử đang tọa thiền và rèn luyện tại Võ Đang Sơn.`
                        : "Tự động tạo đệ tử và nhịp tu luyện mẫu."}
                    </span>
                  </div>
                </section>
                <section
                  className="community-strip"
                  aria-label="Thống kê môn phái"
                >
                  <div>
                    <Sparkles />
                    <strong>
                      {state?.totals.meditate.toLocaleString("vi-VN") ?? 0}
                    </strong>
                    <span>Luyện quyền</span>
                  </div>
                  <div>
                    <Flame />
                    <strong>
                      {state?.totals.elixir.toLocaleString("vi-VN") ?? 0}
                    </strong>
                    <span>Diễn kiếm</span>
                  </div>
                  <div>
                    <Compass />
                    <strong>
                      {state?.totals.sword.toLocaleString("vi-VN") ?? 0}
                    </strong>
                    <span>Lễ vật</span>
                  </div>
                  <div>
                    <Zap />
                    <strong>
                      {state?.totals.breakthroughs.toLocaleString("vi-VN") ?? 0}
                    </strong>
                    <span>Đột phá</span>
                  </div>
                  <div>
                    <Users />
                    <strong>
                      {state?.totals.visits.toLocaleString("vi-VN") ?? 0}
                    </strong>
                    <span>Lượt bái sư</span>
                  </div>
                </section>
                <AdminLeaderboards state={state} />
                <section className="panel session-panel">
                  <div className="panel-heading">
                    <h2>Phiên LIVE</h2>
                    <span className="tag">
                      {state?.session.source === "tiktok"
                        ? "TikTok LIVE"
                        : "Mô phỏng"}
                    </span>
                  </div>
                  <p className="description">
                    Bắt đầu{" "}
                    {state
                      ? new Date(state.session.startedAt).toLocaleString(
                          "vi-VN",
                        )
                      : "—"}
                    . Bắt đầu phiên mới sẽ đặt lại bảng tri ân của phiên hiện
                    tại.
                  </p>
                  {!sessionResetArmed ? (
                    <button
                      className="button secondary"
                      disabled={!connected || busy}
                      onClick={() => setSessionResetArmed(true)}
                    >
                      <RotateCcw size={16} /> Bắt đầu phiên mới
                    </button>
                  ) : (
                    <div
                      className="session-confirm"
                      role="group"
                      aria-label="Xác nhận phiên mới"
                    >
                      <span>Đặt lại điểm trên hai bảng tri ân?</span>
                      <button
                        className="button primary"
                        disabled={!connected || busy}
                        onClick={() =>
                          void run(
                            () => api("session/new"),
                            "Phiên mới đã bắt đầu.",
                          ).then(() => setSessionResetArmed(false))
                        }
                      >
                        Xác nhận phiên mới
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => setSessionResetArmed(false)}
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                </section>
                <section className="panel activity-panel">
                  <div className="panel-heading">
                    <h2>Nhịp Võ Đang</h2>
                    <span className="activity-caption">
                      <Activity size={13} />
                      Thời gian thực
                    </span>
                  </div>
                  <EventList state={state} />
                </section>
                <div className="quiet-note">
                  <ShieldCheck size={18} />
                  <p>
                    {state?.connector.mode === "tiktok" &&
                    state.connector.state === "connected"
                      ? "Đang nhận tương tác từ TikTok LIVE."
                      : "Không cần kết nối TikTok để trải nghiệm."}
                    <br />
                    <span>
                      {state?.connector.mode === "tiktok"
                        ? "Bảng tương tác thử vẫn gửi dữ liệu mô phỏng."
                        : "Các tương tác hiện tại là dữ liệu mô phỏng."}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "prayers" && (
          <section className="content-sheet">
            <div className="sheet-heading">
              <h2>
                Đang chờ duyệt{" "}
                <span className="tag">{state?.pendingPrayers.length ?? 0}</span>
              </h2>
              <span className="subtle">
                Tối đa 240 ký tự mỗi lời thề môn quy
              </span>
            </div>
            {!state?.pendingPrayers.length ? (
              <div className="empty-state">
                <Heart size={34} strokeWidth={1.2} />
                <h3>Một khoảng lặng thanh tịnh</h3>
                <p>
                  Lời thề môn quy mới sẽ xuất hiện ở đây để chưởng môn phê
                  chuẩn.
                </p>
                <button
                  className="button secondary"
                  onClick={() => setTab("control")}
                >
                  Gửi môn quy thử <ChevronRight size={16} />
                </button>
              </div>
            ) : (
              <div className="prayer-list">
                {state.pendingPrayers.map((p) => (
                  <article className="prayer-row" key={p.id}>
                    <span className="visitor-avatar">
                      {p.userName.charAt(0)}
                    </span>
                    <div>
                      <strong>{p.userName}</strong>
                      <p>{p.text}</p>
                      <small>
                        {new Date(p.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>
                    </div>
                    <div className="row-actions">
                      <button
                        className="button secondary"
                        disabled={busy || !connected}
                        onClick={() =>
                          void run(
                            () =>
                              api(`prayers/${p.id}`, { status: "rejected" }),
                            "Đã ẩn lời thề.",
                          )
                        }
                      >
                        <X size={15} />
                        Ẩn
                      </button>
                      <button
                        className="button primary"
                        disabled={busy || !connected}
                        onClick={() =>
                          void run(
                            () =>
                              api(`prayers/${p.id}`, { status: "approved" }),
                            "Lời thề môn quy đã được phê chuẩn.",
                          )
                        }
                      >
                        <Check size={16} />
                        Duyệt
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="approved-prayers">
              <h2>Lời thề môn quy đã phê duyệt</h2>
              {state?.prayers.length ? (
                state.prayers
                  .slice()
                  .reverse()
                  .map((p) => (
                    <p key={p.id}>
                      <Heart size={14} />
                      <span>
                        {p.text}
                        <small>{p.userName}</small>
                      </span>
                    </p>
                  ))
              ) : (
                <p className="subtle">
                  Chưa có lời thề môn quy nào được lưu lại.
                </p>
              )}
            </div>
          </section>
        )}

        {tab === "gifts" && (
          <section className="content-sheet">
            <div className="sheet-heading">
              <h2>Quy tắc lễ vật &amp; quà tặng</h2>
              <button
                className="button secondary"
                aria-label="Thêm quà"
                disabled={!connected || busy || mappings.length >= 100}
                onClick={() =>
                  setMappings((old) => [
                    ...old,
                    {
                      giftId: "",
                      name: "",
                      action: "elixir",
                      intensity: 1,
                      points: 10,
                    },
                  ])
                }
              >
                <Gift size={16} />
                Thêm lễ vật
              </button>
            </div>
            <p className="description">
              Các mã <code>mock-*</code> dành cho mô phỏng. Khi nhận quà thật,
              dùng mã quà trong Nhịp Võ Đang để tạo quy tắc. Quà chưa có quy tắc
              sẽ tự động tăng tu vi và cộng 1 điểm công huân mỗi lượt.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(
                  () => api("mappings", mappings, "PUT"),
                  "Đã lưu quy tắc lễ vật.",
                );
              }}
            >
              <div className="mapping-list">
                {mappings.map((m, i) => (
                  <div className="mapping-row" key={i}>
                    <label>
                      Tên linh bảo
                      <input
                        aria-label={`Tên quà ${i + 1}`}
                        required
                        maxLength={60}
                        value={m.name}
                        onChange={(e) =>
                          mutateMapping(i, "name", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Mã quà
                      <input
                        aria-label={`Mã quà ${i + 1}`}
                        required
                        maxLength={100}
                        value={m.giftId}
                        onChange={(e) =>
                          mutateMapping(i, "giftId", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Hành động
                      <select
                        value={m.action}
                        onChange={(e) =>
                          mutateMapping(i, "action", e.target.value as Action)
                        }
                      >
                        {Object.entries(actionLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Hiệu ứng
                      <select
                        value={m.intensity}
                        onChange={(e) =>
                          mutateMapping(i, "intensity", Number(e.target.value))
                        }
                      >
                        <option value={1}>Nhẹ (1)</option>
                        <option value={2}>Vừa (2)</option>
                        <option value={3}>Lôi đình / Thần thông (3)</option>
                      </select>
                    </label>
                    <label>
                      Điểm công huân
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        required
                        value={m.points}
                        onChange={(e) =>
                          mutateMapping(i, "points", e.target.valueAsNumber)
                        }
                      />
                    </label>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={`Xóa quà ${m.name || i + 1}`}
                      onClick={() =>
                        setMappings((old) =>
                          old.filter((_, index) => index !== i),
                        )
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="button primary"
                type="submit"
                disabled={!connected || busy}
              >
                <Check size={16} />
                Lưu quy tắc
              </button>
            </form>
          </section>
        )}

        {tab === "settings" && (
          <div className="settings-grid">
            <section className="content-sheet">
              <h2>Trải nghiệm Võ Đang Kim Đỉnh</h2>
              <form
                className="settings-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await api("settings", draft, "PUT");
                    draftDirty.current = false;
                  }, "Đã lưu cài đặt.");
                }}
              >
                <label>
                  Thời gian chờ giữa hai lượt (giây)
                  <input
                    type="number"
                    min="0"
                    max="300"
                    required
                    value={draft.cooldownSeconds}
                    onChange={(e) =>
                      setSetting("cooldownSeconds", e.target.valueAsNumber)
                    }
                  />
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={draft.autoCamera}
                    onChange={(e) => setSetting("autoCamera", e.target.checked)}
                  />
                  Tự chuyển toàn cảnh / cận cảnh mỗi 16 giây
                </label>
                <div className="narrator-settings">
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={draft.narratorEnabled}
                      onChange={(e) =>
                        setSetting("narratorEnabled", e.target.checked)
                      }
                    />
                    Đọc lời tri ân (Tiên Âm)
                  </label>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={draft.welcomeEnabled}
                      onChange={(e) =>
                        setSetting("welcomeEnabled", e.target.checked)
                      }
                    />
                    Chào đạo hữu mới vào phòng
                  </label>
                  <p className="field-hint" role="status">
                    {narratorStatus
                      ? narratorStatus.detail
                      : "Đang kiểm tra giọng đọc…"}
                  </p>
                  {narratorStatus?.provider === "edge" && (
                    <>
                      <label>
                        <span>Giọng đọc Windows</span>
                        <select
                          aria-label="Giọng đọc Windows"
                          value={draft.narratorVoice}
                          onChange={(e) =>
                            setSetting(
                              "narratorVoice",
                              e.target.value as Settings["narratorVoice"],
                            )
                          }
                        >
                          <option value="vi-VN-NamMinhNeural">Nam Minh</option>
                          <option value="vi-VN-HoaiMyNeural">Hoài My</option>
                        </select>
                      </label>
                      <p className="field-hint">
                        Cần Internet. Nội dung lời tri ân được gửi tới dịch vụ
                        giọng đọc Microsoft Edge.
                      </p>
                    </>
                  )}
                  {narratorStatus?.provider === "zerotts" && (
                    <label>
                      <span>Giọng ZeroTTS</span>
                      <select
                        aria-label="Giọng ZeroTTS"
                        value={
                          draft.narratorVoice.startsWith("zerotts-")
                            ? draft.narratorVoice
                            : "zerotts-maichi"
                        }
                        onChange={(e) =>
                          setSetting(
                            "narratorVoice",
                            e.target.value as Settings["narratorVoice"],
                          )
                        }
                      >
                        <option value="zerotts-maichi">Mai Chi</option>
                        <option value="zerotts-baotrang">Bảo Trang</option>
                        <option value="zerotts-hamy">Hà My</option>
                        <option value="zerotts-kimoanh">Kim Oanh</option>
                        <option value="zerotts-giahuy">Gia Huy</option>
                        <option value="zerotts-huuduc">Hữu Đức</option>
                        <option value="zerotts-quangminh">Quang Minh</option>
                        <option value="zerotts-tiendat">Tiến Đạt</option>
                      </select>
                    </label>
                  )}
                  <label>
                    <span>
                      <Volume2 size={16} /> Âm lượng Tiên Âm{" "}
                      <small>{Math.round(draft.narratorVolume * 100)}%</small>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={draft.narratorVolume}
                      onChange={(e) =>
                        setSetting("narratorVolume", Number(e.target.value))
                      }
                    />
                  </label>
                </div>
                <label>
                  <span>
                    <Volume2 size={16} />
                    Âm nền Tiên Cảnh{" "}
                    <small>{Math.round(draft.ambientVolume * 100)}%</small>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={draft.ambientVolume}
                    onChange={(e) =>
                      setSetting("ambientVolume", Number(e.target.value))
                    }
                  />
                </label>
                <label>
                  <span>
                    <Volume2 size={16} />
                    Âm hiệu ứng linh bảo{" "}
                    <small>{Math.round(draft.ceremonyVolume * 100)}%</small>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={draft.ceremonyVolume}
                    onChange={(e) =>
                      setSetting("ceremonyVolume", Number(e.target.value))
                    }
                  />
                </label>
                <button
                  className="button primary"
                  type="submit"
                  disabled={!connected || busy}
                >
                  <Check size={16} />
                  Lưu cài đặt
                </button>
              </form>
            </section>
            <section className="content-sheet">
              <h2>Nguồn cho OBS Studio</h2>
              <p className="description">
                Thêm một <strong>Browser Source</strong> vào OBS với tỉ lệ dọc
                chuẩn 9:16.
              </p>
              <div className="obs-spec">
                <dl>
                  <dt>URL</dt>
                  <dd>
                    <code>{obsUrl}</code>
                  </dd>
                  <dt>Chiều rộng</dt>
                  <dd>1080</dd>
                  <dt>Chiều cao</dt>
                  <dd>1920</dd>
                  <dt>Tùy chọn âm thanh</dt>
                  <dd>
                    Để OBS phát cả nhạc nền và âm hiệu ứng, dùng địa chỉ{" "}
                    <code>{obsUrl}?audio=1</code> và bật{" "}
                    <em>Control audio via OBS</em>.
                  </dd>
                </dl>
                <button
                  className="button secondary"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(obsUrl)
                      .then(() => setToast("Đã sao chép địa chỉ nguồn OBS."))
                  }
                >
                  <Copy size={16} />
                  Sao chép URL nguồn
                </button>
              </div>
            </section>
            <section className="content-sheet">
              <h2>Kết nối TikTok LIVE</h2>
              <p className="description">
                Nhập tên người dùng TikTok đang phát trực tiếp. Thiết lập được
                lưu trong cơ sở dữ liệu cục bộ; khóa ký là trường chỉ ghi và
                không bao giờ lộ ra giao diện.
              </p>
              <form
                className="settings-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(() => saveTikTok(), "Đã lưu thông tin TikTok.");
                }}
              >
                <label>
                  Tên tài khoản TikTok đang LIVE
                  <input
                    value={tiktokUser}
                    placeholder="@ten_tai_khoan"
                    maxLength={65}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => setTiktokUser(e.target.value)}
                  />
                </label>
                <label>
                  Khóa dịch vụ ký (tùy chọn)
                  <input
                    type="password"
                    value={tiktokKey}
                    maxLength={200}
                    autoComplete="off"
                    placeholder={
                      tiktok.hasSignKey
                        ? "Đã lưu — để trống để giữ nguyên"
                        : "Chỉ nhập nếu dịch vụ ký yêu cầu"
                    }
                    onChange={(e) => setTiktokKey(e.target.value)}
                  />
                </label>
                <p className="field-hint">
                  Khóa được lưu trên máy này và không bao giờ hiển thị lại.
                  {state?.connector.mode === "tiktok"
                    ? " Bấm Kết nối TikTok lần nữa để áp dụng thay đổi."
                    : ""}
                </p>
                <div className="inline-actions">
                  <button
                    type="submit"
                    className="button secondary"
                    disabled={busy}
                  >
                    <Check size={16} />
                    Lưu thông tin
                  </button>
                  {tiktok.hasSignKey && (
                    <button
                      type="button"
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        void run(() => saveTikTok(true), "Đã xóa khóa.")
                      }
                    >
                      <Trash2 size={16} />
                      Xóa khóa
                    </button>
                  )}
                </div>
              </form>
              <div className="inline-actions">
                <button
                  className="button primary"
                  disabled={
                    !connected ||
                    busy ||
                    !tiktok.username ||
                    state?.connector.state === "connecting"
                  }
                  onClick={() => {
                    void run(() => api("connector", { mode: "tiktok" }));
                  }}
                >
                  <Wifi size={16} />
                  Kết nối TikTok
                </button>
                <button
                  className="button secondary"
                  disabled={!connected || busy}
                  onClick={() =>
                    void run(
                      () => api("connector", { mode: "mock" }),
                      "Đã chuyển về mô phỏng.",
                    )
                  }
                >
                  <Play size={16} />
                  Dùng mô phỏng
                </button>
              </div>
            </section>
            <section className="content-sheet">
              <h2>
                <RotateCcw size={20} />
                Phát lại sự kiện
              </h2>
              <p className="description">
                Phát lại 20 sự kiện gần nhất dưới dạng thử nghiệm. Các hành động
                hợp lệ sẽ cộng điểm thêm; lời thề vẫn cần duyệt.
              </p>
              <button
                className="button secondary"
                disabled={!connected || busy}
                onClick={() =>
                  void run(
                    () => api("replay", { limit: 20 }),
                    "Đã phát lại sự kiện.",
                  )
                }
              >
                <RotateCcw size={16} />
                Phát lại 20 sự kiện
              </button>
            </section>
          </div>
        )}
        <footer className="page-footer">
          <span>Võ Đang Phái LIVE — Kim Đỉnh</span>
          <span>
            <ShieldCheck size={13} />
            Được lưu trên máy của bạn
          </span>
        </footer>
      </main>
    </div>
  );
}

function EventList({ state }: { state?: AdminSnapshot }) {
  return (
    <div className="event-list" aria-label="Sự kiện gần đây">
      {!state?.recent.length ? (
        <div className="event-empty">
          <Activity size={22} />
          <p>
            Võ Đang Sơn đang thanh tịnh.
            <br />
            <span>Thử một tương tác rèn luyện để bắt đầu.</span>
          </p>
        </div>
      ) : (
        state.recent.slice(0, 5).map((event) => (
          <div className="event-row" key={event.id}>
            <span className={`event-icon ${event.type}`}>
              {event.type === "gift" ? (
                <Gift size={16} />
              ) : event.type === "comment" ? (
                <Sparkles size={16} />
              ) : (
                <Users size={16} />
              )}
            </span>
            <div>
              <strong>{event.userName}</strong>
              <span>
                {resultLabels[event.result] ?? event.result}
                {event.giftId ? ` · ${event.giftId}` : ""}
              </span>
            </div>
            <time>
              {new Date(event.at).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </div>
        ))
      )}
    </div>
  );
}
