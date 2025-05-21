const Progressbar = ({ done, ...props }) => {
  const roundedDone = Math.round(done * 100) / 100; // Round to 2 significant figures
  return (
    <div className="w-full bg-gray-200 rounded-full h-5 overflow-hidden relative" {...props}>
      <div
        className="h-full transition-all duration-300 bg-gradient-to-r from-green-300 via-green-200 to-yellow-400"
        style={{
          width: `${roundedDone}%`,
        }}>
        <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-800 text-xs font-semibold w-full text-center">
          {roundedDone}%
        </span>
      </div>
    </div>
  );
};

export default Progressbar;
