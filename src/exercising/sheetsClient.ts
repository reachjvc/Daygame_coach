/**
 * Google Sheets read/write client for the Exercising slice.
 * Uses a service account for auth. No Supabase involved.
 */

import { google, type sheets_v4 } from "googleapis"

// ============================================================================
// Auth & client
// ============================================================================

function getSheetId(): string {
  const id = process.env.GOOGLE_EXERCISE_SHEET_ID
  if (!id) throw new Error("GOOGLE_EXERCISE_SHEET_ID env var is not set")
  return id
}

let cachedClient: sheets_v4.Sheets | null = null

function getSheetsClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient

  const credsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!credsJson) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON env var is not set")
  }

  const creds = JSON.parse(credsJson)
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })

  cachedClient = google.sheets({ version: "v4", auth })
  return cachedClient
}

// ============================================================================
// Read helpers
// ============================================================================

export async function readRange(range: string): Promise<string[][]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range,
  })
  return (res.data.values as string[][]) || []
}

// ============================================================================
// Write helpers
// ============================================================================

export async function writeRange(
  range: string,
  values: string[][],
): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range,
    valueInputOption: "RAW",
    requestBody: { values },
  })
}

export async function appendRows(
  range: string,
  values: string[][],
): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  })
}

export async function clearRange(range: string): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.clear({
    spreadsheetId: getSheetId(),
    range,
    requestBody: {},
  })
}

// ============================================================================
// Sheet (tab) management
// ============================================================================

export async function getSheetTabs(): Promise<string[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.get({
    spreadsheetId: getSheetId(),
    fields: "sheets.properties.title",
  })
  return (
    res.data.sheets?.map((s) => s.properties?.title || "") || []
  )
}

export async function createTabIfMissing(title: string): Promise<void> {
  const existing = await getSheetTabs()
  if (existing.includes(title)) return

  const sheets = getSheetsClient()
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: { title },
          },
        },
      ],
    },
  })
}
