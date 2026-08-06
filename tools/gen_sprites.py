"""자체 픽셀아트 생성 파이프라인 (PixelLab 대체) — Pillow로 크리스프 도트 스프라이트를 그려 PNG 출력.
   수호자 히어로(별빛 요정) 5색 + 적/보스. AA 없이 하드에지 → 도트 선명."""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'sprites')
OUT = os.path.abspath(OUT)
os.makedirs(OUT, exist_ok=True)

def hx(v):
    return ((v >> 16) & 255, (v >> 8) & 255, v & 255, 255)

def mix(a, b, t):
    return tuple(int(a[i] + (b[i]-a[i])*t) for i in range(3)) + (255,)

WHITE=hx(0xfdf6ff); INK=hx(0x241a33); GOLD=hx(0xffd66b); GOLD_D=hx(0xd9a63e)
LIGHT=hx(0xfdf6c9); PINK=hx(0xff8fa3)

GUARD_COLORS = {
    'rose': 0xf1c7d2, 'serenity': 0x9cc1e5, 'gold': 0xffd66b,
    'mint': 0x8fdcc2, 'lavender': 0xc9b8e8,
}

def star_points(cx, cy, R, r, n=5, rot=-90):
    import math
    pts=[]
    for i in range(n*2):
        ang=math.radians(rot)+math.pi*i/n
        rad=R if i%2==0 else r
        pts.append((cx+math.cos(ang)*rad, cy+math.sin(ang)*rad))
    return pts

def draw_hero(color_int):
    base=hx(color_int)
    hi=mix(base, WHITE, 0.55)
    sh=mix(base, INK, 0.30)
    cheek=mix(base, PINK, 0.55)
    im=Image.new('RGBA',(32,32),(0,0,0,0))
    d=ImageDraw.Draw(im)

    # 별 안테나 (gold) + 줄기
    d.line([(16,9),(16,5)], fill=INK, width=2)
    d.line([(16,9),(16,6)], fill=GOLD, width=1)
    sp=star_points(16,4,4.2,1.8)
    d.polygon(sp, fill=GOLD, outline=GOLD_D)

    # 몸통 아웃라인(살짝 큰 실루엣) → 베이스
    d.ellipse([6,11,25,29], fill=INK)          # 아웃라인 실루엣
    d.ellipse([7,12,24,28], fill=base)         # 베이스 바디
    d.ellipse([8,13,19,22], fill=hi)           # 하이라이트(좌상)
    d.ellipse([9,20,22,27], fill=sh)           # 하단 그림자 살짝
    d.ellipse([7,12,24,28], outline=INK)       # 재아웃라인 살짝

    # 스터비 팔
    for ax in (5,26):
        d.ellipse([ax-1,19,ax+3,23], fill=INK)
        d.ellipse([ax,20,ax+2,22], fill=base)

    # 작은 날개(빛) 뒤쪽
    d.polygon([(6,15),(2,13),(4,19)], fill=mix(LIGHT,WHITE,0.3))
    d.polygon([(25,15),(29,13),(27,19)], fill=mix(LIGHT,WHITE,0.3))

    # 얼굴 — 큰 눈 2 + 하이라이트 + 미소 + 볼터치
    for ex in (13,19):
        d.ellipse([ex-2,16,ex+1,20], fill=INK)       # 눈
        d.point((ex-1,17), fill=WHITE)               # 눈 하이라이트
    d.ellipse([11,21,13,23], fill=cheek)             # 볼
    d.ellipse([19,21,21,23], fill=cheek)
    d.arc([14,20,18,24], 20, 160, fill=INK, width=1) # 미소

    # 가슴 코어 반짝
    d.point((16,24), fill=LIGHT)
    return im

def draw_spinner():
    """로딩 스피너 잡몹 — 링만 있던 것 → 눈 달린 톱니형 소용돌이 생명체."""
    im=Image.new('RGBA',(32,32),(0,0,0,0)); d=ImageDraw.Draw(im)
    P=hx(0x8f7fd6); PD=hx(0x5a4aa0); PH=hx(0xc9baf2)
    d.ellipse([4,4,27,27], fill=INK)
    d.ellipse([5,5,26,26], fill=P)
    # 톱니(회전감)
    import math
    for k in range(8):
        a=math.radians(k*45)
        x=16+math.cos(a)*12; y=16+math.sin(a)*12
        d.ellipse([x-2,y-2,x+2,y+2], fill=PD)
    d.ellipse([9,9,22,22], fill=PD)
    d.ellipse([10,10,21,21], fill=P)
    d.ellipse([12,12,19,19], fill=PH)
    # 눈
    d.ellipse([13,13,15,16], fill=INK); d.ellipse([17,13,19,16], fill=INK)
    d.point((13,13),fill=WHITE); d.point((17,13),fill=WHITE)
    # 뾰로통 입
    d.line([(14,19),(18,19)], fill=INK, width=1)
    return im

def draw_boss_noise():
    """노이즈 군체 — 글리치 덩어리. 기존 밋밋한 블롭 → 균열·글리치·다중 눈."""
    im=Image.new('RGBA',(80,80),(0,0,0,0)); d=ImageDraw.Draw(im)
    B=hx(0x6e63a8); BD=hx(0x453c73); BH=hx(0x9a8fd6); RED=hx(0xff5d73)
    d.ellipse([8,10,72,74], fill=INK)
    d.ellipse([10,12,70,72], fill=B)
    d.ellipse([16,16,50,44], fill=BH)         # 상단 하이라이트
    d.ellipse([20,44,64,70], fill=BD)         # 하단 그림자
    # 글리치 가로줄 (RED/white 어긋남)
    for gy in (26,38,52,60):
        d.rectangle([12, gy, 12+ (gy*7%48)+10, gy+2], fill=RED)
        d.rectangle([16, gy+3, 16+(gy*5%40)+6, gy+4], fill=WHITE)
    # 다중 눈 (불안한 군체)
    for (ex,ey,r) in [(30,34,4),(52,32,5),(41,50,3)]:
        d.ellipse([ex-r,ey-r,ex+r,ey+r], fill=WHITE)
        d.ellipse([ex-2,ey-2,ex+2,ey+2], fill=INK)
    return im

