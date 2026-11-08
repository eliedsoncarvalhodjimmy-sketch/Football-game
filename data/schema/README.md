# Formato dos teus dados

Coloca os ficheiros numa pasta e importa-os no separador **Dados**. Também podes usar `npm run export-attributes -- <pasta>`.
O separador pode ser `,` ou `;` (detectado automaticamente). Listas dentro de uma célula separam-se com `|`. Usa UTF-8.
Para veres um exemplo completo, corre `npm run generate-world`, que escreve o mundo fictício em `out/test-world/`.

## clubs.csv (obrigatório)

| coluna | obrig. | descrição |
|---|---|---|
| id | sim | identificador único e estável (ex.: `POR-001`) |
| name | sim | nome |
| league | sim | id da liga: país + escalão, ex. `POR1`, `ENG4`, `BRA3` (ver `src/config/world.config.ts`) |
| short_name | | sigla (3 letras) |
| country | | país (deduzido da liga) |
| city | | cidade |
| reputation | | 1–100 (por omissão 50) |
| stadium_capacity, transfer_budget, wage_budget | | números (EUR) |
| facilities, youth_facilities | | 1–20 |
| crest | | nome do ficheiro em `public/crests/` |
| rivals | | ids de clubes rivais separados por `|` |
| color_primary, color_secondary | | `#rrggbb` |

## players.csv (obrigatório)

| coluna | obrig. | descrição |
|---|---|---|
| id | sim | identificador único e estável |
| last_name | sim | apelido |
| first_name | | nome próprio |
| birth_date | sim | `AAAA-MM-DD` |
| position | sim | GK, DR, DC, DL, DM, MR, MC, ML, AM, RW, LW, ST |
| ovr | sim | 1–99 |
| club | | id do clube (vazio = jogador livre) |
| nationality | | código do país (ex. `POR`); vazio = país do clube |
| other_positions | | outras posições (competente), separadas por `|` |
| foot | | R, L ou B (ambos) |
| height_cm | | altura |

## world.json (opcional)

```json
{
  "name": "O meu mundo",
  "seed": 20260801,
  "referenceDate": "2026-08-01",
  "leagues": { "POR1": { "relegationSlots": 3 }, "ENG1": { "tvRevenuePool": 3000000000 } },
  "countries": { "USA": { "promotionRelegation": false } }
}
```

## attributes.csv (opcional)

É o ficheiro exportado em **Dados → Exportar atributos**, depois de editado. Só conta a coluna `player_id` mais as colunas que editares; as colunas de contexto são ignoradas.
Um valor diferente do gerado fica como edição manual e tem prioridade. Uma célula vazia volta ao valor gerado.

Exemplos pequenos: `data/schema/examples/`.
