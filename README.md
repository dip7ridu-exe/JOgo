# JOgo — Arena de Tinta FPS

Protótipo de jogo de tiro em primeira pessoa para navegador, feito com
**Three.js** e sem etapa de build. A proposta mistura a velocidade de um FPS de
arena com uma disputa de território pintado por duas equipes.

Esta versão inclui movimento por aceleração e impulso, corrida, controle aéreo,
slide-hop, colisões, cinco blasters Kenney, braços em primeira pessoa, animações,
tiro por raycast, tinta em chão/paredes/caixas, placar de cobertura, alvos e HUD.

## Executar

O projeto usa módulos ES. Rode os arquivos por HTTP em vez de abrir o HTML
diretamente:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`. Para publicar no GitHub Pages, use
**Settings → Pages → Deploy from a branch → main → / (root)**.

## Controles

| Controle | Ação |
|---|---|
| Clique na tela | Entrar ou voltar à arena |
| W A S D | Mover |
| Mouse | Olhar |
| Botão esquerdo | Atirar tinta |
| 1–5 ou roda do mouse | Trocar blaster |
| R | Reabastecer o tanque |
| Espaço | Pular; use após o slide para manter o impulso |
| Shift | Correr |
| Ctrl ou C | Deslizar; na própria tinta ativa o impulso de tinta |
| T | Alternar Ciano/Coral para testar a retomada de território |
| Esc | Liberar o mouse |

## Mecânicas implementadas

### Movimento de arena

`player.js` usa velocidade persistente em vez de deslocamento instantâneo. O
jogador acelera até a velocidade desejada, perde velocidade por atrito no chão,
mantém parte do controle no ar e conserva o impulso ao pular durante um slide.
O campo de visão e a inclinação da câmera reagem à velocidade.

Agachar sobre tinta da equipe ativa libera um impulso adicional. Isso é uma
adaptação simples da mobilidade por tinta para o protótipo FPS; ainda não há
transformação de personagem nem multiplayer.

### Tinta e território

Cada raycast pode pintar chão, paredes e caixas. No chão, uma grade de 84×84
células registra qual equipe cobriu cada região e alimenta o placar em tempo
real. Pintar sobre a cor adversária transfere aquela área para a equipe ativa.

As marcas visuais usam um único `THREE.InstancedMesh`, limitado a 900 instâncias
em buffer circular. Assim, disparar por muito tempo não cria milhares de objetos
nem aumenta indefinidamente o número de draw calls.

### Blasters e braços

Os modelos vêm do **Kenney Blaster Kit 2.1**, sob licença CC0. Eles são GLBs
autocontidos: a textura foi incorporada ao arquivo para o GitHub Pages não
depender de outro servidor.

| Tecla | Arma | Perfil | Pintura |
|---|---|---|---|
| 1 | Blaster Pulso | Semiautomático equilibrado | Mancha média |
| 2 | Blaster Rajada | Automático rápido | Manchas menores |
| 3 | Blaster Vetor | Rifle automático | Mancha média |
| 4 | Canhão Onda | Sete projéteis | Área espalhada |
| 5 | Blaster Prisma | Lento e preciso | Mancha grande |

Os braços e as mãos enluvadas são montados em Three.js. O view model anima
entrada, respiração, caminhada, corrida, slide, recuo, ação da arma, recarga e
movimento das mãos. Se um GLB não carregar, existe um modelo procedural de
reserva para a partida continuar.

## Otimização para navegador

- sem bundler, servidor ou framework obrigatório;
- cinco GLBs pequenos e autocontidos;
- manchas agrupadas em um `InstancedMesh` com limite fixo;
- placar em `Uint8Array`, sem textura grande ou leitura de pixels da GPU;
- resolução limitada a 1,75× o DPR e sombras em 1024×1024;
- mapa de teste mantido pequeno, com colisores `Box3` simples;
- dependências Three.js na mesma versão (`0.169.0`).

## Estrutura

```text
JOgo/
├── index.html       # canvas, tela inicial e HUD de território
├── style.css        # interface responsiva
├── main.js          # cena e loop principal
├── map.js           # arena, colisões, superfícies pintáveis e alvos
├── player.js        # Pointer Lock, aceleração, slide e slide-hop
├── ink.js           # marcas instanciadas e cobertura de território
├── weapons.js       # GLTFLoader, braços, tiro, tinta, dano e recarga
├── weapons.json     # atributos e ajustes dos cinco blasters
└── models/weapons/  # cinco GLBs Kenney e LICENSES.md
```

## Referências analisadas

- [Crankshaft](https://github.com/KraXen72/crankshaft) é um cliente alternativo
  leve para Krunker, útil como referência de foco em desempenho, mas não contém
  o motor do gameplay original.
- [F17ers/Krunker.IO](https://github.com/F17ers/Krunker.IO) é um clone HTML
  pequeno; foi tratado como referência exploratória, não como base técnica.
- O [tópico Krunker em Rust](https://github.com/topics/krunker?l=rust) reúne
  principalmente clientes e ferramentas, não uma especificação oficial de
  movimentação.
- Os [exemplos oficiais do Three.js](https://threejs.org/examples/) e a
  documentação de `Raycaster`/`InstancedMesh` orientam colisões de disparo e a
  renderização eficiente das marcas.
- [Awwwards — Three.js](https://www.awwwards.com/websites/three-js/) serve como
  referência visual de interface e apresentação, não de física.
- O repositório [PunishXIV/Splatoon](https://github.com/PunishXIV/Splatoon) é um
  plugin de acessibilidade para Final Fantasy XIV e não implementa o gameplay do
  jogo da Nintendo.
- A regra central de território segue a descrição oficial de
  [Turf War](https://splatoon.nintendo.com/en/gameplay/): vence a equipe que
  cobre mais chão com sua tinta. Nesta versão, o `T` simula as duas equipes
  localmente.
- Modelos: [Kenney — Blaster Kit](https://kenney.nl/assets/blaster-kit), CC0.

O projeto usa apenas a ideia geral de FPS de arena e disputa por território.
Não inclui código, marcas, personagens, mapas, áudio ou modelos extraídos de
Krunker ou Splatoon.

## Próximas etapas

1. Adicionar bots que pintem o mapa para a equipe adversária.
2. Criar rodada de três minutos com tela de resultado.
3. Adicionar áudio CC0 e partículas de tinta.
4. Implementar servidor autoritativo, interpolação e validação de acertos antes
   de ativar multiplayer público.
