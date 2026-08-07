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
    guards={
        'pt_g_bongi': fairy(0xf1c7d2,'star5','wand','open'),
        'pt_g_noeul': fairy(0xffd66b,'heart','heart','excited'),
        'pt_g_yunseul': fairy(0x9cc1e5,'spark6','sun','calm'),
        'pt_g_yeoul': fairy(0x8fdcc2,'ring','rings','gentle'),
        'pt_g_byeotnwi': fairy(0xf0c98a,'spark6','heart','gentle'),
        'pt_g_inae': fairy(0x9a8fd6,'ring','sun','calm'),
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
