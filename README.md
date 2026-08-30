# JOgo — Arena de Tinta FPS

Protótipo de jogo de tiro em primeira pessoa para navegador, feito com
**Three.js** e sem etapa de build. A proposta mistura a velocidade de um FPS de
arena com uma disputa de território pintado por duas equipes.

Esta versão inclui movimento por aceleração e impulso, corrida normal e tática,
controle aéreo, slide-hop, mira ADS, recarga animada em etapas, áudio
procedural, mapa urbano original, cinco blasters Kenney, braços em primeira
pessoa, tiro por raycast, tinta em chão/paredes/caixas, placar de cobertura,
Bot Rosa adversário, partida com vitória/derrota e HUD de arsenal.

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
| Botão direito (segurar) | Usar mira de ferro; no Blaster Prisma, abrir a luneta 4× |
| 1–5 ou roda do mouse | Trocar blaster |
| R | Reabastecer o tanque |
| Espaço | Pular; use após o slide para manter o impulso |
| Shift | Correr |
| Shift duas vezes | Corrida tática temporária, mais rápida e com a arma elevada |
| Ctrl ou C | Deslizar; na própria tinta ativa o impulso de tinta |
| M | Ativar/desativar todo o áudio |
| Esc | Liberar o mouse |

## Mecânicas implementadas

### Movimento de arena

`player.js` usa velocidade persistente em vez de deslocamento instantâneo. O
jogador acelera até a velocidade desejada, perde velocidade por atrito no chão,
mantém parte do controle no ar e conserva o impulso ao pular durante um slide.
O campo de visão e a inclinação da câmera reagem à velocidade.

Dois toques rápidos em `Shift`, enquanto o jogador avança, ativam uma corrida
tática de 3,15 segundos. Ela é mais veloz que a corrida comum, eleva a arma,
acelera o balanço do view model e tem recuperação de 4,25 segundos. Atirar,
recarregar ou deslizar encerra o estado para evitar que as ações se sobreponham.

Segurar o botão direito ativa a mira ADS. Cada blaster recebeu alça, massa e
posição ADS próprias, alinhadas pela mesma linha de visada; a arma também é
afastada da câmera para não cobrir a tela. O Blaster Prisma tem uma luneta 3D e
um retículo 4× em tela cheia, com FOV de 44° e sensibilidade menor. Mirar
interrompe a corrida tática e bloqueia a corrida comum. A dispersão cai
progressivamente; o canhão mantém parte de seu espalhamento.

Agachar sobre tinta da equipe ativa libera um impulso adicional. Isso é uma
adaptação simples da mobilidade por tinta para o protótipo FPS; ainda não há
transformação de personagem nem multiplayer.

### Mapa urbano

A arena antiga de caixas foi substituída por um mapa original construído a
partir da leitura visual do anexo: quatro conjuntos de prédios, praça central,
corredores circulares, muros baixos, coberturas, grades e jardineiras. Não é uma
cópia de um mapa comercial.

O mapa não baixa texturas 4K. O piso usa uma textura de tijolos 64×64 criada no
próprio navegador; janelas, vegetação e barras de grade são agrupadas em três
`InstancedMesh`. Prédios compartilham materiais e geometrias, e cada trecho de
grade usa apenas um colisor simples.

### Áudio procedural

`audio.js` usa um único `AudioContext`, osciladores, filtros e um pequeno buffer
de ruído gerado no carregamento. Há variações para passos de caminhada, corrida
e corrida tática, aterrissagem, tiro por categoria de arma, impacto, recarga em
três etapas e carregador vazio. O contexto só é liberado depois do primeiro clique/tecla,
seguindo a política de autoplay dos navegadores.

Nenhum som do Freesound ou OpenGameArt foi copiado. Esses catálogos misturam
CC0, CC-BY e outras licenças por arquivo; o áudio original mantém o protótipo
leve, offline depois do carregamento e sem uma lista adicional de atribuições.

### Bot e objetivo da partida

Os manequins foram removidos. O Bot Rosa percorre uma rota segura pelo mesmo
mapa, deixa uma trilha contínua, procura linha de visão e atira no jogador. Ele
tem 100 HP, pode ser abatido e retorna depois de 2,8 segundos.

A partida dura 90 segundos e vence quem cobrir 10% primeiro. Se o bot derrubar
o jogador, 16% das células azuis já conquistadas são transferidas ao Time Rosa;
abater o bot recupera uma pequena parte de sua área. Ao atingir a meta ou acabar
o tempo, uma tela informa vitória ou derrota, porcentagens, abates e quedas.

### Tinta e território

Cada raycast pode pintar chão, paredes e caixas. No chão, os impactos escrevem
em uma única `CanvasTexture` transparente de 256×256, funcionando como um mapa
de pintura dinâmico. As manchas têm um núcleo e gotas satélites para formar
bordas mais fluidas. Em paralelo, uma grade de 84×84 células registra a equipe
de cada região e alimenta o placar sem ler pixels da GPU.

Paredes e caixas continuam usando um `THREE.InstancedMesh`, agora limitado a
520 instâncias em buffer circular. Pintar sobre a cor adversária sobrescreve a
textura e transfere a respectiva célula de pontuação.

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

Os braços são modelos procedurais originais montados em blocos low-poly, com
manga escura, punho branco e mãos estilizadas. O view model anima entrada,
respiração, caminhada, corrida, slide, recuo, ação da arma, mira e movimento das
mãos. A recarga inclina a arma para expor o tanque, aproxima a mão esquerda,
retira o reservatório, move-o lateralmente e o encaixa de volta. Se um GLB não
carregar, existe um modelo procedural de reserva para a partida continuar.

