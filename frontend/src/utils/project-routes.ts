export function decodeProjectRouteParam(projectName: string | null | undefined): string | null {
  if (!projectName) {
    return null;
  }

  try {
    return decodeURIComponent(projectName);
  } catch {
    return projectName;
  }
}

export function buildProjectWorkspaceRoute(projectName: string): string {
  return `/app/projects/${encodeURIComponent(projectName)}`;
}

export function buildProjectSettingsRoute(projectName: string): string {
  return `${buildProjectWorkspaceRoute(projectName)}/settings`;
}
