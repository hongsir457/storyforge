import { beforeEach, describe, expect, it, vi } from "vitest";

const authUtilsMocks = vi.hoisted(() => ({
  getToken: vi.fn<() => string | null>(),
  setToken: vi.fn<(token: string) => void>(),
  clearToken: vi.fn<() => void>(),
}));

const apiMocks = vi.hoisted(() => ({
  getMe: vi.fn(),
}));

vi.mock("@/utils/auth", () => ({
  getToken: authUtilsMocks.getToken,
  setToken: authUtilsMocks.setToken,
  clearToken: authUtilsMocks.clearToken,
}));

vi.mock("@/api", () => ({
  API: {
    getMe: apiMocks.getMe,
  },
}));

import { useAuthStore } from "@/stores/auth-store";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useAuthStore.initialize", () => {
  beforeEach(() => {
    useAuthStore.setState(useAuthStore.getInitialState(), true);
    authUtilsMocks.getToken.mockReset();
    authUtilsMocks.setToken.mockReset();
    authUtilsMocks.clearToken.mockReset();
    apiMocks.getMe.mockReset();
  });

  it("does not clear a newer login when stale initialization fails", async () => {
    const pending = deferred<{
      id: string;
      username: string;
      email: string | null;
      display_name: string;
      role: string;
      is_active: boolean;
      is_email_verified: boolean;
    }>();
    authUtilsMocks.getToken.mockReturnValueOnce("stale-token").mockReturnValue("fresh-token");
    apiMocks.getMe.mockReturnValue(pending.promise);

    const initializePromise = useAuthStore.getState().initialize();
    useAuthStore.getState().login("fresh-token", {
      id: "user-1",
      username: "frametale_demo",
      email: "demo@frametale.local",
      display_name: "Frametale Demo",
      role: "user",
      is_active: true,
      is_email_verified: true,
    });

    pending.reject(new Error("expired"));
    await initializePromise;

    expect(authUtilsMocks.clearToken).not.toHaveBeenCalled();
    expect(useAuthStore.getState().token).toBe("fresh-token");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.username).toBe("frametale_demo");
  });

  it("does not overwrite a newer login when stale initialization succeeds late", async () => {
    const pending = deferred<{
      id: string;
      username: string;
      email: string | null;
      display_name: string;
      role: string;
      is_active: boolean;
      is_email_verified: boolean;
    }>();
    authUtilsMocks.getToken.mockReturnValueOnce("stale-token").mockReturnValue("fresh-token");
    apiMocks.getMe.mockReturnValue(pending.promise);

    const initializePromise = useAuthStore.getState().initialize();
    useAuthStore.getState().login("fresh-token", {
      id: "user-2",
      username: "fresh-user",
      email: "fresh@example.com",
      display_name: "Fresh User",
      role: "user",
      is_active: true,
      is_email_verified: true,
    });

    pending.resolve({
      id: "user-legacy",
      username: "stale-user",
      email: "stale@example.com",
      display_name: "Stale User",
      role: "user",
      is_active: true,
      is_email_verified: true,
    });
    await initializePromise;

    expect(useAuthStore.getState().token).toBe("fresh-token");
    expect(useAuthStore.getState().user?.username).toBe("fresh-user");
  });
});
