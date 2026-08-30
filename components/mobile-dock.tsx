"use client";

import { CircleAlert, MessageCircle, Target } from "lucide-react";
import { useState } from "react";
import { useDemo, type EvidenceView } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

type MobileSection = "chat" | EvidenceView;

export function MobileDock() {
  const { evidenceView, setEvidenceView } = useDemo();
  const [activeSection, setActiveSection] = useState<MobileSection>(evidenceView);

  const scrollTo = (id: string) => {
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const select = (section: MobileSection) => {
    setActiveSection(section);

    if (section === "chat") {
      scrollTo("protected-mission");
      return;
    }

    setEvidenceView(section);
    scrollTo("evidence-panel");
  };

  const items = [
    { id: "chat" as const, label: "Chat", icon: MessageCircle },
    { id: "issue" as const, label: "Issue", icon: CircleAlert },
    { id: "goal" as const, label: "Goal", icon: Target },
  ];

  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-[60] md:hidden"
      aria-label="Trip navigation"
    >
      <div className="mx-auto flex max-w-sm items-center gap-1 rounded-[1.35rem] border border-white/[0.10] bg-[#0a1220]/94 p-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeSection === item.id ||
            (activeSection !== "chat" && evidenceView === item.id);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => select(item.id)}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-[11px] font-semibold transition",
                isActive
                  ? "bg-cyan-400 text-slate-950"
                  : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
