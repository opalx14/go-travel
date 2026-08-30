import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import {
  isDeviceJourneySnapshot,
  type DeviceJourneyResponse,
} from "@/lib/device-state";
import { loadDeviceJourney, saveDeviceJourney } from "@/lib/device-state-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEVICE_COOKIE = "tripintent_device";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

async function getDeviceId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(DEVICE_COOKIE)?.value;
  if (existing) return existing;

  const deviceId = randomUUID();
  cookieStore.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  return deviceId;
}

export async function GET() {
  const deviceId = await getDeviceId();
  const snapshot = loadDeviceJourney(deviceId);
  const response: DeviceJourneyResponse = {
    ok: true,
    restored: snapshot !== null,
    snapshot,
  };
  return Response.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(request: Request) {
  const deviceId = await getDeviceId();
  const body: unknown = await request.json();

  if (!isDeviceJourneySnapshot(body)) {
    return Response.json(
      { ok: false, error: "Invalid device journey snapshot" },
      { status: 400 }
    );
  }

  saveDeviceJourney(deviceId, body);
  return Response.json({ ok: true, savedAt: body.savedAt });
}
