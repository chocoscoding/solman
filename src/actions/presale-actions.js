"use server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

/**
 * Create a Supabase client using cookies.
 * @returns {Promise<Object>} The Supabase client.
 */
export async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

/**
 * Get a row by ID from the 'listing' table.
 * @param {number} id - The ID of the row to fetch.
 * @returns {Promise<Object>} The row data or an error.
 */
export async function getRowById(id) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from("listing").select("*").eq("id", id).single();

  if (error) {
    console.error("Error fetching row by ID:", error);
    throw error;
  }

  return data;
}

/**
 * Upsert (insert or update) the startSale and endSale columns.
 * @param {number} id - The ID of the row to upsert.
 * @param {string} startSale - The new startSale timestamp.
 * @param {string} endSale - The new endSale timestamp.
 * @returns {Promise<Object>} The updated row data or an error.
 */
export async function upsertSaleDates(id, startSale, endSale) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from("listing").upsert({ id, startSale, endSale }).select().single();

  if (error) {
    console.error("Error upserting sale dates:", error);
    throw error;
  }

  return data;
}

/**
 * Upsert (insert or update) the totalDeposit column.
 * @param {number} id - The ID of the row to upsert.
 * @param {number} totalDeposit - The new totalDeposit value.
 * @returns {Promise<Object>} The updated row data or an error.
 */
export async function upsertTotalDeposit(id, totalDeposit) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from("listing").upsert({ id, totalDeposit }).select().single();

  if (error) {
    console.error("Error upserting total deposit:", error);
    throw error;
  }

  return data;
}

export async function upsertLockDuration(id, totalDeposit) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from("listing").upsert({ id, totalDeposit }).select().single();

  if (error) {
    console.error("Error upserting total deposit:", error);
    throw error;
  }

  return data;
}

/**
 * Record or update a token purchase in the 'tokens' table.
 * If the user already exists, add to their totals. Otherwise, create a new row.
 * @param {string} userPublicKey - The public key of the user making the purchase.
 * @param {number} tokenAmount - The number of tokens purchased.
 * @param {number} solAmount - The amount of SOL used for the purchase.
 * @param {number} usdAmount - The equivalent amount in USDC.
 * @returns {Promise<Object>} The upserted row data or an error.
 */
export async function upsertPurchase(userPublicKey, tokenAmount, solAmount, usdAmount) {
  const supabase = await getSupabaseClient();

  // Check if the user already exists
  const { data: existing, error: fetchError } = await supabase.from("tokens").select("*").eq("user_public_key", userPublicKey).single();

  if (fetchError && fetchError.code !== "PGRST116") {
    // PGRST116: No rows found
    console.error("Error checking existing purchase:", fetchError);
    throw fetchError;
  }

  let newData;
  if (existing) {
    // Add to existing totals
    newData = {
      user_public_key: userPublicKey,
      token_amount: (existing.token_amount || 0) + tokenAmount,
      sol_amount: (existing.sol_amount || 0) + solAmount,
      usd_amount: (existing.usd_amount || 0) + usdAmount,
    };
  } else {
    // Create new row
    newData = {
      user_public_key: userPublicKey,
      token_amount: tokenAmount,
      sol_amount: solAmount,
      usd_amount: usdAmount,
    };
  }

  const { data, error } = await supabase.from("tokens").upsert(newData, { onConflict: "user_public_key" }).select().single();

  if (error) {
    console.error("Error upserting purchase:", error);
    throw error;
  }

  return data;
}

/**
 * Fetch the total tokens bought by a user.
 * @param {string} userPublicKey - The public key of the user.
 * @returns {Promise<number>} The total tokens bought by the user.
 */
export async function getTokensInfo(userPublicKey) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from("tokens").eq("user_public_key", userPublicKey);

  if (error) {
    console.error("Error fetching total tokens bought:", error);
    throw error;
  }

  return totalTokens;
}
