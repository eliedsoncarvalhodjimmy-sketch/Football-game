# Prompt 6, Bloco A — auditoria dos direitos futuros

3 épocas, semente 2026, mundo completo (1031 clubes), verificação das invariantes ligada em cada negócio.
Gerado por `npx tsx scripts/auditar-direitos.ts --seasons 3 --seed 2026`.

## Invariantes

- Erros encontrados: **0** (simulação e exemplos)
- Verificado em cada negócio com preço: preço = vendedor + beneficiários; cada direito pago uma só vez (ou caducado);
  nenhum titular inexistente; soma das % activas por jogador ≤ 50%; quem recebeu nunca volta a receber pelo mesmo jogador.
- Vendas que pagaram venda futura: 10 (máximo de beneficiários numa venda: 1).
- Direitos activos no fim: 306 (289 de venda futura, 17 de recompra).

## Por época

| Época | Criados | Pagos | Caducados | Recompras exercidas | Recompras recusadas | € pagos |
|---|---|---|---|---|---|---|
| 2027 | 167 | 4 | 0 | 0 | 0 | 1.6 M€ |
| 2028 | 115 | 4 | 27 | 0 | 1 | 4.1 M€ |
| 2029 | 41 | 1 | 7 | 0 | 0 | 0.8 M€ |
| 2026 | 29 | 2 | 0 | 0 | 0 | 0.2 M€ |

## Por liga do titular (as 15 com mais direitos)

| Liga | Criados | Pagos | Caducados | Recompras exercidas | Recompras recusadas | € pagos |
|---|---|---|---|---|---|---|
| AUT1 | 25 | 1 | 2 | 0 | 1 | 0.7 M€ |
| NOR1 | 21 | 2 | 2 | 0 | 0 | 1.2 M€ |
| ARG1 | 20 | 1 | 5 | 0 | 0 | 0.2 M€ |
| GRE1 | 18 | 1 | 3 | 0 | 0 | 0.1 M€ |
| BEL1 | 18 | 0 | 3 | 0 | 0 | 0.0 M€ |
| NED1 | 14 | 0 | 0 | 0 | 0 | 0.0 M€ |
| POL1 | 13 | 0 | 2 | 0 | 0 | 0.0 M€ |
| CRO1 | 12 | 0 | 2 | 0 | 0 | 0.0 M€ |
| CZE1 | 11 | 0 | 1 | 0 | 0 | 0.0 M€ |
| JPN1 | 11 | 0 | 0 | 0 | 0 | 0.0 M€ |
| SCO1 | 11 | 0 | 1 | 0 | 0 | 0.0 M€ |
| BRA1 | 9 | 0 | 0 | 0 | 0 | 0.0 M€ |
| UAE1 | 9 | 0 | 2 | 0 | 0 | 0.0 M€ |
| SUI1 | 8 | 0 | 2 | 0 | 0 | 0.0 M€ |
| TUR1 | 8 | 0 | 2 | 0 | 0 | 0.0 M€ |

## Fluxos dos exemplos do utilizador

### Real Madrid (Olmedosa CF): jovem vendido por 10 M€ com 20% de venda futura

**Venda 1** (Olmedosa CF → FC Torredorato, 10 M€):
- pagamento: 10.0 M€ à vista
- Ömer Karamaz assina pelo FC Torredorato até 2032-06-30

**Venda 2, 3 anos depois** (FC Torredorato → Brackcombe Town, 50 M€):
- pagamento: 50.0 M€ à vista
- 10.0 M€ (20% de venda futura) para o Olmedosa CF, que perde o direito
- Ömer Karamaz assina pelo Brackcombe Town até 2035-06-30

**Venda 3** (Brackcombe Town → SpVgg Mühlberg, 60 M€): sem pagamento ao Olmedosa CF.
- pagamento: 60.0 M€ à vista
- Ömer Karamaz assina pelo SpVgg Mühlberg até 2036-06-30

### Dois beneficiários no limite de 50%

- Atlético de Torre de Carvide pede 30% → fica com 30%
- Futebol Clube de Azenha de Alvarim pede 25% → cortado para 20% (o que sobra dos 50%)
- Atlético de Serra do Freixo pede 15% → não nasce (limite atingido)

