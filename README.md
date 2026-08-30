# FPS de Navegador — Mapa de Teste

Protótipo inicial de um jogo de tiro em primeira pessoa para navegador, com
movimentação inspirada em **Call of Duty** e referência visual/técnica no
**Krunker.io** (que também é feito com Three.js). Esta é a etapa 1: só
movimentação + um mapa vazio para testar a "sensação" do jogo, sem armas
nem multiplayer ainda.

## Como rodar

O jogo usa módulos ES (`import`/`export`), então **não dá pra abrir o
`index.html` direto no navegador** (vai dar erro de CORS). É preciso servir
os arquivos por um servidor local simples:

```bash
# opção 1 — Python (já vem instalado na maioria dos sistemas)
python3 -m http.server 8000

# opção 2 — Node
npx serve .
```

Depois abra `http://localhost:8000` no navegador.

## Controles

| Tecla     | Ação            |
|-----------|-----------------|
| W A S D   | Mover           |
| Mouse     | Olhar em volta  |
| Espaço    | Pular           |
| Shift     | Correr          |
| Ctrl      | Agachar         |
| Esc       | Soltar o mouse  |

## Estrutura do projeto

```
fps-game/
├── index.html          # página + HUD (crosshair, contador de FPS, overlay inicial)
├── style.css            # estilo do HUD
├── js/
│   ├── main.js          # monta a cena, câmera, renderer e o loop do jogo
│   ├── player.js         # mouse look, movimentação, pulo, corrida, agachar, colisão
│   └── map.js            # gera o mapa de teste (chão, paredes, caixas)
├── data/
│   └── weapons.json      # base de dados inicial de armas (ainda não usada no jogo)
└── README.md
```

O Three.js é carregado direto de um CDN (via `importmap` no `index.html`),
então não precisa de `npm install` pra rodar essa primeira versão.

## Sobre a movimentação

- **Sprint** aumenta a velocidade e dá um leve "FOV kick" (a visão abre um
  pouco), igual ao efeito de correr no COD/Krunker.
- **Pulo** usa gravidade simples; no ar você mantém a maior parte do
  controle de direção (permite ajustar a trajetória do pulo, como no
  Krunker), mas com um pouco menos de velocidade que no chão.
- **Colisão** é simples: o jogador é tratado como um círculo que desliza
  nas paredes e caixas do mapa (sem física real, só o suficiente pra testar
  o layout).
- Todos os números (velocidade, gravidade, altura do pulo etc.) estão no
  topo do `js/player.js` — é só ajustar até achar a sensação ideal.

## Onde conseguir modelos 3D de armas (grátis, para usar em jogos)

Não existe uma "API de armas" padrão pronta pra jogos — o mais próximo
disso são APIs de jogos específicos (ex: `valorant-api.com`, que é uma API
não-oficial só pra consulta/estudo, com dados da Riot — não dá pra usar os
nomes/modelos da Valorant num jogo publicado). Pra modelos 3D de verdade
que você pode usar livremente, os melhores lugares são:

- **[Kenney.nl](https://kenney.nl/assets)** — milhares de assets CC0
  (domínio público), incluindo o "Blaster Kit" com armas low-poly.
- **[Quaternius](https://quaternius.com/)** — pacotes CC0, tem um pacote
  com mais de 50 armas low-poly prontas pra jogo.
- **[itch.io — tag CC0](https://itch.io/game-assets/tag-cc0/tag-weapons)** —
  vários pacotes gratuitos de armas (pistolas, rifles, sniper, facas),
  a maioria CC0 ou "credit appreciated".
- **[Poly Pizza](https://poly.pizza/)** — modelos low-poly gratuitos
  (maioria CC-BY, precisa dar crédito).
- **[Sketchfab — filtro CC0](https://sketchfab.com/search?features=downloadable&licenses=322a749bcfa841b29dff1e8a1bb74b0b)** —
  variedade maior, mas confira a licença de cada modelo individualmente.

O arquivo `data/weapons.json` já tem uma base de armas com nomes originais
(dano, cadência de tiro, capacidade de carregador etc.) e uma sugestão de
pacote pra cada uma, pra quando você for importar os modelos `.glb` com o
`GLTFLoader` do Three.js.

## Próximos passos sugeridos

1. Importar um modelo de arma (`.glb`) e prender na câmera (view model).
2. Tiro com raycast a partir da câmera + efeito visual/sonoro.
3. Alternar entre as armas do `weapons.json`.
4. Inimigos/alvos simples no mapa para testar o tiro.
5. Multiplayer (ex: WebSocket + Node.js) quando a base estiver sólida.

## Créditos / licenças dos assets

Este repositório **não inclui** nenhum modelo 3D baixado — só código. Ao
baixar assets dos links acima, confira a licença de cada pacote e credite
o autor quando for exigido (CC0 não exige, CC-BY exige).
