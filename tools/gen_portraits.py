"""초상화(대사·도감 버스트) 생성 — Pillow 슈퍼샘플링(4x→LANCZOS)로 매끈한 일러스트풍.
   수호자는 색만 다른 게 아니라 왕관·엠블럼·표정으로 각자 특색. 적/플레이어도 통일 프레임."""
from PIL import Image, ImageDraw
import os, math

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'portraits'))
os.makedirs(OUT, exist_ok=True)
W, H, SS = 110, 120, 4

def hx(v, a=255): return ((v>>16)&255,(v>>8)&255,v&255,a)
def mix(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))+(255,)

PANEL=hx(0x161327); INK=hx(0x241a33); WHITE=hx(0xfdf6ff); GOLD=hx(0xffd66b)
GOLD_D=hx(0xd9a63e); LIGHT=hx(0xfdf6c9); PINK=hx(0xff8fa3); RED=hx(0xff5d73)

def canvas():
    im=Image.new('RGBA',(W*SS,H*SS),(0,0,0,0)); return im, ImageDraw.Draw(im)
def S(v): return int(v*SS)
def box(d,x0,y0,x1,y1,r,fill=None,outline=None,ow=1):
    d.rounded_rectangle([S(x0),S(y0),S(x1),S(y1)],radius=S(r),fill=fill,outline=outline,width=S(ow))
def circ(d,cx,cy,r,fill=None,outline=None,ow=1):
    d.ellipse([S(cx-r),S(cy-r),S(cx+r),S(cy+r)],fill=fill,outline=outline,width=max(1,S(ow)))
def ell(d,cx,cy,rx,ry,fill=None):
    d.ellipse([S(cx-rx),S(cy-ry),S(cx+rx),S(cy+ry)],fill=fill)
def star(d,cx,cy,R,r,n=5,rot=-90,fill=None,outline=None,ow=1):
    pts=[]
    for i in range(n*2):
        a=math.radians(rot)+math.pi*i/n; rad=R if i%2==0 else r
        pts.append((S(cx+math.cos(a)*rad),S(cy+math.sin(a)*rad)))
    d.polygon(pts,fill=fill,outline=outline,width=max(1,S(ow)))

def glow(d,cx,cy,r,color):
    for k in range(10,0,-1):
        a=int(9*(k/10)); rad=r*k/10
        d.ellipse([S(cx-rad),S(cy-rad),S(cx+rad),S(cy+rad)],fill=(color[0],color[1],color[2],a))

def frame(d, glow_color):
    box(d,3,3,W-3,H-3,14,fill=PANEL)
    glow(d,W/2,54,46,glow_color)
    box(d,3,3,W-3,H-3,14,outline=(glow_color[0],glow_color[1],glow_color[2],120),ow=1.5)

def eyes(d, ex1, ex2, ey, kind='open'):
    if kind=='open':
        for ex in (ex1,ex2):
            circ(d,ex,ey,4.2,fill=INK); circ(d,ex-1.3,ey-1.5,1.4,fill=WHITE)
    elif kind=='excited':  # 반짝 큰 눈
        for ex in (ex1,ex2):
            circ(d,ex,ey,5,fill=INK); circ(d,ex-1.6,ey-1.8,2,fill=WHITE); circ(d,ex+1.3,ey+1.2,0.9,fill=WHITE)
    elif kind=='calm':     # 반쯤 감은
        for ex in (ex1,ex2):
            d.line([(S(ex-4),S(ey)),(S(ex+4),S(ey+2))],fill=INK,width=S(1.6))
            d.arc([S(ex-4),S(ey-3),S(ex+4),S(ey+3)],200,340,fill=INK,width=S(1.4))
    elif kind=='gentle':
        for ex in (ex1,ex2):
            d.arc([S(ex-4),S(ey-2),S(ex+4),S(ey+5)],185,355,fill=INK,width=S(1.8))

