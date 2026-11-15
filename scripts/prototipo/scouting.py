# Protótipo (Prompt 5): fotografia do departamento de scouting. Retira os logótipos das camisolas e gera a camada de
# sombreado das camisolas (máscara + luminância) que a interface pinta com a cor do clube.
# Uso: python3 scripts/prototipo/scouting.py <original> → docs/prototipo/scouting.jpg e docs/prototipo/scouting-camisolas.png
import sys
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
src=Image.open(sys.argv[1] if len(sys.argv) > 1 else 'docs/prototipo/scouting-original.png').convert('RGB'); W,H=src.size
A=np.asarray(src).astype(float)
# 1) Logótipos: difusão a partir das bordas, com grão ligeiro.
mk=np.zeros((H,W),bool)
for (x0,y0,x1,y1) in [(349,520,378,545),(803,602,832,621)]: mk[y0:y1,x0:x1]=True
I=A.copy(); I[mk]=np.nan
for it in range(300):
    nanm=np.isnan(I[...,0])
    if not nanm.any(): break
    P=np.pad(I,((1,1),(1,1),(0,0)),mode='edge'); viz=np.stack([P[:-2,1:-1],P[2:,1:-1],P[1:-1,:-2],P[1:-1,2:]])
    with np.errstate(all='ignore'): media=np.nanmean(viz,axis=0)
    I[nanm]=media[nanm]
I[mk]+=np.random.default_rng(5).normal(0,3,(int(mk.sum()),1))
A=np.clip(I,0,255); limpa=Image.fromarray(A.astype('uint8')); limpa.save('docs/prototipo/scouting.jpg',quality=90)
# 2) Camisolas: azul forte dentro de cada pessoa.
R,G,B=A[...,0],A[...,1],A[...,2]; L=(0.3*R+0.59*G+0.11*B)/255
polis=[[(255,600),(290,520),(330,470),(390,445),(455,436),(500,438),(512,460),(510,500),(470,520),(470,560),(500,640),(500,690),(420,690),(330,660),(262,640)],
       [(765,640),(785,575),(840,548),(905,548),(965,570),(990,615),(985,705),(950,725),(860,725),(795,718)],
       [(0,700),(150,702),(250,760),(300,790),(330,860),(345,940),(335,1024),(0,1024)],
       [(940,730),(975,715),(1024,715),(1024,1024),(940,1024),(950,880)]]
sombra=np.zeros((H,W)); alfa=np.zeros((H,W))
for p in polis:
    rr=Image.new('L',(W,H),0); ImageDraw.Draw(rr).polygon(p,fill=255); reg=np.asarray(rr)>0
    cam=reg&(B>R+28)&(B>G+8)
    cam=np.asarray(Image.fromarray((cam*255).astype('uint8')).filter(ImageFilter.MedianFilter(5)))>0
    if not cam.any(): continue
    # Bordas: azuis menos saturados junto à camisola (golas, contornos).
    perto=np.asarray(Image.fromarray((cam*255).astype('uint8')).filter(ImageFilter.MaxFilter(9)))>0
    cam=cam|(reg&perto&(B>R+8)&(B>G-5))
    med=np.median(L[cam]); sombra[cam]=np.clip(0.62+(L[cam]-med)*1.25,0.05,1); alfa[cam]=255
alfa=np.asarray(Image.fromarray(alfa.astype('uint8')).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.8))).astype(float)
s2=np.asarray(Image.fromarray((sombra*255).astype('uint8')).filter(ImageFilter.MaxFilter(3))).astype(float)/255
sombra=np.where(sombra>0,sombra,s2)
Image.fromarray(np.dstack([sombra*255]*3+[alfa]).astype('uint8'),'RGBA').save('docs/prototipo/scouting-camisolas.png',optimize=True)
cor=np.array([226,163,58])/255; a=(alfa/255)[...,None]
Image.fromarray((A*(1-a)+np.clip(np.dstack([sombra]*3)*cor*1.6,0,1)*255*a).astype('uint8')).save('/tmp/prev-scout.png')
print('ok')
