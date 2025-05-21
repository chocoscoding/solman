"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, getAccount, getMint } from "@solana/spl-token";
import { buyTokens, mintTokensToSelf, transferTokensToAdmin } from "@/Contract/contract";
import Progressbar from "@/components/progressbar/Progressbar";
import { createClient } from "@/utils/supabase/client";
import EditTotalSupply from "@/components/presale/edit-supply";
import { toast } from "sonner";
import WalletNotConnectedBlurred from "@/components/presale/NotConnected";
import IcoStatusDisplay from "@/components/presale/IcoStatusDisplay";

// Dynamically import WalletMultiButton with SSR disabled
const WalletMultiButton = dynamic(() => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton), { ssr: false });

const ICO_MINT = new PublicKey(process.env.NEXT_PUBLIC_ICO_MINT);
const LAMPORTS_PER_TOKEN = parseInt(process.env.NEXT_PUBLIC_LAMPORTS_PER_TOKEN);
const OWNER_ACCOUNT = new PublicKey(process.env.NEXT_PUBLIC_OWNER_ACCOUNT);
const ADMIN_ACCOUNT = new PublicKey(process.env.NEXT_PUBLIC_ADMIN_ACCOUNT);

export default function PresalePage({ getRowById, upsertSaleDates, upsertTotalDeposit, initData, subscribeToChanges }) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [loading, setLoading] = useState(false);
  const [icoData, setIcoData] = useState(null);
  const [amount, setAmount] = useState("");
  const [userStatus, setUserStatus] = useState("user");
  const [userTokenBalance, setUserTokenBalance] = useState("0");
  const [tokensSold, setTokensSold] = useState(0); // State for tokens sold
  const [projectDataFromDb, setProjectDataFromDb] = useState(initData);
  const [newTotalSupply, setNewTotalSupply] = useState(initData?.totalDeposit || 0);

  useEffect(() => {
    if (wallet.connected) {
      fetchIcoData();

      if (wallet.publicKey.equals(OWNER_ACCOUNT)) {
        setUserStatus("OWNER");
      } else if (wallet.publicKey.equals(ADMIN_ACCOUNT)) {
        setUserStatus("ADMIN");
      } else {
        setUserStatus("USER");
      }
    }
  }, [wallet.connected]);

  const fetchData = async () => {
    try {
      const data = await getRowById(1);
      setProjectDataFromDb(data);
    } catch (error) {
      console.error("Error fetching project data:", error);
    }
  };
  useEffect(() => {
    if (projectDataFromDb) fetchData();
    //  Subscribe to changes
    const supabase = createClient();
    const channel = supabase
      .channel("supabase_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "listing" }, (payload) => {
        setProjectDataFromDb((prev) => ({ ...prev, totalDeposit }));
      })
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const fetchIcoData = async () => {
    try {
      const adminAta = await getAssociatedTokenAddress(ICO_MINT, ADMIN_ACCOUNT);
      const tokenAccount = await getAccount(connection, adminAta);
      const amount = Number(tokenAccount.amount);
      const mint = await getMint(connection, tokenAccount.mint);
      const balance = amount / 10 ** mint.decimals;

      setIcoData({
        totalTokens: projectDataFromDb.totalDeposit.toString(),
        tokensSold: (projectDataFromDb.totalDeposit - balance).toString(),
      });
    } catch (error) {
      console.error("Error fetching ICO data:", error);
      setIcoData(null);
    }
  };

  const fetchUserTokenBalance = async () => {
    try {
      if (!wallet.connected) return;

      const userAta = await getAssociatedTokenAddress(ICO_MINT, wallet.publicKey);

      try {
        const tokenAccount = await getAccount(connection, userAta);
        setUserTokenBalance(tokenAccount.amount.toString());
      } catch (e) {
        setUserTokenBalance("0");
      }
    } catch (error) {
      console.error("Error fetching token balance:", error);
      setUserTokenBalance("0");
    }
  };

  useEffect(() => {
    if (wallet.connected) {
      fetchUserTokenBalance();
    }
  }, [wallet.connected]);

  const buyTokensHandler = async () => {
    try {
      if (!amount || parseInt(amount) <= 0) {
        alert("Please enter a valid amount");
        return;
      }
      if (!wallet.publicKey || !wallet.signTransaction) {
        alert("Please connect your wallet.");
        return;
      }

      setLoading(true);

      // Call the updated buyTokens function
      const signature = await buyTokens(wallet.publicKey, parseInt(amount), wallet.signTransaction);
      alert(`Transaction successful: ${signature}`);
    } catch (error) {
      console.error("Error buying tokens:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const mintTokensToSelfHandler = async () => {
    try {
      if (!amount || parseInt(amount) <= 0) {
        alert("Please enter a valid amount");
        return;
      }
      if (!wallet.publicKey || !wallet.signTransaction) {
        alert("Please connect your wallet.");
        return;
      }

      setLoading(true);

      const signature = await mintTokensToSelf(wallet.publicKey, parseInt(amount), wallet.signTransaction);
      alert(`Transaction successful: ${signature}`);
    } catch (error) {
      console.error("Error minting tokens to self:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const transferTokensToAdminHandler = async () => {
    try {
      if (!amount || parseInt(amount) <= 0) {
        alert("Please enter a valid amount");
        return;
      }
      if (!wallet.publicKey || !wallet.signTransaction) {
        alert("Please connect your wallet.");
        return;
      }

      setLoading(true);

      const signature = await transferTokensToAdmin(wallet.publicKey, parseInt(amount), wallet.signTransaction);
      alert(`Transaction successful: ${signature}`);
    } catch (error) {
      console.error("Error transferring tokens to admin:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateTotalSupplyHandler = async () => {
    const toast1 = toast.loading("Saving");
    try {
      if (!newTotalSupply || parseInt(newTotalSupply) <= 0) {
        toast.dismiss(toast1);
        toast.error("Please enter a valid total supply.");
        return;
      }
      const updatedData = await upsertTotalDeposit(1, parseInt(newTotalSupply));
      setProjectDataFromDb(updatedData);
      toast.success(toast1, "Total supply updated successfully");
    } catch (error) {
      toast.success(toast1, "Error updating total supply");
      console.error("Error updating total supply:", error);
    } finally {
      toast.dismiss(toast1);
    }
  };

  const tokenPercent = icoData ? (parseFloat(icoData.tokensSold) / parseFloat(projectDataFromDb.totalDeposit)) * 100 : 0;

  return (
    <div className="py-6 flex flex-col justify-center sm:py-12 min-h-screen bg-gradient-to-br from-green-300 via-yellow-200 to-yellow-400">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative p-4 bg-gray-50 shadow-lg sm:rounded-3xl">
          <div className="max-w-md mx-2">
            <div className="divide-y divide-gray-200">
              {/* Header Section */}
              <div className="pb-4">
                <div className="flex justify-between items-center">
                  <h1 className="text-2xl font-bold">Solman test</h1>
                  <WalletMultiButton
                    style={{
                      background: "#000000",
                      marginLeft: "3px",
                      borderRadius: "60px",
                    }}
                  />
                </div>
                {wallet.connected && (
                  <div className="mt-4 text-sm text-gray-600 ">
                    <p>
                      Wallet: {wallet.publicKey.toString().slice(0, 8)}...
                      {wallet.publicKey.toString().slice(-8)}
                    </p>
                    <p className="mt-1">
                      Status:{" "}
                      <span
                        className={`font-semibold ${
                          userStatus === "OWNER" ? "text-purple-600" : userStatus === "ADMIN" ? "text-green-600" : "text-blue-600"
                        }`}>
                        {userStatus.charAt(0) + userStatus.slice(1).toLowerCase()}
                      </span>
                    </p>
                    <p className="mt-2">
                      Total Tokens Owned: <span className="font-semibold">{(Number(userTokenBalance) / 1e9).toFixed(2)}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Main Content */}
              {wallet.connected && (
                <div className="py-8">
                  {/* ICO Status Display */}
                  <IcoStatusDisplay projectDataFromDb={projectDataFromDb} icoData={icoData} userStatus={userStatus} />
                  {/* Progress Bar Section */}
                  {icoData && (
                    <div className="mb-6">
                      <Progressbar done={tokenPercent} />
                    </div>
                  )}

                  {/* Action Section */}
                  <div className="space-y-4">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={
                        userStatus === "OWNER"
                          ? icoData
                            ? "Amount of tokens to deposit"
                            : "Amount of tokens to initialize"
                          : "Amount of tokens to buy"
                      }
                      className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800"
                      min="1"
                      step="1"
                    />

                    {/* Cost Display for Users */}
                    {amount && userStatus === "USER" && (
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
                    )}

                    {/* Action Buttons */}
                    {userStatus === "OWNER" ? (
                      <div className="space-y-3">
                        {icoData && (
                          <>
                            <button
                              onClick={buyTokensHandler}
                              disabled={loading || !icoData}
                              className="w-full p-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors">
                              {loading ? "Processing..." : "Buy Tokens"}
                            </button>
                            <button
                              onClick={mintTokensToSelfHandler}
                              disabled={loading}
                              className="w-full p-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors">
                              {loading ? "Minting..." : "Mint Tokens"}
                            </button>
                            <button
                              onClick={transferTokensToAdminHandler}
                              disabled={loading}
                              className="w-full p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors">
                              {loading ? "Transferring..." : "Transfer token to Admin"}
                            </button>

                            <EditTotalSupply
                              newTotalSupply={newTotalSupply}
                              setNewTotalSupply={setNewTotalSupply}
                              updateTotalSupplyHandler={updateTotalSupplyHandler}
                            />
                          </>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={buyTokensHandler}
                        disabled={loading || !icoData}
                        className="w-full p-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors">
                        {loading ? "Processing..." : "Buy Tokens"}
                      </button>
                    )}

                    {/* Transaction Status */}
                    {loading && <div className="text-center animate-pulse text-gray-600">Processing transaction...</div>}
                  </div>
                </div>
              )}

              {/* Not Connected State */}
              {!wallet.connected && <WalletNotConnectedBlurred />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
