# Formato dos teus dados (prompt v2.4 — países-clube)

Importa no separador **Dados**. Todos os ficheiros são opcionais: o que faltar é gerado e marcado como teste.
Separador `,` ou `;` (detectado automaticamente); listas dentro de uma célula com `|`; UTF-8.
Exemplo completo do formato: `npm run generate-world` → `out/test-world/`. Exemplos pequenos: `data/schema/examples/`.

A lista dos **213 países** é fixa (`src/config/countries.base.ts`); usa os mesmos códigos (ex.: `POR`, `ESP`, `CAT`, `EUS`, `KSA`).

## countries.csv
| coluna | descrição |
|---|---|
| id | código do país (obrigatório) |
| name | nome a mostrar (vazio = o da lista) |
| confederation | só verificação; a confederação de jogo é calculada |
| population | população **real** (o jogo usa 10%) |
| gdp_usd | PIB real em USD |
| reputation | 1–100 |
| football_culture, youth_strength | 1–20 |
| division | divisão inicial (1, 2, 3); só é usada se todas as contagens baterem |
| flag | ficheiro em `public/assets/flags/` |
| rivals | códigos separados por `|` (substitui a lista por omissão) |
| color_primary, color_secondary | `#rrggbb` |

## players.csv (convocatórias)
| coluna | obrig. | descrição |
|---|---|---|
| id | sim | identificador único e estável |
| last_name | sim | apelido |
| first_name | | nome próprio |
| nationality | sim | país de **formação** (nunca muda) |
| team | | país-clube onde joga. Coluna ausente = país de formação; vazio = livre |
| squad | | `senior` (omissão), `u23`, `u19`, `u17` |
| birth_date | sim | `AAAA-MM-DD` |
| position | sim | GK, DR, DC, DL, DM, MR, MC, ML, AM, RW, LW, ST |
| other_positions | | outras posições (competente), separadas por `|` |
| ovr | sim | 1–99 |
| value_eur | | valor de mercado em € (sinal para o potencial) |
| foot | | R, L ou B |
| height_cm | | altura |

## initial_country.csv (excepções — prioridade máxima)
`player_id;country;note` — ex.: `P1;KSA;começa na Arábia Saudita`. País vazio = jogador livre.

## world.json
```json
{ "name": "O meu mundo", "seed": 20260205, "referenceDate": "2026-02-05", "fillSquads": true }
```
`fillSquads: false` desliga o preenchimento automático dos plantéis.

## attributes.csv
O ficheiro exportado em **Dados → Exportar atributos**, editado. Valor diferente do gerado = edição manual (tem prioridade); célula vazia = volta ao gerado.

## Ainda a receber de ti
- Documento com população e PIB (preenche `countries.csv`).
- Histórico (qualificação inicial para as Ligas dos Campeões e, se quiseres, divisões iniciais).
