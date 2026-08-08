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
# 14정령 — 귀엽게 재디자인(2026-08). '못생김' 피드백 반영.
# 공통 큐트 베이스(큰 반짝 눈·볼터치·둥근 몸) + 정령별 시그니처 소품/색으로 구별.
# (임시 인하우스 아트. 최종본은 PixelLab 프롬프트로 별도 렌더 예정.)
# ══════════════════════════════════════════════════════════════════
CHEEK = hx(0xff9db0)

def cutie(base, eyes='star', mouth='smile', blush=True):
    """귀여운 정령 공통 베이스 — (im,d) 반환해 소품을 이어 그림."""
    im, d = canvas(); frame(d, base)
    hi = mix(base, WHITE, 0.5); sh = mix(base, INK, 0.22)
    ell(d, 55, 85, 15, 11, fill=sh)                      # 작은 몸
    circ(d, 55, 54, 26, fill=INK); circ(d, 55, 54, 24.5, fill=base)  # 큰 머리
    ell(d, 46, 45, 11, 8, fill=hi)                       # 하이라이트
    for ax in (31, 79):                                  # 작고 둥근 팔
        circ(d, ax, 73, 5.2, fill=INK); circ(d, ax, 73, 4, fill=base)
    if blush:
        ell(d, 41, 60, 5, 3.2, fill=CHEEK); ell(d, 69, 60, 5, 3.2, fill=CHEEK)
    _eyes(d, eyes); _cmouth(d, mouth)
    return im, d

def _eyes(d, kind):
    if kind == 'star':
        for ex in (46, 64):
            circ(d, ex, 52, 5.6, fill=INK); circ(d, ex-1.8, 50, 2.4, fill=WHITE); circ(d, ex+1.5, 54, 1.1, fill=WHITE)
    elif kind == 'sleepy':
        for ex in (46, 64):
            d.arc([S(ex-4.5), S(50), S(ex+4.5), S(58)], 185, 355, fill=INK, width=S(2.2))
    elif kind == 'wink':
        circ(d, 46, 52, 5.6, fill=INK); circ(d, 44.2, 50, 2.4, fill=WHITE)
        d.arc([S(59.5), S(50), S(68.5), S(58)], 185, 355, fill=INK, width=S(2.2))
    elif kind == 'heart':
        for ex in (46, 64):
            for dx in (-1.7, 1.7): circ(d, ex+dx, 51, 2.2, fill=RED)
            d.polygon([(S(ex-3.4), S(51.5)), (S(ex+3.4), S(51.5)), (S(ex), S(56))], fill=RED)
    elif kind == 'sparkle':  # 큰 눈 + 큰 반짝
        for ex in (46, 64):
            circ(d, ex, 52, 6, fill=INK); circ(d, ex-2, 49.5, 2.8, fill=WHITE); circ(d, ex+1.8, 54, 1.3, fill=WHITE)

def _cmouth(d, kind):
    if kind == 'smile': d.arc([S(50), S(58), S(60), S(66)], 15, 165, fill=INK, width=S(1.7))
    elif kind == 'open': d.ellipse([S(52), S(59), S(58), S(65)], fill=INK); ell(d, 55, 63, 1.8, 1, fill=CHEEK)
    elif kind == 'cat': d.line([(S(51), S(61)), (S(55), S(63)), (S(59), S(61))], fill=INK, width=S(1.5), joint='curve')
    elif kind == 'ohh': d.ellipse([S(53), S(60), S(57), S(64)], fill=INK)

def _hairtuft(d, base, xs):  # 머리 위 작은 뿔/삐침
    hi = mix(base, WHITE, 0.5)
    for x in xs: d.polygon([(S(x-3), S(30)), (S(x+3), S(30)), (S(x), S(22))], fill=hi)