def fairy(color_int, crown, emblem, expr):
    base=hx(color_int); hi=mix(base,WHITE,0.55); sh=mix(base,INK,0.28); cheek=mix(base,PINK,0.5)
    im,d=canvas(); frame(d, base)
    # 왕관/안테나
    if crown=='star5':
        d.line([(S(55),S(30)),(S(55),S(21))],fill=INK,width=S(2)); star(d,55,15,8,3.4,5,fill=GOLD,outline=GOLD_D,ow=1)
    elif crown=='heart':
        d.line([(S(55),S(30)),(S(55),S(22))],fill=INK,width=S(2))
        for dx in (-3,3): circ(d,55+dx,14,3.6,fill=RED)
        d.polygon([(S(48),S(15)),(S(62),S(15)),(S(55),S(24))],fill=RED)
    elif crown=='spark6':
        d.line([(S(55),S(30)),(S(55),S(20))],fill=INK,width=S(2)); star(d,55,14,8.5,3,6,fill=mix(GOLD,WHITE,0.3),outline=GOLD_D,ow=1)
    elif crown=='ring':
        circ(d,55,16,8,outline=GOLD,ow=2.4); circ(d,55,16,8,outline=GOLD_D,ow=0.8)
    # 몸통
    circ(d,55,58,29,fill=INK); circ(d,55,58,27.5,fill=base)
    ell(d,46,49,15,11,fill=hi); ell(d,55,72,20,10,fill=sh)
    circ(d,55,58,27.5,outline=INK,ow=1.4)
    # 팔
    for ax in (28,82):
        circ(d,ax,66,6,fill=INK); circ(d,ax,66,4.6,fill=base)
    # 볼
    ell(d,41,64,6,4,fill=cheek); ell(d,69,64,6,4,fill=cheek)
    # 얼굴
    eyes(d,47,63,56,expr)
    if expr=='excited': d.ellipse([S(52),S(63),S(58),S(70)],fill=INK); ell(d,55,67,2.4,1.4,fill=PINK)
    elif expr=='calm': d.arc([S(50),S(62),S(60),S(70)],10,170,fill=INK,width=S(1.6))
    elif expr=='gentle': d.arc([S(51),S(63),S(59),S(69)],15,165,fill=INK,width=S(1.6))
    else: d.arc([S(50),S(62),S(60),S(70)],20,160,fill=INK,width=S(1.6))
    # 엠블럼(가슴)
    if emblem=='wand':
        d.line([(S(55),S(78)),(S(55),S(68))],fill=GOLD,width=S(1.6)); star(d,55,66,3.4,1.4,5,fill=LIGHT)
    elif emblem=='heart':
        for dx in (-2,2): circ(d,55+dx,71,2.2,fill=mix(base,RED,0.5))
        d.polygon([(S(51),S(72)),(S(59),S(72)),(S(55),S(77))],fill=mix(base,RED,0.5))
    elif emblem=='sun':
        d.arc([S(48),S(70),S(62),S(84)],180,360,fill=GOLD,width=S(1.6))
        for a in range(200,341,28):
            x=55+math.cos(math.radians(a))*9; y=77+math.sin(math.radians(a))*9
            d.line([(S(55),S(77)),(S(x),S(y))],fill=GOLD,width=S(1))
    elif emblem=='rings':
        circ(d,52,73,3.2,outline=mix(base,WHITE,0.6),ow=1.4); circ(d,58,73,3.2,outline=mix(base,WHITE,0.6),ow=1.4)
    # 반짝
    star(d,92,40,2.6,1,4,fill=LIGHT); star(d,20,86,2,0.8,4,fill=LIGHT)
    return im

def antagonist_noise():
    im,d=canvas(); frame(d, hx(0x6e63a8))
    B=hx(0x6e63a8); BD=hx(0x453c73); BH=hx(0x9a8fd6)
    # 조각난 머리
    box(d,24,26,86,96,10,fill=BD)
    box(d,26,28,84,94,9,fill=B)
    # 글리치 어긋난 조각
    d.rectangle([S(26),S(40),S(84),S(48)],fill=BH)
    d.rectangle([S(20),S(41),S(60),S(46)],fill=RED)
    d.rectangle([S(40),S(66),S(90),S(71)],fill=WHITE)
    d.rectangle([S(30),S(80),S(70),S(84)],fill=RED)
    # 어긋난 눈
    d.rectangle([S(36),S(52),S(48),S(62)],fill=WHITE); d.rectangle([S(38),S(54),S(44),S(60)],fill=INK)
    d.rectangle([S(62),S(50),S(74),S(60)],fill=WHITE); d.rectangle([S(66),S(52),S(72),S(58)],fill=INK)
    return im

