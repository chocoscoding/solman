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
import { notFound } from "next/navigation";

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

  useEffect(() => {
    if (!startTime || !endTime) {
      setCountdown("");
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
      } else if (now < end) {
        target = end;
        label = "Ends in";
      } else {
        setCountdown("");
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

  if (!countdown) return null;
  return <div className="mb-2 text-center text-lg font-bold text-green-700">{countdown}</div>;
}

export default function PresalePageClient() {
  const { connection } = useConnection();
  const wallet = useWallet();

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

  // Throw notFound if user is not admin
  useEffect(() => {
    if (!loading && wallet.connected && !isAdmin) {
      notFound();
    }
  }, [loading, wallet.connected, isAdmin]);

  return (
    <div className="py-6 flex flex-col justify-center sm:py-12 min-h-screen bg-gradient-to-br from-green-300 via-yellow-200 to-yellow-400">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative p-4 bg-gray-50 shadow-lg sm:rounded-3xl">
          <div className="max-w-md mx-2">
            <div className="divide-y divide-gray-200">
              {/* Header Section */}
              <div className="pb-4">
                <div className="flex justify-between items-center">
                  <h1 className="text-2xl font-bold">Presale Page</h1>
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
                      <span className={`font-semibold ${isAdmin ? "text-green-600" : "text-blue-600"}`}>{isAdmin ? "Admin" : "User"}</span>
                    </p>
                    <p className="mt-2 p-2 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Your Token Balance:</span>{" "}
                      <span className="font-semibold">
                        {isAdmin ? (Number(userTokenBalance) / 1e9).toFixed(2) : new BN(userIcoData?.buyTokenAmount).toNumber()} tokens
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Main Content */}
              {wallet.connected && (
                <div className="py-6">
                  {/* Always show balances for admin, or for anyone if icoData exists */}
                  {(isAdmin || icoData) && (
                    <div className={`mb-2 p-4 rounded-lg border border-gray-200 bg-red-50"`}>
                      <h2 className="text-lg font-semibold mb-3">ICO Status</h2>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">USDC balance</p>
                          <p>
                            {/* Show empty string if presale not initialized */}
                            {presaleUsdcBalance !== null && presaleUsdcBalance !== undefined ? presaleUsdcBalance.toString() : "--"}{" "}
                            <span className="font-medium">USDC</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">SOL balance</p>
                          <p className="">
                            {presaleSolBalance !== null && presaleSolBalance !== undefined ? presaleSolBalance.toString() : "--"}{" "}
                            <span className="font-medium">SOL</span>
                          </p>
                        </div>
                        {icoData && (
                          <div>
                            <p className="text-gray-600">Deposited Token</p>
                            <p className="font-medium">{icoData.depositTokenAmount.toString()} tokens</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ICO Status Display */}
                  {icoData ? (
                    <div className={`mb-2 p-4 rounded-lg border border-gray-200 ${icoData.isLive ? "bg-gray-50" : "bg-red-50"}`}>
                      <h2 className="text-lg font-semibold mb-3">Presale Status</h2>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Total Supply</p>
                          <p className="font-medium">{icoData.depositTokenAmount.toString()} tokens</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Tokens Sold</p>
                          <p className="font-medium">{icoData.soldTokenAmount ? icoData.soldTokenAmount.toString() : "0"} tokens</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Token Price</p>
                          <p className="font-medium">
                            {icoData.pricePerToken} USDC
                            {solPriceInUsdc && (
                              <span className="ml-2 text-xs text-gray-500">
                                (~{(icoData.pricePerToken / solPriceInUsdc).toFixed(4)} SOL)
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Available</p>
                          <p className="font-medium">{(icoData.depositTokenAmount - icoData.soldTokenAmount).toString()} tokens</p>
                        </div>
                      </div>
                      <br />{" "}
                      <div>
                        {icoData?.isLive ? (
                          <PresaleCountdown startTime={icoData.startTime} endTime={icoData.endTime} />
                        ) : (
                          <p className="mb-2 text-center font-medium text-red-600">Presale is not live yet</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    isAdmin && (
                      <>
                        <div className="mb-2 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-yellow-700">Presale needs to be initialized</p>
                        </div>
                        {icoData ? null : (
                          <button
                            onClick={createPresale}
                            disabled={loading}
                            className="w-full p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors mb-6">
                            {loading ? "Initializing..." : "Initialize Presale"}
                          </button>
                        )}
                      </>
                    )
                  )}
                  {/* Progress Bar Section */}
                  {icoData && (
                    <div className="mb-6">
                      <Progressbar
                        done={
                          icoData.depositTokenAmount && Number(icoData.depositTokenAmount) !== 0
                            ? (parseFloat(icoData.soldTokenAmount ?? 0) / parseFloat(icoData.depositTokenAmount)) * 100
                            : 0
                        }
                      />
                    </div>
                  )}

                  {/* Action Section */}
                  <div className="space-y-4">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={isAdmin ? "Amount to initialize or deposit" : "Amount to buy"}
                      className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800"
                      min="1"
                      step="1"
                    />

                    {isAdmin ? (
                      <>
                        {isAdmin && !icoData?.isLive && (
                          <button
                            onClick={startPresale}
                            disabled={loading}
                            className="w-full p-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors">
                            {loading ? "Starting..." : "Start Presale"}
                          </button>
                        )}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Update Presale Parameters</h3>
                          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="maxTokenAmountPerAddress">
                            Max tokens per address
                          </label>
                          <input
                            id="maxTokenAmountPerAddress"
                            type="number"
                            value={maxTokenAmountPerAddress}
                            onChange={(e) => setMaxTokenAmountPerAddress(e.target.value)}
                            placeholder="Max tokens per address"
                            className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800"
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
                            className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800"
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
                            className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800"
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
                            className="w-full p-2 outline-none border rounded-lg focus:ring-1 focus:ring-green-800 focus:border-green-800"
                          />
                          <button
                            onClick={updatePresale}
                            disabled={loading}
                            className="w-full p-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors">
                            {loading ? "Updating..." : "Update Presale"}
                          </button>
                        </div>

                        <button
                          onClick={withdrawSol}
                          disabled={loading}
                          className="w-full p-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors">
                          {loading ? "Withdrawing..." : "Withdraw SOL"}
                        </button>

                        <button
                          onClick={depositTokens}
                          disabled={loading}
                          className="w-full p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors">
                          {loading ? "Depositing..." : "Deposit Tokens"}
                        </button>
                        <button
                          onClick={withdrawToken}
                          disabled={loading}
                          className="w-full p-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors">
                          {loading ? "Withdrawing..." : "Withdraw Tokens"}
                        </button>
                        <button
                          onClick={withdrawUsdc}
                          disabled={loading}
                          className="w-full p-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-400 transition-colors">
                          {loading ? "Withdrawing..." : "Withdraw USDC"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => buyTokens()}
                          disabled={loading || !icoData}
                          className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors">
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
                      </>
                    )}

                    {/* Transaction Status */}
                    {loading && <div className="text-center animate-pulse text-gray-600">Processing transaction...</div>}
                  </div>
                </div>
              )}

              {/* Not Connected State */}
              {!wallet.connected && <div className="text-center text-gray-600">Connect your wallet to participate in the presale.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
