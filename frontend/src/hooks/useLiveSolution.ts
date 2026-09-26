import { useCallback, useEffect, useRef } from "react";
import { useRouteStore } from "../store/useRouteStore";
import type { ClientMessage, ServerMessage } from "../types";

const RECONNECT_DELAY_MS = 2500;

function getWebSocketUrl(): string {
  const envUrl = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
  if (
    envUrl &&
    envUrl !== "wss:///ws" &&
    envUrl !== "ws:///ws" &&
    !envUrl.includes("${")
  ) {
    return envUrl;
  }

  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "ws://localhost:8000/ws";
    }
    const isHttps = window.location.protocol === "https:";
    const protocol = isHttps ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  }

  return "ws://localhost:8000/ws";
}

/**
 * Owns the WebSocket connection to the routing backend: connects, parses every
 * incoming ServerMessage into the store, reconnects on drop, and exposes
 * sendMessage for components that need to trigger disruption events.
 */
export function useLiveSolution() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const setInitialState = useRouteStore((s) => s.setInitialState);
  const applySolutionUpdate = useRouteStore((s) => s.applySolutionUpdate);
  const updateVehiclePosition = useRouteStore((s) => s.updateVehiclePosition);
  const setConnectionStatus = useRouteStore((s) => s.setConnectionStatus);
  const addPendingStop = useRouteStore((s) => s.addPendingStop);

  const connect = useCallback(() => {
    setConnectionStatus("connecting");
    let ws: WebSocket;

    try {
      const url = getWebSocketUrl();
      ws = new WebSocket(url);
    } catch (err) {
      console.warn("useLiveSolution: unable to construct WebSocket", err);
      setConnectionStatus("closed");
      if (!unmountedRef.current) {
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("open");
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data) as ServerMessage;
      } catch (err) {
        console.error("useLiveSolution: could not parse server message", err, event.data);
        return;
      }

      switch (message.type) {
        case "initial_state":
          setInitialState(message.stops, message.vehicles, message.solution);
          break;
        case "solution_update":
          applySolutionUpdate(message.solution, message.explanation);
          break;
        case "vehicle_position":
          updateVehiclePosition(message.vehicleId, message.lat, message.lng, message.bearing);
          break;
        default:
          console.warn("useLiveSolution: unknown message type", message);
      }
    };

    ws.onclose = () => {
      // StrictMode can immediately replace a just-closed development socket.
      // An older socket must not clear or reconnect over the newer one.
      if (wsRef.current !== ws) return;
      setConnectionStatus("closed");
      wsRef.current = null;
      if (!unmountedRef.current) {
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
    };
  }, [applySolutionUpdate, setConnectionStatus, setInitialState, updateVehiclePosition]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      const ws = wsRef.current;
      wsRef.current = null;
      try {
        ws?.close();
      } catch {
        // ignore
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (message.type === "trigger_new_order") addPendingStop(message.stop);
      ws.send(JSON.stringify(message));
    } else {
      console.warn("useLiveSolution: socket not open, dropped message", message);
    }
  }, [addPendingStop]);

  return { sendMessage };
}
