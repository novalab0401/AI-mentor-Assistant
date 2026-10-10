// 약관·처리방침 버전. 내용을 바꾸면 날짜를 올리세요.
// 버전이 바뀌면 모든 회원에게 다음 로그인 때 동의 화면이 다시 떠요.
export const TERMS_VERSION = "2026-10-10";
export const PRIVACY_VERSION = "2026-10-10";

export type ConsentChoice = {
  age: boolean;      // [필수] 만 14세 이상
  terms: boolean;    // [필수] 이용약관
  privacy: boolean;  // [필수] 개인정보 수집·이용
  research: boolean; // [선택] 비식별 데이터의 서비스 개선·연구 활용
};

export const emptyConsent: ConsentChoice = { age: false, terms: false, privacy: false, research: false };

export const requiredOk = (c: ConsentChoice) => c.age && c.terms && c.privacy;

// 개인정보 보호책임자 연락처 — 실제 연락받을 이메일로 바꿔 주세요
export const PRIVACY_OFFICER = { name: "김재호 (Nova Lab 대표)", email: "[연락처 이메일 입력 필요]" };
export const SERVICE_NAME = "Nova Lab 멘토 평가";
