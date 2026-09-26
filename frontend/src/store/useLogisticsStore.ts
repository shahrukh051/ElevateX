import { create } from "zustand";

export interface Parcel {
  id: string;
  orderId: string;
  description: string;
  weight: string;
  destination: string;
  destinationLat: number;
  destinationLng: number;
  status: "pending" | "in_transit" | "delivered" | "reassigned";
  priority: "normal" | "high";
  estimatedDelivery: string;
  customer: string;
  vehicleId: string | null;
  originalVehicleId?: string;
}

export interface NearbyCandidate {
  id: string;
  name: string;
  avatar: string;
  distanceKm: number;
  vehicleType: string;
}

export interface AccidentEvent {
  id: string;
  vehicleId: string;
  lat: number;
  lng: number;
  timestamp: string;
  nearbyVehicles: string[];
  nearbyCandidates: NearbyCandidate[];
  reassignedTo: string | null;
  parcelsCount: number;
  status: "active" | "resolving" | "resolved";
}

export interface DriverProfile {
  id: string;
  name: string;
  avatar: string;
  vehicleType: string;
  plate: string;
  phone: string;
  rating: string;
  completedTrips: number;
  originHub: string;
  destHub: string;
}

export const DRIVER_PROFILES: Record<string, DriverProfile> = {
  "V-01": {
    id: "V-01",
    name: "Rajesh Sharma",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces",
    vehicleType: "Tata Ace Electric Van",
    plate: "RJ 14 GA 3218",
    phone: "+91 98290 14820",
    rating: "4.92",
    completedTrips: 1240,
    originHub: "MI Road Central Warehouse",
    destHub: "Malviya Nagar Sector 4",
  },
  "V-02": {
    id: "V-02",
    name: "Priya Meena",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&h=120&fit=crop&crop=faces",
    vehicleType: "Mahindra Treo EV Van",
    plate: "RJ 14 EA 9921",
    phone: "+91 94140 33819",
    rating: "4.88",
    completedTrips: 980,
    originHub: "Sindhi Camp Logistics Hub",
    destHub: "Vaishali Nagar Amrapali",
  },
  "V-03": {
    id: "V-03",
    name: "Vikram Singh",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces",
    vehicleType: "Hero Electric Cargo Bike",
    plate: "RJ 14 CJ 5510",
    phone: "+91 98281 77312",
    rating: "4.96",
    completedTrips: 1520,
    originHub: "Mansarovar Sector 5 Depot",
    destHub: "Gopalpura Bypass Crossing",
  },
  "V-04": {
    id: "V-04",
    name: "Neha Yadav",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&fit=crop&crop=faces",
    vehicleType: "Piaggio Ape E-City Delivery",
    plate: "RJ 14 TC 1042",
    phone: "+91 98292 90114",
    rating: "4.85",
    completedTrips: 840,
    originHub: "Civil Lines Freight Center",
    destHub: "C-Scheme Ashok Marg",
  },
  "V-05": {
    id: "V-05",
    name: "Imran Khan",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces",
    vehicleType: "Tata Intra V30 Cargo",
    plate: "RJ 14 LA 8871",
    phone: "+91 94141 62901",
    rating: "4.79",
    completedTrips: 2100,
    originHub: "Sitapura Industrial Area",
    destHub: "Jagatpura Mahal Road",
  },
  "V-06": {
    id: "V-06",
    name: "Kavita Saini",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=faces",
    vehicleType: "Ather 450X Express Delivery",
    plate: "RJ 14 EV 4419",
    phone: "+91 98293 88120",
    rating: "4.91",
    completedTrips: 1110,
    originHub: "Tonk Road Distribution",
    destHub: "Pratap Nagar Sector 8",
  },
  "V-07": {
    id: "V-07",
    name: "Deepak Verma",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&h=120&fit=crop&crop=faces",
    vehicleType: "Ashok Leyland Bada Dost",
    plate: "RJ 14 KA 7731",
    phone: "+91 94142 55904",
    rating: "4.83",
    completedTrips: 790,
    originHub: "Ajmer Road 200ft Bypass",
    destHub: "Vidhyadhar Nagar Sector 2",
  },
  "V-08": {
    id: "V-08",
    name: "Sunita Joshi",
    avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=120&h=120&fit=crop&crop=faces",
    vehicleType: "TVS iQube Electric Scooter",
    plate: "RJ 14 MX 2098",
    phone: "+91 98294 11209",
    rating: "4.89",
    completedTrips: 630,
    originHub: "Bani Park Express Station",
    destHub: "Jhotwara Industrial Zone",
  },
};

