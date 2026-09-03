import { probeLocalQwenHealth } from "@/lib/qwen-health";

export async function GET() {
  const report = await probeLocalQwenHealth();
  return Response.json(report, { headers: { "Cache-Control": "no-store" } });
}
