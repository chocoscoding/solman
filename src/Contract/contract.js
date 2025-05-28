export const runtime = "edge";

import { Connection, PublicKey, Transaction, SystemProgram, Keypair, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  mintTo,
  transfer,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  createMintToInstruction,
  createTransferInstruction,
} from "@solana/spl-token";
import {
  address,
  createSolanaClient,
  signTransactionMessageWithSigners,
  createKeyPairSignerFromBytes,
  createKeyPairFromBytes,
  createKeyPairFromPrivateKeyBytes,
  createKeypairFromBase58,
} from "gill";
import { buildTransferTokensTransaction } from "gill/programs/token";
import bs58 from "bs58";
import { install } from "@solana/webcrypto-ed25519-polyfill";
install();
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const OWNER_ACCOUNT = new PublicKey("3JFwGRwwY6UMo4bGt4sFnLLTmxg5iyoMuNKQPf6oAucF");
const ADMIN_ACCOUNT = new PublicKey("2pvgznLM7CfzUmC5NJdbFx3dyHroMPw6Z4VvNTN5rw3v");
const ICO_MINT_ADDRESS = new PublicKey("KhdTGv2Ve1AVioVfQimLd84G4RfDUXx7m3Qf27p2tz4");
const USDC_MINT_ADDRESS = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // Replace with actual USDC mint address
const TOKEN_DECIMALS = 1_000_000_000; // 10^9 for SPL token decimals
const LAMPORTS_PER_TOKEN = 1_000_000; // 0.001 SOL in lamports

const { rpc } = createSolanaClient({
  urlOrMoniker: "https://api.devnet.solana.com",
});

export async function mintTokensToSelf(owner, amount, signTransaction) {
  if (!owner.equals(OWNER_ACCOUNT)) {
    throw new Error("Unauthorized: Only the owner can mint tokens to itself.");
  }

  try {
    // Get or create the token account for the owner
    const ownerTokenAccount = await getOrCreateAssociatedTokenAccount(connection, owner, ICO_MINT_ADDRESS, owner);

    // Mint tokens to the owner's token account
    const transaction = new Transaction().add(
      createMintToInstruction(
        ICO_MINT_ADDRESS, // Mint address
        ownerTokenAccount.address, // Destination token account
        owner, // Authority
        amount * TOKEN_DECIMALS, // Amount to mint
        [] // Signers (none needed for this case)
      )
    );

    // Set transaction details
    const blockHash = await connection.getLatestBlockhash();
    transaction.feePayer = owner;
    transaction.recentBlockhash = blockHash.blockhash;

    // Sign and send the transaction
    const signedTransaction = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    await connection.confirmTransaction({
      blockhash: blockHash.blockhash,
      lastValidBlockHeight: blockHash.lastValidBlockHeight,
      signature,
    });

    console.log(`Minted ${amount} tokens to the owner's token account.`);
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  } catch (error) {
    console.error("Error in mintTokensToSelf:", error);
    throw error;
  }
}

export async function transferTokensToAdmin(owner, amount, signTransaction) {
  if (!owner.equals(OWNER_ACCOUNT)) {
    throw new Error("Unauthorized: Only the owner can transfer tokens to the admin.");
  }

  try {
    // Get or create the token accounts for the owner and admin
    const ownerTokenAccount = await getOrCreateAssociatedTokenAccount(connection, owner, ICO_MINT_ADDRESS, owner);
    const adminTokenAccount = await getOrCreateAssociatedTokenAccount(connection, owner, ICO_MINT_ADDRESS, ADMIN_ACCOUNT);

    // Transfer tokens from the owner's token account to the admin's token account
    const transaction = new Transaction().add(
      transfer(
        connection,
        owner,
        ownerTokenAccount.address, // Source token account
        adminTokenAccount.address, // Destination token account
        owner, // Authority
        amount * TOKEN_DECIMALS, // Amount to transfer
        [], // Signers (none needed for this case)
        TOKEN_PROGRAM_ID // Explicitly set the program ID
      )
    );

    // Set transaction details
    const blockHash = await connection.getLatestBlockhash();
    transaction.feePayer = owner;
    transaction.recentBlockhash = blockHash.blockhash;

    // Sign and send the transaction
    const signedTransaction = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    await connection.confirmTransaction({
      blockhash: blockHash.blockhash,
      lastValidBlockHeight: blockHash.lastValidBlockHeight,
      signature,
    });

    console.log(`Transferred ${amount} tokens from the owner to the admin.`);
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  } catch (error) {
    console.error("Error in transferTokensToAdmin:", error);
    throw error;
  }
}

