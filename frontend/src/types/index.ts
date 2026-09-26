export interface Stop {
  id: string;
  lat: number;
  lng: number;
  timeWindowStart: string; // ISO
  timeWindowEnd: string; // ISO
  priority: "normal" | "high";
  demand: number;
  unassigned?: boolean;
}

export interface Vehicle {
  id: string;
  capacity: number;
  status: "active" | "unavailable";
  currentLat: number;
  currentLng: number;
  bearing?: number;
}

export interface RouteAssignment {
  vehicleId: string;
  stopIds: string[];
  polyline: string; // encoded Google polyline
}

export interface Solution {
  routes: RouteAssignment[];
  timestamp: string;
  unassignedStopIds: string[];
}

export interface ExplanationEvent {
  id: string;
  message: string;
  timestamp: string;
  triggeringEventType: "breakdown" | "new_order" | "traffic_delay" | "window_change";
}

// WebSocket messages from backend (discriminated union)
export type ServerMessage =
  | { type: "solution_update"; solution: Solution; explanation: ExplanationEvent }
  | { type: "vehicle_position"; vehicleId: string; lat: number; lng: number; bearing?: number }
  | { type: "initial_state"; stops: Stop[]; vehicles: Vehicle[]; solution: Solution };

// Messages sent to backend to trigger events
export type ClientMessage =
  | { type: "trigger_breakdown"; vehicleId: string }
  | { type: "trigger_new_order"; stop: Omit<Stop, "id"> }
  | { type: "trigger_traffic_delay"; segmentFrom: string; segmentTo: string; multiplier: number }
  | { type: "trigger_window_change"; stopId: string; newStart: string; newEnd: string };
