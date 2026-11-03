import {
  DONOR_TIERS,
  type CultivatorSummary,
  type DonorEntry,
  type LeaderboardEntry,
  type Snapshot,
} from "../../../packages/shared/src/index.ts";

type BoardKind = "donors" | "gifts" | "participation" | "realms";

const titles: Record<BoardKind, string> = {
  donors: "Cảm ơn ủng hộ",
  gifts: "Công huân · lễ vật",
  participation: "Tinh tấn · quyền kiếm",
  realms: "Phong thần · đạo hạnh",
};

function LeaderboardRows({
  entries,
  limit = 5,
}: {
  entries: LeaderboardEntry[];
  limit?: number;
}) {
  if (!entries.length) {
    return <p className="thanks-empty">Chưa có lượt ghi nhận trong phiên.</p>;
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

function DonorRows({ donors }: { donors: DonorEntry[] }) {
  if (!donors.length) {
    return <p className="thanks-empty">Chưa có lễ vật trong phiên.</p>;
  }
  return (
    <ol className="thanks-list donor-list">
      {[...donors].reverse().slice(0, 4).map((donor) => {
        const tier = DONOR_TIERS[donor.tier] ?? DONOR_TIERS[0]!;
        return (
          <li key={`${donor.userId}-${donor.at}`}>
            <span className="thanks-rank" style={{ color: tier.color }}>
              ✦
            </span>
            <span className="thanks-name">
              {donor.userName}
              <small className="stream-realm-name" style={{ color: tier.color }}>
                {tier.index > 0 ? tier.name : donor.giftName}
              </small>
            </span>
            <strong>×{donor.count}</strong>
          </li>
        );
      })}
    </ol>
  );
}

function RealmRows({ realms }: { realms: CultivatorSummary[] }) {
  if (!realms.length) {
    return <p className="thanks-empty">Chưa có lượt ghi nhận trong phiên.</p>;
  }
  return (
    <ol className="thanks-list">
      {realms.slice(0, 3).map((cultivator, index) => (
        <li key={cultivator.userId}>
          <span className="thanks-rank">{index + 1}</span>
          <span className="thanks-name">
            {cultivator.userName}
            <small className="stream-realm-name">{cultivator.realmName}</small>
          </span>
          <strong>{cultivator.tuVi.toLocaleString("vi-VN")}</strong>
        </li>
      ))}
    </ol>
  );
}

/** Compact stream board (Thiên Bảng); rotates across 3 views when motion is permitted */
export function StreamThanks({
  state,
  rotation = 0,
}: {
  state?: Snapshot;
  rotation?: number;
}) {
  const kind: BoardKind = (
    ["donors", "gifts", "participation", "realms"] as const
  )[rotation % 4];

  return (
    <section className="stream-thanks" aria-label="Bảng tri ân">
      <div className="stream-thanks-heading">
        <strong>Võ Đang Bảng</strong>
        <span>{titles[kind]}</span>
      </div>
      {kind === "donors" ? (
        <DonorRows donors={state?.session.recentDonors ?? []} />
      ) : kind === "realms" ? (
        <RealmRows realms={state?.realms ?? []} />
      ) : (
        <LeaderboardRows
          limit={3}
          entries={
            kind === "gifts"
              ? (state?.session.gifts ?? [])
              : (state?.session.participation ?? [])
          }
        />
      )}
      <small>
        {state?.session.source === "tiktok"
          ? "Phiên TikTok LIVE"
          : "Phiên mô phỏng"}
      </small>
    </section>
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
