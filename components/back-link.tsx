import Link from "next/link";

// 화면 왼쪽 위 "← 뒤로" 링크. 어디로 돌아갈지 정확히 정해 둬요.
export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-block py-1 text-sm text-muted-foreground hover:text-foreground">
      ← {label}
    </Link>
  );
}