export async function buyTokens(user, tokenAmount, signTransaction) {
  const solAmount = tokenAmount * LAMPORTS_PER_TOKEN; // Calculate the equivalent SOL amount

  try {
    // Get or create the token accounts for the user and admin
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(connection, user, ICO_MINT_ADDRESS, user);
    const adminTokenAccount = await getOrCreateAssociatedTokenAccount(connection, ADMIN_ACCOUNT, ICO_MINT_ADDRESS, ADMIN_ACCOUNT);
    const { signer: adminSigner, keypair: adminKeyPair } = await signerPromise;
    console.log(adminKeyPair);

    // Create a single transaction with both SOL and token transfer instructions
    const transaction = new Transaction().add(
      // SOL transfer instruction
      SystemProgram.transfer({
        fromPubkey: user,
        toPubkey: ADMIN_ACCOUNT,
        lamports: solAmount,
      }),
      // Token transfer instruction
      createTransferInstruction(
        adminTokenAccount.address, // Source token account (admin's)
        userTokenAccount.address, // Destination token account (user's)
        ADMIN_ACCOUNT, // Authority (admin)
        tokenAmount * TOKEN_DECIMALS, // Amount to transfer
        [adminKeyPair.publicKey], // No additional signers needed here
        TOKEN_PROGRAM_ID // Explicitly set the program ID
      )
    );

    // Set transaction details
    const blockHash = await connection.getLatestBlockhash();
    transaction.feePayer = user;
    transaction.recentBlockhash = blockHash.blockhash;

    // Use the admin keypair to sign the transaction
    transaction.partialSign(adminKeyPair);

    // Then sign the transaction with the user's key
    const signedTransaction = await signTransaction(transaction);

    const finalSignature = await connection.sendRawTransaction(signedTransaction.serialize());
    await connection.confirmTransaction({
      blockhash: blockHash.blockhash,
      lastValidBlockHeight: blockHash.lastValidBlockHeight,
      signature: finalSignature,
    });

    console.log(`Transaction successful. Transferred ${solAmount} lamports and ${tokenAmount} tokens. Signature: ${finalSignature}`);
    return `https://explorer.solana.com/tx/${finalSignature}?cluster=devnet`;
  } catch (error) {
    console.error("Error in buyTokens:", error);
    throw new Error("Transaction failed. Both SOL and token transfers were rolled back.");
  }
}

/**
 * Allow users to buy tokens using USDC.
 * @param {PublicKey} user - The public key of the user making the purchase.
 * @param {number} tokenAmount - The number of tokens to purchase.
 * @param {Function} signTransaction - Function to sign the transaction.
 * @returns {Promise<string>} The transaction signature or an error.
 */
