import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API } from "@/api";
import { useAppStore } from "@/stores/app-store";
import { useTasksStore } from "@/stores/tasks-store";
import type { ProjectData } from "@/types";
import { VisualSystemsPanel } from "./VisualSystemsPanel";

function makeProjectData(overrides: Partial<ProjectData> = {}): ProjectData {
  return {
    title: "Demo",
    content_mode: "narration",
    style: "Anime",
    style_description: "cinematic",
    episodes: [],
    characters: {},
    clues: {},
    ...overrides,
  };
}

describe("VisualSystemsPanel", () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true);
    useTasksStore.setState(useTasksStore.getInitialState(), true);
    vi.restoreAllMocks();
  });

  it("persists visual system drafts through updateProject", async () => {
    vi.spyOn(API, "updateProject").mockResolvedValue({
      success: true,
      project: makeProjectData(),
    });
    const refreshProject = vi.fn().mockResolvedValue(undefined);

    const { container } = render(
      <VisualSystemsPanel
        projectName="demo"
        projectData={makeProjectData()}
        refreshProject={refreshProject}
      />,
    );

    const textareas = container.querySelectorAll("textarea");
    expect(textareas.length).toBeGreaterThanOrEqual(3);

    fireEvent.change(textareas[0] as HTMLTextAreaElement, {
      target: { value: "Keep the corridor spill light stable across cuts." },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Save Visual Systems|保存视觉系统/ }),
    );

    await waitFor(() => {
      expect(API.updateProject).toHaveBeenCalledWith(
        "demo",
        expect.objectContaining({
          visual_capture: expect.objectContaining({
            continuity_notes: "Keep the corridor spill light stable across cuts.",
          }),
        }),
      );
      expect(refreshProject).toHaveBeenCalled();
    });
  });
});
