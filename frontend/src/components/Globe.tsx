import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Earthquake } from "@/types/earthquake";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

// Use environment variable for security
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

type GlobeProps = {
  earthquakes: Earthquake[];
};

const GlobeComponent: React.FC<GlobeProps> = ({ earthquakes }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedEarthquake, setSelectedEarthquake] =
    useState<Earthquake | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/navigation-night-v1",
      center: [0, 0],
      zoom: 1.5,
      projection: { name: "globe" as const },
    });

    map.current.on("load", () => {
      if (!map.current) return;

      // Add atmosphere and stars effects
      map.current.setFog({
        "horizon-blend": 0.0,
        "star-intensity": 0.6,
        "space-color": "#000000",
      });

      // Add earthquake data source
      map.current.addSource("earthquakes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Add earthquake layer with smaller, styled dots
      map.current.addLayer({
        id: "earthquake-circles",
        type: "circle",
        source: "earthquakes",
        paint: {
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "mag"],
            2.5,
            "#3B82F6",
            5.0,
            "#F59E0B",
            7.5,
            "#DC2626",
          ],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "mag"],
            2.5,
            2,
            5.0,
            5,
            7.5,
            10,
          ],
          "circle-opacity": 0.85,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });

      updateEarthquakeData();

      // Click event listener for popups
      map.current.on("click", "earthquake-circles", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;

        setSelectedEarthquake({
          id: feature.id as number,
          magnitude: feature.properties?.mag,
          place: feature.properties?.place,
          latitude: (feature.geometry as GeoJSON.Point).coordinates[1],
          longitude: (feature.geometry as GeoJSON.Point).coordinates[0],
          depth: feature.properties?.depth,
          time: new Date(feature.properties?.time).toISOString(),
          alert: feature.properties?.alert || "N/A",
          tsunami: feature.properties?.tsunami || 0,
          url: feature.properties?.url || "#",
        });
      });

      // Change cursor on hover
      map.current.on("mouseenter", "earthquake-circles", () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer";
      });
      map.current.on("mouseleave", "earthquake-circles", () => {
        if (map.current) map.current.getCanvas().style.cursor = "";
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Function to update earthquake data on the map
  const updateEarthquakeData = () => {
    if (!map.current) return;

    const geojson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
      type: "FeatureCollection",
      features: earthquakes.map((quake) => ({
        type: "Feature",
        id: quake.id,
        properties: {
          mag: quake.magnitude,
          place: quake.place,
          depth: quake.depth,
          time: quake.time,
          alert: quake.alert,
          tsunami: quake.tsunami,
          url: quake.url,
        },
        geometry: {
          type: "Point",
          coordinates: [quake.longitude, quake.latitude],
        },
      })),
    };

    if (map.current.getSource("earthquakes")) {
      (map.current.getSource("earthquakes") as mapboxgl.GeoJSONSource).setData(
        geojson
      );
    }
  };

  // Update map when earthquake data changes
  useEffect(() => {
    updateEarthquakeData();
  }, [earthquakes]);

  return (
    <div ref={mapContainer} className="w-full h-screen relative">
      <AnimatePresence>
        {selectedEarthquake && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-10 left-0 ml-4 transform bg-white/10 backdrop-blur-sm p-6 rounded-2xl shadow-lg w-[400px] border border-white/20"
          >
            <button
              onClick={() => setSelectedEarthquake(null)}
              className="absolute top-2 right-2 text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold tracking-tight text-white text-center mb-4">
              Earthquake Details
            </h2>
            <p className="text-sm text-white/80 text-center mb-3">
              {selectedEarthquake.place}
            </p>
            <div className="text-white space-y-2 text-sm">
              <p>
                <strong>Magnitude:</strong> {selectedEarthquake.magnitude}
              </p>
              <p>
                <strong>Depth:</strong> {selectedEarthquake.depth} km
              </p>
              <p>
                <strong>Latitude:</strong> {selectedEarthquake.latitude}
              </p>
              <p>
                <strong>Longitude:</strong> {selectedEarthquake.longitude}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(selectedEarthquake.time).toLocaleString()}
              </p>
              <p>
                <strong>Alert:</strong>{" "}
                <span className="capitalize">{selectedEarthquake.alert}</span>
              </p>
              <p>
                <strong>Tsunami:</strong>{" "}
                {selectedEarthquake.tsunami ? "Yes" : "No"}
              </p>
            </div>
            <div className="mt-4 text-center">
              <a
                href={selectedEarthquake.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 text-sm hover:underline"
              >
                View More Details
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobeComponent;