def antagonist_server():
    im,d=canvas(); frame(d, hx(0x9cc1e5))
    B=hx(0x2b2f45); BD=hx(0x1a1d2e); STEEL=hx(0x3f4665); OKG=hx(0x4be08a)
    box(d,22,24,88,100,8,fill=BD); box(d,24,26,86,98,7,fill=B)
    for r in range(4):
        y=32+r*16
        box(d,30,y,80,y+11,3,fill=BD,outline=STEEL,ow=1)
        circ(d,36,y+5.5,2.4,fill=OKG if r%2 else RED)
        circ(d,43,y+5.5,2.4,fill=hx(0x9cc1e5))
        for sx in range(54,78,4): d.line([(S(sx),S(y+2)),(S(sx),S(y+9))],fill=STEEL,width=S(1))
    # 에러 X 눈 느낌 (상단 큰 화면)
    d.line([(S(34),S(30)),(S(46),S(40))],fill=RED,width=S(1.6)); d.line([(S(46),S(30)),(S(34),S(40))],fill=RED,width=S(1.6))
    return im

def antagonist_monopolist():
    im,d=canvas(); frame(d, hx(0xc9b8e8))
    DARK=hx(0x141024); PRISM=hx(0x2a2450); EDGE=hx(0x3a2f5e)
    for i in range(5):
        x=30+i*11; d.polygon([(S(x),S(30)),(S(x+8),S(30)),(S(x+4),S(20))],fill=PRISM,outline=EDGE)
    d.polygon([(S(55),S(28)),(S(24),S(58)),(S(86),S(58))],fill=DARK,outline=EDGE)
    d.rectangle([S(25),S(58),S(85),S(90)],fill=DARK)
    d.polygon([(S(25),S(90)),(S(85),S(90)),(S(55),S(102))],fill=DARK,outline=EDGE)
    # 가둔 빛 + 창살
    circ(d,55,66,13,fill=LIGHT); circ(d,51,62,5,fill=WHITE)
    for gx in (48,55,62): d.rectangle([S(gx),S(52),S(gx+2),S(80)],fill=DARK)
    circ(d,42,44,3.2,fill=RED); circ(d,68,44,3.2,fill=RED)
    return im

# ══════════════════════════════════════════════════════════════════
# 14정령 최종 디자인 — 캐논 designConcept 반영, 실루엣·모티프를 서로 겹치지 않게.
# 각 함수는 110×120 프레임 버스트를 반환. 상단 2/3에 피사체(하단은 대사창).
# ══════════════════════════════════════════════════════════════════
def _mouth(d, cx, cy, w, kind='smile'):
    if kind=='smile': d.arc([S(cx-w),S(cy-w*0.7),S(cx+w),S(cy+w*0.9)],15,165,fill=INK,width=S(1.7))
    elif kind=='flat': d.line([(S(cx-w),S(cy)),(S(cx+w),S(cy))],fill=INK,width=S(1.6))
    elif kind=='open': d.ellipse([S(cx-w*0.6),S(cy-w*0.5),S(cx+w*0.6),S(cy+w*0.9)],fill=INK)
    elif kind=='frown': d.arc([S(cx-w),S(cy+w*0.5),S(cx+w),S(cy+w*1.5)],195,345,fill=INK,width=S(1.6))

