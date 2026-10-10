import { redirect } from "next/navigation";

// 예전 테스트용 주소예요. 이제는 시연별 링크(/evaluate/시연번호)를 써요.
export default function Page() {
  redirect("/sessions");
}
