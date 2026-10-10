import BackLink from "@/components/back-link";

// 약관·처리방침 공통 틀
export default function LegalDoc({
  title, version, children,
}: { title: string; version: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4 pb-16">
      <BackLink href="/signup" label="회원가입" />
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">버전 {version} · 시행일 {version}</p>
      </div>
      <div className="space-y-5 text-sm leading-relaxed [&_h2]:mb-1 [&_h2]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_table]:w-full [&_td]:border [&_td]:p-1.5 [&_th]:border [&_th]:bg-muted [&_th]:p-1.5 [&_th]:text-left">
        {children}
      </div>
    </main>
  );
}
