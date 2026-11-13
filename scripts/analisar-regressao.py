import json, glob, sys
G8 = ['ENG1','ESP1','ITA1','GER1','FRA1','POR1','NED1','BEL1']
res = {}
for f in sorted(glob.glob(sys.argv[1] + '/*.json')):
    d = json.load(open(f))
    c = d['campeoes']; k = d['continentais']
    dist = [len(set(c[l])) for l in G8]
    eur = k.get('UCL', []) + k.get('UEL', []) + k.get('UECL', [])
    r = dict(dist=sum(dist)/8, min=min(dist), dez=sum(1 for l in G8 if len(set(c[l]))==1),
             eng=100*eur.count('ENG')/len(eur), ksa=k.get('ACLE', []).count('KSA'), nAsia=len(k.get('ACLE', [])),
             bra=k.get('CLI', []).count('BRA'), nLib=len(k.get('CLI', [])), t=d['segundos'],
             todos=sum(len(set(v)) for v in c.values())/len(c), pl=dist)
    res.setdefault(d['modo'], []).append((d['semente'], r))
for m, rs in res.items():
    print('##', m)
    print('semente | campeões distintos 8 ligas (média / mín) | ligas 10/10 | ENG % europeus | KSA asiáticos | BRA Libertadores | por liga')
    for s, r in sorted(rs):
        print(f"{s} | {r['dist']:.2f} / {r['min']} | {r['dez']} | {r['eng']:.0f}% | {r['ksa']}/{r['nAsia']} | {r['bra']}/{r['nLib']} | {r['pl']}")
    n = len(rs); a = lambda k: sum(r[k] for _, r in rs)/n
    print(f"média | {a('dist'):.2f} | {a('dez'):.2f} | {a('eng'):.1f}% | {a('ksa'):.1f} | {a('bra'):.1f} | todas as ligas {a('todos'):.2f}")
