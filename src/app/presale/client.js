"use client";
import React, { useState, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import dynamic from "next/dynamic";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, sendAndConfirmTransaction, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { Program, AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@project-serum/anchor/dist/cjs/utils/token";

import IDL from "../../lib/solman_presale.json";
import Progressbar from "../../components/progressbar/Progressbar";
import { HermesClient } from "@pythnetwork/hermes-client";
import { PhantomWalletName } from "@solana/wallet-adapter-wallets";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { FaSpinner } from "react-icons/fa6";
import PresaleCountdown from "@/components/presale/PresaleCountdown";
import BuyAndClaim from "@/components/presale/BuyAndClaim";

// Dynamically import WalletMultiButton with SSR disabled
const WalletMultiButton = dynamic(() => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton), { ssr: false });

const ENV_PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID2;
// const ENV_ICO_MINT = process.env.NEXT_PUBLIC_ICO_MINT;
const ENV_ICO_MINT = "KhdTGv2Ve1AVioVfQimLd84G4RfDUXx7m3Qf27p2tz4";

// Program constants
const PROGRAM_ID = new PublicKey(ENV_PROGRAM_ID);
const ICO_MINT = new PublicKey(ENV_ICO_MINT);

// Example price per SOLMAN in USDT

export default function PresalePageClient() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [loading, setLoading] = useState(true);
  const [icoData, setIcoData] = useState(null);
  const [userIcoData, setUserIcoData] = useState(null);
  const [amount, setAmount] = useState("");
  const [userTokenBalance, setUserTokenBalance] = useState(null);

  const [maxTokenAmountPerAddress, setMaxTokenAmountPerAddress] = useState(0);
  const [pricePerToken, setPricePerToken] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [userUsdcBalance, setUserUsdcBalance] = useState(null);

  const [solPriceInUsdc, setSolPriceInUsdc] = useState(null);
  const [presaleSolBalance, setPresaleSolBalance] = useState(0);
  const [presaleUsdcBalance, setPresaleUsdcBalance] = useState(0);

  const PRICE_PER_SOLMAN = icoData?.pricePerToken || 0;
  const buyControls = useAnimation();
  const claimControls = useAnimation();

  const handleBuyHover = () => {
    buyControls.start({ scale: 1.01 });
    claimControls.start({ scale: 0.99, opacity: 0.6 });
  };
  const handleBuyLeave = () => {
    buyControls.start({ scale: 1 });
    claimControls.start({ scale: 1, opacity: 1 });
  };
  const handleClaimHover = () => {
    claimControls.start({ scale: 1.01 });
    buyControls.start({ scale: 0.99, opacity: 0.6 });
  };
  const handleClaimLeave = () => {
    claimControls.start({ scale: 1 });
    buyControls.start({ scale: 1, opacity: 1 });
  };

  // Utility function to fetch presale info and user/admin info
  async function getPresaleAndUserInfo(program, wallet, isAdmin = false) {
    // Fetch presaleInfo PDA and account
    const presaleInfoAll = await program.account.presaleInfo.all();
    if (!presaleInfoAll.length) throw new Error("No presale info found");
    const presaleInfo = presaleInfoAll[0];
    const presaleInfoPda = presaleInfo.publicKey;
    const authority = presaleInfo.account.authority;

    const walletConnected = wallet.connected;
    // Derive user/admin info PDA
    let userInfoPda = null,
      userInfo = null;
    if (walletConnected) {
      if (!isAdmin) {
        [userInfoPda] = PublicKey.findProgramAddressSync([Buffer.from("user"), wallet.publicKey.toBuffer()], program.programId);
        try {
          userInfo = await program.account.userInfo.fetch(userInfoPda);
        } catch {
          userInfo = null;
        }
      }
    }

    return {
      presaleInfo,
      presaleInfoPda,
      authority,
      userInfo,
      userInfoPda,
    };
  }

  useEffect(() => {
    if (icoData) {
      setMaxTokenAmountPerAddress(new BN(icoData.maxTokenAmountPerAddress).toNumber() || 0);
      setPricePerToken(icoData.pricePerToken || 0);
      setStartTime(new Date(new BN(icoData.startTime).toNumber()).toISOString().substring(0, 16) || "");
      setEndTime(new Date(new BN(icoData.endTime).toNumber()).toISOString().substring(0, 16) || "");
    }
  }, [icoData]);

  const fetchSolPrice = async () => {
    try {
      const hermesClient = new HermesClient("https://hermes.pyth.network/", {});

      // Specify the price feed ID and the TWAP window in seconds (maximum 600 seconds)
      const twapWindowSeconds = 3; // 5 minutes
      const twapUpdateData = await hermesClient.getLatestTwaps(
        ["0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"], // SOL/USD feed ID
        twapWindowSeconds,
        { encoding: "base64" }
      );

      // TWAP updates are strings of base64-encoded binary data
      const solPrice = twapUpdateData.parsed[0].twap.price / 1e8;
      const roundedSolPrice = Math.round(solPrice * 100) / 100;
      setSolPriceInUsdc(roundedSolPrice);
    } catch (error) {
      console.error("Error fetching SOL price:", error);
      setSolPriceInUsdc(null);
    }
  };

  useEffect(() => {
    fetchSolPrice();
    const interval = setInterval(fetchSolPrice, 9000);
    return () => clearInterval(interval);
  }, []);

  const getProgram = () => {
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    return new Program(IDL, provider);
  };

  const CheckIsAdmin = () => {
    if (!wallet.connected) return false;

    const adminAddress = "3JFwGRwwY6UMo4bGt4sFnLLTmxg5iyoMuNKQPf6oAucF";
    const isAdmin = wallet.publicKey.toString() === adminAddress;

    return isAdmin;
  };
  // Unified fetchIcoData for both user and admin
  const fetchIcoData = async () => {
    setLoading(true);

    try {
      const program = getProgram();
      if (!program) return;
      const isAdmin = CheckIsAdmin();
      const { presaleInfo, userInfo } = await getPresaleAndUserInfo(program, wallet, isAdmin);
      const mainICO = presaleInfo.account;
      setIcoData({
        tokenMintAddress: mainICO.tokenMintAddress?.toString() || "N/A",
        usdcMintAddress: mainICO.usdcMintAddress?.toString() || "N/A",
        usdcVaultAddress: mainICO.usdcVaultAddress?.toString() || "N/A",
        depositTokenAmount: new BN(mainICO.depositTokenAmount).toNumber() / 1e9 || 0,
        soldTokenAmount: new BN(mainICO.soldTokenAmount).toNumber() || 0,
        startTime: mainICO.startTime ?? "",
        endTime: mainICO.endTime ?? "",
        maxTokenAmountPerAddress: new BN(mainICO.maxTokenAmountPerAddress) || 0,
        pricePerToken: new BN(mainICO.pricePerToken).toNumber() / 1e9 || 0,
        isLive: mainICO.isLive || false,
        authority: mainICO.authority?.toString() || "N/A",
        isSoftCapped: mainICO.isSoftCapped || false,
        isHardCapped: mainICO.isHardCapped || false,
        totalTokens: new BN(mainICO.hardcapAmount) || 0,
      });
      if (!isAdmin && userInfo) {
        setUserTokenBalance(new BN(userInfo.buyTokenAmount).toNumber());
        setUserIcoData(userInfo);
      }
    } catch (error) {
      console.error("Error fetching ICO data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cleaned up fetchUserTokenBalance
  const fetchUserTokenBalance = async () => {
    if (!wallet.connected) return;
    const isAdmin = CheckIsAdmin();
    const program = getProgram();
    if (!program) return;
    if (isAdmin) {
      try {
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
    } else {
      try {
        const { userInfo } = await getPresaleAndUserInfo(program, wallet, false);
        setUserTokenBalance(new BN(userInfo?.buyTokenAmount || 0).toNumber());
        setUserIcoData(userInfo);
      } catch (error) {
        setUserTokenBalance("0");
      }
    }
  };

  const refreshPresaleBalances = async () => {
    try {
      const program = getProgram();
      if (!program) return;

      // Only fetch balances if presaleInfo exists
      const presaleInfoAll = await program.account.presaleInfo.all();
      if (!presaleInfoAll.length) {
        setPresaleUsdcBalance(0);
        setPresaleSolBalance(0);
        return;
      }
      const presaleInfo = presaleInfoAll[0];
      const presaleInfoPda = presaleInfo.publicKey;
      const usdcMintAddress = presaleInfo.account.usdcMintAddress;
      // Fetch and update USDC balance
      const presaleVaultUsdcAccount = await getAssociatedTokenAddress(usdcMintAddress, presaleInfoPda, true);
      const presaleVaultUsdcAccountInfo = await connection.getTokenAccountBalance(presaleVaultUsdcAccount);
      setPresaleUsdcBalance(parseFloat(presaleVaultUsdcAccountInfo.value.uiAmountString || "0"));
      // 2. Derive presaleVault PDA
      const [presaleVaultPda, vaultBump] = PublicKey.findProgramAddressSync([Buffer.from("vault")], program.programId);

      const presaleSolBalance = await connection.getBalance(presaleVaultPda);
      setPresaleSolBalance(presaleSolBalance / 1e9);
    } catch (error) {
      // If fetching fails (e.g. presale not initialized), show empty balances
      setPresaleUsdcBalance(0);
      setPresaleSolBalance(0);
      // Optionally log error
      // console.error("Error refreshing presale balances:", error);
    }
  };

  useEffect(() => {
    // Refresh balances whenever icoData changes (e.g. after presale creation)
    refreshPresaleBalances();
  }, [icoData]);

  const buyTokens = async () => {
    try {
      if (!amount || Number(amount) <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      setLoading(true);

      const program = getProgram();
      if (!program) return;

      // Get the presaleInfo PDA
      const presaleInfoAll = await program.account.presaleInfo.all();
      const presaleInfoAll2 = await program.account.userInfo.all();
      const presaleInfoPda = presaleInfoAll[0].publicKey;

      // Prepare USDC mint and user's USDC token account
      const usdcMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
      const buyerUsdcAccount = getAssociatedTokenAddressSync(usdcMint, wallet.publicKey, true);
      const presaleVaultUsdcAccount = getAssociatedTokenAddressSync(usdcMint, presaleInfoPda, true);

      let quoteAmountBN = new BN(Math.floor(amount * 1_000_000));

      const [userInfoPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user"),
          wallet.publicKey.toBuffer(), // wallet is the buyer
        ],
        program.programId
      );

      // Send the transaction
      const tx = program.methods.buyToken(quoteAmountBN).accounts({
        presaleInfo: presaleInfoPda,
        userInfo: userInfoPda,
        buyer: wallet.publicKey,
        buyerUsdcAccount: buyerUsdcAccount,
        presaleVaultUsdcAccount: presaleVaultUsdcAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      });

      const txSig = await tx.rpc();
      console.log("Transaction Signature:", txSig);

      const txDetails = await connection.getParsedTransaction(txSig, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      const logs = txDetails?.meta?.logMessages ?? [];

      logs.forEach((log) => console.log("Program log:", log));

      await fetchIcoData();
      await fetchUserTokenBalance();
    } catch (error) {
      console.error("Error buying tokens:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const claimTokens = async () => {
    try {
      setLoading(true);
      const program = getProgram();
      if (!program) return;

      const presaleInfoAll = await program.account.presaleInfo.all();
      const presaleInfo = presaleInfoAll[0];
      const presaleInfoPda = presaleInfo.publicKey;
      const authority = presaleInfo.account.authority;

      const [_presaleInfoPda, presaleInfoBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("presale"), authority.toBuffer()],
        program.programId
      );
      const [presaleAta, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("presale_token"), presaleInfoPda.toBuffer()],
        program.programId
      );

      // 2. Derive userInfo PDA
      const [userInfoPda] = PublicKey.findProgramAddressSync([Buffer.from("user"), wallet.publicKey.toBuffer()], program.programId);

      // 3. Buyer's associated token account for claim
      const tokenAccount = await getAssociatedTokenAddress(ICO_MINT, wallet.publicKey);

      // 5. Call the program
      const txSig = await program.methods
        .claimToken(presaleInfoBump)
        .accounts({
          tokenMint: ICO_MINT,
          tokenAccount, // buyer's token account
          presaleAssociatedTokenAccount: presaleAta,
          userInfo: userInfoPda,
          presaleInfo: presaleInfoPda,
          buyer: wallet.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        })
        .rpc();

      const txDetails = await connection.getParsedTransaction(txSig, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      const logs = txDetails?.meta?.logMessages ?? [];
      logs.forEach((log) => console.log("Program log:", log));

      console.log("Claim successful. Tx:", txSig);
      alert("Tokens claimed successfully!");
      await fetchUserTokenBalance();
    } catch (error) {
      console.error("Error claiming tokens:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Two-way binding for USDT <-> SOLMAN
  const [usdtAmount, setUsdtAmount] = useState("");
  const [solmanAmount, setSolmanAmount] = useState("");

  // When USDT changes, update SOLMAN
  const handleUsdtChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setUsdtAmount(value);
    const num = parseFloat(value);
    setSolmanAmount(num && num > 0 ? (num / PRICE_PER_SOLMAN).toFixed(4) : "");
    setAmount(value); // keep original amount state in sync if needed for buyTokens
  };

  // When SOLMAN changes, update USDT
  const handleSolmanChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setSolmanAmount(value);
    const num = parseFloat(value);
    setUsdtAmount(num && num > 0 ? (num * PRICE_PER_SOLMAN).toFixed(4) : "");
    setAmount(num && num > 0 ? (num * PRICE_PER_SOLMAN).toFixed(4) : ""); // keep original amount state in sync if needed
  };

  const fetchUserUsdcBalance = async () => {
    if (!wallet.connected) return;
    try {
      const usdcMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
      const userUsdcAccount = await getAssociatedTokenAddress(usdcMint, wallet.publicKey);
      const accountInfo = await connection.getTokenAccountBalance(userUsdcAccount);
      setUserUsdcBalance(accountInfo.value.uiAmountString);
    } catch (e) {
      setUserUsdcBalance("0");
    }
  };

  const init = async () => {
    await fetchIcoData();
    if (wallet.connected) {
      await fetchUserTokenBalance();
      await fetchUserUsdcBalance();
    }
  };

  useEffect(() => {
    init().then();
  }, [wallet.connected]);

  return (
    <section
      className="relative bg-[#E7FF53] pt-[80px] min-h-screen flex flex-col items-center justify-center transition-all mb-6"
      id="contact">
      {/* Big Solman text */}
      <div className="w-full flex justify-center">
        <h1 className="font-gorditas text-black text-[80px] sm:text-[120px] md:text-[180px] lg:text-[220px] xl:text-[260px]  leading-[90%] text-center tracking-tight mb-6 select-none">
          SOLMAN
        </h1>
      </div>

      {/* Left mascot */}
      <img
        src="./solman2.png"
        alt="Mascot Left"
        className="hidden md:block absolute left-0 bottom-0 md:bottom-16 lg:bottom-24 xl:bottom-32 w-[260px] lg:w-[340px] z-10"
        style={{ maxWidth: "30vw" }}
      />

      {/* Right mascot */}
      <img
        src="./solman2.png"
        alt="Mascot Right"
        className="hidden md:block absolute right-0 bottom-0 md:bottom-16 lg:bottom-24 xl:bottom-32 w-[220px] lg:w-[300px] z-10"
        style={{ maxWidth: "26vw" }}
      />

      {/* Center Card */}
      <div className="relative z-20 flex flex-col items-center w-full">
        <div className="mx-auto mt-4 mb-10 max-w-[540px] rounded-2xl border-2 border-black bg-[#fee000] px-6 py-8 shadow-xl">
          <div className="w-full flex justify-end mb-2">
            <WalletMultiButton
              style={{
                textAlign: "center",
                borderRadius: "9999px",
                color: "oklch(79.5% 0.184 86.047)",
                backgroundColor: "#000",
                width: "100%",
                cursor: "pointer",
                marginBottom: "20px",
                minWidth: "200px",
              }}>
              {wallet.connected ? null : (
                <div className="block text-center rounded-full font-bold text-lg py-2 px-3 text-yellow-500 bg-black w-full cursor-pointer">
                  CONNECT WALLET
                </div>
              )}
            </WalletMultiButton>
          </div>
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src="./solman2.png" alt="Coin" className="w-8 h-8 object-contain" />
            <span className="text-black font-title-font text-2xl font-bold">BUY SOLMAN</span>
          </div>
          {/* Spinner if loading */}
          {loading || wallet.connecting || wallet.disconnecting || !connection ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] min-w-[300px] w-full md:w-[400px]">
              <FaSpinner className="animate-spin text-black" style={{ fontSize: 80 }} />
            </div>
          ) : (
            <>
              <div className="grid gap-4 grid-cols-2 mb-4">
                <div className="flex flex-col items-start rounded-lg border border-black bg-transparent p-3">
                  <span className="text-xs text-black/70">Current price</span>
                  <span className="font-bold text-lg">
                    {`$`}
                    {`${PRICE_PER_SOLMAN}`}
                  </span>
                </div>
                <div className="flex flex-col items-start rounded-lg border border-black bg-transparent p-3">
                  <span className="text-xs text-black/70">Listing Price</span>
                  <span className="font-bold text-lg">$0.005</span>
                </div>
              </div>

              <Progressbar raised={20} goal={200} />

              <br />
              <PresaleCountdown startTime={icoData?.startTime} endTime={icoData?.endTime} />
              <br />
              {wallet.connected ? (
                <div className="flex flex-col items-start rounded-lg border border-black bg-black text-yellow-500 p-3">
                  <span className="text-xs text-white">Balance</span>
                  <span className="font-bold text-lg">
                    {userTokenBalance !== null ? userTokenBalance / 1e9 : "--"}
                    <span className="ml-1.5 font-light text-sm">{`SOLMAN`}</span>
                  </span>
                </div>
              ) : null}
              {/* --- REPLACE INPUTS WITH TWO-WAY BINDING --- */}
              <div className="grid gap-4 grid-cols-2 mt-4">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="font-semibold text-black">You send</span>
                    <span className="text-black">{(Math.ceil(Number(userUsdcBalance) * 100) / 100).toFixed(2)} USDC</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-black bg-transparent">
                    <input
                      className="outline-none w-[65%] bg-transparent p-3 placeholder:text-black"
                      placeholder={`at least ${PRICE_PER_SOLMAN}`}
                      value={usdtAmount}
                      onChange={handleUsdtChange}
                    />
                    <div className="flex items-center gap-1 pr-2">
                      <img src="./solman2.png" alt="USDC" className="w-6 h-6 object-contain" />
                      <span className="m-text font-bold">USDC</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="font-semibold text-black">You’ll receive</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-black bg-transparent">
                    <input
                      className="outline-none w-[65%] bg-transparent p-3 placeholder:text-black"
                      placeholder="0"
                      value={solmanAmount}
                      onChange={handleSolmanChange}
                    />
                    <div className="flex items-center gap-1 pr-2">
                      <img src="./solman2.png" alt="SOLMAN" className="w-6 h-6 object-contain" />
                      <span className="m-text font-bold">SOLMAN</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* --- END REPLACEMENT --- */}

              <BuyAndClaim
                buyToken={buyTokens}
                claimToken={claimTokens}
                isConnected={wallet.connected}
                buyControls={buyControls}
                claimControls={claimControls}
                handleBuyHover={handleBuyHover}
                handleBuyLeave={handleBuyLeave}
                handleClaimHover={handleClaimHover}
                handleClaimLeave={handleClaimLeave}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
