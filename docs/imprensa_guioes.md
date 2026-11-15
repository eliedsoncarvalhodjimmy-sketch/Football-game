# Imprensa — guiões

Os guiões são escritos pelo utilizador em **`data/imprensa/guioes.md`** (formato e regras de escolha descritos no próprio
ficheiro: ID, Quando, Modo, Jornalista, Pergunta, respostas A/B/C com tom e efeitos EQ/AD/DN/IM/TR/BL, PROMESSA, MENTIRA).

- `npm run imprensa` lê o ficheiro, valida-o e escreve `data/imprensa/guioes.json` (o que o motor usa).
- Os números (escala −3…+3, conversão para as escalas do jogo, pesos por jornalista e por clube, multas, regras de escolha,
  multiplicadores de promessas e mentiras) estão em `src/config/imprensa.ts`.
- Para acrescentar guiões: novas entradas `### IMP-xxx — título` no mesmo formato (também em pacotes de dados por país).
  Pode enviar em texto simples; eu converto.
- Variáveis aceites: as da lista do ficheiro, mais `{idade}`, `{lucro_ou_prejuizo}` e `{promessa}` (usadas em IMP-030,
  IMP-041 e IMP-066). Quem responde é sempre o utilizador (Director ou Presidente), nunca o treinador.
