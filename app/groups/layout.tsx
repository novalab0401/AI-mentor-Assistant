import OperatorGate from "@/components/operator-gate";

// /groups 아래 화면은 로그인한 사람만 볼 수 있어요.
export default function GroupsLayout({ children }: { children: React.ReactNode }) {
  return <OperatorGate>{children}</OperatorGate>;
}
