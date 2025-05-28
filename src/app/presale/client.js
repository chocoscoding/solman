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

// Dynamically import WalletMultiButton with SSR disabled
const WalletMultiButton = dynamic(() => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton), { ssr: false });

const ENV_PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID2;
// const ENV_ICO_MINT = process.env.NEXT_PUBLIC_ICO_MINT;
const ENV_ICO_MINT = "KhdTGv2Ve1AVioVfQimLd84G4RfDUXx7m3Qf27p2tz4";

// Program constants
const PROGRAM_ID = new PublicKey(ENV_PROGRAM_ID);
const ICO_MINT = new PublicKey(ENV_ICO_MINT);

// ...existing code...
function PresaleCountdown({ startTime, endTime }) {
  const [label, setLabel] = useState("");
  const [time, setTime] = useState({
    days: "00",
    hours: "00",
    minutes: "00",
    seconds: "00",
  });
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!startTime || !endTime) {
      setLabel("");
      setTime({ days: "00", hours: "00", minutes: "00", seconds: "00" });
      setEnded(false);
      return;
    }
    let interval;
    function updateCountdown() {
      const now = Date.now();
      const start = new Date(new BN(startTime).toNumber());
      const end = new Date(new BN(endTime).toNumber());
      let target, newLabel;

      if (now < start) {
        target = start;
        newLabel = "Presale starts in";
        setEnded(false);
      } else if (now < end) {
        target = end;
        newLabel = "Presale ends in";
        setEnded(false);
      } else {
        setLabel("");
        setEnded(true);
        setTime({ days: "00", hours: "00", minutes: "00", seconds: "00" });
        return;
      }

      const diff = target - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setLabel(newLabel);
      setTime({
        days: days.toString().padStart(2, "0"),
        hours: hours.toString().padStart(2, "0"),
        minutes: minutes.toString().padStart(2, "0"),
        seconds: seconds.toString().padStart(2, "0"),
      });
    }
    updateCountdown();
    interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  if (ended) {
    return (
      <div className="w-full flex flex-col items-center my-4">
        <div className="bg-black text-[#E7FF53] font-bold text-lg rounded-lg px-6 py-3 text-center">
          Presale ended, You can now claim your $SOLMAN
        </div>
      </div>
    );
  }

  if (!label) return null;
  return (
    <div className="w-full flex flex-col items-center my-4">
      <div className="text-black font-bold text-lg mb-2">{label}</div>
      <div className="w-full border-t border-black mb-2"></div>
      <div className="flex justify-center gap-6 mb-1">
        <span className="text-black font-semibold text-sm">Days</span>
        <span className="text-black font-semibold text-sm">Hours</span>
        <span className="text-black font-semibold text-sm">Minutes</span>
        <span className="text-black font-semibold text-sm">Seconds</span>
      </div>
      <div className="flex justify-center gap-6">
        <span className="bg-black text-[#E7FF53] font-bold text-xl rounded-lg px-4 py-1 min-w-[48px] text-center">{time.days}</span>
        <span className="bg-black text-[#E7FF53] font-bold text-xl rounded-lg px-4 py-1 min-w-[48px] text-center">{time.hours}</span>
        <span className="bg-black text-[#E7FF53] font-bold text-xl rounded-lg px-4 py-1 min-w-[48px] text-center">{time.minutes}</span>
        <span className="bg-black text-[#E7FF53] font-bold text-xl rounded-lg px-4 py-1 min-w-[48px] text-center">{time.seconds}</span>
      </div>
    </div>
  );
}
// ...existing code....

