# Relatório da regressão do Bloco C: python3 scripts/relatorio-regressao.py <pasta com os JSON> > docs/relatorios/fase2_paragemC_regressao.md
import json, glob, sys, subprocess
pasta = sys.argv[1]
G8 = ['ENG1','ESP1','ITA1','GER1','FRA1','POR1','NED1','BEL1']
import os
on = json.load(open(f'{pasta}/onze_2026.json')); rp = json.load(open(f'{pasta}/reputacao_2026.json'))
p3 = json.load(open(f'{pasta}/prompt3_2026.json')) if os.path.exists(f'{pasta}/prompt3_2026.json') else None
MODOS = ([('Prompt 3', p3)] if p3 else []) + [('Prompt 2', on), ('Fase 1', rp)]
print('# Regressão: Prompt 3 (clube) lado a lado com o Prompt 2 e a Fase 1\n' if p3 else '# Fase 2 — Paragem C: regressão do motor novo contra a Fase 1\n')
print('> DADOS DE TESTE. Mundo fictício, 10 épocas por corrida, 6 sementes. "Prompt 3" = com a camada do clube (economia, dívida e sanções, donos, IA, treinadores e staff); "Prompt 2" = força pelos ratings do onze sem a camada do clube; "Fase 1" = força pela reputação.\n')
print('## 1. Seis sementes\n')
print('```')
print(subprocess.run(['python3', 'scripts/analisar-regressao.py', pasta], capture_output=True, text=True).stdout.replace('reputacao', 'Fase 1 (reputação)'))
print('```\n')
print('Alvos: campeões distintos nas 8 maiores ligas (UEFA: ENG, ESP, ITA, GER, FRA, POR, NED, BEL) em média ≥ 3 e nenhuma 10/10; Inglaterra 30–40% dos títulos europeus (UCL + UEL + UECL); Arábia 3–5 dos 10 títulos asiáticos.\n')
print('## 2. Semente 2026 lado a lado: campeões das 8 maiores ligas\n')
print('Cada clube aparece pelo número do seu id (o mesmo clube nos dois modos).\n')
print('| Liga | Época | ' + ' | '.join(str(k + 1) for k in range(10)) + ' | Distintos |')
print('|---|---|' + '---|' * 10 + '---:|')
for l in G8:
    for nome, d in MODOS:
        v = d['campeoes'][l]
        print(f'| {l} | {nome} | ' + ' | '.join(x.split('_')[-1] for x in v) + f' | {len(set(v))} |')
print('\n## 3. Semente 2026 lado a lado: continentais (país do vencedor)\n')
print('| Competição | Modo | ' + ' | '.join(str(k + 1) for k in range(10)) + ' |')
print('|---|---|' + '---|' * 10)
for comp in ['UCL', 'UEL', 'UECL', 'CLI', 'ACLE']:
    for nome, d in MODOS:
        print(f'| {comp} | {nome} | ' + ' | '.join(d['continentais'].get(comp, [])) + ' |')
