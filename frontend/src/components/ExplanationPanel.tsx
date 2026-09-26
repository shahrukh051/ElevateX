import { useRouteStore } from "../store/useRouteStore";

const EVENT_LABELS: Record<string, string> = {
  breakdown:     "Breakdown",
  new_order:     "New Order",
  traffic_delay: "Traffic Delay",
  window_change: "Window Change",
};

export default function ExplanationPanel() {
  const explanationFeed = useRouteStore((s) => s.explanationFeed);

  return (
    <div className="explanation-panel">
      <div className="explanation-panel__feed">
        {explanationFeed.length === 0 && (
          <p className="explanation-panel__empty">
            Waiting for the first re-optimization…
          </p>
        )}
        {explanationFeed.map((event) => (
          <article
            key={event.id}
            className={`ep-item ep-item--${event.triggeringEventType}`}
          >
            <div className="ep-item__meta">
              <span className="ep-item__tag">
                {EVENT_LABELS[event.triggeringEventType] ?? event.triggeringEventType}
              </span>
              <time className="ep-item__time" dateTime={event.timestamp}>
                {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </time>
            </div>
            <p className="ep-item__message">{event.message}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
