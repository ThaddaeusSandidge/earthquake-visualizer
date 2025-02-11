import React, { useState } from "react";
import Globe from "@/components/Globe";
import EarthquakeFilters from "@/components/EarthquakeFilters";
import LoadPreferencesModal from "@/components/LoadPreferencesModal";
import type { FilterValues } from "@/types/filters";
import type { Earthquake } from "@/types/earthquake";

const Home: React.FC = () => {
  const minDate = new Date("2020-01-01");
  const [filters, setFilters] = useState<FilterValues>({
    depth_min: 0,
    depth_max: 800,
    magnitude_min: 0,
    magnitude_max: 9,
    longitude_min: -180,
    longitude_max: 180,
    latitude_min: -90,
    latitude_max: 90,
    time_start: minDate,
    time_end: new Date(),
  });

  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]); // Store earthquakes

  const handleFilterChange = (newFilters: Partial<FilterValues>) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      ...Object.fromEntries(
        Object.entries(newFilters).filter(([_, value]) => value !== undefined)
      ),
    }));
  };
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLoadPreference = (loadedFilters: Partial<FilterValues>) => {
    console.log("Loaded preference received:", loadedFilters);

    setFilters((prevFilters) => ({
      ...prevFilters,
      ...Object.fromEntries(
        Object.entries(loadedFilters).filter(
          ([_, value]) => value !== undefined
        )
      ),
    }));
    setIsModalOpen(false);
  };
  const handleLogout = () => {
    localStorage.removeItem("token");
    console.log("Token removed from local storage");
    window.location.href = "/";
  };
  return (
    <main className="relative flex flex-wrap justify-center items-start min-h-screen bg-gray-100">
      <div className="w-full h-screen relative">
        <div className="absolute top-0 left-0 m-4 z-20">
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-indigo-500 text-indigo-500 bg-transparent rounded"
          >
            <p className="font-semibold text-sm">Logout</p>
          </button>
        </div>

        <Globe earthquakes={earthquakes} />
        <EarthquakeFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onEarthquakesChange={setEarthquakes}
          openPreferences={() => setIsModalOpen(true)}
        />
        {isModalOpen && (
          <LoadPreferencesModal
            onClose={() => setIsModalOpen(false)}
            onLoadPreference={handleLoadPreference}
          />
        )}
      </div>
    </main>
  );
};

export default Home;
