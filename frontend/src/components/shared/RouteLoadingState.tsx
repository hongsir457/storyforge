import { BrandLogo } from "@/components/brand/BrandLogo";

interface RouteLoadingStateProps {
  message?: string;
  embedded?: boolean;
}

export function RouteLoadingState({
  message = "Loading workspace",
  embedded = false,
}: RouteLoadingStateProps) {
  const card = (
    <div className="frametale-form-card w-full max-w-md rounded-[2rem] p-8 text-center">
      <BrandLogo alt="Frametale" className="mx-auto h-14 w-auto max-w-[16rem]" />
      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[rgba(24,151,214,0.14)] bg-[rgba(24,151,214,0.08)] px-4 py-2 text-sm text-[var(--sf-blue)]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
        {message}
      </div>
    </div>
  );

  if (embedded) {
    return <div className="flex min-h-[20rem] items-center justify-center px-6 py-10">{card}</div>;
  }

  return <div className="frametale-public-shell flex min-h-screen items-center justify-center px-6">{card}</div>;
}
