"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, LoaderCircle, TriangleAlert, XCircle } from "lucide-react";
import { useDemo } from "@/lib/demo-store";

interface Check { id:string; label:string; status:"PASS"|"WARN"|"FAIL"; required:boolean; detail:string }
interface Report { ok:boolean; mode:"demo"|"live"; readiness:"READY"|"READY_WITH_FALLBACK"|"BLOCKED"; passed:number; warnings:number; failed:number; checks:Check[] }

export function JudgePreflightPanel() {
  const { runtimeMode } = useDemo();
  const key = runtimeMode;
  const [state,setState] = useState<{key:string; report:Report|null}|null>(null);
  useEffect(()=>{
    const c=new AbortController();
    void fetch(`/api/agent/preflight?mode=${key}`,{cache:"no-store",signal:c.signal})
      .then(async r=>{if(!r.ok) throw new Error("preflight"); return await r.json() as Report;})
      .then(report=>setState({key,report}))
      .catch(e=>{if(e instanceof Error && e.name==="AbortError") return; setState({key,report:null});});
    return ()=>c.abort();
  },[key]);
  const report=state?.key===key?state.report:null;
  return <section className="overflow-hidden rounded-2xl border bg-card">
    <header className="flex items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-5"><div><div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-primary"/><h3 className="text-sm font-semibold">Judge preflight</h3></div><p className="mt-1 text-[11px] text-muted-foreground">Mode-aware readiness gate for safety evidence, benchmark, Qwen and Atlas prerequisites.</p></div>{!report?<LoaderCircle className="size-4 animate-spin text-muted-foreground"/>:<span className="rounded-full border px-2.5 py-1 text-[10px] font-semibold">{report.mode.toUpperCase()} · {report.readiness}</span>}</header>
    {report&&<div className="grid gap-px bg-border sm:grid-cols-2">{report.checks.map(c=><div key={c.id} className="bg-card px-4 py-3"><div className="flex items-start gap-2">{c.status==="PASS"?<CheckCircle2 className="mt-0.5 size-4 text-emerald-600"/>:c.status==="WARN"?<TriangleAlert className="mt-0.5 size-4 text-amber-600"/>:<XCircle className="mt-0.5 size-4 text-rose-600"/>}<div><p className="text-xs font-semibold">{c.label}</p><p className="mt-1 text-[10px] text-muted-foreground">{c.detail}</p><p className="mt-1 font-mono text-[8px] uppercase text-muted-foreground">{c.required?"required":"optional"} · {c.status}</p></div></div></div>)}</div>}
  </section>;
}
