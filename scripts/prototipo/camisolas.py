# Protótipo (Prompt 5): retira dizeres/logótipos das camisolas da fotografia de análise e gera a camada de sombreado
# que a interface pinta com a cor do clube. Uso: python3 scripts/prototipo/camisolas.py
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
src=Image.open('docs/prototipo/analise-original.jpg').convert('RGB'); W,H=src.size
A=np.asarray(src).astype(float); R,G,B=A[...,0],A[...,1],A[...,2]
polis={
 'esq':([(50,362),(90,345),(140,338),(176,356),(198,398),(230,415),(285,450),(295,470),(278,500),(270,522),(232,537),(196,550),(175,562),(150,600),(120,624),(85,624),(60,600),(46,560),(42,480),(45,420)],(118,520)),
 'pe':([(352,152),(368,152),(420,148),(458,143),(488,128),(530,132),(550,148),(558,178),(560,240),(560,302),(548,314),(520,314),(472,304),(464,272),(470,240),(462,196),(420,180),(372,172),(354,162)],(478,248)),
 'dir':([(700,640),(706,560),(726,512),(734,488),(744,462),(770,440),(800,424),(830,418),(870,408),(915,418),(962,440),(1002,470),(1024,498),(1024,768),(702,768),(700,705)],(800,600)),
}
L=(0.3*R+0.59*G+0.11*B)/255
pele=(R>95)&(R>G+12)&(G>B+5)&((R-B)>35)&(B>=0.62*G)
sombra=np.zeros((H,W)); alfa=np.zeros((H,W)); LET=np.zeros((H,W),bool)
def blur(a,s):
    m=a.max() or 1
    return np.asarray(Image.fromarray(np.clip(a/m*255,0,255).astype('uint8')).filter(ImageFilter.GaussianBlur(s))).astype(float)/255*m
def blurf(a,s):  # mais precisão: separa em 2 partes
    hi=np.floor(a*255)/255; lo=a-hi
    return blur(hi,s)+blur(lo*255,s)/255
for nome,(p,(dx0,dy0)) in polis.items():
    rr=Image.new('L',(W,H),0); ImageDraw.Draw(rr).polygon(p,fill=255); reg=np.asarray(rr)>0
    amarelo=(((R+G)/2-B)>28)&(B<0.62*G)&(G>55)&reg
    if nome=='pe':
        for (x0,y0,x1,y1) in [(500,165,540,210)]: amarelo[y0:y1,x0:x1]=reg[y0:y1,x0:x1]
    letras=np.asarray(Image.fromarray((amarelo*255).astype('uint8')).filter(ImageFilter.MaxFilter(15)))>0
    sat=(np.max(A,axis=2)-np.min(A,axis=2))
    if nome=='dir': tecido=(B>R+12)&(B>G)
    else: tecido=(sat<85)&(L>0.05)&(L<(0.7 if nome=='pe' else 0.88))
    cam=(reg&~pele&tecido)|(letras&reg)
    cam=np.asarray(Image.fromarray((cam*255).astype('uint8')).filter(ImageFilter.MedianFilter(7)))>0
    w=(cam&~letras).astype(float)
    base=blurf(L*w,12)/np.maximum(blurf(w,12),1e-3)
    # Textura do tecido: pedaço limpo de 48x48 da mesma camisola, repetido.
    pat=L[dy0:dy0+48,dx0:dx0+48]; patd=pat-blurf(pat,2)
    tex=np.tile(patd,(H//48+1,W//48+1))[:H,:W]
    sint=base+tex*1.5
    f=np.asarray(Image.fromarray((letras*255).astype('uint8')).filter(ImageFilter.GaussianBlur(3))).astype(float)/255
    Lf=L*(1-f)+sint*f
    med=np.median(L[cam&~letras])
    sombra[cam]=np.clip(0.62+(Lf[cam]-med)*1.25,0.05,1)
    alfa[cam]=255
    LET[letras&reg]=True
alfa=np.asarray(Image.fromarray(alfa.astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))).astype(float)
alfa[LET]=255
Image.fromarray(np.dstack([sombra*255]*3+[alfa]).astype('uint8'),'RGBA').save('docs/prototipo/analise-camisolas.png',optimize=True)
# Logótipos dos calções (fora das camisolas): apagados por difusão.
I=A.copy(); mk=np.zeros((H,W),bool)
for (x0,y0,x1,y1) in [(262,520,302,562),(486,334,508,356)]: mk[y0:y1,x0:x1]=True
I[mk]=np.nan
for it in range(300):
    nanm=np.isnan(I[...,0])
    if not nanm.any(): break
    P=np.pad(I,((1,1),(1,1),(0,0)),mode='edge'); viz=np.stack([P[:-2,1:-1],P[2:,1:-1],P[1:-1,:-2],P[1:-1,2:]])
    with np.errstate(all='ignore'): media=np.nanmean(viz,axis=0)
    I[nanm]=media[nanm]
I[mk]+=np.random.default_rng(3).normal(0,3,(int(mk.sum()),1))
A=np.clip(I,0,255)
Image.fromarray(A.astype('uint8')).save('docs/prototipo/analise.jpg',quality=90)
# Pré-visualização em vermelho, como no browser (cor × sombreado × 1,6).
cor=np.array([214,58,58])/255
over=np.clip(np.dstack([sombra]*3)*cor*1.6,0,1)*255
a=(alfa/255)[...,None]
prev=Image.fromarray((A*(1-a)+over*a).astype('uint8'))
print('ok')
