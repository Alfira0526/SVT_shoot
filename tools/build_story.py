"""스토리 데이터 빌더 — story_canon.json + 아래 MAP을 읽어
   worlds.json / guardians.json / dialogue_worlds.json 세 파일을 생성한다.
   목적: 14정령(루멘 1 + 세계별 13) 구조로 전면 교체하면서 id 정합성을 코드로 보장.
   IP: 실존 아티스트/팬덤/공식 콘텐츠 무참조 — 팬덤 '경험'의 의인화만."""
import json, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CANON = os.path.join(ROOT, 'src', 'config', 'story_canon.json')

def load_canon():
    with open(CANON, encoding='utf-8') as f:
        return json.load(f)

# 세계 진행 순서(입덕→수집→티켓팅→응원→노동→소비→기록→기다림→새벽→상실→창작→버티기).
# 해금은 자유(코인)라 강제 순서는 아니지만, 지도 배열/추천 순서로 사용.
# canonName: 캐논 spirits 매칭 키. id: 코드/텍스처 id(로마자). stage: 재사용 레이아웃.
# accent: 지도/브리핑 강조색(PALETTE 키). hero: 탄·히어로색(rose/serenity/gold/mint/lavender).
MAP = [
  { 'id':'pollin','canon':'폴린','world':'w_pollin','light':'설렘의 빛','accent':'rose','hero':'rose','stage':'w1','diff':1,
    'threat':'끝없는 낙하','threatDesc':'착지하면 설렘이 끝난다며 영영 떨어지게 만드는 중력. 첫 쿵만 좇게 한다.',
    'sub':'입덕·낙하','situation':'발이 땅에 닿으면 안 되는 세계. 아래에서 새 얼굴이 자꾸 올라와 계속 떨어진다.' },
  { 'id':'pick','canon':'픽','world':'w_pick','light':'우연의 빛','accent':'serenity','hero':'serenity','stage':'w2','diff':1,
    'threat':'꽝의 반복','threatDesc':'원하는 건 절대 처음에 안 나오고, 멈추는 법은 아무도 안 알려주는 확률의 늪.',
    'sub':'포카·뽑기','situation':'봉투가 산더미. 뜯는 소리와 한숨 사이에서 무언가 자꾸 얼굴을 바꾼다.' },
  { 'id':'saerok','canon':'새록','world':'w_saerok','light':'기다림의 빛','accent':'serenity','hero':'gold','stage':'w3','diff':2,
    'threat':'무한 대기열','threatDesc':'멈추면 잃을까 봐 못 멈추는데, 멈추지 않으면 결국 아무 데도 못 가는 대기의 방.',
    'sub':'새로고침·대기열','situation':'일어서면 순번이 뒤로 밀려 아무도 안 움직이는 로비. 벽엔 시계가 없다.' },
  { 'id':'bitjang','canon':'빗장','world':'w_bitjang','light':'결백의 빛','accent':'danger','hero':'rose','stage':'w4','diff':2,
    'threat':'뒤틀린 관문','threatDesc':'통과하려면 결백을 증명해야 하는데, 애쓸수록 더 수상해 보이는 문.',
    'sub':'보안문자·인증','situation':'글자가 볼 때마다 다시 뒤틀리고, 틀리면 처음 문으로 돌아가는 관문.' },
  { 'id':'ulrim','canon':'울림','world':'w_ulrim','light':'목소리의 빛','accent':'mint','hero':'mint','stage':'w1','diff':3,
    'threat':'볼륨의 벽','threatDesc':'벽을 넘으려면 남과 겹쳐야 하는데, 겹칠수록 자기 목소리는 사라지는 홀.',
    'sub':'떼창·스밍','situation':'소리가 멈추면 발밑이 꺼지는 홀. 혼자 낸 소리는 벽을 못 넘는다.' },
  { 'id':'semi','canon':'셈이','world':'w_semi','light':'헌신의 빛','accent':'lavender','hero':'lavender','stage':'w2','diff':4,
    'threat':'멈추지 않는 순위표','threatDesc':'이겨야 문이 열리는데, 이기려 셀수록 애초에 왜 좋아했는지를 잊게 하는 방.',
    'sub':'총공·투표','situation':'숫자를 멈추면 전부 0으로 리셋되는 방. 마감이 오지 않아 못 쉰다.' },
  { 'id':'yeongsu','canon':'영수','world':'w_yeongsu','light':'진심의 빛','accent':'gold','hero':'gold','stage':'w3','diff':3,
    'threat':'완판의 유혹','threatDesc':'완판 임박 알림이 계속 울리는데 잔고는 이미 0에 닿은 상점가. 사랑을 지출로 증명하게 한다.',
    'sub':'굿즈·텅장','situation':'산 물건은 하루면 사라지고 영수증만 남는 상점가. 잔고가 0이 되어야 문이 열린다.' },
  { 'id':'chalna','canon':'찰나','world':'w_chalna','light':'순간의 빛','accent':'danger','hero':'rose','stage':'w4','diff':4,
    'threat':'되감기 협곡','threatDesc':'남기려 찍는 순간 그 자리에 없던 사람이 되는 3초짜리 루프. 사는 대신 저장하게 한다.',
    'sub':'직캠·기록','situation':'딱 3초씩만 흐르고 처음으로 되감기는 협곡. 렌즈로 본 것만 세계에 남는다.' },
  { 'id':'diwon','canon':'디원','world':'w_diwon','light':'기대의 빛','accent':'gold','hero':'gold','stage':'w1','diff':3,
    'threat':'영원한 D-1','threatDesc':'D-1이 안 끝나 설렘도 안 끝나는 대신, 영원히 그날을 못 만나게 하는 전날.',
    'sub':'컴백·기다림','situation':'카운트다운이 D-1에서 안 줄고, 새 티저는 무한히 뜨는데 본편은 안 나오는 광장.' },
  { 'id':'nesi','canon':'네시','world':'w_nesi','light':'새벽의 빛','accent':'lavender','hero':'lavender','stage':'w2','diff':2,
    'threat':'4시 44분','threatDesc':'끝나길 바라면서 안 끝나길 바라는 밤. 여기서만 솔직해질 수 있어 못 떠난다.',
    'sub':'새벽감성·불면','situation':'시계가 4시 44분에서 안 넘어가는 밤. 하고 싶은 말이 낮보다 두 배로 커진다.' },
  { 'id':'yeobaek','canon':'여백','world':'w_yeobaek','light':'여백의 빛','accent':'lavender','hero':'lavender','stage':'w3','diff':3,
    'threat':'빈 예약석','threatDesc':'그 자리를 접어야 나갈 수 있는데, 접는 순간 진짜로 보내는 게 돼버리는 객석.',
    'sub':'최애상실·졸업','situation':'공연이 끝나면 의자가 다 접히는데, 누가 기다리는 자리만 안 접히는 셋째 열.' },
  { 'id':'seupjak','canon':'습작','world':'w_seupjak','light':'밑그림의 빛','accent':'mint','hero':'mint','stage':'w4','diff':2,
    'threat':'미완의 화첩','threatDesc':'완성하면 사라지는 그림. 똑같이 그리려 할수록 흐려지고, 미완으로 남겨야 남는다.',
    'sub':'팬창작·2차','situation':'완성을 선언하면 그림이 사라지는 화첩. 기억으로 그린 삐뚠 선만 진하게 남는다.' },
  { 'id':'janbul','canon':'잔불','world':'w_janbul','light':'잔불의 빛','accent':'gold','hero':'gold','stage':'w1','diff':4,
    'threat':'식은 재','threatDesc':'그냥 끄면 편한데 끄면 끝. 미지근한 채로 밤새 지켜야 하나 매 순간 갈등하게 하는 공터.',
    'sub':'버티기·현타','situation':'흔들어야 겨우 깜빡이는 응원봉. 온 데가 식은 재인데 주황 불씨 하나가 안 꺼진다.' },
]