export function getDriverProfile(vehicleId: string): DriverProfile {
  if (DRIVER_PROFILES[vehicleId]) {
    return DRIVER_PROFILES[vehicleId];
  }
  return {
    id: vehicleId,
    name: `Driver ${vehicleId}`,
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=faces",
    vehicleType: "Electric Delivery Van",
    plate: `RJ 14 ${vehicleId.replace("-", "")}`,
    phone: "+91 98290 00000",
    rating: "4.85",
    completedTrips: 850,
    originHub: "Jaipur Central Depot",
    destHub: "Malviya Nagar",
  };
}

export interface LogisticsState {
  parcels: Parcel[];
  accidentEvents: AccidentEvent[];
  selectedVehicleId: string | null;
  activePageTab: "track" | "fleet" | "orders" | "disruptions";

  setSelectedVehicle: (id: string | null) => void;
  setActivePage: (page: "track" | "fleet" | "orders" | "disruptions") => void;
  triggerAccident: (
    vehicleId: string,
    vehicleLat: number,
    vehicleLng: number,
    allVehicles: Array<{ id: string; currentLat: number; currentLng: number; status: string }>
  ) => AccidentEvent | null;
  reassignToVehicle: (fromVehicleId: string, toVehicleId: string) => void;
  resolveAccident: (eventId: string) => void;
  clearAccidents: () => void;
}

// Jaipur delivery locations
const JAIPUR_LOCATIONS = [
  { name: "Malviya Nagar Sector 4", lat: 26.8530, lng: 75.8135 },
  { name: "Vaishali Nagar Amrapali Circle", lat: 26.9023, lng: 75.7388 },
  { name: "Mansarovar Shipra Path", lat: 26.8572, lng: 75.7672 },
  { name: "Jagatpura Mahal Road", lat: 26.8048, lng: 75.8657 },
  { name: "Tonk Road Vasundhara Colony", lat: 26.8363, lng: 75.8108 },
  { name: "Ajmer Road 200ft Bypass", lat: 26.9157, lng: 75.7336 },
  { name: "Civil Lines Metro Station", lat: 26.9124, lng: 75.8073 },
  { name: "MI Road Ganpati Plaza", lat: 26.9197, lng: 75.8197 },
  { name: "Sitapura RIICO Industrial Area", lat: 26.7934, lng: 75.8654 },
  { name: "Sanganer Airport Enclave", lat: 26.8298, lng: 75.8000 },
  { name: "C-Scheme Ahinsa Circle", lat: 26.9028, lng: 75.8010 },
  { name: "Bani Park Collectorate Circle", lat: 26.9248, lng: 75.7997 },
  { name: "Jhotwara Elevated Road", lat: 26.9648, lng: 75.7699 },
  { name: "Shyam Nagar Janpath", lat: 26.9351, lng: 75.7793 },
  { name: "Pratap Nagar Sector 8 Market", lat: 26.8402, lng: 75.7860 },
  { name: "Vidhyadhar Nagar Sector 2", lat: 26.9596, lng: 75.8180 },
  { name: "Gopalpura Bypass Crossing", lat: 26.8682, lng: 75.7720 },
  { name: "Sindhi Camp Bus Terminal", lat: 26.9234, lng: 75.8091 },
];

const CUSTOMERS = [
  "Rahul Sharma", "Priya Meena", "Ajay Singh", "Sunita Yadav",
  "Mohit Agarwal", "Kavya Gupta", "Deepak Joshi", "Neha Kumawat",
  "Vijay Verma", "Rekha Mathur", "Suresh Bansal", "Anita Saxena",
];