export default function PresalePageClient() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { setVisible, visible } = useWalletModal();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [icoData, setIcoData] = useState(null);
  const [userIcoData, setUserIcoData] = useState(null);
  const [amount, setAmount] = useState("");
  const [userTokenBalance, setUserTokenBalance] = useState(null);

  const [maxTokenAmountPerAddress, setMaxTokenAmountPerAddress] = useState(0);
  const [pricePerToken, setPricePerToken] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  const [solPriceInUsdc, setSolPriceInUsdc] = useState(null);
  const [presaleSolBalance, setPresaleSolBalance] = useState(0);
  const [presaleUsdcBalance, setPresaleUsdcBalance] = useState(0);

  const buyControls = useAnimation();
  const claimControls = useAnimation();

  const handleBuyHover = () => {
    buyControls.start({ scale: 1.08 });
    claimControls.start({ scale: 0.95 });
  };
  const handleBuyLeave = () => {
    buyControls.start({ scale: 1 });
    claimControls.start({ scale: 1 });
  };
  const handleClaimHover = () => {
    claimControls.start({ scale: 1.08 });
    buyControls.start({ scale: 0.95 });
  };
  const handleClaimLeave = () => {
    claimControls.start({ scale: 1 });
    buyControls.start({ scale: 1 });
  };

  // Utility function to fetch presale info and user/admin info
  async function getPresaleAndUserInfo(program, wallet, isAdmin = false) {
    // Fetch presaleInfo PDA and account
    const presaleInfoAll = await program.account.presaleInfo.all();
    if (!presaleInfoAll.length) throw new Error("No presale info found");
    const presaleInfo = presaleInfoAll[0];
    const presaleInfoPda = presaleInfo.publicKey;
    const authority = presaleInfo.account.authority;

    // Derive user/admin info PDA
    let userInfoPda = null,
      userInfo = null;
    if (!isAdmin) {
      [userInfoPda] = PublicKey.findProgramAddressSync([Buffer.from("user"), wallet.publicKey.toBuffer()], program.programId);
      try {
        userInfo = await program.account.userInfo.fetch(userInfoPda);
      } catch {
        userInfo = null;
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
    if (wallet.connected) {
      checkIfAdmin();
      fetchIcoData();
      fetchUserTokenBalance();
    }
  }, [wallet.connected]);

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
    if (!wallet.connected) return null;
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    return new Program(IDL, provider);
  };

  const checkIfAdmin = async () => {
    try {
      if (!wallet.connected) return;

      // Check if the wallet address matches the admin address
      const adminAddress = "3JFwGRwwY6UMo4bGt4sFnLLTmxg5iyoMuNKQPf6oAucF";
      setIsAdmin(wallet.publicKey.toString() === adminAddress);
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  // Cleaned up: fetchAllIcoData and fetchUserIcoData merged into fetchIcoData below

  const CheckIsAdmin = () => {
    const adminAddress = "3JFwGRwwY6UMo4bGt4sFnLLTmxg5iyoMuNKQPf6oAucF";
    const isAdmin = wallet.publicKey.toString() === adminAddress;

    return isAdmin;
  };
  // Unified fetchIcoData for both user and admin
  const fetchIcoData = async () => {
    if (!wallet.connected) return;
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

  const createPresale = async () => {
    try {
      const startTimestamp = Date.now(); // Convert to seconds
      const endTimestamp = startTimestamp + 30 * 24 * 60 * 60; // 30 days in seconds

      setLoading(true);
      const program = getProgram();
      if (!program) return;

      const usdcMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");

      await program.methods
        .createPresale(new PublicKey(ICO_MINT), new BN(10), new BN(0.1 * 1e6), new BN(startTimestamp), new BN(endTimestamp))
        .accounts({
          authority: wallet.publicKey,
          usdcMint: usdcMint,
        })
        .rpc();

      alert("Presale created successfully!");
      await fetchIcoData();
    } catch (error) {
      console.error("Error creating presale:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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

  const startPresale = async () => {
    try {
      setLoading(true);
      const program = getProgram();
      if (!program) return;

      const presaleInfoAll = await program.account.presaleInfo.all();
      const presaleInfoPda = presaleInfoAll[0].publicKey;

      // Convert timestamps to seconds for blockchain
      const startTimestamp = Date.now(); // Current time in seconds
      const endTimestamp = startTimestamp + 30 * 24 * 60 * 60; // 30 days in seconds

      const usdcMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
      const presaleVaultUsdcAccount = await getAssociatedTokenAddress(usdcMint, presaleInfoPda, true);

      // Ensure ATA exists
      try {
        await getAccount(connection, presaleVaultUsdcAccount);
      } catch (e) {
        if (e instanceof TokenAccountNotFoundError) {
          const ataIx = createAssociatedTokenAccountInstruction(wallet.publicKey, presaleVaultUsdcAccount, presaleInfoPda, usdcMint);
          const tx = new Transaction().add(ataIx);
          await wallet.sendTransaction(tx, connection);
        } else {
          throw e;
        }
      }

      await program.methods
        .startPresale(new BN(startTimestamp), new BN(endTimestamp))
        .accounts({
          presaleInfo: presaleInfoPda,
          admin: wallet.publicKey,
          presaleVaultUsdcAccount: presaleVaultUsdcAccount,
        })
        .rpc();

      alert("Presale started successfully!");
    } catch (error) {
      console.error("Error starting presale:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updatePresale = async () => {
    try {
      setLoading(true);
      const program = getProgram();
      if (!program) return;

      const presaleInfoAll = await program.account.presaleInfo.all();
      const presaleInfoPda = presaleInfoAll[0].publicKey;

      // Convert timestamps to seconds for blockchain
      const startTimestamp = new Date(startTime).getTime();
      const endTimestamp = new Date(endTime).getTime();

      await program.methods
        .updatePresale(
          new BN(maxTokenAmountPerAddress),
          new BN(pricePerToken * 1e9), // Assuming price is in USDC
          new BN(startTimestamp),
          new BN(endTimestamp)
        )
        .accounts({
          presaleInfo: presaleInfoPda,
          authority: wallet.publicKey,
        })
        .rpc();

      alert("Presale updated successfully!");
      await fetchIcoData();
    } catch (error) {
      console.error("Error updating presale:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const withdrawSol = async () => {
    try {
      if (!amount || Number(amount) <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      setLoading(true);

      const program = getProgram();
      if (!program || !wallet.publicKey) {
        alert("Program or wallet not found");
        return;
      }

      // 1. Get presaleInfo PDA
      const presaleInfoAll = await program.account.presaleInfo.all();
      if (presaleInfoAll.length === 0) {
        alert("No presale info found");
        return;
      }
      const presaleInfo = presaleInfoAll[0];
      const presaleInfoPda = presaleInfo.publicKey;

      // 2. Derive presaleVault PDA
      const [presaleVaultPda, vaultBump] = PublicKey.findProgramAddressSync([Buffer.from("vault")], program.programId);

      const presaleSolBalance = await connection.getBalance(presaleVaultPda);
      console.log("Vault balance:", presaleSolBalance);
      console.log("Vault address:", presaleVaultPda.toBase58());

      if (Number(amount) > presaleSolBalance / web3.LAMPORTS_PER_SOL) {
        alert("Withdraw amount exceeds vault balance");
        return;
      }

      // 3. Call withdrawSol
      await program.methods
        .withdrawSol(new BN(Number(amount) * web3.LAMPORTS_PER_SOL), vaultBump)
        .accounts({
          presaleInfo: presaleInfoPda,
          presaleVault: presaleVaultPda,
          admin: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      alert("SOL withdrawn successfully!");
    } catch (error) {
      console.error("Error withdrawing SOL:", error);
      alert(`Error: ${error.message}`);
    } finally {
      refreshPresaleBalances();
      setLoading(false);
    }
  };

  const withdrawToken = async () => {
    try {
      if (!amount || Number(amount) <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      setLoading(true);
      const program = getProgram();
      if (!program) return;

      // 1. Fetch presaleInfo PDA and authority
      const presaleInfoAll = await program.account.presaleInfo.all();
      const presaleInfo = presaleInfoAll[0];
      const presaleInfoPda = presaleInfo.publicKey;
      const authority = presaleInfo.account.authority;

      // 2. Get token mint address
      const mintPk = new PublicKey(ICO_MINT);

      // 3. Derive admin ATA
      const adminAta = getAssociatedTokenAddressSync(mintPk, wallet.publicKey);

      // Derive presale_info PDA and bump
      const [_presaleInfoPda, presaleInfoBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("presale"), authority.toBuffer()],
        program.programId
      );
      // Derive presale ATA (owned by presaleInfo PDA, allowOwnerOffCurve)
      const [presaleAta, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("presale_token"), presaleInfoPda.toBuffer()],
        program.programId
      );

      // 6. Ensure both token accounts exist
      const tx = new Transaction();
      try {
        // Get admin ATA info and balance
        const adminAtaInfo = await getAccount(program.provider.connection, adminAta);
        console.log("Admin ATA address:", adminAta.toBase58());
        console.log("Admin ATA balance:", adminAtaInfo.amount.toString());
      } catch {
        tx.add(createAssociatedTokenAccountInstruction(wallet.publicKey, adminAta, wallet.publicKey, mintPk));
      }

      try {
        const presaleAtaInfo = await getAccount(program.provider.connection, presaleAta);
        console.log("Presale ATA address:", presaleAta.toBase58());
        console.log("Presale ATA balance:", presaleAtaInfo.amount.toString());
      } catch {
        tx.add(createAssociatedTokenAccountInstruction(wallet.publicKey, presaleAta, presaleInfoPda, mintPk));
      }

      if (tx.instructions.length > 0) {
        tx.feePayer = wallet.publicKey;
        tx.recentBlockhash = (await program.provider.connection.getLatestBlockhash()).blockhash;

        const signedTx = await wallet.signTransaction(tx);
        const txid = await program.provider.connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        });

        await program.provider.connection.confirmTransaction(txid, "confirmed");
      }

      // 7. Call withdrawToken
      await program.methods
        .withdrawToken(new BN(Number(amount * 1e9)), presaleInfoBump)
        .accounts({
          mintAccount: mintPk,
          adminAssociatedTokenAccount: adminAta,
          presaleAssociatedTokenAccount: presaleAta,
          presaleTokenMintAccount: mintPk,
          presaleInfo: presaleInfoPda,
          admin: wallet.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        })
        .rpc();

      alert("✅ SPL Tokens withdrawn successfully!");
    } catch (error) {
      console.error("Error withdrawing tokens:", error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const withdrawUsdc = async () => {
    try {
      if (!amount || Number(amount) <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      setLoading(true);
      const program = getProgram();
      if (!program) return;

      const presaleInfoAll = await program.account.presaleInfo.all();
      const presaleInfoPda = presaleInfoAll[0].publicKey;

      const usdcMintAddress = presaleInfoAll[0].account.usdcMintAddress;

      const presaleVaultUsdcAccount = await getAssociatedTokenAddress(usdcMintAddress, presaleInfoPda, true);
      const adminUsdcAccount = await getAssociatedTokenAddress(usdcMintAddress, wallet.publicKey);

      // Ensure admin ATA exists
      try {
        await getAccount(connection, adminUsdcAccount);
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          const ataIx = createAssociatedTokenAccountInstruction(wallet.publicKey, adminUsdcAccount, wallet.publicKey, usdcMintAddress);
          const transaction = new Transaction().add(ataIx);
          await wallet.sendTransaction(transaction, connection);
        } else {
          throw error;
        }
      }

      await program.methods
        .withdrawUsdc(new BN(amount))
        .accounts({
          presaleInfo: presaleInfoPda,
          presaleVaultUsdcAccount: presaleVaultUsdcAccount,
          admin: wallet.publicKey,
          adminUsdcAccount: adminUsdcAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      alert("USDC withdrawn successfully!");
    } catch (error) {
      console.error("Error withdrawing USDC:", error);
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

  const depositTokens = async () => {
    try {
      if (!amount || Number(amount) <= 0) {
        alert("Enter a valid amount to deposit");
        return;
      }
      setLoading(true);

      const program = getProgram();
      if (!program || !wallet.publicKey) {
        alert("Wallet not connected or program not loaded");
        return;
      }

      // Fetch presale info PDA and authority
      const presaleInfoAll = await program.account.presaleInfo.all();
      if (presaleInfoAll.length === 0) {
        alert("Presale not initialized");
        return;
      }
      const presaleInfo = presaleInfoAll[0];
      const presaleInfoPda = presaleInfo.publicKey;
      const authority = presaleInfo.account.authority;

      const mintPk = new PublicKey(ICO_MINT);

      // Derive admin ATA
      const adminAta = getAssociatedTokenAddressSync(mintPk, wallet.publicKey);

      // Derive presale ATA (owned by presaleInfo PDA, allowOwnerOffCurve)
      const [presaleAta] = PublicKey.findProgramAddressSync([Buffer.from("presale_token"), presaleInfoPda.toBuffer()], program.programId);
      // Derive presaleVault PDA
      const [presaleVaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault")], program.programId);

      // Prepare transaction to create admin ATA if missing
      const tx = new Transaction();

      // Check admin ATA exists, create if missing
      try {
        await connection.getTokenAccountBalance(adminAta);
      } catch {
        tx.add(createAssociatedTokenAccountInstruction(wallet.publicKey, adminAta, wallet.publicKey, mintPk));
      }

      // Send tx if needed
      if (tx.instructions.length > 0) {
        await Transaction(tx, connection);
      }

      // Call depositToken on chain, program will create presale ATA itself
      await program.methods
        .depositToken(new BN(Number(amount) * 1e9))
        .accounts({
          mintAccount: mintPk,
          tokenAccount: adminAta,
          admin: wallet.publicKey,
          toAssociatedTokenAccount: presaleAta,
          presaleVault: presaleVaultPda,
          presaleInfo: presaleInfoPda,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        })
        .rpc();

      alert("✅ Tokens deposited to presale vault!");
      await fetchIcoData();
      await refreshPresaleBalances();
    } catch (error) {
      console.error("Error depositing tokens:", error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative bg-[#E7FF53] pt-[80px] min-h-screen flex flex-col items-center justify-center transition-all" id="contact">
      {/* Big Solman text */}
      <div className="w-full flex justify-center">
        <h1 className="font-gorditas text-black text-[80px] sm:text-[120px] md:text-[180px] lg:text-[220px] xl:text-[260px] 2xl:text-[320px] leading-[90%] text-center tracking-tight mb-0 mt-4 select-none">
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
        <div className="mx-auto mt-4 max-w-[540px] rounded-2xl border-2 border-black bg-[#FEF200] px-6 py-8 shadow-xl">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src="./solman2.png" alt="Coin" className="w-8 h-8 object-contain" />
            <span className="text-black font-title-font text-2xl font-bold">BUY SOLMAN</span>
          </div>

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
                <button className="block text-center rounded-full font-bold text-lg py-2 px-3 text-yellow-500 bg-black w-full cursor-pointer">
                  CONNECT WALLET
                </button>
              )}
            </WalletMultiButton>
          </div>

          <div className="grid gap-4 grid-cols-2 mb-4">
            <div className="flex flex-col items-start rounded-lg border border-black bg-transparent p-3">
              <span className="text-xs text-black/70">Current price</span>
              <span className="font-bold text-lg">$0.00138</span>
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
          <div className="flex flex-col items-start rounded-lg border border-black bg-black text-yellow-500 p-3">
            <span className="text-xs text-white">Balance</span>
            <span className="font-bold text-lg">
              {userTokenBalance !== null ? userTokenBalance / 1e9 : "--"}
              <span className="ml-1.5 font-light text-sm">{`SOLMAN`}</span>
            </span>
          </div>
          <div className="grid gap-4 grid-cols-2 mt-4">
            <div>
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="font-semibold text-black">You send</span>
                <span className="text-black">$ 0.00000</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-black bg-transparent">
                <input className="outline-none w-[65%] bg-transparent p-3 placeholder:text-black" placeholder="at least 0.001" />
                <div className="flex items-center gap-1 pr-2">
                  <img src="./solman2.png" alt="USDT" className="w-6 h-6 object-contain" />
                  <span className="m-text font-bold">USDT</span>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="font-semibold text-black">You’ll receive</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-black bg-transparent">
                <input className="outline-none w-[65%] bg-transparent p-3 placeholder:text-black" placeholder="0" />
                <div className="flex items-center gap-1 pr-2">
                  <img src="./solman2.png" alt="LHUNT" className="w-6 h-6 object-contain" />
                  <span className="m-text font-bold">SOLMAN</span>
                </div>
              </div>
            </div>
          </div>

          <motion.button
            className="outline-2 outline-black mt-6 mb-2 p-0.5 rounded-full w-full relative"
            animate={buyControls}
            whileTap={{ scale: 1.12 }}
            onMouseEnter={handleBuyHover}
            onMouseLeave={handleBuyLeave}>
            <div className="block text-center rounded-full font-bold text-lg py-2 px-3 text-yellow-500 bg-black hover:bg-transparent w-full cursor-pointer hover:text-black">
              BUY
            </div>
          </motion.button>
          <motion.button
            className="outline-2 outline-black mt-2 mb-2 p-0.5 rounded-full w-full relative"
            animate={claimControls}
            whileTap={{ scale: 1.12 }}
            onMouseEnter={handleClaimHover}
            onMouseLeave={handleClaimLeave}>
            <div className="block text-center rounded-full font-bold text-lg py-2 px-3 hover:text-yellow-500 hover:bg-black bg-transparent w-full cursor-pointer text-black">
              CLAIM
            </div>
          </motion.button>
        </div>
      </div>
    </section>
  );
}
