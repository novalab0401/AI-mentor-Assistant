import OperatorGate from "@/components/operator-gate";

// /sessions 아래의 모든 화면(목록, 등록, 결과)은 운영자만 볼 수 있어요.
export default function SessionsLayout({ children }: { children: React.ReactNode }) {
  return <OperatorGate>{children}</OperatorGate>;
}
