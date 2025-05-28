import React from "react";

// Timeline data
const phases = [
  {
    title: "Foundation",
    phase: "Phase 1",
    points: ["Lore reveal", "Community launch", "Early meme campaigns"],
  },
  {
    title: "Engagement",
    phase: "Phase 2",
    points: ["Meme quests", "Leaderboard system", "Fair Launch announcement"],
  },
  {
    title: "Token Launch",
    phase: "Phase 3",
    points: ["Token launch on Raydium or Jupiter", "Liquidity added & locked", "Listing on major trackers"],
  },
  {
    title: "Hype & Gameplay",
    phase: "Phase 4",
    points: ["NFT preview", "Influencer marketing push", "SolMan Runner alpha test"],
  },
  {
    title: "Utility Activation",
    phase: "Phase 5",
    points: ["Staking system launch", "Meme-to-earn rewards", "Discord role integration"],
  },
  {
    title: "Governance & Expansion",
    phase: "Phase 6",
    points: ["DAO testing", "Lore & character expansion", "NFT staking roadmap"],
  },
];

const Roadmap = () => (
  <div className="py-16 bg-gradient-to-b rounded-b-3xl from-yellow-100 via-white to-yellow-50">
    <div className="max-w-4xl mx-auto px-4">
      <h2 className="text-4xl font-bold text-center mb-12">Roadmap</h2>
      <div className="relative">
        {/* Timeline vertical bar */}
        <div className="absolute left-1/2 top-0 h-full w-1 bg-gradient-to-b from-yellow-400 via-yellow-600 to-yellow-400 -translate-x-1/2 z-0 rounded"></div>
        <div className="space-y-16 relative z-10">
          {phases.map((phase, idx) => {
            const isLeft = idx % 2 === 0;
            return (
              <div key={phase.phase} className="flex flex-col md:flex-row items-center">
                {/* Left side content */}
                <div className={`md:w-1/2 ${isLeft ? "md:pr-8 md:justify-end flex" : "md:order-2 md:pl-8 flex justify-start"}`}>
                  <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-2xl font-bold mb-2 text-yellow-700">{phase.title}</h3>
                    <ul className="text-gray-700 text-lg space-y-1">
                      {phase.points.map((point, i) => (
                        <li key={i}>• {point}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {/* Right side empty for alignment */}
                <div className={`md:w-1/2 ${isLeft ? "md:order-2" : "md:pr-8 md:justify-end flex"}`}></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);

export default Roadmap;