const DESCRIPTIONS = [
  "Electronics & Gadgets", "Premium Apparel Box", "Urgent Medicine Supply", "Fresh Gourmet Groceries",
  "Tech Accessories", "Smart Home Devices", "Cosmetics Hamper", "Sports Gear Pack",
  "Retail Merchandise", "Fragile Glassware Kit", "Automotive Components", "Priority Legal Documents",
];

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function generateParcels(vehicleIds: string[]): Parcel[] {
  const parcels: Parcel[] = [];
  let parcelCount = 0;

  vehicleIds.forEach((vehicleId, vIdx) => {
    const count = 3 + (vIdx % 3);
    for (let i = 0; i < count; i++) {
      parcelCount++;
      const loc = JAIPUR_LOCATIONS[(parcelCount * 3 + vIdx) % JAIPUR_LOCATIONS.length];
      const eta = new Date(Date.now() + (25 + parcelCount * 10) * 60000);
      parcels.push({
        id: `PKG-${String(parcelCount).padStart(4, "0")}`,
        orderId: `CR-JPR-${String(100 + parcelCount)}`,
        description: DESCRIPTIONS[parcelCount % DESCRIPTIONS.length],
        weight: `${(0.8 + (parcelCount % 8) * 0.4).toFixed(1)} kg`,
        destination: loc.name,
        destinationLat: loc.lat,
        destinationLng: loc.lng,
        status: parcelCount % 6 === 0 ? "pending" : "in_transit",
        priority: parcelCount % 4 === 0 ? "high" : "normal",
        estimatedDelivery: eta.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " IST",
        customer: CUSTOMERS[(parcelCount + vIdx) % CUSTOMERS.length],
        vehicleId,
      });
    }
  });

  return parcels;
}

export const useLogisticsStore = create<LogisticsState>((set, get) => ({
  parcels: [],
  accidentEvents: [],
  selectedVehicleId: null,
  activePageTab: "track",

  setSelectedVehicle: (id) => set({ selectedVehicleId: id }),
  setActivePage: (page) => set({ activePageTab: page }),

  triggerAccident: (vehicleId, vehicleLat, vehicleLng, allVehicles) => {
    const otherVehicles = allVehicles.filter(
      (v) => v.id !== vehicleId && v.status === "active"
    );

    if (otherVehicles.length === 0) return null;

    const sorted = otherVehicles
      .map((v) => {
        const dist = haversineDistance(vehicleLat, vehicleLng, v.currentLat, v.currentLng);
        const profile = getDriverProfile(v.id);
        return {
          id: v.id,
          name: profile.name,
          avatar: profile.avatar,
          distanceKm: parseFloat(dist.toFixed(2)),
          vehicleType: profile.vehicleType,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const nearbyCandidates = sorted.slice(0, Math.min(4, sorted.length));
    const nearest = nearbyCandidates[0];

    const { parcels } = get();
    const affectedParcels = parcels.filter((p) => p.vehicleId === vehicleId && p.status === "in_transit");

    const event: AccidentEvent = {
      id: `ACC-${Date.now()}`,
      vehicleId,
      lat: vehicleLat,
      lng: vehicleLng,
      timestamp: new Date().toISOString(),
      nearbyVehicles: nearbyCandidates.map((v) => v.id),
      nearbyCandidates,
      reassignedTo: nearest ? nearest.id : null,
      parcelsCount: affectedParcels.length,
      status: "active",
    };

    set((state) => ({
      accidentEvents: [event, ...state.accidentEvents],
      selectedVehicleId: vehicleId,
    }));

    return event;
  },

  reassignToVehicle: (fromVehicleId, toVehicleId) => {
    set((state) => {
      const updatedParcels = state.parcels.map((p) =>
        p.vehicleId === fromVehicleId && (p.status === "in_transit" || p.status === "pending")
          ? {
              ...p,
              vehicleId: toVehicleId,
              originalVehicleId: fromVehicleId,
              status: "reassigned" as const,
            }
          : p
      );

      const updatedEvents = state.accidentEvents.map((e) =>
        e.vehicleId === fromVehicleId
          ? { ...e, reassignedTo: toVehicleId, status: "resolving" as const }
          : e
      );

      return {
        parcels: updatedParcels,
        accidentEvents: updatedEvents,
        selectedVehicleId: toVehicleId,
      };
    });
  },

  resolveAccident: (eventId) =>
    set((state) => ({
      accidentEvents: state.accidentEvents.map((e) =>
        e.id === eventId ? { ...e, status: "resolved" } : e
      ),
    })),

  clearAccidents: () => set({ accidentEvents: [] }),
}));

export function seedParcels(vehicleIds: string[]) {
  useLogisticsStore.setState({ parcels: generateParcels(vehicleIds) });
}
