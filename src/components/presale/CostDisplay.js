export default function CostDisplay({ amount }) {
  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
      <div className="flex justify-between">
        <span>Token Amount:</span>
        <span className="font-medium">{amount} tokens</span>
      </div>
      <div className="flex justify-between">
        <span>Cost:</span>
        <span className="font-medium">{(parseInt(amount) * 0.001).toFixed(3)} SOL</span>
      </div>
      <div className="flex justify-between">
        <span>Network Fee:</span>
        <span className="font-medium">~0.000005 SOL</span>
      </div>
      <div className="border-t pt-2 flex justify-between font-semibold">
        <span>Total:</span>
        <span>{(parseInt(amount) * 0.001 + 0.000005).toFixed(6)} SOL</span>
      </div>
    </div>
  );
}
