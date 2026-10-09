export const items = [
  { id: "structure", title: "수업 구조", question: "목표에 맞게 구조화하고 단계를 자연스럽게 연결했는가?" },
  { id: "explanation", title: "설명의 적절성", question: "사전지식·수준을 고려해 정확하고 이해 가능하게 설명했는가?" },
  { id: "question", title: "질문의 질", question: "목표에 적합하며 사고·참여를 유도하는가?" },
];

export function itemTitle(id: string) {
  return items.find((i) => i.id === id)?.title ?? id;
}