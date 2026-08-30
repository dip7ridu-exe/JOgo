# JOgo — Campo de Teste FPS

Protótipo de jogo de tiro em primeira pessoa para navegador, feito com
**Three.js** e sem etapa de build. O projeto já possui movimentação, colisão,
cinco armas low-poly, disparo por raycast, recarga, troca de arma, alvos e HUD.

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

Os cinco modelos atuais são originais e gerados com geometrias do Three.js em
`weapons.js`. Assim, o protótipo funciona imediatamente, sem baixar arquivos e
sem depender de licença de terceiros.

| Tecla | Arma | Tipo | Funcionamento |
|---|---|---|---|
| 1 | PT-9 | Pistola | Semiautomática |
| 2 | VK-5 | Submetralhadora | Automática |
| 3 | AR-7 | Rifle de assalto | Automático |
| 4 | SG-2 | Espingarda | 8 projéteis por disparo |
| 5 | RK-1 | Sniper | Alto dano e alta precisão |

Dano, cadência, munição, recarga, recuo, dispersão e cores ficam centralizados
em `weapons.json`. Os modelos são montados e conectados ao sistema de tiro em
`weapons.js`.

## Estrutura

```text
JOgo/
├── index.html       # canvas, tela inicial e HUD
├── style.css        # interface responsiva
├── main.js          # inicialização, cena e loop principal
├── map.js           # arena, colisões e alvos reativos
├── player.js        # Pointer Lock e movimentação FPS
├── weapons.js       # modelos 3D, troca, tiro, dano e recarga
└── weapons.json     # atributos das cinco armas
```

## Onde conseguir modelos 3D de armas

Para substituir os modelos de teste por arquivos `.glb`, prefira pacotes com
licença clara e guarde a licença junto dos assets.

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

### Troca futura por `.glb`

1. Converta o asset permitido para `.glb` e salve em `models/weapons/`.
2. Importe o `GLTFLoader` usando a mesma versão do Three.js do `index.html`.
3. Carregue o arquivo, ajuste escala/rotação e prenda `gltf.scene` ao
   `WeaponSystem`.
4. Preserve um ponto chamado `muzzle` para o clarão e o início do traçante.
5. Registre autor, link e licença em `models/weapons/LICENSES.md`.

## Correção da tela inicial

O arquivo HTML antigo carregava `js/main.js`, mas `main.js` estava na raiz do
repositório. Esse caminho inválido impedia todo o JavaScript de executar. O
`index.html` agora aponta para `main.js`, e falhas de inicialização exibem uma
mensagem visível na tela em vez de deixar o clique sem resposta.
