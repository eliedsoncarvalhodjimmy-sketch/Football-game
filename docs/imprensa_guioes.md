# Imprensa — formato dos guiões de entrevista

Os guiões são escritos pelo utilizador e enviados para serem incluídos no jogo. Cada guião é uma entrevista com
perguntas e respostas pré-definidas; cada resposta tem um **tom** e **efeitos**.

## Campos

| Campo | Obrigatório | Valores |
|---|---|---|
| `id` | sim | identificador único, sem espaços (ex.: `pos-jogo-vitoria-derbi-1`) |
| `contexto` | sim | `pre-jogo`, `pos-jogo`, `conferencia` (semanal), `mercado`, `apresentacao` (reforço), `crise`, `fim-de-epoca` |
| `quando` | sim | condição em que pode sair: `vitoria`, `empate`, `derrota`, `derbi`, `goleada-sofrida`, `serie-derrotas`, `rumor-venda`, `pedido-reforco`, `lider`, `zona-descida`, `qualquer` (podem combinar-se: `derbi+vitoria`) |
| `tipo_meio` | não | `jornal`, `televisao`, `debate`, `radio`, `online` (por omissão: qualquer) |
| `titulo` | sim | título mostrado na entrevista |
| `perguntas` | sim | 1 a 5 perguntas, cada uma com 2 a 4 respostas |
| `resposta.tom` | sim | `calmo`, `confiante`, `provocador`, `evasivo`, `firme`, `exigente`, `humilde`, `emotivo` |
| `resposta.efeitos` | não | números (de −10 a +10) em: `pressao` (pressão mediática), `adeptos`, `moral` (plantel), `dono` (confiança do dono), `rel` (relação com o meio), `treinador` (confiança do treinador, no modo Dono) |
| `manchete` | não | por tom: o título do jornal do dia seguinte. Pode usar `{clube}`, `{adversario}`, `{jogador}`, `{treinador}` |

Os nomes entre chavetas são substituídos pelo jogo (`{clube}` = nome curto do clube do utilizador; `{cargo}` = Director no modo Director, Presidente no modo Dono). Quem responde às entrevistas é sempre o utilizador (Director ou Presidente), nunca o treinador.

## Exemplo

```json
{
  "id": "pos-jogo-vitoria-derbi-1",
  "contexto": "pos-jogo",
  "quando": "derbi+vitoria",
  "tipo_meio": "jornal",
  "titulo": "Flash interview depois do dérbi",
  "perguntas": [
    {
      "texto": "Vitória clara no dérbi. Esta equipa já é candidata ao título?",
      "respostas": [
        { "texto": "Pensamos jogo a jogo. O título decide-se em Maio.", "tom": "calmo", "efeitos": { "pressao": -3 } },
        { "texto": "Sim. Viemos para ganhar tudo e não escondemos isso.", "tom": "confiante", "efeitos": { "pressao": 6, "adeptos": 4, "moral": 2 } },
        { "texto": "Candidatos são os que gastam mais. Nós trabalhamos.", "tom": "provocador", "efeitos": { "pressao": 3, "adeptos": 2, "rel": -4 } }
      ]
    }
  ],
  "manchete": {
    "calmo": "{cargo} do {clube} de pés no chão: \"O título decide-se em Maio\"",
    "confiante": "{cargo} do {clube} assume: \"Viemos para ganhar tudo\"",
    "provocador": "\"Candidatos são os que gastam mais\": {clube} atira-se aos rivais"
  }
}
```

Também pode enviar os guiões em texto simples (pergunta, respostas, tom e efeitos de cada uma); eu converto para este formato.
