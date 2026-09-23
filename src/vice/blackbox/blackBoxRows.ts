/**
 * THE RECORD AS ROWS, AND BACK.
 *
 * One file owns the translation between what the app works in (camel case, a
 * `BlackBoxRecord`) and what the database holds (snake case, two tables). A
 * column rename is this file and nothing else.
 *
 * ----------------------------------------------------------------------------
 * `user_id` IS NOT IN THE RECORD, AND THAT IS DELIBERATE.
 *
 * The browser does not know the account id and must not decide it. Rows going
 * up carry `user_id: ""`, and `viceRepo.writeViceRows` overwrites it with the
 * authenticated id from the session — proved by a test, because it is the one
 * thing standing between a crafted request and somebody else's record. A
 * placeholder that is obviously a placeholder is safer than a plausible one.
 *
 * ----------------------------------------------------------------------------
 * `where` IS A RESERVED WORD IN SQL, so the column is `where_at`. The record
 * keeps `where`, because that is what the form asks and what the screen shows.
 * The rename lives here and nowhere else.
 */

import type { ViceAttemptRow, ViceReportRow, ViceRows } from "@/src/db/viceTypes"
import type { BlackBoxRecord, ViceAttempt, ViceReport } from "../types"

/** A row on its way up. The owner is stamped by the repo, never by the browser. */
const UNOWNED = ""

export function attemptToRow(a: ViceAttempt): ViceAttemptRow {
  return {
    id: a.id,
    user_id: UNOWNED,
    vice_id: a.viceId,
    label: a.label,
    started_on: a.startedOn,
    started_by: a.startedBy,
    structure: a.structure,
    ended_on: a.endedOn,
    ended_by_report_id: a.endedByReportId,
    updated_at: a.updatedAt,
    deleted_at: a.deletedAt,
  }
}

export function reportToRow(r: ViceReport): ViceReportRow {
  return {
    id: r.id,
    user_id: UNOWNED,
    attempt_id: r.attemptId,
    at: r.at,
    went_through: r.wentThrough,
    thought: r.thought,
    ending: r.ending,
    closeness: r.closeness,
    with_whom: r.withWhom,
    where_at: r.where,
    factors: r.factors,
    did_instead: r.didInstead,
    updated_at: r.updatedAt,
    deleted_at: r.deletedAt,
  }
}

/**
 * A row coming back.
 *
 * DEFENSIVE ON EVERY FIELD THE DATABASE MAY SPELL DIFFERENTLY OR NOT SEND. An
 * array column arrives as `null` rather than `[]` when it was never written by
 * an older client, and `structure.join(", ")` on null takes the page down —
 * with the page being the only way to reach the rest of the record. Nothing
 * here invents a value; it only chooses the empty one over a crash.
 */
export function rowToAttempt(row: ViceAttemptRow): ViceAttempt {
  return {
    id: row.id,
    viceId: row.vice_id,
    label: row.label,
    startedOn: row.started_on.slice(0, 10),
    startedBy: row.started_by ?? "",
    structure: row.structure ?? [],
    endedOn: row.ended_on === null ? null : row.ended_on.slice(0, 10),
    endedByReportId: row.ended_by_report_id,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

export function rowToReport(row: ViceReportRow): ViceReport {
  return {
    id: row.id,
    attemptId: row.attempt_id,
    // A wall-clock moment with no zone. Postgres may hand back
    // `2026-05-04T21:00:00+00:00` for a `timestamp` column in some drivers, and
    // a `Z` or an offset on this field would shift somebody's night by hours.
    // Trimmed to the nineteen characters the record is written in.
    at: row.at.slice(0, 19),
    wentThrough: row.went_through,
    thought: row.thought ?? "",
    ending: row.ending,
    closeness: row.closeness,
    withWhom: row.with_whom ?? "",
    where: row.where_at ?? "",
    factors: row.factors ?? [],
    didInstead: row.did_instead ?? "",
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

export function recordToRows(record: BlackBoxRecord): ViceRows {
  return {
    attempts: record.attempts.map(attemptToRow),
    reports: record.reports.map(reportToRow),
  }
}

export function rowsToRecord(rows: ViceRows): BlackBoxRecord {
  return {
    version: 1,
    attempts: rows.attempts.map(rowToAttempt),
    reports: rows.reports.map(rowToReport),
  }
}
