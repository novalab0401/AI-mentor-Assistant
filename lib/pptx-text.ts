// PPTX(파워포인트) 파일에서 슬라이드별 글자와 발표자 노트를 뽑아요. 서버 전용.
// PPTX는 사실 ZIP 묶음이고, 슬라이드마다 XML 파일이 들어 있어요. 외부 라이브러리 없이 Node 기본 기능(zlib)으로 풀어요.
// 한계: 글자만 읽어요. 그림·도표·배치·글자 크기는 볼 수 없어요 (그래서 PDF를 권해요).

import { inflateRawSync } from "node:zlib";

type Entry = { name: string; method: number; compSize: number; localOffset: number };

function readEntries(buf: Buffer): Entry[] {
  // 끝에서부터 '중앙 디렉터리 끝' 표시(0x06054b50)를 찾아요
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("PPTX 파일 구조를 읽지 못했어요.");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out: Entry[] = [];
  for (let k = 0; k < count; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    out.push({ name, method, compSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

function readFile(buf: Buffer, e: Entry): string {
  const n = buf.readUInt16LE(e.localOffset + 26);
  const x = buf.readUInt16LE(e.localOffset + 28);
  const start = e.localOffset + 30 + n + x;
  const data = buf.subarray(start, start + e.compSize);
  const raw = e.method === 0 ? data : e.method === 8 ? inflateRawSync(data) : null;
  if (!raw) throw new Error("지원하지 않는 압축 방식이에요.");
  return raw.toString("utf8");
}

const decode = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

// 문단(<a:p>)마다 한 줄, 글자 조각(<a:t>)은 이어 붙여요
function xmlText(xml: string): string {
  return xml
    .split(/<\/a:p>/)
    .map((p) => [...p.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => decode(m[1])).join(""))
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

export function extractPptx(buf: Buffer): { slides: { n: number; text: string; notes?: string }[] } {
  const entries = readEntries(buf);
  const num = (name: string) => Number(name.match(/(\d+)\.xml$/)?.[1] ?? 0);
  const slideFiles = entries.filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.name)).sort((a, b) => num(a.name) - num(b.name));
  if (slideFiles.length === 0) throw new Error("슬라이드를 찾지 못했어요. 올바른 PPTX 파일인지 확인해 주세요.");
  const notes = new Map(
    entries.filter((e) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(e.name)).map((e) => [num(e.name), e])
  );
  return {
    slides: slideFiles.map((e) => {
      const n = num(e.name);
      const noteEntry = notes.get(n);
      // 노트 파일 번호는 보통 슬라이드 번호와 같아요 (정확한 연결은 관계 파일에 있지만, 대부분 이걸로 충분해요)
      const noteText = noteEntry ? xmlText(readFile(buf, noteEntry)).replace(/^\d+$/m, "").trim() : "";
      return { n, text: xmlText(readFile(buf, e)), ...(noteText ? { notes: noteText } : {}) };
    }),
  };
}