def spirit_lumen():  # 루멘(가이드) — 응원봉 + 별. 밝고 따뜻.
    im, d = cutie(LIGHT, 'sparkle', 'smile')
    d.line([(S(78), S(90)), (S(84), S(46))], fill=GOLD, width=S(2.4)); glow(d, 84, 42, 11, LIGHT); star(d, 84, 41, 6, 2.4, 5, fill=LIGHT, outline=GOLD_D)
    star(d, 55, 16, 6.5, 2.6, 5, fill=GOLD, outline=GOLD_D)  # 머리 위 별
    return im

def spirit_pollin():  # 폴린(입덕) — 하트 눈 + 통통 튀는 하트.
    im, d = cutie(hx(0xff8fb0), 'heart', 'open')
    for hx0, hy, r in ((22, 40, 3), (86, 46, 2.4), (74, 26, 2)):  # 떠다니는 하트
        for dx in (-r*0.7, r*0.7): circ(d, hx0+dx, hy, r*0.7, fill=RED)
        d.polygon([(S(hx0-r), S(hy)), (S(hx0+r), S(hy)), (S(hx0), S(hy+r*1.4))], fill=RED)
    _hairtuft(d, hx(0xff8fb0), (49, 55, 61))
    return im

def spirit_pick():  # 픽(뽑기) — 포토카드 한 장 들고 홀로 반짝.
    base = hx(0xb18cff); im, d = cutie(base, 'star', 'cat')
    box(d, 68, 60, 86, 88, 3, fill=mix(base, WHITE, 0.4), outline=WHITE, ow=1)  # 든 카드
    d.line([(S(70), S(64)), (S(84), S(84))], fill=(255, 255, 255, 120), width=S(1.2))
    star(d, 20, 40, 3, 1.2, 4, fill=WHITE); star(d, 90, 34, 2.4, 1, 4, fill=WHITE)
    return im

def spirit_saerok():  # 새록(새로고침) — 머리 위 로딩 도넛 + 졸린 눈.
    base = hx(0x86c8ff); im, d = cutie(base, 'sleepy', 'smile')
    circ(d, 55, 18, 8, outline=mix(base, WHITE, 0.5), ow=2.4)  # 로딩 링
    d.arc([S(47), S(10), S(63), S(26)], 30, 140, fill=WHITE, width=S(2.4))
    circ(d, 62, 22, 1.6, fill=WHITE)
    return im

def spirit_bitjang():  # 빗장(캡차) — 열쇠 참 + 볼에 작은 X 스티커.
    base = hx(0xff8a5c); im, d = cutie(base, 'wink', 'cat')
    d.line([(S(80), S(64)), (S(80), S(80))], fill=GOLD, width=S(2)); circ(d, 80, 62, 3.4, outline=GOLD, ow=2); d.rectangle([S(78), S(78), S(82), S(82)], fill=GOLD)  # 열쇠
    d.line([(S(66), S(62)), (S(72), S(68))], fill=RED, width=S(1.6)); d.line([(S(72), S(62)), (S(66), S(68))], fill=RED, width=S(1.6))  # X 스티커
    return im

def spirit_ulrim():  # 울림(떼창) — 헤드폰 + 음표.
    base = hx(0x7fe6c6); im, d = cutie(base, 'star', 'open')
    d.arc([S(34), S(24), S(76), S(60)], 180, 360, fill=mix(base, INK, 0.2), width=S(3))  # 밴드
    box(d, 26, 44, 34, 60, 3, fill=mix(base, INK, 0.2)); box(d, 76, 44, 84, 60, 3, fill=mix(base, INK, 0.2))  # 이어컵
    d.line([(S(86), S(40)), (S(86), S(26))], fill=INK, width=S(1.6)); circ(d, 84, 40, 2.4, fill=INK)  # 음표
    return im

def spirit_semi():  # 셈이(총공) — 동그란 안경 + 작은 체크 메모.
    base = hx(0xcfa8ff); im, d = cutie(base, 'star', 'smile')
    circ(d, 46, 52, 7, outline=INK, ow=1.6); circ(d, 64, 52, 7, outline=INK, ow=1.6); d.line([(S(53), S(52)), (S(57), S(52))], fill=INK, width=S(1.4))  # 안경
    box(d, 70, 62, 86, 82, 2, fill=WHITE, outline=mix(base, INK, 0.3), ow=1)  # 메모
    for yy in (68, 74, 79): d.line([(S(73), S(yy)), (S(83), S(yy))], fill=mix(base, INK, 0.4), width=S(1))
    return im

