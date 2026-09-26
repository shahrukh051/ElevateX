import { useRouteStore } from "../store/useRouteStore";

const EVENT_LABELS: Record<string, string> = {
  breakdown: "Breakdown",
  new_order: "New order",
  traffic_delay: "Traffic delay",
  window_change: "Window change",
};

export default function ExplanationPanel() {
  // Never sliced or reversed in the store — this feed only ever grows.
  const explanationFeed = useRouteStore((s) => s.explanationFeed);

  return (
    <div className="explanation-panel">
      <h2>Re-optimization log</h2>
      <div className="explanation-panel__feed">
        {explanationFeed.length === 0 && (
          <p className="explanation-panel__empty">Waiting for the first re-optimization…</p>
        )}
        {explanationFeed.map((event) => (
          <article key={event.id} className="explanation-panel__item">
            <div className="explanation-panel__meta">
              <span
                className={`explanation-panel__tag explanation-panel__tag--${event.triggeringEventType}`}
              >
                {EVENT_LABELS[event.triggeringEventType] ?? event.triggeringEventType}
              </span>
              <time dateTime={event.timestamp}>
                {new Date(event.timestamp).toLocaleTimeString()}
              </time>
            </div>
            <p className="explanation-panel__message">{event.message}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