# 초기 가이드 정령 — 코드 기본 id 'bongi' 유지(SaveSystem/Loadout 하드코딩 정합), 표시명 '루멘'.
GUIDE = { 'id':'bongi','name':'루멘','light':'응원의 빛','color':'rose','portrait':'pt_g_bongi',
          'personality':'응원봉에 처음 불을 켠 빛. 흩어진 열셋을 데리러 팬과 함께 세계를 건넌다.' }

# 최종 세계 — 무결(완결/포기의 의인화, 루멘의 그림자). 정령 각성 없음, 피날레 대사로 종결.
FINALE_WORLD = {
  'id':'mugyeol','name':'완결의 문','sub':'최종 · 완결의 유혹',
  'theme':'모든 빛을 되찾은 뒤 마지막으로 마주하는 문. 여기서 접으면 아무도 안 아프다고 속삭인다.',
  'situation':'열셋을 다 깨우자 열린 마지막 문. 루멘을 닮은 그림자가 리본을 들고 기다린다.',
  'objective':"'잘 끝났잖아'라는 완결의 유혹을 끊고, 마침표를 쉼표로 바꿔라.",
  'threat':'무결','threatDesc':'완결·만족의 의인화. 루멘의 그림자. 가장 다정한 목소리로 "여한 없지?"라며 덕질을 끝내게 한다.',
  'color':'rose','stageRef':'final','spirits':[],'entry':'finale','difficulty':6,'isFinale':True,'reward':0,
}

UNLOCK_COST = 2   # 세계 1개 해금 비용(코인)
CLEAR_REWARD = 3  # 세계 클리어 보상(코인)

