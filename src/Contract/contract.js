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
const TOKEN_DECIMALS = 1_000_000_000; // 10^9 for SPL token decimals
const LAMPORTS_PER_TOKEN = 1_000_000; // 0.001 SOL in lamports
const adminKeypair = Keypair.fromSecretKey(
  bs58.decode("3CtWL2ZcssH53esnwFfoYW63snKzvtKGyQJqpSzqCJg3kMEK7L9i7pTej1QK72K4xGaeHqTNWy3ZQ5WUPGZLc9bE")
);

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
