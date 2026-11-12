# FutCEO

Jogo de gestão de futebol para uso pessoal (PWA offline, TypeScript + Vite). Fase 1: base e mundo de competições.

```bash
npm install
npm test                 # testes (Vitest)
npm run validate-pack    # valida os pacotes de dados em packs/
npm run gen-world -- --seed 2026   # gera o mundo fictício e os relatórios em docs/relatorios/
npm run dev              # ecrã "Mundo" no browser
```

- `packs/`: pacotes de dados (um por país, mais `africa_unificada` e `_continental`). O motor não conhece clubes nem ligas.
- `src/config/`: todas as constantes afináveis.
- `docs/PLANO_FASE1.md`, `DECISIONS.md`: plano e decisões.