def spirit_lumen():  # 루멘 — 응원봉에 처음 불을 켠 빛(가이드). 밝은 빛구체 + 응원봉.
    base=LIGHT; im,d=canvas(); frame(d,base)
    glow(d,55,52,38,LIGHT)
    circ(d,55,55,25,fill=mix(base,WHITE,0.35)); circ(d,55,55,25,outline=GOLD_D,ow=1.4)
    ell(d,47,47,11,8,fill=WHITE)
    d.line([(S(80),S(94)),(S(86),S(48))],fill=GOLD,width=S(2.4)); glow(d,86,44,11,LIGHT); star(d,86,43,6,2.4,5,fill=LIGHT,outline=GOLD_D)
    eyes(d,48,62,53,'excited'); _mouth(d,55,62,5,'smile')
    ell(d,43,59,5,3,fill=hx(0xff9db0)); ell(d,67,59,5,3,fill=hx(0xff9db0))
    return im

def spirit_saerok():  # 새록 — 로딩스피너 후광 겹침 + 웅크림 + 눈=로딩바 + F5 잔상 팔.
    base=hx(0x9cc1e5); im,d=canvas(); frame(d,base)
    for k,rr in enumerate((30,24,18)):  # 여러 겹 스피너 링(끊긴 호)
        col=mix(base,WHITE,0.1+0.2*k)
        d.arc([S(55-rr),S(54-rr),S(55+rr),S(54+rr)], 20+k*40, 200+k*40, fill=col, width=S(2.2))
        d.arc([S(55-rr),S(54-rr),S(55+rr),S(54+rr)], 220+k*40, 340+k*40, fill=col, width=S(2.2))
    circ(d,55,58,17,fill=base); circ(d,55,58,17,outline=INK,ow=1.2)  # 웅크린 몸
    for ax in (40,70):  # F5 잔상 팔(반투명 겹침)
        for j in range(3): circ(d,ax+j*2,68,4,fill=(base[0],base[1],base[2],90))
    # 눈=차오르는 로딩바
    for ex in (48,62):
        box(d,ex-4,55,ex+4,59,1,outline=INK,ow=1); d.rectangle([S(ex-3),S(56),S(ex+0),S(58)],fill=INK)
    _mouth(d,55,64,4,'flat')
    return im

def spirit_bitjang():  # 빗장 — 세로 문(門) + 얼굴=뒤틀린 보안문자 + 붉은 X 도장 + 개찰구 격자.
    base=hx(0xff5d73); im,d=canvas(); frame(d,base)
    box(d,36,30,74,98,3,fill=mix(base,INK,0.4),outline=base,ow=2)  # 문틀
    d.line([(S(55),S(30)),(S(55),S(98))],fill=base,width=S(1.4))   # 여닫이 경계
    for gy in range(40,92,10): d.line([(S(38),S(gy)),(S(72),S(gy))],fill=(base[0],base[1],base[2],90),width=S(1))  # 개찰구 격자
    # 얼굴 칸 — 뒤틀린 보안문자(찌그러진 글리프)
    box(d,42,44,68,64,2,fill=hx(0x1a0a10))
    for i,gx in enumerate((46,53,60)):
        d.line([(S(gx),S(48+((i*3)%4))),(S(gx+3),S(60-((i*2)%4)))],fill=mix(base,WHITE,0.5),width=S(1.4))
        d.arc([S(gx-2),S(50),S(gx+3),S(58)],30,300,fill=mix(base,WHITE,0.4),width=S(1))
    # 붉은 X 도장
    d.line([(S(62),S(70)),(S(74),S(82))],fill=RED,width=S(2.4)); d.line([(S(74),S(70)),(S(62),S(82))],fill=RED,width=S(2.4))
    return im

def spirit_ulrim():  # 울림 — 이퀄라이저 세로바 몸 + 물결 번짐(윤곽선 없음).
    base=hx(0x8fdcc2); im,d=canvas(); frame(d,base)
    heights=[10,20,32,24,38,22,14]
    for i,h in enumerate(heights):
        x=32+i*6.5; col=mix(base,WHITE,0.1+0.1*(i%3))
        box(d,x,70-h,x+4,72,1.5,fill=col)
    for rr in (16,24,32):  # 물수제비 파문
        d.ellipse([S(55-rr),S(60-rr*0.5),S(55+rr),S(60+rr*0.5)],outline=(base[0],base[1],base[2],70),width=S(1))
    circ(d,48,44,3,fill=INK); circ(d,62,44,3,fill=INK)  # 눈(작게 떠 있음)
    d.arc([S(50),S(48),S(60),S(55)],20,160,fill=INK,width=S(1.4))
    return im

