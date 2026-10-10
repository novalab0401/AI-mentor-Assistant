import LegalDoc from "@/components/legal-doc";
import { PRIVACY_OFFICER, PRIVACY_VERSION, SERVICE_NAME } from "@/lib/legal";

export default function PrivacyPage() {
  return (
    <LegalDoc title="개인정보 처리방침" version={PRIVACY_VERSION}>
      <p>
        Nova Lab(이하 &quot;회사&quot;)은 {SERVICE_NAME} 서비스를 제공하면서 개인정보 보호법에 따라
        이용자의 개인정보를 다음과 같이 처리합니다.
      </p>

      <section>
        <h2>1. 수집하는 개인정보와 이용 목적</h2>
        <table>
          <thead>
            <tr><th>구분</th><th>항목</th><th>목적</th></tr>
          </thead>
          <tbody>
            <tr><td>회원가입 (필수)</td><td>이름, 이메일, 비밀번호(암호화 저장)</td><td>회원 식별, 로그인, 공지</td></tr>
            <tr><td>그룹 활동 (필수)</td><td>소속 그룹·팀, 역할, 가입·승인 기록</td><td>그룹·팀 운영과 권한 관리</td></tr>
            <tr><td>평가 (필수)</td><td>평가자 이름, 평가받는 사람 이름, 점수, 근거 메모, 서술형 의견, 작성 일시</td><td>수업 평가, 평가 결과와 피드백 제공, AI 채점, 평가 기준 개선</td></tr>
            <tr><td>자동 수집</td><td>접속 일시, 접속 기록</td><td>보안, 장애 대응</td></tr>
          </tbody>
        </table>
        <p className="mt-1 text-xs text-muted-foreground">
          평가 링크로 로그인 없이 평가하는 경우에도 입력한 이름과 평가 내용이 위와 같이 처리됩니다.
        </p>
      </section>

      <section id="research">
        <h2>2. AI 채점과 평가 기준 개선 (서비스 핵심 기능)</h2>
        <ul>
          <li>이 서비스는 전문가가 만든 평가 기준에 따라 AI가 수업을 일관되게 채점·피드백하는 것을 핵심 기능으로 합니다. 이를 위해 평가 데이터를 AI 채점과 평가 기준(루브릭) 개선, 평가자 간 일치도 분석에 활용합니다.</li>
          <li>개별 회원에게 결과를 제공하는 목적 외의 분석·개선 작업에는 이름 등 개인을 알아볼 수 있는 정보를 지우거나 다른 값으로 바꾼 데이터(가명·비식별 데이터)를 사용합니다.</li>
          <li>회원은 탈퇴를 통해 이후의 처리를 중단할 수 있으며, 이미 비식별 처리된 통계·분석 결과는 개인을 알아볼 수 없어 삭제 대상에서 제외될 수 있습니다.</li>
        </ul>
      </section>

      <section>
        <h2>3. 보유 기간과 파기</h2>
        <ul>
          <li>회원 정보는 탈퇴할 때까지 보유하며, 탈퇴하면 지체 없이 파기합니다.</li>
          <li>운영진이 목록에서 삭제한 수업·평가 기록과 탈퇴 회원이 작성한 평가 기록은 분쟁 대응을 위해 삭제·탈퇴일부터 1년간 보관한 뒤 파기하거나 개인을 알아볼 수 없게 처리합니다.</li>
          <li>법령에서 보관을 요구하는 정보는 그 기간 동안 보관합니다.</li>
          <li>전자 파일은 복구할 수 없는 방법으로 지웁니다.</li>
        </ul>
      </section>

      <section>
        <h2>4. 제3자 제공</h2>
        <p>
          회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만 평가 결과는 서비스 기능에 따라
          같은 그룹의 운영진·팀장, 그리고 평가받은 본인에게 표시됩니다(평가받은 사람에게는 평가자 이름이 표시되지 않습니다).
        </p>
      </section>

      <section>
        <h2>5. 처리 위탁과 국외 이전</h2>
        <table>
          <thead>
            <tr><th>받는 곳</th><th>위탁 업무</th><th>저장 위치</th></tr>
          </thead>
          <tbody>
            <tr><td>Supabase Inc.</td><td>데이터베이스, 회원 인증</td><td>대한민국(서울) 리전</td></tr>
            <tr><td>Vercel Inc.</td><td>웹사이트 호스팅</td><td>미국 등</td></tr>
          </tbody>
        </table>
        <p className="mt-1 text-xs text-muted-foreground">
          수업 녹음의 AI 분석 등 새로운 위탁이나 국외 이전이 생기면 시행 전에 이 방침을 고치고 다시 동의를 받습니다.
        </p>
      </section>

      <section>
        <h2>6. 이용자의 권리</h2>
        <ul>
          <li>이용자는 자신의 개인정보를 열람·정정·삭제하거나 처리 정지를 요청할 수 있습니다.</li>
          <li>아래 개인정보 보호책임자에게 요청하면 지체 없이 처리합니다.</li>
        </ul>
      </section>

      <section>
        <h2>7. 안전성 확보 조치</h2>
        <ul>
          <li>비밀번호는 암호화해 저장하며, 데이터베이스 접근은 역할별 권한 규칙으로 제한합니다.</li>
          <li>평가받은 사람에게 보이는 피드백에서는 평가자 이름을 번호로 바꿔 표시합니다.</li>
          <li>개인정보에 접근할 수 있는 인원을 최소화합니다.</li>
        </ul>
      </section>

      <section>
        <h2>8. 만 14세 미만 아동</h2>
        <p>서비스는 만 14세 이상만 가입할 수 있습니다.</p>
      </section>

      <section>
        <h2>9. 개인정보 보호책임자</h2>
        <p>
          {PRIVACY_OFFICER.name} · {PRIVACY_OFFICER.email}
        </p>
      </section>

      <section>
        <h2>10. 방침 변경</h2>
        <p>이 방침이 바뀌면 시행 전에 서비스에 알리고, 변경된 방침에 다시 동의를 받습니다.</p>
      </section>
    </LegalDoc>
  );
}
