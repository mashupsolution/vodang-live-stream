import { useEffect, useRef, useState } from "react";
import { Sparkles, Heart, Eye, Users, Volume2, VolumeX } from "lucide-react";
import {
  actionLabels,
  nextMilestone,
  type Action,
  type Snapshot,
} from "../../../packages/shared/src/index.ts";
import { TempleClient } from "./api";
import { mountGame } from "./game";
import { Soundscape } from "./audio";
import { GiftBoard } from "./Leaderboard";

export function TempleView({
  client,
  state,
  preview = false,
  overlay = false,
}: {
  client: TempleClient;
  state?: Snapshot;
  preview?: boolean;
  overlay?: boolean;
}) {
  const parent = useRef<HTMLDivElement>(null);
  const sound = useRef<Soundscape | undefined>(undefined);
  const [audio, setAudio] = useState(false);
  const mutedByUser = useRef(false);
  const [error, setError] = useState("");
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [quietTipIndex, setQuietTipIndex] = useState(0);
  const [prayerSpotlightUntil, setPrayerSpotlightUntil] = useState(0);
  const clockAnchor = useRef<{ serverTime: number; localTime: number } | null>(
    null,
  );

  if (state && clockAnchor.current?.serverTime !== state.serverTime) {
    clockAnchor.current = {
      serverTime: state.serverTime,
      localTime: Date.now(),
    };
  }

  useEffect(() => {
    const game = mountGame(parent.current!, client);
    return () => game.destroy(true);
  }, [client]);

  useEffect(() => {
    if (preview) return;
    sound.current = new Soundscape();
    mutedByUser.current = false;
    const wantsAudio =
      !overlay || new URLSearchParams(location.search).get("audio") === "1";
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    const stopListening = () =>
      events.forEach((name) => window.removeEventListener(name, unlock));
    // Browsers reject audio before a user gesture, so retry on the first one.
    function unlock() {
      if (mutedByUser.current || sound.current?.active) return stopListening();
      sound.current
        ?.enable()
        .then(() => {
          setAudio(sound.current?.active ?? false);
          if (sound.current?.active) stopListening();
        })
        .catch(() => {});
    }
    if (wantsAudio) {
      sound.current
        .enable()
        .then(() => setAudio(sound.current?.active ?? false))
        .catch(() => {});
      events.forEach((name) =>
        window.addEventListener(name, unlock, { passive: true }),
      );
    }
    return () => {
      stopListening();
      void sound.current?.destroy();
      sound.current = undefined;
    };
  }, [preview, overlay]);

  useEffect(() => {
    if (state) sound.current?.update(state);
  }, [state, audio]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (
      new URLSearchParams(location.search).has("capture") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = window.setInterval(
      () => setQuietTipIndex((current) => current + 1),
      10000,
    );
    return () => window.clearInterval(timer);
  }, []);

  const milestone = nextMilestone(state?.progress ?? 0);
  const progress = state?.progress ?? 0;
  const currentTime =
    state && clockAnchor.current
      ? clockAnchor.current.serverTime +
        (clockTick - clockAnchor.current.localTime)
      : clockTick;
  const freshCeremonies = (state?.ceremonies ?? []).filter((ceremony) => {
    const age = currentTime - ceremony.at;
    return age >= 0 && age <= 6000;
  });
  const prayer = state?.prayers.at(-1);
  useEffect(() => {
    if (prayer) setPrayerSpotlightUntil(Date.now() + 7000);
  }, [prayer?.id]);
  const freshAnnouncements = (state?.announcements ?? []).filter((item) => {
    const age = currentTime - item.at;
    return age >= 0 && age <= 6000;
  });
  const announcementPriority = (kind: string) =>
    kind === "gift"
      ? 1
      : kind === "audience-milestone" || kind === "breakthrough"
        ? 2
        : 3;
  const bestAnnouncement = [...freshAnnouncements].sort(
    (a, b) =>
      announcementPriority(a.kind) - announcementPriority(b.kind) ||
      b.at - a.at,
  )[0];
  const activeTribulation = freshCeremonies
    .filter(
      (ceremony) =>
        ceremony.action === "tribulation-success" ||
        ceremony.action === "tribulation-fail",
    )
    .sort((a, b) => b.at - a.at)[0];
  const activeTierUp = freshCeremonies
    .filter((ceremony) => ceremony.action === "donor-tier")
    .sort((a, b) => b.at - a.at)[0];
  const activeMilestone = freshCeremonies
    .filter(
      (ceremony) =>
        ceremony.action === "milestone" ||
        ceremony.action === "audience-milestone",
    )
    .sort((a, b) => b.at - a.at)[0];
  const audienceAge =
    state?.audience.updatedAt != null
      ? currentTime - state.audience.updatedAt
      : Infinity;
  const audienceFresh =
    !!state &&
    client.connected &&
    state.connector.state === "connected" &&
    audienceAge >= 0 &&
    audienceAge <= 30000 &&
    state.audience.current !== null;
  const audienceLabel = audienceFresh
    ? `${state!.audience.current!.toLocaleString("vi-VN")} người xem`
    : "Đang chờ số người xem";

  const activeAction = freshCeremonies
    .slice()
    .reverse()
    .find((c) => c.action in actionLabels);
  const eventAnnouncement = bestAnnouncement;
  const eventKind = activeTierUp
    ? "tier-up"
    : activeTribulation
      ? "ceremony"
      : eventAnnouncement?.kind === "gift"
      ? "gift"
      : activeMilestone ||
          eventAnnouncement?.kind === "audience-milestone" ||
          eventAnnouncement?.kind === "breakthrough"
        ? "milestone"
        : eventAnnouncement
          ? "community"
          : activeAction
            ? "action"
            : "quiet";
  const activeCeremony =
    activeTierUp ?? activeTribulation ?? activeMilestone ?? activeAction;
  let eventTitle = "";
  let eventText = "";
  if (activeTierUp) {
    eventTitle = activeTierUp.name;
    eventText = `Phong ${activeTierUp.realmName ?? "Ân Công"} · linh khí tăng tiến!`;
  } else if (activeTribulation) {
    eventTitle = activeTribulation.name;
    eventText =
      activeTribulation.action === "tribulation-success"
        ? `Chúc mừng! Đột phá ${activeTribulation.realmName ?? "cảnh giới mới"}!`
        : "Hộ trận cản lôi · +20% cơ duyên";
  } else if (eventAnnouncement?.kind === "gift") {
    eventTitle = "Lễ vật dâng tặng";
    eventText = eventAnnouncement.text;
  } else if (activeMilestone) {
    eventTitle = activeMilestone.name;
    eventText =
      activeMilestone.action === "audience-milestone"
        ? `${activeMilestone.count.toLocaleString("vi-VN")} đệ tử đồng đạo`
        : "Chân khí môn phái thăng hoa";
  } else if (eventAnnouncement) {
    eventTitle = "Truyền âm Võ Đang";
    eventText = eventAnnouncement.text;
  } else if (activeAction) {
    eventTitle = activeAction.name;
    eventText = `${actionLabels[activeAction.action as Action]}${activeAction.realmName ? ` · ${activeAction.realmName}` : ""}`;
  }
  const connectionLabel =
    state?.connector.mode === "tiktok"
      ? !client.connected
        ? "Mất kết nối"
        : {
            connected: "TikTok LIVE",
            connecting: "Đang kết nối",
            disconnected: "Mất kết nối",
            error: "Lỗi kết nối",
          }[state.connector.state]
      : "Mô phỏng";

  return (
    <div
      className={`temple-stage ${preview ? "is-preview" : ""} ${overlay ? "is-overlay" : ""}`}
      aria-label="Không gian Võ Đang Kim Đỉnh"
    >
      <div ref={parent} className="game-canvas" />
      <div className="temple-vignette" />
      <div className="stream-hud" data-testid="stream-hud">
        <div className="temple-top">
          <span className="temple-mark">
            <Sparkles size={20} /> VÕ ĐANG
          </span>
          <span className="temple-mode">
            <i />
            {connectionLabel}
          </span>
        </div>
        <div className="temple-heading">
          <h2>Võ Đang Sơn</h2>
          <p>Thái Cực sinh lưỡng nghi, vạn kiếm quy tông.</p>
        </div>
        <div className="temple-metrics">
          <span className="temple-attendance">
            <Users size={14} /> {state?.visitors.length ?? 0} đệ tử
            {state && state.visitorOverflow > 0 ? ` +${state.visitorOverflow}` : ""}
          </span>
          <span className="temple-audience" aria-label="Số người xem đồng thời">
            <Eye size={14} />
            <span data-testid="audience-value">{audienceLabel}</span>
          </span>
          <div className="temple-progress">
            <span>Chân Vũ Trận</span>
            <strong data-testid="progress-value">
              {progress.toLocaleString("vi-VN")} /{" "}
              {milestone.toLocaleString("vi-VN")}
            </strong>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Linh khí tông môn"
              aria-valuemin={0}
              aria-valuemax={milestone}
              aria-valuenow={progress}
            >
              <span
                style={{
                  width: `${Math.min(100, (progress / milestone) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
        <section
          className="stream-information"
          data-testid="stream-information"
        >
          <GiftBoard state={state} />
          <p className="stream-comment-guide">
            Bình luận để bái sư · <b>!quyen</b> (<b>!tu</b>) · <b>!kiem</b> (
            <b>!dan</b>) · <b>!dotpha</b> (<b>!dokiep</b>) · <b>!loithe</b> (
            <b>!daotam</b>)
            <span>
              Chỉ xem cũng góp sức: thả tim ♥{" "}
              {(state?.session.hearts.count ?? 0).toLocaleString("vi-VN")}
              {" / "}
              {(state?.session.hearts.goal ?? 100).toLocaleString("vi-VN")}{" "}
              nuôi Chân Vũ Trận · 10 tim = +1 tinh tấn
            </span>
          </p>
        </section>
        <section
          className="stream-events"
          data-testid="stream-events"
          aria-live="polite"
        >
          {!client.connected ? (
            <div className="scene-connection" role="status">
              Đang kết nối lại máy chủ…
            </div>
          ) : eventKind !== "quiet" &&
            !new URLSearchParams(location.search).has("capture") ? (
            eventKind === "community" ? (
              <div
                className="live-announcement"
                role="status"
                key={eventAnnouncement?.id}
              >
                <Sparkles size={19} />
                <span>{eventText}</span>
              </div>
            ) : (
              <div
                className={`offering-note ${eventKind === "tier-up" ? `tier-up tier-${activeTierUp?.intensity ?? 1}` : ""}`}
                key={`${eventKind}-${activeTierUp?.id ?? activeCeremony?.id ?? eventAnnouncement?.id}`}
              >
                <Sparkles size={22} />
                <div>
                  <strong>{eventTitle}</strong>
                  <span
                    data-testid={
                      eventKind === "milestone" &&
                      activeMilestone?.action === "audience-milestone"
                        ? "audience-milestone"
                        : undefined
                    }
                    className={
                      eventKind === "milestone"
                        ? "audience-milestone-banner"
                        : undefined
                    }
                  >
                    {eventText}
                  </span>
                </div>
              </div>
            )
          ) : prayer && clockTick <= prayerSpotlightUntil ? (
            <div className="public-prayer" aria-label="Lời nguyện được duyệt">
              <Heart size={15} />
              <p>
                <span className="vow-excerpt">“{prayer.text}”</span>
                <span className="vow-author">{prayer.userName}</span>
              </p>
            </div>
          ) : null}
        </section>
      </div>
      {!preview && !overlay && (
        <div className="viewer-audio-control">
          <button
            aria-label={audio ? "Tắt âm thanh" : "Bật âm thanh"}
            onClick={async () => {
              if (audio) {
                mutedByUser.current = true;
                await sound.current?.destroy();
                sound.current = new Soundscape();
                setAudio(false);
              } else {
                mutedByUser.current = false;
                try {
                  await sound.current?.enable();
                  setAudio(sound.current?.active ?? false);
                } catch {
                  setError("Trình duyệt chưa cho phép âm thanh. Thử bấm lại.");
                }
              }
            }}
          >
            {audio ? <Volume2 /> : <VolumeX />}
          </button>
          {!audio && <span>Chạm để bật nhạc</span>}
        </div>
      )}
      {error && (
        <p className="scene-notice" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const SectView = TempleView;