def spirit_yeongsu():  # 영수(굿즈) — 작은 쇼핑백 + 반짝.
    base = hx(0xffd66b); im, d = cutie(base, 'sparkle', 'open')
    box(d, 68, 66, 86, 88, 2, fill=mix(base, WHITE, 0.3), outline=mix(base, INK, 0.3), ow=1)  # 쇼핑백
    d.arc([S(71), S(60), S(78), S(70)], 180, 360, fill=INK, width=S(1.4)); d.arc([S(76), S(60), S(83), S(70)], 180, 360, fill=INK, width=S(1.4))  # 손잡이
    for dx in (-1.4, 1.4): circ(d, 77+dx, 76, 1.4, fill=RED)
    d.polygon([(S(74), S(77)), (S(80), S(77)), (S(77), S(81))], fill=RED)  # 하트
    return im

def spirit_chalna():  # 찰나(직캠) — 목에 건 작은 카메라 + REC 반짝.
    base = hx(0xff8a5c); im, d = cutie(base, 'sparkle', 'smile')
    box(d, 44, 74, 66, 90, 3, fill=mix(base, INK, 0.3))  # 카메라 바디
    circ(d, 55, 82, 5, fill=mix(base, WHITE, 0.4), outline=INK, ow=1); circ(d, 55, 82, 2.4, fill=INK)  # 렌즈
    circ(d, 62, 76, 1.6, fill=RED); glow(d, 62, 76, 4, RED)  # REC
    d.arc([S(40), S(64), S(70), S(80)], 200, 340, fill=INK, width=S(1.2))  # 넥스트랩
    return im

def spirit_diwon():  # 디원(컴백) — 배에 D-1 달력 배지 + 반짝.
    base = hx(0xffe066); im, d = cutie(base, 'star', 'open')
    box(d, 45, 74, 65, 90, 2, fill=WHITE, outline=mix(base, INK, 0.3), ow=1)  # 달력
    d.rectangle([S(45), S(74), S(65), S(78)], fill=hx(0xff6b8a))  # 상단 빨강
    d.line([(S(49), S(82)), (S(52), S(82))], fill=INK, width=S(1.6)); d.arc([S(49), S(80), S(53), S(88)], 270, 90, fill=INK, width=S(1.4))  # D
    d.line([(S(55), S(84)), (S(57), S(84))], fill=INK, width=S(1.2))  # -
    d.line([(S(60), S(80)), (S(60), S(88)), (S(62), S(88))], fill=INK, width=S(1.4))  # 1
    return im

def spirit_nesi():  # 네시(새벽) — 이불 후드 뒤집어씀 + 졸린 눈 + 별.
    base = hx(0x8a7fe0); im, d = cutie(base, 'sleepy', 'smile')
    d.pieslice([S(28), S(22), S(82), S(80)], 180, 360, fill=(mix(base, INK, 0.25)[0], mix(base, INK, 0.25)[1], mix(base, INK, 0.25)[2], 220))  # 이불 후드
    d.arc([S(28), S(22), S(82), S(80)], 180, 360, fill=mix(base, WHITE, 0.3), width=S(2))
    star(d, 84, 34, 3, 1.2, 4, fill=WHITE); star(d, 24, 42, 2.2, 0.9, 4, fill=WHITE)
    circ(d, 78, 70, 3, fill=hx(0xbfe0ff)); glow(d, 78, 70, 5, hx(0xbfe0ff))  # 폰빛
    return im