export async function buyTokensWithUSDC(user, tokenAmount, signTransaction) {
  const usdcAmount = tokenAmount * LAMPORTS_PER_TOKEN; // Calculate the equivalent USDC amount

  try {
    // Get or create the token accounts for the user and admin
    const userUSDCAccount = await getOrCreateAssociatedTokenAccount(connection, user, USDC_MINT_ADDRESS, user);
    const adminUSDCAccount = await getOrCreateAssociatedTokenAccount(connection, ADMIN_ACCOUNT, USDC_MINT_ADDRESS, ADMIN_ACCOUNT);
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(connection, user, ICO_MINT_ADDRESS, user);
    const adminTokenAccount = await getOrCreateAssociatedTokenAccount(connection, ADMIN_ACCOUNT, ICO_MINT_ADDRESS, ADMIN_ACCOUNT);
    const { signer: adminSigner, keypair: adminKeyPair } = await signerPromise;

    // Create a transaction with both USDC transfer and token transfer instructions
    const transaction = new Transaction().add(
      // USDC transfer instruction
      createTransferInstruction(
        userUSDCAccount.address, // Source token account (user's)
        adminUSDCAccount.address, // Destination token account (admin's)
        user, // Authority (user)
        usdcAmount, // Amount to transfer
        [], // No additional signers needed
        TOKEN_PROGRAM_ID // Explicitly set the program ID
      ),
      // Token transfer instruction
      createTransferInstruction(
        adminTokenAccount.address, // Source token account (admin's)
        userTokenAccount.address, // Destination token account (user's)
        ADMIN_ACCOUNT, // Authority (admin)
        tokenAmount * TOKEN_DECIMALS, // Amount to transfer
        [adminKeyPair.publicKey],
        TOKEN_PROGRAM_ID // Explicitly set the program ID
      )
    );

    // Set transaction details
    const blockHash = await connection.getLatestBlockhash();
    transaction.feePayer = user;
    transaction.recentBlockhash = blockHash.blockhash;

    // Use the admin keypair to sign the transaction
    transaction.partialSign(adminKeyPair);

    // Then sign the transaction with the user's key
    const signedTransaction = await signTransaction(transaction);

    const finalSignature = await connection.sendRawTransaction(signedTransaction.serialize());
    await connection.confirmTransaction({
      blockhash: blockHash.blockhash,
      lastValidBlockHeight: blockHash.lastValidBlockHeight,
      signature: finalSignature,
    });

    console.log(`User ${user.toBase58()} bought ${tokenAmount} tokens using USDC.`);
    return `https://explorer.solana.com/tx/${finalSignature}?cluster=devnet`;
  } catch (error) {
    console.error("Error in buyTokensWithUSDC:", error);
    throw new Error("Transaction failed. USDC and token transfers were rolled back.");
  }
}

/**
 * Vested buy with USDC: Buy tokens using USDC and vest them.
 * @param {PublicKey} user - The public key of the user making the purchase.
 * @param {number} tokenAmount - The number of tokens to purchase.
 * @param {number} usdAmount - The equivalent amount in USDC.
 * @param {Function} signTransaction - Function to sign the transaction.
 * @returns {Promise<string>} The transaction signature or an error.
 */
export async function vestedBuyWithUSDC(user, tokenAmount, usdAmount, signTransaction) {
  const userPublicKey = user.toBase58();
  let oldRecord = null;

  try {
    // Fetch existing record for the user
    const supabase = await getSupabaseClient();
    const { data: existingRecord, error: fetchError } = await supabase
      .from("tokens")
      .select("token_amount, usd_amount")
      .eq("user_public_key", userPublicKey)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw new Error("Error fetching existing record: " + fetchError.message);
    }

    // Save the old state
    oldRecord = existingRecord || null;

    // Calculate new values
    const newTokenAmount = existingRecord ? existingRecord.token_amount + tokenAmount : tokenAmount;
    const newUsdAmount = existingRecord ? existingRecord.usd_amount + usdAmount : usdAmount;

    // Prepare database update
    const { error: upsertError } = await supabase.from("tokens").upsert({
      user_public_key: userPublicKey,
      token_amount: newTokenAmount,
      usd_amount: newUsdAmount,
    });

    if (upsertError) {
      throw new Error("Error upserting vesting record: " + upsertError.message);
    }

    // Transfer USDC from the user to the admin
    const userUSDCAccount = await getOrCreateAssociatedTokenAccount(connection, user, USDC_MINT_ADDRESS, user);
    const transaction = new Transaction().add(
      createTransferInstruction(
        userUSDCAccount.address, // Source token account (user's)
        ADMIN_ACCOUNT, // Destination token account (admin's)
        user, // Authority (user)
        usdAmount, // Amount to transfer
        [], // No additional signers needed
        TOKEN_PROGRAM_ID // Explicitly set the program ID
      )
    );

    // Set transaction details
    const blockHash = await connection.getLatestBlockhash();
    transaction.feePayer = user;
    transaction.recentBlockhash = blockHash.blockhash;

    // Sign and send the transaction
    const signedTransaction = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    await connection.confirmTransaction({
      blockhash: blockHash.blockhash,
      lastValidBlockHeight: blockHash.lastValidBlockHeight,
      signature,
    });

    console.log(`Vested buy with USDC recorded for user ${userPublicKey}.`);
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  } catch (error) {
    console.error("Error in vestedBuyWithUSDC:", error);

    // Revert database changes if blockchain transaction fails
    if (oldRecord) {
      // Restore old state
      await supabase.from("tokens").upsert(oldRecord);
    } else {
      // Delete the new record if it was previously null
      await supabase.from("tokens").delete().eq("user_public_key", userPublicKey);
    }

    throw error;
  }
}

