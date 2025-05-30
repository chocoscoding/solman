import React from "react";

export default function AdminNav({ icoData, activeSection, setActiveSection }) {
  return (
    <div className="flex flex-wrap gap-2 bg-gray-100 px-4 py-2 border-b border-gray-200">
      {!icoData && (
        <button
          onClick={() => setActiveSection("initialize")}
          className={`px-4 py-2 rounded-lg cursor-pointer ${
            activeSection === "initialize" ? "bg-blue-600 text-white" : "bg-white border"
          }`}>
          Initialize
        </button>
      )}
      <button
        onClick={() => icoData && setActiveSection("start")}
        disabled={!icoData}
        className={`px-4 py-2 rounded-lg cursor-pointer ${activeSection === "start" ? "bg-green-600 text-white" : "bg-white border"} ${
          !icoData ? "opacity-50 cursor-not-allowed" : ""
        }`}>
        Start Presale
      </button>
      <button
        onClick={() => icoData && setActiveSection("update")}
        disabled={!icoData}
        className={`px-4 py-2 rounded-lg cursor-pointer ${activeSection === "update" ? "bg-neutral-700 text-white" : "bg-white border"} ${
          !icoData ? "opacity-50 cursor-not-allowed" : ""
        }`}>
        Update Presale
      </button>
      <button
        onClick={() => icoData && setActiveSection("deposit")}
        disabled={!icoData}
        className={`px-4 py-2 rounded-lg cursor-pointer ${activeSection === "deposit" ? "bg-indigo-600 text-white" : "bg-white border"} ${
          !icoData ? "opacity-50 cursor-not-allowed" : ""
        }`}>
        Deposit Token
      </button>
      {/* <button
        onClick={() => icoData && setActiveSection("withdrawSol")}
        disabled={!icoData}
        className={`px-4 py-2 rounded-lg cursor-pointer ${
          activeSection === "withdrawSol"
            ? "bg-gradient-to-r from-purple-500 to-green-400 text-white rounded-lg hover:from-purple-600 hover:to-green-500"
            : "bg-white border"
        } ${!icoData ? "opacity-50 cursor-not-allowed" : ""}`}>
        Withdraw SOL
      </button> */}
      <button
        onClick={() => icoData && setActiveSection("withdrawToken")}
        disabled={!icoData}
        className={`px-4 py-2 rounded-lg cursor-pointer ${
          activeSection === "withdrawToken" ? "bg-yellow-600 text-white" : "bg-white border"
        } ${!icoData ? "opacity-50 cursor-not-allowed" : ""}`}>
        Withdraw Token
      </button>
      <button
        onClick={() => icoData && setActiveSection("withdrawUsdc")}
        disabled={!icoData}
        className={`px-4 py-2 rounded-lg cursor-pointer ${activeSection === "withdrawUsdc" ? "bg-sky-600 text-white" : "bg-white border"} ${
          !icoData ? "opacity-50 cursor-not-allowed" : ""
        }`}>
        Withdraw USDC
      </button>
    </div>
  );
}
