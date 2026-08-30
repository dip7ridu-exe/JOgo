# Atualização — ADS corrigido, Bot Rosa e disputa de território

Data: 30 de agosto de 2026

## ADS e miras

- As posições ADS antigas foram substituídas por uma linha de visada calculada.
- Blaster Pulso, Rajada, Vetor e Canhão Onda receberam miras de ferro 3D.
- Cada arma tem distância, altura, FOV e sensibilidade próprios durante o ADS.
- O Blaster Prisma recebeu luneta 3D e retículo 4× em tela cheia.
- A arma é afastada durante o ADS para não cobrir a visão como ocorria antes.

## Bot e objetivo

- Os sete manequins foram removidos.
- Foi criado um Bot Rosa low-poly com 100 HP e respawn de 2,8 segundos.
- O bot patrulha rotas livres, pinta o mapa e atira quando enxerga o jogador.
- O jogador agora possui vida real, recebe dano e reaparece após ser derrubado.
- A meta é cobrir 10% do mapa antes do adversário em até 90 segundos.
- Uma morte transfere 16% da área azul conquistada para o Bot Rosa.
- Abater o bot recupera 8% da área rosa conquistada.
- A partida termina em uma tela de vitória ou derrota com o resultado completo.

## Sistema de tinta

- O chão usa uma única `CanvasTexture` dinâmica de 256×256 como paint-map.
- A grade de 84×84 continua calculando a porcentagem sem leitura da GPU.
- Tinta adversária sobrescreve a anterior e transfere a célula de território.
- Paredes e caixas mantêm manchas instanciadas, reduzidas para 520 posições.
- A rota do bot atinge a meta de 10% em aproximadamente 77 segundos sem disputa.

## Efeitos de tiro

- O antigo raio/linha de bala foi removido completamente.
- O cano usa chama procedural curta de três camadas.
- Impactos geram pequenas gotas coloridas com gravidade e duração de 0,22 s.
- Nenhum modelo ou efeito externo pesado foi incluído.

## Arquivos principais alterados

- `weapons.js`: miras, luneta, muzzle flash, impactos e remoção do traçante.
- `ink.js`: paint-map dinâmico e pintura por equipe.
- `bot.js`: IA local, modelo, patrulha, pintura e combate.
- `match.js`: objetivo, tempo, penalidades e resultado.
- `player.js`: vida, dano, respawn e parâmetros ADS.
- `map.js`: remoção dos manequins e rota segura do bot.
- `index.html` / `style.css`: luneta, HUD do bot e telas da partida.
