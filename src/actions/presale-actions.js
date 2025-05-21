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
