import React, { useEffect, useState } from "react";
import { FiCloud, FiSettings, FiFilter } from "react-icons/fi";
import type { FilterValues } from "@/types/filters";
import { axiosWithAuth } from "@/context/AuthContext";
import { Earthquake } from "@/types/earthquake";

type EarthquakeFiltersProps = {
  filters: FilterValues;
  onFilterChange: (newFilters: FilterValues) => void;
  openPreferences: () => void;
  onEarthquakesChange: (earthquakes: Earthquake[]) => void; // New prop
};

const EarthquakeFilters: React.FC<EarthquakeFiltersProps> = ({
  filters,
  onFilterChange,
  onEarthquakesChange,
  openPreferences,
}) => {
  const [localFilters, setLocalFilters] = useState<FilterValues>({
    ...filters,
    time_start: new Date(filters.time_start),
    time_end: new Date(filters.time_end),
  });

  useEffect(() => {
    console.log("Received filters:", filters);
    setLocalFilters({
      ...filters,
      time_start: new Date(filters.time_start),
      time_end: new Date(filters.time_end),
    });
  }, [filters]);

  const updateFilters = (newFilters: Partial<FilterValues>) => {
    const updatedFilters = Object.fromEntries(
      Object.entries({ ...localFilters, ...newFilters }).filter(
        ([_, value]) => value !== undefined
      )
    ) as unknown as FilterValues;
    setLocalFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const fetchEarthquakes = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("No token found, skipping earthquake fetch.");
        return;
      }

      const axiosInstance = axiosWithAuth(token);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await axiosInstance.get(`${apiUrl}/api/go/earthquakes`, {
        params: {
          time_start: localFilters.time_start.toISOString(),
          time_end: localFilters.time_end.toISOString(),
          depth_min: localFilters.depth_min,
          depth_max: localFilters.depth_max,
          magnitude_min: localFilters.magnitude_min,
          magnitude_max: localFilters.magnitude_max,
          longitude_min: localFilters.longitude_min,
          longitude_max: localFilters.longitude_max,
          latitude_min: localFilters.latitude_min,
          latitude_max: localFilters.latitude_max,
        },
      });

      console.log("Fetched Earthquakes:", response.data);
      onEarthquakesChange(response.data); // Pass the data up
    } catch (error) {
      console.error("Error fetching earthquake data:", error);
    }
  };

  useEffect(() => {
    fetchEarthquakes(); // Fetch on mount
  }, []);

  const savePreferences = async () => {
    try {
      const token = localStorage.getItem("token");
      const axiosInstance = axiosWithAuth(token);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      await axiosInstance.post(`${apiUrl}/api/go/preferences`, {
        ...localFilters,
        time_start: localFilters.time_start.toISOString(),
        time_end: localFilters.time_end.toISOString(),
      });

      alert("Preferences saved successfully!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("Error saving preferences.");
    }
  };

  return (
    <div className="absolute top-4 right-4 w-96 bg-white/5 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/10">
      <h2 className="text-2xl font-bold tracking-tight text-white text-center mb-6">
        Filter Earthquakes
      </h2>
      {/* Date Range */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-white mb-2">
          Start Date
        </label>
        <input
          type="date"
          value={localFilters.time_start.toISOString().split("T")[0]}
          min="2020-01-01"
          max={localFilters.time_end.toISOString().split("T")[0]}
          onChange={(e) =>
            updateFilters({ time_start: new Date(e.target.value) })
          }
          className="block w-full rounded-md bg-white/10 px-3 py-1.5 text-white"
        />
        <label className="block text-sm font-medium text-white mt-4 mb-2">
          End Date
        </label>
        <input
          type="date"
          value={localFilters.time_end.toISOString().split("T")[0]}
          min={localFilters.time_start.toISOString().split("T")[0]}
          max={new Date().toISOString().split("T")[0]}
          onChange={(e) =>
            updateFilters({ time_end: new Date(e.target.value) })
          }
          className="block w-full rounded-md bg-white/10 px-3 py-1.5 text-white"
        />
      </div>
      {/* Range Filters */}
      {[
        {
          label: "Depth Range (km)",
          key: "depth",
          min: 0,
          max: 800,
          step: 1,
          minValue: localFilters.depth_min,
          maxValue: localFilters.depth_max,
        },
        {
          label: "Magnitude Range",
          key: "magnitude",
          min: 0,
          max: 9,
          step: 0.1,
          minValue: localFilters.magnitude_min,
          maxValue: localFilters.magnitude_max,
        },
        {
          label: "Longitude Range",
          key: "longitude",
          min: -180,
          max: 180,
          step: 1,
          minValue: localFilters.longitude_min,
          maxValue: localFilters.longitude_max,
        },
        {
          label: "Latitude Range",
          key: "latitude",
          min: -90,
          max: 90,
          step: 1,
          minValue: localFilters.latitude_min,
          maxValue: localFilters.latitude_max,
        },
      ].map(({ label, key, min, max, step, minValue, maxValue }, idx) => (
        <div className="mb-6" key={idx}>
          <label className="block text-sm font-medium text-white mb-2">
            {label}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white">Min</span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={minValue}
              onChange={(e) =>
                updateFilters({ [`${key}_min`]: Number(e.target.value) })
              }
              className="w-full accent-indigo-500"
            />
            <span className="text-xs text-white">Max</span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={maxValue}
              onChange={(e) =>
                updateFilters({ [`${key}_max`]: Number(e.target.value) })
              }
              className="w-full accent-indigo-500"
            />
          </div>
          <div className="flex justify-between text-xs text-white mt-1">
            <span>{minValue.toFixed(1)}</span>
            <span>{maxValue.toFixed(1)}</span>
          </div>
        </div>
      ))}
      {/* Apply Filters Button */}
      <div className="mt-6">
        <button
          onClick={fetchEarthquakes}
          className="w-full flex items-center justify-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400"
        >
          <FiFilter className="mr-2" /> Apply Filters
        </button>
      </div>
      {/* Preferences Buttons */}
      <div className="mt-4 flex space-x-4">
        <button
          onClick={savePreferences}
          className="flex-1 flex items-center justify-center rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
        >
          <FiCloud className="mr-2" /> Save Preferences
        </button>
        <button
          onClick={openPreferences}
          className="flex-1 flex items-center justify-center rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
        >
          <FiSettings className="mr-2" /> Load Preferences
        </button>
      </div>
    </div>
  );
};

export default EarthquakeFilters;
