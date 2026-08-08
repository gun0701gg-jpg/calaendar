// 일부 기관 업무포털에서 내려받은 엑셀은 아직 입력되지 않은 빈 줄에 "값이 계산되지 않은 수식"
// 셀(t="str" 또는 t="s"인데 <v/>가 비어있는 셀)이 남아있는 경우가 있다. read-excel-file
// 라이브러리는 이런 셀을 만나면 내부적으로 빈 값을 문자열로 취급하려다가 오류
// ("Cannot read properties of undefined (reading 'trim')")를 내며 멈춰버린다.
// 그래서 읽기 전에 그런 "값 없는 문자열형 수식" 셀을 통째로 제거해서 안전하게 만든다.
export async function sanitizeXlsxFile(file) {
  const { unzipSync, zipSync, strFromU8, strToU8 } = await import("fflate");

  const buffer = new Uint8Array(await file.arrayBuffer());
  let unzipped;
  try {
    unzipped = unzipSync(buffer);
  } catch {
    // 압축 파일이 아니거나 손상된 경우, 원본 그대로 반환해서 원래 오류 메시지가 나오게 둔다.
    return file;
  }

  let changed = false;
  for (const path of Object.keys(unzipped)) {
    if (!/^xl\/worksheets\/sheet\d+\.xml$/.test(path)) continue;

    const xml = strFromU8(unzipped[path]);
    const fixed = xml.replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (whole, attrs, inner) => {
      if (inner === undefined) return whole; // 자체닫힘(빈) 셀은 손댈 필요 없음
      const isTextType = /\bt="(str|s)"/.test(attrs);
      if (!isTextType) return whole;
      const valueMatch = inner.match(/<v[^>]*>([\s\S]*?)<\/v>/);
      const hasContent = Boolean(valueMatch && valueMatch[1].length > 0);
      if (hasContent) return whole;
      changed = true;
      return ""; // 값이 없는 문자열형 셀은 통째로 제거(빈 칸으로 취급)
    });

    if (fixed !== xml) {
      unzipped[path] = strToU8(fixed);
    }
  }

  if (!changed) return file;

  const zipped = zipSync(unzipped);
  return new Blob([zipped], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
