# FutCEO

Jogo de gestão de futebol para uso pessoal (PWA offline, tablet primeiro). Num universo sem clubes, cada um dos
**213 países é um clube** e cada confederação funciona como um "país" com divisões e taça. És o Presidente da
federação e o Director de Futebol do país-clube que escolheres.

**Estado:** fase 1 do prompt v2.4 — confederações e divisões, 213 países-clube, mundo de teste (~17 500 jogadores
com sub-23/19/17), redistribuição UEFA→AFC e CONCACAF→OFC (pendente de confirmação), importação dos teus ficheiros,
excepções de país inicial, exportação/reimportação de atributos, gravações.
O estado do prompt v1 (clubes) está no ramo `backup/v1-clubes-fase1`.

## Comandos
```bash
npm install
npm run dev               # http://localhost:5173
npm run build             # tipos + build da PWA em dist/
npm run preview           # serve dist/ (tablet na mesma rede: npm run preview -- --host)
npm test                  # testes (Vitest)
npm run bench             # benchmark com o mundo de teste completo
npm run counts -- [pasta] # tabela por confederação e candidatos a mudar (pendência 1)
npm run generate-world    # escreve o mundo de teste em CSV (out/test-world/)
npm run export-attributes -- <pasta-de-dados> [saida.csv] [--semicolon]
```

## Estrutura
- `src/config/` — tudo o que se afina: países, confederações, calendário, Ligas dos Campeões, plantéis, economia, atributos, gerador, nomes, rivalidades.
- `src/engine/` — motor puro e determinístico (RNG com semente, gerador, confederações, plantéis, armazenamento compacto).
- `src/data/` — `DataSource`, adaptador de ficheiros locais, CSV, validação, atributos.
- `src/persistence/` — IndexedDB com ranhuras e gravação incremental.
- `src/worker/` — Web Worker dono do mundo.
- `src/ui/` — interface (tema escuro, separadores, listas virtualizadas).
- `data/schema/` — formato dos teus ficheiros. `DECISIONS.md`, `MEMORY_BUDGET.md`.
