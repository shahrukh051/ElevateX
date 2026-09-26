import { create } from "zustand";
import type { ExplanationEvent, Solution, Stop, Vehicle } from "../types";

export type ConnectionStatus = "connecting" | "open" | "closed";

interface RouteState {
  stops: Stop[];
  vehicles: Vehicle[];
  currentSolution: Solution | null;
  explanationFeed: ExplanationEvent[];
  connectionStatus: ConnectionStatus;
  pendingStopIds: string[];

  setInitialState: (stops: Stop[], vehicles: Vehicle[], solution: Solution) => void;
  applySolutionUpdate: (solution: Solution, explanation: ExplanationEvent) => void;
  updateVehiclePosition: (vehicleId: string, lat: number, lng: number) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  addPendingStop: (stop: Omit<Stop, "id">) => void;
}

/**
 * Single source of truth for everything the map and panels render.
 * Written to exclusively by useLiveSolution as WebSocket messages arrive.
 */
export const useRouteStore = create<RouteState>((set) => ({
  stops: [],
  vehicles: [],
  currentSolution: null,
  explanationFeed: [],
  connectionStatus: "connecting",
  pendingStopIds: [],

  setInitialState: (stops, vehicles, solution) =>
    set({ stops, vehicles, currentSolution: solution }),

  applySolutionUpdate: (solution, explanation) =>
    set((state) => {
      const serverStopId = explanation.message.match(/P-[A-F0-9]+/)?.[0];
      const pendingId = state.pendingStopIds[0];
      return {
        currentSolution: solution,
        // Append-only: newest explanation goes to the front, nothing is ever dropped.
        explanationFeed: [explanation, ...state.explanationFeed],
        pendingStopIds: serverStopId && pendingId ? state.pendingStopIds.slice(1) : state.pendingStopIds,
        stops: serverStopId && pendingId
          ? state.stops.map((stop) => stop.id === pendingId ? { ...stop, id: serverStopId, priority: "high" } : stop)
          : state.stops,
      };
    }),

  updateVehiclePosition: (vehicleId, lat, lng) =>
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehicleId ? { ...v, currentLat: lat, currentLng: lng } : v
      ),
    })),

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  addPendingStop: (stop) => set((state) => {
    const id = `pending-${Date.now()}-${state.pendingStopIds.length}`;
    return { pendingStopIds: [...state.pendingStopIds, id], stops: [...state.stops, { ...stop, id }] };
  }),
}));