def build(canon):
    by_name = { s['name']: s for s in canon['spirits'] }

    # ---- worlds.json ----
    worlds = []
    for i, m in enumerate(MAP):
        c = by_name[m['canon']]
        w = c['world']
        worlds.append({
            'id': m['world'], 'name': w['name'].split(' — ')[0].split(' - ')[0].strip(),
            'sub': m['sub'], 'theme': c['fandomExp'],
            'situation': m['situation'], 'objective': f"정령 '{m['canon']}'의 빛을 깨우고, 이 세계의 거짓을 끊어라.",
            'threat': m['threat'], 'threatDesc': m['threatDesc'],
            'color': m['accent'], 'stageRef': m['stage'], 'spirits': [m['id']],
            'entry': 'unlock', 'unlockCost': 0 if i == 0 else UNLOCK_COST,
            'reward': CLEAR_REWARD, 'difficulty': m['diff'], 'order': i + 1,
        })
    worlds.append(FINALE_WORLD)
    worlds_doc = {
        '_status': '다중세계 지도 v2 — 팬덤 경험 의인화 13세계(정령 1/세계) + 완결의 문(무결). 개별 코인 해금(비연쇄).',
        '_note': 'entry=unlock: unlockCost 코인으로 개별 해금(하나 열어도 다른 세계는 안 열림). finale: 13세계 클리어 시 개방. IP 무참조 오리지널.',
        'firstWorld': MAP[0]['world'],
        'worlds': worlds,
    }

    # ---- guardians.json ----
    roster = [{
        'id': GUIDE['id'], 'order': 1, 'name': GUIDE['name'], 'light': GUIDE['light'],
        'color': GUIDE['color'], 'portrait': GUIDE['portrait'], 'awake': True,
        'personality': GUIDE['personality'],
    }]
    for i, m in enumerate(MAP):
        c = by_name[m['canon']]
        roster.append({
            'id': m['id'], 'order': i + 2, 'name': m['canon'], 'light': m['light'],
            'color': m['hero'], 'portrait': f"pt_g_{m['id']}", 'world': m['world'],
            'shadow': m['threat'],
            'personality': c['fandomExp'][:70].rstrip() + ('…' if len(c['fandomExp']) > 70 else ''),
            'ghost': c['ghost'], 'lie': c['lie'], 'want': c['want'], 'need': c['need'],
        })
    guardians_doc = {
        '_status': '수호자 도감 v2 — 루멘(가이드) + 팬덤 경험 정령 13. 표시명은 순우리말/자연·경험 어휘 오리지널.',
        '_note': "내부 가이드 id는 'bongi'(코드 기본값 정합) 유지, 표시명 '루멘'. 실존 IP 무참조.",
        'roster': roster,
    }

    # ---- dialogue_worlds.json ----
    def line(speaker, portrait, text, side='right'):
        return { 'speaker': speaker, 'portrait': portrait, 'side': side, 'text': text }

    wd = {}
    for m in MAP:
        c = by_name[m['canon']]
        d = c['dialogue']
        pid = f"pt_g_{m['id']}"
        intro = [line('{nickname}', 'player', t, 'right') for t in d['intro']]
        enc = [line(m['canon'], pid, t, 'right') for t in d['encounter']]
        awa = [line(m['canon'], pid, t, 'right') for t in d['awaken']]
        wd[m['world']] = { 'intro': intro, 'spirits': { m['id']: { 'encounter': enc, 'awaken': awa } } }

    # 무결 피날레 — 앞부분(유혹)은 intro, 뒷부분(거절·전환)은 clear.
    fin = canon['finale']['finale']
    def parse_fin(s):
        if ':' in s:
            who, txt = s.split(':', 1)
            who, txt = who.strip(), txt.strip()
        else:
            who, txt = '무결', s.strip()
        if who == '무결':
            return line('무결', 'pt_noise', txt, 'left')
        return line('{nickname}', 'player', txt, 'right')
    fin_lines = [parse_fin(s) for s in fin]
    # 유혹(무결 연속 도입부) vs 거절 이후 분리 — 첫 플레이어 대사 등장 지점에서 자름.
    split = next((i for i, s in enumerate(fin) if s.startswith('나:')), 4)
    wd['mugyeol'] = {
        'intro': fin_lines[:split],
        'clear': fin_lines[split:],
        'spirits': {},
    }

    dialogue_doc = {
        '_status': '세계별 대사 v2 — 캐논(story_canon.json)에서 자동 생성. intro=플레이어 관찰, encounter/awaken=정령. mugyeol=무결 피날레.',
        'worlds': wd,
    }

    def dump(name, doc):
        path = os.path.join(ROOT, 'src', 'config', name)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)
        print('wrote', name, '(%d bytes)' % os.path.getsize(path))

    dump('worlds.json', worlds_doc)
    dump('guardians.json', guardians_doc)
    dump('dialogue_worlds.json', dialogue_doc)

if __name__ == '__main__':
    build(load_canon())
