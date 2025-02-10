export type Earthquake = {
  id: number;
  time: string; // ISO string format
  latitude: number;
  longitude: number;
  depth: number;
  magnitude: number;
  place: string;
  alert: string;
  tsunami: number;
  url: string;
};
