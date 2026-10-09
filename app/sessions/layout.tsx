import OperatorGate from "@/components/operator-gate";

// 운영자 화면은 로그인 확인이 끝난 뒤에야 내용을 보여 줘요.
// 그래서 "누르자마자 바로 뜨는 화면"(instant navigation) 검사에서 제외해요.
export const instant = false;

// /sessions 아래의 모든 화면(목록, 등록, 결과)은 운영자만 볼 수 있어요.
export default function SessionsLayout({ children }: { children: React.ReactNode }) {
  return <OperatorGate>{children}</OperatorGate>;
}