**Venda** (Grupo Desportivo de Azenha de Rebordelo → Stourmercombe City, 20 M€):
- pagamento: 20.0 M€ à vista
- 6.0 M€ (30% de venda futura) para o Atlético de Torre de Carvide, que perde o direito
- 4.0 M€ (20% de venda futura) para o Futebol Clube de Azenha de Alvarim, que perde o direito
- André Barares assina pelo Stourmercombe City até 2032-06-30

### Recompra com notificação ao titular

O Stourdale Athletic tem a recompra de Callum Thornstone por 30 M€ (preço fixo, 1,5 × os 20 M€ que pagou).

**Oferta do CF Alcormonte:**
- CF Alcormonte oferece 90 M€ por Callum Thornstone
- Stourmercombe City aceita 90.0 M€ do CF Alcormonte
- o Stourdale Athletic tem a recompra (30.0 M€) e é notificado: decide até 2029-07-06
- negócio falha: o Stourdale Athletic exerceu a recompra

**Recompra:**
- Stourdale Athletic exerce a recompra de Callum Thornstone por 30.0 M€ (cláusula do contrato: o jogador não pode recusar)
- pagamento: 30.0 M€ à vista
- Callum Thornstone assina pelo Stourdale Athletic até 2032-06-30

## Exemplos de negócios da simulação

### 1
- Yıldızdere Belediyespor oferece 1.2 M€ ao Independiente Cerro Soledad por Michalis Dimipoulos
- Independiente Cerro Soledad faz contra-proposta: 1.4 M€
- Yıldızdere Belediyespor sobe a oferta para 1.4 M€
- Independiente Cerro Soledad aceita 1.4 M€ do Yıldızdere Belediyespor
- Michalis Dimipoulos aceita os termos: 225 mil €/ano, rotacao
- passa nos exames médicos
- pagamento: 1.4 M€ à vista
- 135 mil € (10% de venda futura) para o Panathlitikos Kato Kastro, que perde o direito
- Michalis Dimipoulos assina pelo Yıldızdere Belediyespor até 2030-06-30

### 2
- Ikekope City oferece 363 mil € ao SK Lesov por Joey Smitker
- SK Lesov faz contra-proposta: 430 mil €
- Ikekope City sobe a oferta para 430 mil €
- SK Lesov aceita 430 mil € do Ikekope City
- Joey Smitker aceita os termos: 90 mil €/ano, suplente
- passa nos exames médicos
- pagamento: 430 mil € à vista
- 43 mil € (10% de venda futura) para o Sparta Breedam, que perde o direito
- Joey Smitker assina pelo Ikekope City até 2028-06-30

### 3
- Asteras Oristathmos oferece 3.9 M€ ao Yıldızderespor por Cristian Ferudo
- Yıldızderespor faz contra-proposta: 4.2 M€
- Asteras Oristathmos sobe a oferta para 4.2 M€
- Yıldızderespor aceita 4.2 M€ do Asteras Oristathmos
- Cristian Ferudo recusa os termos; aceita com +15% (521 mil €/ano)
- passa nos exames médicos
- pagamento: 4.2 M€ à vista
- 423 mil € (10% de venda futura) para o Club Valle Soledad, que perde o direito
- cláusula de venda futura: 10% da próxima venda para o Yıldızderespor (até 2032-07-29)
- Cristian Ferudo assina pelo Asteras Oristathmos até 2032-06-30

### 4
- União de Casal das Lajes oferece 3.4 M€ ao VV Alderveen por Julian Fischel
- VV Alderveen recusa (pede 4.8 M€)
- União de Casal das Lajes sobe a oferta para 4.1 M€
- VV Alderveen faz contra-proposta: 4.5 M€
- União de Casal das Lajes sobe a oferta para 4.5 M€
- VV Alderveen aceita 4.5 M€ do União de Casal das Lajes
- Julian Fischel aceita os termos: 670 mil €/ano, rotacao
- passa nos exames médicos
- pagamento: 4.5 M€ à vista
- 674 mil € (15% de venda futura) para o Eintracht Dornau, que perde o direito
- Julian Fischel assina pelo União de Casal das Lajes até 2031-06-30

## Desempenho

3 épocas em 42.5 s; semana média 272 ms (máx. 582 ms).
