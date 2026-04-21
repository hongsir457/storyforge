import { useLocation } from "wouter";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SiteLegalFooter } from "@/components/legal/SiteLegalFooter";

export function NotFoundPage() {
  const [, navigate] = useLocation();

  return (
    <div className="storyforge-public-shell flex min-h-screen flex-col">
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="storyforge-form-card w-full max-w-2xl rounded-[2.2rem] p-10 text-center">
          <BrandLogo alt="Storyforge" className="mx-auto h-16 w-auto max-w-[18rem]" />
          <p
            className="mt-8 text-[5.5rem] font-semibold leading-none tracking-[-0.08em] text-[var(--sf-text)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            404
          </p>
          <p className="mt-4 text-lg text-[var(--sf-text-muted)]">这个入口不在当前的叙事版图里。</p>
          <p className="mt-3 text-sm leading-7 text-[var(--sf-text-soft)]">
            返回项目库继续工作，或者回到首页重新进入正确的路径。
          </p>
          <button
            onClick={() => navigate("/app/projects", { replace: true })}
            className="storyforge-primary-button mt-8 rounded-[1rem] px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            返回项目库
          </button>
        </div>
      </main>

      <SiteLegalFooter className="bg-transparent" />
    </div>
  );
}
