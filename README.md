# JOgo — Campo de Teste FPS

Protótipo de jogo de tiro em primeira pessoa para navegador, feito com
**Three.js** e sem etapa de build. O projeto já possui movimentação, colisão,
cinco armas convencionais, braços em primeira pessoa, animações, disparo por
raycast, recarga, troca de arma, alvos e HUD.

## Como jogar

O projeto usa módulos ES. Por isso, rode os arquivos por um servidor HTTP em
vez de abrir `index.html` diretamente pelo explorador de arquivos.

```bash
# dentro da pasta do projeto
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.

Também funciona no GitHub Pages: em **Settings → Pages**, escolha
**Deploy from a branch**, selecione `main` e a pasta `/ (root)`.

## Controles

| Controle | Ação |
|---|---|
| Clique na tela | Entrar ou voltar ao teste |
| W A S D | Mover |
| Mouse | Olhar |
| Botão esquerdo | Atirar |
| 1–5 ou roda do mouse | Trocar arma |
| R | Recarregar |
| Espaço | Pular |
| Shift | Correr |
| Ctrl ou C | Agachar |
| Esc | Liberar o mouse |

## Armas incluídas

Os cinco modelos atuais vêm do **Free CC0 Guns & Explosives Pack**, de
**3dmodelscc0**. Os FBX originais foram convertidos para `.glb` autocontido,
carregados pelo `GLTFLoader` e mantêm a licença CC0 declarada pelo autor. O jogo
não baixa modelos de serviços externos durante a partida.

| Tecla | Arma | Tipo | Modelo GLB | Funcionamento |
|---|---|---|---|---|
| 1 | Makarov | Pistola | `makarov.glb` | Semiautomática |
| 2 | Grease Gun M3 | Submetralhadora | `grease-gun.glb` | Automática |
| 3 | M4A1 | Rifle de assalto | `m4a1.glb` | Automático |
| 4 | Shotgun | Espingarda | `shotgun.glb` | 8 projéteis por disparo |
| 5 | Sniper Rifle | Sniper | `sniper.glb` | Alto dano e alta precisão |

Dano, cadência, munição, recarga, recuo, dispersão, caminho do modelo, escala,
posição, rotação e ponto `muzzle` ficam centralizados em `weapons.json`. O
carregamento e o sistema de tiro ficam em `weapons.js`. Caso algum GLB falhe ao
carregar, o jogo mantém um modelo procedural de reserva para não interromper a
partida.

Os braços e as mãos enluvadas são construídos em Three.js e possuem pontos de
empunhadura diferentes para cada arma. O view model anima a entrada da arma,
respiração, caminhada/corrida, recuo, peça móvel, saída do carregador e movimento
da mão durante a recarga.

## Estrutura

```text
JOgo/
├── index.html       # canvas, tela inicial e HUD
├── style.css        # interface responsiva
├── main.js          # inicialização, cena e loop principal
├── map.js           # arena, colisões e alvos reativos
├── player.js        # Pointer Lock e movimentação FPS
├── weapons.js       # GLTFLoader, modelos de reserva, tiro, dano e recarga
├── weapons.json     # atributos e ajuste visual das cinco armas
└── models/
    └── weapons/
        ├── makarov.glb
        ├── grease-gun.glb
        ├── m4a1.glb
        ├── shotgun.glb
        ├── sniper.glb
        └── LICENSES.md
```

## Onde conseguir modelos 3D de armas

Para adicionar outros arquivos `.glb`, prefira pacotes com licença clara e
guarde a licença junto dos assets.

- [3dmodelscc0 — Free CC0 Guns & Explosives Pack](https://3dmodelscc0.itch.io/free-cc0-guns-explosives-pack):
  19 armas e explosivos em FBX, licença CC0; é o pacote usado nesta versão.
- [Kenney — Blaster Kit](https://kenney.nl/assets/blaster-kit): 40 arquivos 3D,
  licença CC0.
- [Quaternius — Ultimate Guns Pack](https://quaternius.com/packs/ultimategun.html):
  40 armas em FBX, OBJ e Blend, licença CC0.
- [Quaternius — Animated Guns Pack](https://quaternius.com/packs/animatedguns.html):
  6 armas animadas em FBX, OBJ e Blend, gratuitas para projetos pessoais e
  comerciais.
- [itch.io — armas CC0](https://itch.io/game-assets/tag-cc0/tag-weapons): confira
  a licença indicada na página de cada pacote.
- [Poly Pizza](https://poly.pizza/): muitos modelos usam CC-BY e exigem crédito.
- [Sketchfab — filtro CC0](https://sketchfab.com/search?features=downloadable&licenses=322a749bcfa841b29dff1e8a1bb74b0b):
  confira a licença individual antes de publicar.

Não use nomes, texturas ou modelos extraídos de Valorant, Call of Duty ou outro
jogo comercial. APIs como `valorant-api.com` fornecem dados de consulta, não uma
licença para reutilizar os assets em outro jogo.

### Integração `.glb` implementada

1. Os assets permitidos estão em `models/weapons/` como GLBs autocontidos com
   texturas PBR em 1024×1024.
2. O `index.html` mapeia `three` e `three/addons/` para a mesma versão `0.169.0`.
3. O `WeaponSystem` usa `GLTFLoader.loadAsync()` e prende cada `gltf.scene` ao
   view model da câmera.
4. Cada arma possui um objeto `muzzle` usado pelo clarão e pelo traçante.
5. Autor, fonte, versão do pacote e licença estão registrados em
   `models/weapons/LICENSES.md`.

## Correção da tela inicial

O arquivo HTML antigo carregava `js/main.js`, mas `main.js` estava na raiz do
repositório. Esse caminho inválido impedia todo o JavaScript de executar. O
`index.html` agora aponta para `main.js`, e falhas de inicialização exibem uma
mensagem visível na tela em vez de deixar o clique sem resposta.
