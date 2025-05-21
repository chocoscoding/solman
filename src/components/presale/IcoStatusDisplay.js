export default function IcoStatusDisplay({ projectDataFromDb, icoData, userStatus }) {
  if (!icoData) {
    //if ico data is false
    if (userStatus === "OWNER") {
      //if ico data is false but user is owner
      return (
        <div className="mb-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-yellow-700">ICO needs to be initialized</p>
        </div>
      );
    } else {
      return null;
    }
  }
  return (
    <div className="mb-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-lg font-semibold mb-3">Allocation Status</h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Total Supply</p>
          <p className="font-medium">{projectDataFromDb.totalDeposit} tokens</p>
        </div>
        <div>
          <p className="text-gray-600">Tokens Sold</p>
          <p className="font-medium">{icoData.tokensSold.toString()} tokens</p>
        </div>
        <div>
          <p className="text-gray-600">Token Price</p>
          <p className="font-medium">0.001 SOL</p>
        </div>
        <div>
          <p className="text-gray-600">Available</p>
          <p className="font-medium">{(projectDataFromDb.totalDeposit - icoData.tokensSold).toString()} tokens</p>
        </div>
      </div>
    </div>
  );
}
