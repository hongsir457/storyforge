import { Bot } from "lucide-react";
import { GlobalHeader } from "./GlobalHeader";
import { AssetSidebar } from "./AssetSidebar";
import { AgentCopilot } from "@/components/copilot/AgentCopilot";
import { SiteLegalFooter } from "@/components/legal/SiteLegalFooter";
import { useTasksSSE } from "@/hooks/useTasksSSE";
import { useProjectEventsSSE } from "@/hooks/useProjectEventsSSE";
import { useProjectsStore } from "@/stores/projects-store";
import { useAppStore } from "@/stores/app-store";
import { UI_LAYERS } from "@/utils/ui-layers";

interface StudioLayoutProps {
  children: React.ReactNode;
}

export function StudioLayout({ children }: StudioLayoutProps) {
  const currentProjectName = useProjectsStore((s) => s.currentProjectName);
  const assistantPanelOpen = useAppStore((s) => s.assistantPanelOpen);
  const toggleAssistantPanel = useAppStore((s) => s.toggleAssistantPanel);

  useTasksSSE(currentProjectName);
  useProjectEventsSSE(currentProjectName);

  return (
    <div className="frametale-workspace-shell flex h-screen flex-col">
      <div className="px-4 pt-4">
        <GlobalHeader />
      </div>
      <div className="frametale-shell-main flex flex-1 overflow-hidden px-4 pb-4 pt-3">
        <AssetSidebar className="frametale-workspace-rail min-w-[17rem] rounded-[1.9rem]" />
        <main className="mx-3 flex-1 overflow-auto rounded-[2rem] border border-[rgba(117,132,159,0.16)] bg-[rgba(255,255,255,0.76)] shadow-[0_18px_46px_rgba(23,38,69,0.06)]">
          {children}
        </main>
        <div
          className={`frametale-assistant-rail shrink-0 overflow-hidden rounded-[1.9rem] transition-[width,min-width,opacity] duration-300 ease-out ${
            assistantPanelOpen ? "opacity-100" : "opacity-0"
          }`}
          style={{
            width: assistantPanelOpen ? "27rem" : "0",
            minWidth: assistantPanelOpen ? "27rem" : "0",
          }}
        >
          <div
            className={`h-full transition-opacity duration-200 ${
              assistantPanelOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <AgentCopilot />
          </div>
        </div>
      </div>

      <SiteLegalFooter
        className="mx-4 mb-4 rounded-[1.4rem] border border-[rgba(117,132,159,0.16)] bg-white/72"
        contentClassName="max-w-none px-5 py-4"
      />

      <button
        type="button"
        onClick={toggleAssistantPanel}
        className={`frametale-primary-button fixed right-6 top-24 flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ease-out ${UI_LAYERS.workspaceFloating} ${
          assistantPanelOpen
            ? "pointer-events-none scale-0 opacity-0"
            : "scale-100 opacity-100 hover:-translate-y-0.5"
        }`}
        style={{ transitionDelay: assistantPanelOpen ? "0ms" : "180ms" }}
        title="展开助手面板"
        aria-label="展开助手面板"
      >
        <Bot className="h-5 w-5 text-white" />
      </button>
    </div>
  );
}