def spirit_yeobaek():  # 여백(졸업) — 머리 리본 + 파스텔 부드럽게.
    base = hx(0xcbb8ee); im, d = cutie(base, 'star', 'smile')
    rib = hx(0xff9ecb)
    d.polygon([(S(48), S(24)), (S(55), S(28)), (S(48), S(32))], fill=rib); d.polygon([(S(62), S(24)), (S(55), S(28)), (S(62), S(32))], fill=rib)  # 리본
    circ(d, 55, 28, 2.6, fill=mix(rib, WHITE, 0.3))
    return im

def spirit_seupjak():  # 습작(팬창작) — 붓 들고 볼에 물감.
    base = hx(0x86c8ff); im, d = cutie(base, 'star', 'cat')
    d.line([(S(80), S(88)), (S(86), S(58))], fill=hx(0xcaa27a), width=S(2))  # 붓대
    d.polygon([(S(83), S(60)), (S(89), S(60)), (S(86), S(50))], fill=hx(0xff8a5c))  # 붓끝(물감)
    ell(d, 69, 62, 3, 2, fill=hx(0xff8a5c))  # 볼 물감
    ell(d, 40, 58, 2.4, 1.6, fill=hx(0x7fe6c6))
    return im

def spirit_janbul():  # 잔불(버티기) — 담요 두르고 작은 랜턴(불씨) 안음.
    base = hx(0xff9e6b); im, d = cutie(base, 'sleepy', 'smile')
    blanket = hx(0x8a7f92)
    d.pieslice([S(30), S(60), S(80), S(100)], 180, 360, fill=blanket)  # 담요
    circ(d, 55, 82, 8, fill=mix(INK, base, 0.2), outline=hx(0x6a6470), ow=1.4)  # 랜턴
    circ(d, 55, 82, 4, fill=hx(0xffb07a)); circ(d, 55, 82, 2, fill=hx(0xfff2c9)); glow(d, 55, 82, 8, hx(0xffb07a))  # 불씨
    return im


def portrait_mugyeol():  # 무결 — 루멘의 그림자. 빛 버스트의 어둠 거울 + 완결 리본 + 감은 만족의 눈.
    base=hx(0x2a2440); im,d=canvas(); frame(d, hx(0x6a5a8a))
    for k in range(9,0,-1):  # 어둠 후광
        a=int(12*(k/9)); rr=40*k/9
        d.ellipse([S(55-rr),S(52-rr),S(55+rr),S(52+rr)],fill=(hx(0x160f22)[0],hx(0x160f22)[1],hx(0x160f22)[2],a))
    circ(d,55,55,25,fill=base); circ(d,55,55,25,outline=hx(0x160f22),ow=1.4)
    ell(d,47,47,10,7,fill=mix(base,PINK,0.18))  # 희미한 온기(루멘 잔영)
    glow(d,55,60,10,LIGHT); circ(d,55,60,4,fill=LIGHT); circ(d,55,60,2,fill=WHITE)  # 삼켜진 마침표 빛
    # 완결 리본
    d.line([(S(34),S(60)),(S(76),S(48))],fill=GOLD_D,width=S(2.2)); d.line([(S(34),S(48)),(S(76),S(60))],fill=GOLD_D,width=S(2.2))
    d.polygon([(S(50),S(52)),(S(55),S(54)),(S(50),S(58))],fill=GOLD_D); d.polygon([(S(60),S(52)),(S(55),S(54)),(S(60),S(58))],fill=GOLD_D)
    circ(d,55,54,3,fill=mix(GOLD_D,WHITE,0.3))
    # 만족스러운 감은 눈 + 응원봉(끝을 봉한)
    d.arc([S(45),S(46),S(53),S(53)],190,350,fill=WHITE,width=S(1.8)); d.arc([S(57),S(46),S(65),S(53)],190,350,fill=WHITE,width=S(1.8))
    d.line([(S(80),S(94)),(S(84),S(56))],fill=hx(0x6a5a3a),width=S(2.2)); circ(d,84,53,4,fill=mix(GOLD_D,INK,0.3))
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
            'pt_monopolist':antagonist_monopolist(),'pt_mugyeol':portrait_mugyeol(),'pt_player':player()}
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