O HUD inferior esquerdo usa a linguagem visual pixelada dos FPS de navegador:
avatar, nome do Time Azul ou Time Rosa, seis blocos de vida e indicador 100. A
interface, o reservatório visível na arma, o clarão e as manchas de
tinta mudam juntos para azul (`#188cff`) ou rosa (`#ff3f9f`).

O traçante em forma de raio foi removido. Cada tiro usa uma chama procedural de
três camadas no cano e um pequeno conjunto de gotas físicas no impacto; os
efeitos são curtos e descartados imediatamente para não deixar linhas cruzando
o mapa.

O seletor de armas agora é um painel vertical à direita, com silhuetas vetoriais
originais, categoria, tecla, barra de munição e destaque da arma ativa. O cartão
inferior mostra tanque, modo livre, mira, recarga ou corrida tática sem cobrir o
centro da tela; em celular, a lista é ocultada e o cartão é reduzido.

## Otimização para navegador

- sem bundler, servidor ou framework obrigatório;
- cinco GLBs pequenos e autocontidos;
- resolução inicial limitada a 1,5× no desktop e 1,2× em telas menores, com
  ajuste automático quando o FPS permanece baixo;
- mapa estático com sombras calculadas uma vez;
- materiais e geometrias compartilhados entre prédios;
- grades, janelas e vegetação usando instanciamento;
- áudio sintetizado em tempo real, sem baixar WAV/MP3;
- tinta do chão em uma única `CanvasTexture` 256×256;
- manchas verticais agrupadas em um `InstancedMesh` com limite fixo;
- placar em `Uint8Array`, sem leitura de pixels da GPU;
- resolução limitada a 1,75× o DPR e sombras em 1024×1024;
- mapa de teste mantido pequeno, com colisores `Box3` simples;
- dependências Three.js na mesma versão (`0.169.0`).

## Estrutura

```text
JOgo/
├── index.html       # canvas, tela inicial e HUD de território
├── style.css        # interface responsiva
├── main.js          # cena e loop principal
├── map.js           # arena urbana, colisões, instâncias e rota do bot
├── player.js        # movimento, vida, dano, respawn e ADS
├── bot.js           # bot pintor, patrulha, linha de visão e combate
├── match.js         # meta de território, tempo, penalidades e resultado
├── audio.js         # passos, tiros, impactos e recarga procedurais
├── ink.js           # paint-map, marcas verticais e cobertura de território
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
- A documentação oficial de
  [`InstancedMesh`](https://threejs.org/docs/pages/InstancedMesh.html) confirma
  seu uso para reduzir draw calls com geometrias repetidas.
- As práticas da [Web Audio API no MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
  orientam a criação/reabertura do contexto após uma ação do usuário.
- [Freesound](https://freesound.org/help/faq/) e
  [OpenGameArt](https://opengameart.org/content/faq) foram avaliados como
  catálogos futuros; cada download ainda precisa ter licença e crédito
  verificados individualmente.
- [Poly Haven](https://polyhaven.com/license) oferece assets CC0, mas a versão
  atual usa uma textura procedural menor para não aumentar o download.
- [Mixamo](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) e
  [ActorCore](https://actorcore.reallusion.com/license) são opções para uma
  futura animação corporal completa. Nenhum arquivo desses serviços foi
  redistribuído nesta versão.
- Os modelos de braços/armas indicados no Sketchfab foram usados apenas como
  referência visual para as poses de POV, mira e recarga. O modelo AK74U não foi
  incorporado: o jogo mantém os braços procedurais originais e os cinco blasters
  CC0 já documentados em `models/weapons/LICENSES.md`.
- O [Splatoon-Ink do Mix and Jam](https://github.com/mixandjam/Splatoon-Ink)
  orientou a separação entre disparo, gerenciador de pintura e superfície
  pintável. A implementação Unity/URP não foi copiada; o navegador usa
  `CanvasTexture`, grade compacta e materiais do Three.js.
- A [animação de chama indicada no Sketchfab](https://sketchfab.com/3d-models/animation-of-fire-shoot-flame-vfx-40af8e4b4f9f477da34ebe3cf1885039)
  foi referência de forma e duração. O efeito incluído é procedural e original.
- [Awwwards — Three.js](https://www.awwwards.com/websites/three-js/) serve como
  referência visual de interface e apresentação, não de física.
- O repositório [PunishXIV/Splatoon](https://github.com/PunishXIV/Splatoon) é um
  plugin de acessibilidade para Final Fantasy XIV e não implementa o gameplay do
  jogo da Nintendo.
- A regra central de território segue a descrição oficial de
  [Turf War](https://splatoon.nintendo.com/en/gameplay/): vence a equipe que
  cobre mais chão com sua tinta. Nesta versão, o Bot Rosa controla a segunda
  equipe localmente.
- Modelos: [Kenney — Blaster Kit](https://kenney.nl/assets/blaster-kit), CC0.

O projeto usa apenas a ideia geral de FPS de arena e disputa por território.
Não inclui código, marcas, personagens, mapas, áudio ou modelos extraídos de
Krunker ou Splatoon.

## Próximas etapas

1. Adicionar navegação em malha para o bot escolher rotas dinamicamente.
2. Criar diferentes níveis de dificuldade e armas para o bot.
3. Adicionar variação de superfície nos passos.
4. Implementar animações corporais licenciadas para o bot.
5. Implementar servidor autoritativo, interpolação e validação de acertos antes
   de ativar multiplayer público.
