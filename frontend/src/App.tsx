import { useLiveSolution } from "./hooks/useLiveSolution";
import { useRouteStore } from "./store/useRouteStore";
import MapView from "./components/MapView";
import VehicleList from "./components/VehicleList";
import EventControls from "./components/EventControls";
import ExplanationPanel from "./components/ExplanationPanel";
import "./App.css";

const STATUS_LABEL: Record<string, string> = {
  connecting: "Connecting…",
  open: "Live",
  closed: "Disconnected — retrying",
};

export default function App() {
  const { sendMessage } = useLiveSolution();
  const connectionStatus = useRouteStore((s) => s.connectionStatus);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Last-Mile Route Control</h1>
        <span className={`app__status app__status--${connectionStatus}`}>
          <span className="app__status-dot" />
          {STATUS_LABEL[connectionStatus]}
        </span>
      </header>

      <div className="app__body">
        <aside className="app__sidebar app__sidebar--left">
          <VehicleList />
          <EventControls sendMessage={sendMessage} />
        </aside>

        <main className="app__map">
          <MapView />
        </main>

        <aside className="app__sidebar app__sidebar--right">
          <ExplanationPanel />
        </aside>
      </div>
    </div>
  );
}
