import {
  type LeaderboardEntry,
  type Snapshot,
} from "../../../packages/shared/src/index.ts";

function LeaderboardRows({
  entries,
  limit = 5,
}: {
  entries: LeaderboardEntry[];
  limit?: number;
}) {
  if (!entries.length) {
    return (
      <p className="thanks-empty">
        Chưa có ai lên bảng · gửi Hoa Hồng 🌹 hoặc gõ !quyen để ghi danh.
      </p>
    );
  }
  return (
    <ol className="thanks-list">
      {entries.slice(0, limit).map((entry, index) => (
        <li key={entry.userId}>
          <span className="thanks-rank">{index + 1}</span>
          <span className="thanks-name">{entry.userName}</span>
          <strong>{entry.score.toLocaleString("vi-VN")}</strong>
        </li>
      ))}
    </ol>
  );
}

const GIFT_TILES = [
  { icon: "🌹", name: "Hoa Hồng", note: "+1 sức mạnh" },
  { icon: "🫰", name: "Tim Ngón Tay", note: "+5 sức mạnh" },
  { icon: "🍩", name: "Bánh Vòng", note: "+30 · Đá Đột Phá" },
] as const;

/** Fixed stream boards: top gift contributors, and a separate frame of gift icons */
export function GiftBoard({ state }: { state?: Snapshot }) {
  const gifts = state?.session.gifts ?? [];
  return (
    <>
      <section className="stream-thanks" aria-label="Bảng công trạng">
        <div className="stream-thanks-heading">
          <strong>Bảng Công Trạng</strong>
          <span>Sức mạnh</span>
        </div>
        {gifts.length ? (
          <LeaderboardRows limit={3} entries={gifts} />
        ) : (
          <p className="thanks-empty">Chưa có ai lên bảng, hãy là người đầu tiên!</p>
        )}
      </section>
      <section className="stream-thanks gift-guide" aria-label="Gửi quà">
        <div className="stream-thanks-heading">
          <strong>Gửi quà tăng sức mạnh</strong>
          <span>Đá đột phá</span>
        </div>
        <ul className="gift-tiles">
          {GIFT_TILES.map((gift) => (
            <li key={gift.name}>
              <span className="gift-icon" aria-hidden="true">
                {gift.icon}
              </span>
              <b>{gift.name}</b>
              <small>{gift.note}</small>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export function AdminLeaderboards({ state }: { state?: Snapshot }) {
  const realms = state?.realms ?? [];

  return (
    <section
      className="panel admin-thanks"
      aria-labelledby="admin-thanks-title"
    >
      <div className="panel-heading">
        <h2 id="admin-thanks-title">Võ Đang Bảng Phiên LIVE</h2>
        <span className="tag">
          {state?.session.source === "tiktok" ? "TikTok LIVE" : "Mô phỏng"}
        </span>
      </div>
      <p className="description">
        Phiên bắt đầu{" "}
        {state
          ? new Date(state.session.startedAt).toLocaleString("vi-VN")
          : "—"}
        . Điểm cống hiến tính theo điểm lễ vật và công phu rèn luyện đã cấu
        hình.
      </p>
      <div className="admin-thanks-columns">
        <div>
          <h3>Công huân · lễ vật</h3>
          <LeaderboardRows entries={state?.session.gifts ?? []} />
        </div>
        <div>
          <h3>Tinh tấn · quyền kiếm</h3>
          <LeaderboardRows entries={state?.session.participation ?? []} />
        </div>
        <div>
          <h3>Bảng Phong Thần Đạo Hạnh</h3>
          {!realms.length ? (
            <p className="thanks-empty">Chưa có đệ tử nhập bảng.</p>
          ) : (
            <ol className="thanks-list">
              {realms.slice(0, 5).map((entry, idx) => (
                <li key={entry.userId}>
                  <span className="thanks-rank">{idx + 1}</span>
                  <span className="thanks-name">
                    {entry.userName}
                    <small
                      style={{
                        display: "block",
                        fontSize: "11px",
                        color: "#16534e",
                      }}
                    >
                      {entry.realmName} ·{" "}
                      {Math.round(entry.breakthroughChance * 100)}%
                    </small>
                  </span>
                  <strong>{entry.tuVi.toLocaleString("vi-VN")}</strong>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
