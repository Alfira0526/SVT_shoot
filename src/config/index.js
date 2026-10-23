// 스테이지·대사 데이터 레지스트리 — 콘텐츠 추가 = JSON 파일 추가 + 여기 등록
import stageW1 from './stage_w1.json';
import stage01 from './stage01.json';
import dialoguePrologue from './dialogue_prologue.json';
import dialogueW1 from './dialogue_w1.json';
import dialogue01 from './dialogue01.json';

export const STAGES = {
  w1: stageW1,
  w2: stage01,
};

export const STAGE_ORDER = ['w1', 'w2'];

export const DIALOGUES = {
  prologue: dialoguePrologue,
  w1: dialogueW1,
  w2: dialogue01,
  // v2 슬롯 예약: w3, w4, final (T14 확정 대사는 기획서 §2.9 참조)
};