def spirit_semi():  # 셈이 — 正자 격자 장부 몸 + 심장=깜빡 커서 + 다크서클 + 굽은 등.
    base=hx(0xc9b8e8); im,d=canvas(); frame(d,base)
    box(d,36,34,74,92,4,fill=mix(base,INK,0.25),outline=base,ow=1.5)  # 장부 몸
    for r in range(4):  # 正자 바(정자 흘려)
        y=42+r*12
        for c in range(3):
            x=42+c*10; d.line([(S(x),S(y)),(S(x),S(y+7))],fill=mix(base,WHITE,0.4),width=S(1)); d.line([(S(x-2),S(y+7)),(S(x+2),S(y+7))],fill=mix(base,WHITE,0.4),width=S(1))
    box(d,50,58,60,66,1,fill=INK)  # 커서 심장(깜빡)
    for ex in (46,64): circ(d,ex,46,2.6,fill=INK); ell(d,ex,50,4,2,fill=mix(base,hx(0x6a7fd6),0.5))  # 눈+다크서클
    _mouth(d,55,52,3,'flat')
    return im

def spirit_pollin():  # 폴린 — 자유낙하 유선형 + 머리카락 위로 흩날림 + 심장빛 + 눈빛줄기.
    base=hx(0xff8fa3); im,d=canvas(); frame(d,base)
    d.polygon([(S(55),S(30)),(S(42),S(60)),(S(55),S(96)),(S(68),S(60))],fill=base,outline=mix(base,INK,0.3))  # 낙하 유선형 몸
    for hx0 in (44,50,55,60,66):  # 위로 솟은 머리카락
        d.line([(S(hx0),S(38)),(S(hx0+((hx0-55)//3)),S(24))],fill=mix(base,WHITE,0.4),width=S(1.6))
    glow(d,55,58,12,hx(0xffd1dc)); circ(d,55,58,5,fill=WHITE)  # 심장빛
    for ex in (49,61):  # 눈 + 빛줄기
        circ(d,ex,50,2.4,fill=WHITE); d.line([(S(ex),S(50)),(S(ex+(ex-55)//2),S(44))],fill=(255,255,255,120),width=S(1.4))
    return im

def spirit_pick():  # 픽 — 겹친 홀로그램 카드 몸 + 안 뜯은 봉투 + 각진 실루엣.
    base=hx(0x9a8fd6); im,d=canvas(); frame(d,base)
    for k,(ox,oy) in enumerate(((-8,-6),(0,0),(8,6))):  # 겹친 카드 3장
        col=mix(base,WHITE,0.15*k)
        box(d,42+ox,36+oy,68+ox,80+oy,3,fill=col,outline=mix(base,WHITE,0.5),ow=1)
        d.line([(S(44+ox),S(40+oy)),(S(66+ox),S(74+oy))],fill=(255,255,255,70),width=S(1))  # 홀로 사선
    box(d,30,66,44,86,2,fill=mix(base,INK,0.3),outline=base,ow=1)  # 안 뜯은 봉투
    circ(d,52,52,2.6,fill=INK); circ(d,60,55,2.6,fill=INK)  # 각도마다 갈리는 눈(어긋나게)
    return im

def spirit_yeongsu():  # 영수 — 감열지 리본 몸(하반신 종이) + 눈=빨간 가격표 + 다 긁은 카드.
    base=hx(0xffd66b); im,d=canvas(); frame(d,base)
    box(d,42,32,68,60,3,fill=mix(base,WHITE,0.2),outline=mix(base,INK,0.3),ow=1.5)  # 상체(프린터 헤드)
    # 말려 나오는 감열지 리본(하반신)
    pts=[(46,60),(44,72),(52,80),(48,92),(58,96),(64,84),(60,72),(66,64)]
    d.polygon([ (S(x),S(y)) for x,y in pts ], fill=mix(base,WHITE,0.35), outline=mix(base,INK,0.2))
    for ry in range(64,94,6): d.line([(S(46),S(ry)),(S(64),S(ry))],fill=(base[0],base[1],base[2],70),width=S(1))  # 인쇄줄
    for ex in (48,62): box(d,ex-4,44,ex+4,50,1,fill=RED); d.line([(S(ex-3),S(47)),(S(ex+3),S(47))],fill=WHITE,width=S(1))  # 빨간 가격표 눈
    box(d,30,66,42,74,1,fill=mix(base,INK,0.4))  # 다 긁은 카드
    return im

def spirit_chalna():  # 찰나 — 카메라/렌즈 머리 + 버퍼링 깜빡 몸 + REC 빨간 점 + 프레임 잔상.
    base=hx(0xff8a5d); im,d=canvas(); frame(d,base)
    for j in range(3): box(d,40+j*2,58,72+j*2,92,4,fill=(base[0],base[1],base[2],80))  # 프레임 잔상 몸
    box(d,40,58,72,92,4,fill=base,outline=mix(base,INK,0.3),ow=1.5)
    circ(d,55,48,16,fill=hx(0x241a33),outline=base,ow=2)  # 렌즈 머리
    circ(d,55,48,10,fill=mix(base,INK,0.5)); circ(d,55,48,5,fill=mix(base,WHITE,0.3)); circ(d,51,44,2,fill=WHITE)
    circ(d,66,36,3,fill=RED); glow(d,66,36,6,RED)  # REC 점
    for bx in range(46,66,6): d.line([(S(bx),S(70)),(S(bx),S(84))],fill=(255,255,255,60),width=S(2))  # 버퍼링 바
    return im

def spirit_diwon():  # 디원 — 플립 숫자판 몸 + D-1 배지 + 모래시계 세로 실루엣.
    base=hx(0xf0c98a); im,d=canvas(); frame(d,base)
    d.polygon([(S(40),S(32)),(S(70),S(32)),(S(58),S(60)),(S(70),S(90)),(S(40),S(90)),(S(52),S(60))],fill=base,outline=mix(base,INK,0.3))  # 모래시계 실루엣
    for fy in (40,50,70,80):  # 플립 숫자판 칸
        box(d,46,fy,64,fy+7,1,fill=mix(base,INK,0.25),outline=mix(base,WHITE,0.4),ow=1)
        d.line([(S(46),S(fy+3.5)),(S(64),S(fy+3.5))],fill=INK,width=S(1))
    box(d,44,62,66,72,2,fill=RED)  # D-1 배지
    d.line([(S(47),S(67)),(S(51),S(67))],fill=WHITE,width=S(1.6))  # 'D'
    d.arc([S(47),S(64),S(52),S(70)],270,90,fill=WHITE,width=S(1.4))
    d.line([(S(55),S(67)),(S(58),S(67))],fill=WHITE,width=S(1.4))  # '-'
    d.line([(S(61),S(64)),(S(61),S(70)),(S(63),S(70))],fill=WHITE,width=S(1.4))  # '1'
    circ(d,50,45,2,fill=INK); circ(d,60,45,2,fill=INK)
    return im

def spirit_nesi():  # 네시 — 이불 고치 둥근 실루엣 + 폰빛 얼굴(유일 광원) + 4:44 + 다크서클.
    base=hx(0x6a7fd6); im,d=canvas(); frame(d,base)
    circ(d,55,60,30,fill=mix(base,INK,0.35),outline=base,ow=1.5)  # 이불 고치(둥글게)
    circ(d,55,60,30,outline=(base[0],base[1],base[2],80),ow=3)
    box(d,46,50,64,68,3,fill=hx(0x1a2036))  # 얼굴 그늘
    glow(d,55,58,12,hx(0xbfe0ff)); box(d,50,54,60,64,1,fill=hx(0xbfe0ff))  # 폰빛(유일 광원)
    for ex in (51,59): d.line([(S(ex-2),S(58)),(S(ex+2),S(58))],fill=INK,width=S(1.4)); ell(d,ex,61,3,1.6,fill=mix(base,INK,0.4))  # 감은 눈+다크서클
    # 떠다니는 '4:44' — 안 넘어가는 시각(작은 도형으로)
    for i,fx in enumerate((72,78,84)):
        d.line([(S(fx),S(38)),(S(fx),S(43))],fill=mix(base,WHITE,0.5),width=S(1.2))
    circ(d,75,42,0.8,fill=mix(base,WHITE,0.5))
    return im

def spirit_yeobaek():  # 여백 — 반투명(속 비침) + 접힌 객석 의자 어깨 + 빈 장갑 + 바랜 파스텔.
    base=hx(0xbca9e0); im,d=canvas(); frame(d,base)
    faded=mix(base,PANEL,0.35)
    d.polygon([(S(42),S(40)),(S(68),S(40)),(S(72),S(92)),(S(38),S(92))],fill=(faded[0],faded[1],faded[2],150),outline=base)  # 반투명 몸
    box(d,44,36,52,54,2,fill=(base[0],base[1],base[2],120))  # 접히는 의자 어깨(좌)
    box(d,58,36,66,54,2,fill=(base[0],base[1],base[2],120))
    d.line([(S(55),S(50)),(S(55),S(90))],fill=(base[0],base[1],base[2],80),width=S(1))  # 속 비침 경계
    box(d,30,70,40,82,3,outline=base,ow=1.4)  # 빈 장갑 한 짝(윤곽만)
    for ex in (49,61): d.arc([S(ex-3),S(50),S(ex+3),S(56)],185,355,fill=INK,width=S(1.4))  # 잔잔한 눈
    return im

def spirit_seupjak():  # 습작 — 미완성 스케치(겹친 선+지우개 자국) + 덜 마른 잉크 손 + 남색/살구.
    base=hx(0x8fb0f0); apr=hx(0xf6c9a0); im,d=canvas(); frame(d,base)
    # 겹친 밑그림 선(실루엣이 흔들림)
    for off in (-3,0,3):
        d.line([(S(46+off),S(36)),(S(42+off),S(70)),(S(52+off),S(92))],fill=(base[0],base[1],base[2],120 if off else 220),width=S(1.6),joint='curve')
        d.line([(S(64+off),S(36)),(S(68+off),S(70)),(S(58+off),S(92))],fill=(base[0],base[1],base[2],120 if off else 220),width=S(1.6),joint='curve')
    d.arc([S(42),S(38),S(68),S(64)],200,340,fill=base,width=S(1.6))  # 머리 윤곽(미완)
    for ex in (50,60): d.line([(S(ex-3),S(52)),(S(ex+3),S(52))],fill=INK,width=S(1.4))  # 눈=아직 선 (특히 눈이 안 됨)
    d.ellipse([S(60),S(78),S(70),S(88)],fill=(apr[0],apr[1],apr[2],150))  # 덜 마른 잉크 손(번짐)
    for gx,gy in ((40,44),(72,66),(44,84)): circ(d,gx,gy,1.2,fill=(base[0],base[1],base[2],120))  # 지우개 가루
    return im

def spirit_janbul():  # 잔불 — 재 뒤집어쓴 실루엣 + 주황 불씨 한 점 + 담요 + 감싼 손.
    base=hx(0xffb07a); ash=hx(0x6b6470); im,d=canvas(); frame(d,base)
    d.polygon([(S(55),S(34)),(S(36),S(58)),(S(40),S(92)),(S(70),S(92)),(S(74),S(58))],fill=ash,outline=mix(ash,INK,0.3))  # 재 담요 실루엣
    for sx,sy in ((44,50),(66,54),(50,74),(64,80)): circ(d,sx,sy,1.4,fill=mix(ash,WHITE,0.3))  # 재 얼룩
    glow(d,55,66,14,base); circ(d,55,66,6,fill=base); circ(d,55,66,3,fill=hx(0xfff2c9))  # 불씨 한 점
    for ax in (44,66): d.arc([S(ax-6),S(62),S(ax+6),S(76)],250,470,fill=ash,width=S(2.4))  # 감싼 두 손
    for ex in (49,61): circ(d,ex,50,2,fill=mix(base,WHITE,0.3))  # 재 속 눈(은은)
    return im

def player():
    im,d=canvas(); frame(d, hx(0xf1c7d2))
    HOOD=hx(0x35304f); HOODD=hx(0x24203a); FACE=hx(0x2a2438)
    # 후드 실루엣
    d.polygon([(S(55),S(26)),(S(30),S(48)),(S(30),S(96)),(S(80),S(96)),(S(80),S(48))],fill=HOOD)
    d.ellipse([S(34),S(30),S(76),S(72)],fill=HOOD)
    d.ellipse([S(40),S(40),S(70),S(78)],fill=FACE)  # 얼굴 그림자
    d.polygon([(S(55),S(28)),(S(36),S(46)),(S(74),S(46))],fill=HOODD)
    # 빛나는 눈 2점
    circ(d,48,58,2.4,fill=hx(0x9cc1e5)); circ(d,62,58,2.4,fill=hx(0x9cc1e5))
    # 응원봉 (손)
    d.line([(S(78),S(92)),(S(84),S(60))],fill=GOLD,width=S(2)); star(d,85,55,5,2,5,fill=LIGHT,outline=GOLD_D)
    return im

def out(im,name): im.resize((W,H),Image.LANCZOS).save(os.path.join(OUT,name+'.png'))

def main():
    # 14정령 최종 디자인 — 캐논 designConcept 반영, 실루엣·모티프 서로 겹치지 않게.
    guards={
        'pt_g_bongi':    spirit_lumen(),    # 루멘(가이드) — 응원봉 빛구체
        'pt_g_pollin':   spirit_pollin(),   # 입덕·낙하 — 자유낙하 유선형
        'pt_g_pick':     spirit_pick(),     # 포카·뽑기 — 겹친 홀로그램 카드
        'pt_g_saerok':   spirit_saerok(),   # 새로고침·대기열 — 로딩스피너 후광
        'pt_g_bitjang':  spirit_bitjang(),  # 보안문자·인증 — 세로 관문+X
        'pt_g_ulrim':    spirit_ulrim(),    # 떼창·스밍 — 이퀄라이저+물결
        'pt_g_semi':     spirit_semi(),     # 총공·투표 — 正자 장부+커서 심장
        'pt_g_yeongsu':  spirit_yeongsu(),  # 굿즈·텅장 — 감열지 리본
        'pt_g_chalna':   spirit_chalna(),   # 직캠·기록 — 렌즈 머리+REC
        'pt_g_diwon':    spirit_diwon(),    # 컴백·기다림 — 플립 숫자판+D-1
        'pt_g_nesi':     spirit_nesi(),     # 새벽·불면 — 이불 고치+폰빛
        'pt_g_yeobaek':  spirit_yeobaek(),  # 최애상실·졸업 — 반투명+접힌 의자
        'pt_g_seupjak':  spirit_seupjak(),  # 팬창작·2차 — 미완성 스케치
        'pt_g_janbul':   spirit_janbul(),   # 버티기·현타 — 재+불씨
    }
    others={'pt_noise':antagonist_noise(),'pt_server':antagonist_server(),
            'pt_monopolist':antagonist_monopolist(),'pt_player':player()}
    allp={**guards,**others}
    for k,v in allp.items(): out(v,k)
    # 미리보기 몽타주
    scale=3; pad=8; items=list(allp.items())
    ims=[(n,im.resize((W,H),Image.LANCZOS).resize((W*scale,H*scale),Image.NEAREST)) for n,im in items]
    cols=4; rows=(len(ims)+cols-1)//cols
    cw=W*scale+pad; ch=H*scale+pad+16
    mont=Image.new('RGBA',(cols*cw+pad,rows*ch+pad),(30,28,42,255))
    dd=ImageDraw.Draw(mont)
    for i,(n,im) in enumerate(ims):
        x=pad+(i%cols)*cw; y=pad+(i//cols)*ch
        mont.paste(im,(x,y),im); dd.text((x+2,y+H*scale+2),n,fill=(200,200,220,255))
    mont.save(os.path.abspath(os.path.join(os.path.dirname(__file__),'..','preview_portraits.png')))
    print('portraits generated:', ', '.join(allp.keys()))

if __name__=='__main__': main()