/**
 * Vested buy with SOL: Buy tokens using SOL and vest them.
 * @param {PublicKey} user - The public key of the user making the purchase.
 * @param {number} tokenAmount - The number of tokens to purchase.
 * @param {number} solAmount - The amount of SOL used for the purchase.
 * @param {Function} signTransaction - Function to sign the transaction.
 * @returns {Promise<string>} The transaction signature or an error.
 */
export async function vestedBuyWithSOL(user, tokenAmount, solAmount, signTransaction) {
  const userPublicKey = user.toBase58();
  let oldRecord = null;

  try {
    // Fetch existing record for the user
    const supabase = await getSupabaseClient();
    const { data: existingRecord, error: fetchError } = await supabase
      .from("tokens")
      .select("token_amount, sol_amount")
      .eq("user_public_key", userPublicKey)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw new Error("Error fetching existing record: " + fetchError.message);
    }

    // Save the old state
    oldRecord = existingRecord || null;

    // Calculate new values
    const newTokenAmount = existingRecord ? existingRecord.token_amount + tokenAmount : tokenAmount;
    const newSolAmount = existingRecord ? existingRecord.sol_amount + solAmount : solAmount;

    // Prepare database update
    const { error: upsertError } = await supabase.from("tokens").upsert({
      user_public_key: userPublicKey,
      token_amount: newTokenAmount,
      sol_amount: newSolAmount,
    });

    if (upsertError) {
      throw new Error("Error upserting vesting record: " + upsertError.message);
    }

    // Transfer SOL from the user to the admin
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: user,
        toPubkey: ADMIN_ACCOUNT,
        lamports: solAmount,
      })
    );

    // Set transaction details
    const blockHash = await connection.getLatestBlockhash();
    transaction.feePayer = user;
    transaction.recentBlockhash = blockHash.blockhash;

    // Sign and send the transaction
    const signedTransaction = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    await connection.confirmTransaction({
      blockhash: blockHash.blockhash,
      lastValidBlockHeight: blockHash.lastValidBlockHeight,
      signature,
    });

    console.log(`Vested buy with SOL recorded for user ${userPublicKey}.`);
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  } catch (error) {
    console.error("Error in vestedBuyWithSOL:", error);

    // Revert database changes if blockchain transaction fails
    if (oldRecord) {
      // Restore old state
      await supabase.from("tokens").upsert(oldRecord);
    } else {
      // Delete the new record if it was previously null
      await supabase.from("tokens").delete().eq("user_public_key", userPublicKey);
    }

    throw error;
  }
}

export function checkRole(account) {
  if (account === OWNER_ACCOUNT) {
    return "Owner";
  } else if (account === ADMIN_ACCOUNT) {
    return "Admin";
  } else {
    return "User";
  }
}

export async function isAdmin(account) {
  return account === ADMIN_ACCOUNT;
}

export async function isOwner(account) {
  return account === OWNER_ACCOUNT;
}