def draw_boss_server():
    """티켓팅 서버 — 랙 걸린 서버 괴물. 상태 LED·균열·에러 표정."""
    im=Image.new('RGBA',(80,80),(0,0,0,0)); d=ImageDraw.Draw(im)
    B=hx(0x2b2f45); BD=hx(0x1a1d2e); STEEL=hx(0x3f4665); OKG=hx(0x4be08a); RED=hx(0xff5d73)
    d.rectangle([10,8,70,72], fill=INK)
    d.rectangle([12,10,68,70], fill=B)
    # 랙 슬롯
    for r in range(5):
        y=14+r*11
        d.rectangle([16,y,64,y+8], fill=BD)
        d.rectangle([16,y,64,y+8], outline=STEEL)
        # LED
        d.ellipse([20,y+2,24,y+6], fill=OKG if r%2 else RED)
        d.ellipse([27,y+2,31,y+6], fill=hx(0x9cc1e5))
        # 팬 슬릿
        for sx in range(40,62,4):
            d.line([(sx,y+1),(sx,y+7)], fill=STEEL, width=1)
    # 과열 균열
    d.line([(34,12),(40,34),(30,52),(38,70)], fill=RED, width=1)
    return im

def draw_boss_monopolist():
    """독점자 — 빛을 창살에 가둔 왕관 쓴 어둠의 프리즘."""
    im=Image.new('RGBA',(80,80),(0,0,0,0)); d=ImageDraw.Draw(im)
    DARK=hx(0x141024); PRISM=hx(0x2a2450); EDGE=hx(0x3a2f5e); RED=hx(0xff5d73)
    # 왕관 스파이크
    for i in range(5):
        x=18+i*11
        d.polygon([(x,14),(x+8,14),(x+4,4)], fill=PRISM, outline=EDGE)
    # 프리즘 몸체
    d.polygon([(40,8),(8,40),(72,40)], fill=DARK, outline=EDGE)
    d.rectangle([9,40,71,66], fill=DARK)
    d.polygon([(9,66),(71,66),(40,78)], fill=DARK, outline=EDGE)
    # 가둔 빛 코어
    d.ellipse([28,40,52,64], fill=LIGHT)
    d.ellipse([33,44,42,53], fill=WHITE)
    # 창살
    for gx in (34,40,46):
        d.rectangle([gx,36,gx+2,66], fill=DARK)
    # 위험한 눈
    d.ellipse([26,28,32,34], fill=RED); d.ellipse([48,28,54,34], fill=RED)
    d.point((28,30),fill=WHITE); d.point((50,30),fill=WHITE)
    return im

def draw_coin():
    im=Image.new('RGBA',(18,18),(0,0,0,0)); d=ImageDraw.Draw(im)
    d.polygon([(9,1),(16,9),(9,16),(2,9)], fill=GOLD, outline=GOLD_D)
    d.polygon([(9,3),(13,9),(9,13),(5,9)], fill=mix(GOLD,WHITE,0.5))
    d.point((7,6), fill=WHITE)
    return im

def save(im, name, scale_note=''):
    p=os.path.join(OUT, name+'.png'); im.save(p); return im

def main():
    heroes={}
    for name,c in GUARD_COLORS.items():
        im=draw_hero(c); save(im, f'hero_{name}'); heroes[name]=im
    save(draw_spinner(), 'enemy_spinner')
    save(draw_boss_noise(), 'boss_noise')
    save(draw_boss_server_png:=draw_boss_server(), 'boss_server')
    save(draw_boss_monopolist(), 'boss_monopolist')
    save(draw_coin(), 'coin')

    # 미리보기 몽타주
    scale=7; pad=10
    row1=[('hero_'+n, heroes[n]) for n in GUARD_COLORS]
    row2=[('spinner',draw_spinner()),('coin',draw_coin())]
    row3=[('boss_noise',draw_boss_noise()),('boss_server',draw_boss_server()),('boss_monopolist',draw_boss_monopolist())]
    def strip(items):
        ims=[(n,im.resize((im.width*scale,im.height*scale),Image.NEAREST)) for n,im in items]
        W=sum(im.width for _,im in ims)+pad*(len(ims)+1); H=max(im.height for _,im in ims)+pad*2
        s=Image.new('RGBA',(W,H),(20,18,32,255)); x=pad
        for _,im in ims: s.paste(im,(x,pad),im); x+=im.width+pad
        return s
    s1,s2,s3=strip(row1),strip(row2),strip(row3)
    W=max(s1.width,s2.width,s3.width); H=s1.height+s2.height+s3.height+pad
    mont=Image.new('RGBA',(W,H),(20,18,32,255))
    mont.paste(s1,(0,0)); mont.paste(s2,(0,s1.height)); mont.paste(s3,(0,s1.height+s2.height))
    prev=os.path.join(os.path.dirname(__file__),'..','preview_sprites.png')
    mont.convert('RGBA').save(os.path.abspath(prev))
    print('generated heroes + enemies + bosses; preview at preview_sprites.png')

if __name__=='__main__':
    main()
