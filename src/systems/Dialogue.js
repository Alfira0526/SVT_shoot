// §3.8 / D21 — 대사 데이터 유틸. {nickname} 플레이스홀더 치환.
export function fillNickname(text, nickname) {
  if (typeof text !== 'string') return text;
  return text.split('{nickname}').join(nickname);
}

export function prepareLines(lines, nickname) {
  return (lines || []).map((line) => ({
    ...line,
    speaker: fillNickname(line.speaker ?? '', nickname),
    text: fillNickname(line.text ?? '', nickname),
  }));
}

// 대사창 화자 위치: 플레이어는 오른쪽, 그 외(봉이·보스)는 왼쪽 (동방프로젝트식, D12)
export function sideOf(portrait) {
  return portrait === 'player' ? 'right' : 'left';
}
