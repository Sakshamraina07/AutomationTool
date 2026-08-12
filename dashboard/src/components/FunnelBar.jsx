// Funnel: Sent → Delivered → Opened → Replied → Interview, with % drop per stage.
export default function FunnelBar({ funnel }) {
  const max = Math.max(1, ...funnel.map((s) => s.count));
  const top = funnel[0]?.count || 0;
  return (
    <div>
      {funnel.map((stage) => {
        const pctOfTop = top > 0 ? Math.round((stage.count / top) * 100) : 0;
        return (
          <div className="funnel-row" key={stage.stage}>
            <div className="funnel-label">{stage.stage}</div>
            <div className="funnel-track">
              <div className="funnel-fill" style={{ width: `${(stage.count / max) * 100}%` }} />
              <div className="funnel-count">{stage.count}</div>
            </div>
            <div className="funnel-pct">{pctOfTop}%</div>
          </div>
        );
      })}
    </div>
  );
}
