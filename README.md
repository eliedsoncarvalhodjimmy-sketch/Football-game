# FutCEO

Jogo de gestão de futebol para uso pessoal (PWA offline, tablet primeiro). És o Presidente e o Director de Futebol.

**Estado:** fase 1 (esqueleto PWA, configuração, mundo fictício com 64 ligas, importação de ficheiros, exportação e reimportação de atributos, gravações).

## Comandos

```bash
npm install
npm run dev               # servidor de desenvolvimento (http://localhost:5173)
npm run build             # verificação de tipos + build da PWA em dist/
npm run preview           # serve dist/ (para instalar no tablet na mesma rede: npm run preview -- --host)
npm test                  # testes (Vitest)
npm run bench             # benchmark com o mundo fictício completo
npm run generate-world    # escreve o mundo fictício em CSV (out/test-world/)
npm run export-attributes -- <pasta-de-dados> [saida.csv] [--semicolon]
```

## Estrutura

- `src/config/`: todas as fórmulas e constantes ajustáveis (mundo, atributos, pesos, gerador, nomes).
- `src/engine/`: motor puro e determinístico (RNG com semente, gerador, armazenamento em arrays tipados). Sem DOM.
- `src/data/`: interface `DataSource`, adaptador de ficheiros locais, CSV, validação, exportação e importação de atributos.
- `src/persistence/`: IndexedDB com ranhuras e gravação incremental.
- `src/worker/`: Web Worker, dono do mundo; a interface só lhe faz pedidos.
- `src/ui/`: interface (tema escuro, separadores, listas virtualizadas).
- `data/schema/`: formato dos teus ficheiros.
- `DECISIONS.md`, `MEMORY_BUDGET.md`.

Os dados gerados são **fictícios** e estão marcados como dados de teste.
