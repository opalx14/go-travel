import "server-only";

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { DeviceJourneySnapshot } from "./device-state";
import { isDeviceJourneySnapshot } from "./device-state";

const DEFAULT_DB_PATH = join(process.cwd(), ".data", "go-travel.sqlite");

type GlobalWithDeviceDb = typeof globalThis & {
  __goTravelDeviceDb?: DatabaseSync;
};

function openDatabase(): DatabaseSync {
  const globalStore = globalThis as GlobalWithDeviceDb;
  if (globalStore.__goTravelDeviceDb) return globalStore.__goTravelDeviceDb;

  const dbPath = process.env.GO_TRAVEL_SQLITE_PATH ?? DEFAULT_DB_PATH;
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS device_journey_state (
      device_id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      flight_no TEXT NOT NULL,
      phase TEXT NOT NULL,
      is_protected INTEGER NOT NULL DEFAULT 0,
      snapshot_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_device_journey_trip
      ON device_journey_state(trip_id);
  `);

  globalStore.__goTravelDeviceDb = db;
  return db;
}

function touchDevice(deviceId: string, now: string) {
  const db = openDatabase();
  db.prepare(`
    INSERT INTO devices (id, created_at, last_seen_at)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at
  `).run(deviceId, now, now);
}

export function loadDeviceJourney(deviceId: string): DeviceJourneySnapshot | null {
  const db = openDatabase();
  const now = new Date().toISOString();
  touchDevice(deviceId, now);

  const row = db
    .prepare("SELECT snapshot_json FROM device_journey_state WHERE device_id = ?")
    .get(deviceId) as { snapshot_json?: string } | undefined;

  if (!row?.snapshot_json) return null;

  try {
    const parsed: unknown = JSON.parse(row.snapshot_json);
    return isDeviceJourneySnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export interface DeviceJourneyRow {
  deviceId: string;
  createdAt: string;
  lastSeenAt: string;
  tripId: string;
  origin: string;
  destination: string;
  flightNo: string;
  phase: string;
  isProtected: boolean;
  updatedAt: string;
  snapshot: DeviceJourneySnapshot | null;
}

export function listDeviceJourneys(): DeviceJourneyRow[] {
  const db = openDatabase();
  const rows = db
    .prepare(`
      SELECT
        d.id AS device_id,
        d.created_at,
        d.last_seen_at,
        s.trip_id,
        s.origin,
        s.destination,
        s.flight_no,
        s.phase,
        s.is_protected,
        s.snapshot_json,
        s.updated_at
      FROM devices d
      INNER JOIN device_journey_state s ON s.device_id = d.id
      ORDER BY s.updated_at DESC
    `)
    .all() as Array<{
      device_id: string;
      created_at: string;
      last_seen_at: string;
      trip_id: string;
      origin: string;
      destination: string;
      flight_no: string;
      phase: string;
      is_protected: number;
      snapshot_json: string;
      updated_at: string;
    }>;

  return rows.map((row) => {
    let snapshot: DeviceJourneySnapshot | null = null;
    try {
      const parsed: unknown = JSON.parse(row.snapshot_json);
      snapshot = isDeviceJourneySnapshot(parsed) ? parsed : null;
    } catch {
      snapshot = null;
    }

    return {
      deviceId: row.device_id,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
      tripId: row.trip_id,
      origin: row.origin,
      destination: row.destination,
      flightNo: row.flight_no,
      phase: row.phase,
      isProtected: row.is_protected === 1,
      updatedAt: row.updated_at,
      snapshot,
    };
  });
}

export function saveDeviceJourney(deviceId: string, snapshot: DeviceJourneySnapshot) {
  const db = openDatabase();
  const now = new Date().toISOString();
  touchDevice(deviceId, now);

  db.prepare(`
    INSERT INTO device_journey_state (
      device_id,
      trip_id,
      origin,
      destination,
      flight_no,
      phase,
      is_protected,
      snapshot_json,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(device_id) DO UPDATE SET
      trip_id = excluded.trip_id,
      origin = excluded.origin,
      destination = excluded.destination,
      flight_no = excluded.flight_no,
      phase = excluded.phase,
      is_protected = excluded.is_protected,
      snapshot_json = excluded.snapshot_json,
      updated_at = excluded.updated_at
  `).run(
    deviceId,
    snapshot.trip.id,
    snapshot.trip.origin,
    snapshot.trip.destination,
    snapshot.trip.flightNo,
    snapshot.phase,
    snapshot.isProtected ? 1 : 0,
    JSON.stringify(snapshot),
    now
  );
}
