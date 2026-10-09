import OperatorGate from "@/components/operator-gate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <OperatorGate>{children}</OperatorGate>;
}
