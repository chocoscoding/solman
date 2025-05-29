"use client";
import React, { useState, useEffect } from "react";
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
import Progressbar from "../../components/progressbar/Progressbar2";
import { HermesClient } from "@pythnetwork/hermes-client";
import { FaSpinner } from "react-icons/fa";

// Dynamically import WalletMultiButton with SSR disabled
const WalletMultiButton = dynamic(() => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton), { ssr: false });

const ENV_PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID2;
// const ENV_ICO_MINT = process.env.NEXT_PUBLIC_ICO_MINT;
const ENV_ICO_MINT = "KhdTGv2Ve1AVioVfQimLd84G4RfDUXx7m3Qf27p2tz4";

// Program constants
const PROGRAM_ID = new PublicKey(ENV_PROGRAM_ID);
const ICO_MINT = new PublicKey(ENV_ICO_MINT);

function PresaleCountdown({ startTime, endTime }) {
  const [countdown, setCountdown] = useState("");
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    if (!startTime || !endTime) {
      setCountdown("");
      setIsOver(false);
      return;
    }
    let interval;
    function updateCountdown() {
      const now = Date.now();
      const start = new Date(new BN(startTime).toNumber());
      const end = new Date(new BN(endTime).toNumber());
      let target, label;

      if (now < start) {
        target = start;
        label = "Starts in";
        setIsOver(false);
      } else if (now < end) {
        target = end;
        label = "Ends in";
        setIsOver(false);
      } else {
        setCountdown("");
        setIsOver(true);
        return;
      }

      const diff = target - now;
      if (diff <= 0) {
        setCountdown(`${label}: 00 days 00 hours 00 minutes 00 seconds`);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(
        `${label}: ${days.toString().padStart(2, "0")} days ${hours.toString().padStart(2, "0")} hours ${minutes
          .toString()
          .padStart(2, "0")} minutes ${seconds.toString().padStart(2, "0")} secs`
      );
    }
    updateCountdown();
    interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  if (isOver) {
    return (
      <div className="mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-neutral-100 to-neutral-50 border border-neutral-300 shadow-sm flex flex-col items-center my-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🎉</span>
          <span className="text-xl font-bold text-blue-800">Presale Ended</span>
        </div>
        <div className="text-sm text-gray-600 font-normal text-center">
          <div>
            <span className="font-semibold">Started:</span>{" "}
            {new Date(new BN(startTime).toNumber()).toLocaleString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div>
            <span className="font-semibold">Ended:</span>{" "}
            {new Date(new BN(endTime).toNumber()).toLocaleString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    );
  }
  if (!countdown) return null;
  return <div className="mb-2 text-center text-lg font-bold text-green-700">{countdown}</div>;
}

export default function PresalePageClient() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [loading, setLoading] = useState(false);
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
      if (mainICO) {
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
      }
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

      let quoteAmountBN = new BN(amount * 1_000_000);

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
      const endTimestamp = startTimestamp + 30 * 24 * 60 * 60 * 1000; // 30 days in seconds

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

  // Add this at the top of your component if not already present:
  const [activeSection, setActiveSection] = React.useState("initialize");
  const showLoader = loading || wallet.connecting || wallet.disconnecting || !connection;

  if (!isAdmin) {
    //if user is not an admin
    return (
      <div className="py-6 flex flex-col items-center min-h-screen bg-gradient-to-br from-green-300 via-yellow-200 to-yellow-400 justify-center">
        <div className="w-full max-w-3xl">
          {/* DASHBOARD UPPER PANE */}
          <div className="bg-white shadow-lg rounded-t-3xl p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold mb-1">Presale</h1>
                <p>Connect wallet to continue</p>
              </div>
              <div className="flex justify-end mt-4 sm:mt-0">
                <WalletMultiButton
                  style={{
                    background: "#000000",
                    marginLeft: "3px",
                    borderRadius: "60px",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="py-6 flex flex-col items-center min-h-screen bg-gradient-to-br from-green-300 via-yellow-200 to-yellow-400">
      <div className="w-full max-w-3xl">
        {/* DASHBOARD UPPER PANE */}
        <div className="bg-white shadow-lg rounded-t-3xl p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">Presale Dashboard</h1>
              {wallet.connected && (
                <div className="text-sm text-gray-600">
                  <p>
                    Wallet: {wallet.publicKey.toString().slice(0, 8)}...{wallet.publicKey.toString().slice(-8)}
                  </p>
                  <p>
                    Status:{" "}
                    <span className={`font-semibold ${isAdmin ? "text-green-600" : "text-blue-600"}`}>{isAdmin ? "Admin" : "User"}</span>
                  </p>
                  <p>
                    <span className="text-gray-600">Your Token Balance:</span>{" "}
                    <span className="font-semibold">
                      {isAdmin ? (Number(userTokenBalance) / 1e9).toFixed(2) : new BN(userIcoData?.buyTokenAmount).toNumber()} tokens
                    </span>
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-4 sm:mt-0">
              <WalletMultiButton
                style={{
                  background: "#000000",
                  marginLeft: "3px",
                  borderRadius: "60px",
                }}
              />
            </div>
          </div>

          {showLoader ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <FaSpinner className="animate-spin text-4xl text-gray-700 mb-2" />
              <div className="text-gray-700 text-lg font-semibold">Loading admin panel...</div>
            </div>
          ) : (
            <>
              {/* ICO DATA AND PRESALE DATA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="text-xs text-gray-500">USDC Balance</div>
                  <div className="font-bold text-lg">
                    {presaleUsdcBalance !== null && presaleUsdcBalance !== undefined ? presaleUsdcBalance.toString() : "--"}{" "}
                    <span className="text-xs font-normal">USDC</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="text-xs text-gray-500">SOL Balance</div>
                  <div className="font-bold text-lg">
                    {presaleSolBalance !== null && presaleSolBalance !== undefined ? presaleSolBalance.toString() : "--"}{" "}
                    <span className="text-xs font-normal">SOL</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="text-xs text-gray-500">Deposited Token</div>
                  <div className="font-bold text-lg">
                    {icoData ? icoData.depositTokenAmount.toString() : "--"} <span className="text-xs font-normal">tokens</span>
                  </div>
                </div>
              </div>
              {/* PRESALE STATUS */}
              <div className={`mt-4 p-4 rounded-lg border ${icoData?.isLive ? "bg-gray-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                  <div className="w-full">
                    <div className="font-semibold text-lg mb-1">Presale Status</div>
                    <div className="grid grid-cols-2 gap-2 text-sm my-2">
                      <div>
                        <div className="text-gray-600">Total Supply</div>
                        <div className="font-medium">{icoData ? icoData.depositTokenAmount.toString() : "--"} tokens</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Tokens Sold</div>
                        <div className="font-medium">{icoData?.soldTokenAmount ? icoData.soldTokenAmount.toString() : "0"} tokens</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Token Price</div>
                        <div className="font-medium">
                          {icoData?.pricePerToken ?? "--"} USDC
                          {solPriceInUsdc && icoData?.pricePerToken && (
                            <span className="ml-2 text-xs text-gray-500">(~{(icoData.pricePerToken / solPriceInUsdc).toFixed(4)} SOL)</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Available</div>
                        <div className="font-medium">
                          {icoData ? (icoData.depositTokenAmount - icoData.soldTokenAmount).toString() : "--"} tokens
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 sm:mt-0">
                  {icoData?.isLive ? (
                    <PresaleCountdown startTime={icoData.startTime} endTime={icoData.endTime} />
                  ) : (
                    <div className="text-center font-medium text-red-600">Presale is not live yet</div>
                  )}
                </div>
                {icoData && (
                  <div className="mt-4">
                    <Progressbar
                      done={
                        icoData.depositTokenAmount && Number(icoData.depositTokenAmount) !== 0
                          ? (parseFloat(icoData.soldTokenAmount ?? 0) / parseFloat(icoData.depositTokenAmount)) * 100
                          : 0
                      }
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* MINI NAVIGATION */}
        {wallet.connected && isAdmin && (
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
              className={`px-4 py-2 rounded-lg cursor-pointer ${
                activeSection === "start" ? "bg-green-600 text-white" : "bg-white border"
              } ${!icoData ? "opacity-50 cursor-not-allowed" : ""}`}>
              Start Presale
            </button>
            <button
              onClick={() => icoData && setActiveSection("update")}
              disabled={!icoData}
              className={`px-4 py-2 rounded-lg cursor-pointer ${
                activeSection === "update" ? "bg-neutral-700 text-white" : "bg-white border"
              } ${!icoData ? "opacity-50 cursor-not-allowed" : ""}`}>
              Update Presale
            </button>
            <button
              onClick={() => icoData && setActiveSection("deposit")}
              disabled={!icoData}
              className={`px-4 py-2 rounded-lg cursor-pointer ${
                activeSection === "deposit" ? "bg-indigo-600 text-white" : "bg-white border"
              } ${!icoData ? "opacity-50 cursor-not-allowed" : ""}`}>
              Deposit Token
            </button>
            <button
              onClick={() => icoData && setActiveSection("withdrawSol")}
              disabled={!icoData}
              className={`px-4 py-2 rounded-lg cursor-pointer ${
                activeSection === "withdrawSol"
                  ? "bg-gradient-to-r from-purple-500 to-green-400 text-white rounded-lg hover:from-purple-600 hover:to-green-500"
                  : "bg-white border"
              } ${!icoData ? "opacity-50 cursor-not-allowed" : ""}`}>
              Withdraw SOL
            </button>
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
              className={`px-4 py-2 rounded-lg cursor-pointer ${
                activeSection === "withdrawUsdc" ? "bg-sky-600 text-white" : "bg-white border"
              } ${!icoData ? "opacity-50 cursor-not-allowed" : ""}`}>
              Withdraw USDC
            </button>
          </div>
        )}

        {/* CURRENT SECTION VIEW */}
        <div className="bg-white shadow-lg rounded-b-3xl p-6 min-h-[200px]">
          {/* Not Connected State */}
          {!wallet.connected && <div className="text-center text-gray-600">Connect your wallet to get started.</div>}

          {/* Admin Views */}
          {wallet.connected && isAdmin && (
            <>
              {activeSection === "dashboard" && (
                <div className="text-center text-gray-500">Select an action from the navigation above.</div>
              )}
              {activeSection === "initialize" && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Initialize Presale</h3>
                  {icoData ? (
                    <div className="mt-4 text-center">
                      <div className="text-green-700 text-lg font-semibold flex items-center justify-center gap-2">
                        <span>✅</span>
                        <span>Initialized successfully</span>
                      </div>
                      <div className="mt-2 text-gray-700">You are ready to go! Move to the other sections to continue.</div>
                    </div>
                  ) : (
                    <button
                      onClick={createPresale}
                      disabled={loading}
                      className="w-full p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors mb-1">
                      {loading ? "Initializing..." : "Initialize Presale"}
                    </button>
                  )}
                </div>
              )}
              {activeSection === "start" && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Start Presale</h3>
                  {icoData?.isLive ? (
                    <>
                      <button
                        onClick={startPresale}
                        disabled={loading}
                        className="w-full p-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors mb-3">
                        {loading ? "Starting..." : "Start Presale"}
                      </button>
                      <div className="text-gray-700 mt-2 text-center">
                        Once you click <span className="font-semibold">Start Presale</span>, your project will go live and become buyable
                        for users between <span className="font-mono">{new Date(Date.now()).toLocaleString()}</span> and{" "}
                        <span className="font-mono">{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleString()}</span>.<br />
                        You can change these dates later in the <span className="font-semibold">Update Presale</span> section.
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center mt-4">
                      <span className="text-2xl mb-2">✅</span>
                      <div className="text-green-700 font-semibold text-lg">Presale is live and has started!</div>
                      <div className="text-gray-700 mt-1 text-center">
                        You can update presale data in the <span className="font-semibold">Update Presale</span> section.
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activeSection === "update" && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Update Presale Parameters</h3>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="maxTokenAmountPerAddress">
                    Max tokens per address
                  </label>
                  <input
                    id="maxTokenAmountPerAddress"
                    type="number"
                    value={maxTokenAmountPerAddress}
                    onChange={(e) => setMaxTokenAmountPerAddress(e.target.value)}
                    placeholder="Max tokens per address"
                    className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 mb-2"
                  />
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="pricePerToken">
                    Price per token (in USDC)
                  </label>
                  <input
                    id="pricePerToken"
                    type="number"
                    value={pricePerToken}
                    onChange={(e) => setPricePerToken(e.target.value)}
                    placeholder="Price per token (in USDC)"
                    className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 mb-2"
                  />
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="startTime">
                    Start time
                  </label>
                  <input
                    id="startTime"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="Start time"
                    className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 mb-2"
                  />
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="endTime">
                    End time
                  </label>
                  <input
                    id="endTime"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="End time"
                    className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800 mb-4"
                  />
                  <button
                    onClick={updatePresale}
                    disabled={loading}
                    className="w-full p-2.5 bg-neutral-600 text-white rounded-lg hover:bg-neutral-700 disabled:bg-gray-400 transition-colors">
                    {loading ? "Updating..." : "Update Presale"}
                  </button>
                </div>
              )}
              {activeSection === "deposit" && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Deposit Tokens</h3>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount to deposit"
                    className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-indigo-800 focus:border-indigo-800 mb-4"
                  />
                  <button
                    onClick={depositTokens}
                    disabled={loading}
                    className="w-full p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors">
                    {loading ? "Depositing..." : "Deposit Tokens"}
                  </button>
                </div>
              )}
              {activeSection === "withdrawSol" && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Withdraw SOL</h3>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount to withdraw (SOL)"
                    className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-purple-800 focus:border-purple-800 mb-4"
                  />
                  <button
                    onClick={withdrawSol}
                    disabled={loading}
                    className="w-full p-2.5 bg-gradient-to-r from-purple-500 to-green-400 text-white rounded-lg hover:from-purple-600 hover:to-green-500 disabled:bg-gray-400 transition-colors">
                    {loading ? "Withdrawing..." : "Withdraw SOL"}
                  </button>
                </div>
              )}
              {activeSection === "withdrawToken" && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Withdraw Tokens</h3>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount to withdraw (tokens)"
                    className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-yellow-800 focus:border-yellow-800 mb-4"
                  />
                  <button
                    onClick={withdrawToken}
                    disabled={loading}
                    className="w-full p-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors">
                    {loading ? "Withdrawing..." : "Withdraw Tokens"}
                  </button>
                </div>
              )}
              {activeSection === "withdrawUsdc" && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Withdraw USDC</h3>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount to withdraw (USDC)"
                    className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-sky-800 focus:border-sky-800 mb-4"
                  />
                  <button
                    onClick={withdrawUsdc}
                    disabled={loading}
                    className="w-full p-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:bg-gray-400 transition-colors">
                    {loading ? "Withdrawing..." : "Withdraw USDC"}
                  </button>
                </div>
              )}
              {loading && <div className="text-center animate-pulse text-gray-600 mt-4">Processing transaction...</div>}
            </>
          )}

          {/* User View */}
          {wallet.connected && !isAdmin && icoData && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Buy Tokens</h3>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount to buy"
                className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-blue-800 focus:border-blue-800 mb-4"
              />
              <button
                onClick={() => buyTokens()}
                disabled={loading || !icoData}
                className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors mb-2">
                {loading ? "Processing..." : "Buy with USDC"}
              </button>
              {icoData && icoData.soldTokenAmount > 0 && (
                <button
                  onClick={claimTokens}
                  disabled={loading}
                  className="w-full p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors">
                  {loading ? "Claiming..." : "Claim Tokens"}
                </button>
              )}
              {loading && <div className="text-center animate-pulse text-gray-600 mt-4">Processing transaction...</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
