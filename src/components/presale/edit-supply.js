"use client";
import React, { useState } from "react";

export default function EditTotalSupply({ newTotalSupply, setNewTotalSupply, updateTotalSupplyHandler }) {
  const [showEditSection, setShowEditSection] = useState(false);

  return (
    <div className="mb-4">
      {/* Toggle Button */}
      {!showEditSection && (
        <button
          onClick={() => setShowEditSection(true)}
          className="p-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-800 transition-colors w-full">
          Edit Total Supply
        </button>
      )}

      {/* Edit Total Supply Section */}
      {showEditSection && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Edit Total Supply</label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={newTotalSupply}
              onChange={(e) => setNewTotalSupply(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800"
            />
            <button
              onClick={updateTotalSupplyHandler}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Update
            </button>
            <button
              onClick={() => setShowEditSection(false)}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
