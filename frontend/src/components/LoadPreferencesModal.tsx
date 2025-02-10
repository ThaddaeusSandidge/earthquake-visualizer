import React, { useEffect, useState } from "react";
import { axiosWithAuth } from "@/context/AuthContext";
import type { FilterValues } from "@/types/filters";
import { X, Pencil, Trash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/20/solid";

interface LoadPreferencesModalProps {
  onClose: () => void;
  onLoadPreference: (filters: FilterValues) => void;
}

const LoadPreferencesModal: React.FC<LoadPreferencesModalProps> = ({
  onClose,
  onLoadPreference,
}) => {
  const [preferences, setPreferences] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const token = localStorage.getItem("token");
        const axiosInstance = axiosWithAuth(token);
        const response = await axiosInstance.get(
          `${apiUrl}/api/go/preferences`
        );
        setPreferences(response.data);
      } catch (error) {
        console.error("Error fetching preferences:", error);
      }
    };

    fetchPreferences();
  }, []);

  const deletePreference = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const axiosInstance = axiosWithAuth(token);
      await axiosInstance.delete(`${apiUrl}/api/go/preferences/${id}`);
      setPreferences((prev) => prev.filter((pref) => pref.id !== id));
    } catch (error) {
      console.error("Error deleting preference:", error);
    }
  };

  const loadPreference = (filters: FilterValues) => {
    console.log("Preference clicked:", filters); // Log the preference details
    onLoadPreference(filters);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center backdrop-blur-sm z-50">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-800 text-green-200 p-4 rounded-md shadow-md flex items-center w-96"
          >
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
            <p className="ml-3 text-sm font-medium">
              Preference loaded successfully
            </p>
            <button
              onClick={() => setShowSuccess(false)}
              className="ml-auto text-green-300 hover:text-green-100"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl shadow-lg w-[600px] relative border border-white/10"
      >
        <button onClick={onClose} className="absolute top-2 right-2 text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold tracking-tight text-white text-center mb-6">
          Manage Preferences
        </h2>
        <p className="text-sm text-white/70 text-center mt-1">
          Select a preference to load or manage your saved filters.
        </p>
        <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
          {preferences.length > 0 ? (
            preferences.map((pref) => (
              <motion.div
                key={pref.id}
                whileHover={{
                  y: -2,
                  boxShadow: "0px 4px 12px rgba(255, 255, 255, 0.2)",
                }}
                className="flex items-center justify-between bg-white/10 p-3 rounded-md cursor-pointer hover:bg-white/20"
                onClick={() => loadPreference(pref)}
              >
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {pref.name || "Details:"}
                  </h3>
                  <p className="text-xs text-white/80">
                    Mag {pref.magnitude_min}-{pref.magnitude_max}, Depth{" "}
                    {pref.depth_min}-{pref.depth_max} km
                  </p>
                  <p className="text-xs text-white/80">
                    Start Date: {new Date(pref.time_start).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-white/80">
                    End Date: {new Date(pref.time_end).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePreference(pref.id);
                    }}
                  >
                    <Trash className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <p className="text-sm text-white/70 text-center mt-1">
              No preferences saved. Save a preference to see it here.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LoadPreferencesModal;
