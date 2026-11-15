# Guia de Sobrevivência — série de animação 3D (canal do usuário)

Série de vídeos curtos em 3D, em **português do Brasil**, com personagens grãos de café ensinando a sobreviver a desastres, com humor.
Episódios prontos: **EP1 Tsunami** (`tsunami/`) e **EP2 Terremoto** (`terremoto/`). **EP3 Enchente** (`enchente/`) pronto (2:33, cidade, formato de "planos" certos e errados com o bordão "Assim, a enchente não chega"). O final do EP3 pede comentário ("sobrevivi" / "não consegui") em vez de anunciar o próximo episódio; **EP4 Incêndio** (`incendio/`) pronto (1:38; o prédio inteiro pega fogo por um curto-circuito; opção 1 "a mais legal" = roupa de bombeiro + extintores, opção 2 "a da vida real" = ligar 193; final com o amigo pulando da janela). O usuário agora prefere episódios de **até 2 minutos**. Storyboard: https://claude.ai/artifact/Le5ve7Aw9Zc5RYAbBzgxmk

## Temporada dos filmes (a partir do EP5)
- O usuário quer expandir para "sobreviver" a vilões e situações de filmes e séries, **por etapas** (escolhas → roteiro → storyboard → vídeo) e com tudo nas especificações dele. Menu de escolhas: https://claude.ai/artifact/1Ke6fkm8S5Dg6rx9K1su46 (`temporada2/menu_episodio.html`).
- **EP5: boneco assassino** (inspirado no Chucky). Título: "Você sobreviveria ao boneco assassino?". Não usar o nome "Chucky"; o boneco é uma paródia em grão (veja abaixo).
- Escolhas do usuário para o EP5 (`boneco/`): **cenário e personagens em 2D** (mudança grande: nada de Three.js; teste de estilo em `boneco/style_test.html` → `estilo_2d_a/b/c.jpg`: desenho chapado com contorno grosso, casa média americana à noite). Formato "as regras para sobreviver": o narrador diz cada cuidado ("O primeiro cuidado que você deve tomar é não fazer barulho, pois o boneco escuta") e o protagonista erra por conta própria (às vezes segue), **sem opções de escolha**. **Até 1 minuto.** Comédia com um pouco de suspense. **Protagonista novo**: um grão com cara de espantado (os personagens antigos não aparecem). **Sem cachorro** ("vídeo completamente diferente dos outros"). Vilão não fala, só faz sons. Final: o público escolhe o próximo vilão nos comentários.
- Estilo 2D pedido (v2 do teste): **bem contrastado**, com um **contorno claro brilhando em volta dos personagens** (camada própria + `characters()` com rim); ambiente **mais escuro e azulado, noturno** (`nightGrade` multiply + `lightPool` para abajur/TV/varanda); casa americana normal e coerente (um set só: porta da frente com mochila no gancho, janela com sofá, abajur, poltrona, escada com a porta do PORÃO embaixo); câmera com enquadramentos caprichados (`camera({x,y,z})`).
- **O boneco agora é um grão** com traços que lembram o Chucky (decisão do usuário): cabelo laranja espetado, camisa listrada colorida, macacão jeans, tênis vermelhos, sardas, cicatrizes costuradas só nas bochechas (nunca passando pelo olho), olhos vermelhos e faca quando fica do mal. Não usar o nome "Chucky" no vídeo.
- **Pipeline do EP5 (2D)** em `boneco/`: `art.js` (kit de desenho: casa, grão, boneco, `nightGrade`, `lightPool`, contorno) + `scene.js` (fachada `exterior()`, direção por cena, câmera `camL`, pipoca voando `kernels`) carregados por `index.html`; `build_audio.py` (voz Piper grave por enquanto — o usuário pediu **voz genérica, sem ElevenLabs** na prévia; efeitos: grilos, drone de suspense, caixinha de música, TV, campainha `dingdong`, `sting`) gera `audio/mix.wav`, `timeline.json` e `audio/words.json`; `render.js` (1080×1920 direto) e `make_vertical.py ... --native` (legendas em ASS em y=1520; sem título fixo: o gancho "Você sobreviveria ao boneco assassino?" é desenhado no quadro por `hook()`: **aparece no começo, junto com a fala, e encolhe até sumir quando a frase termina**; **reto**, só "VOCÊ SOBREVIVERIA / AO BONECO ASSASSINO?" (sem "Guia de Sobrevivência"/episódio); essa frase não tem legenda; **sem a faixa escura no topo**). **Legendas do EP5: uma palavra de cada vez**, em maiúsculas, **brancas com contorno escuro** (sem amarelo), com **fade in e fade out** (desfoque leve que entra nítido e cresce um pouco). Grilos suaves (chirps curtos) e TV abafada, sem chiado. Campainha normal, sem susto (pedido do usuário); embaixo da porta só uma linha fina de luz. Prévia da abertura (13,5 s) entregue em 14/11/2026.
- **O protagonista se chama Pedrinho.** Roteiro até agora (do usuário): … "a campainha toca." → "E então Pedrinho levanta do sofá e abre a porta." (ele levanta, deixa a pipoca no sofá e anda até a porta com a câmera acompanhando) → **corte para fora**: a câmera filma da frente da casa o Pedrinho abrindo a porta e **não encontrando ninguém**, só uma **caixa de brinquedo** ("MEU AMIGÃO", com janelinha mostrando o boneco sorrindo) na frente da porta, no caminho (`drawPorch`, `toyBox`). Ele olha para os lados, depois para a caixa ("?"). → narrador: "Ele não vê ninguém lá fora, apenas uma caixa com um boneco dentro. Ele acha que foi um presente, mas ele mal espera o que está por vir." (câmera chega perto da caixa em "apenas"; em "acha" ele desce feliz, brilhinhos, e pega a caixa no colo; em "mas…" a câmera fecha na janelinha e em "vir" os olhos do boneco viram para a câmera e ficam vermelhos com sorriso de dentes — aviso, sem susto; caixinha de música desafinando). Prévia com ~26 s.
- **Roteiro do EP5 salvo em `boneco/ROTEIRO.md`** (texto aprovado do usuário + seção separada de ideias minhas, que só entram se ele aprovar). Partes 6–11 (abre a caixa e põe o boneco na mesa → erro 1: não olhar dentro do brinquedo/microfone → desliga a TV e vai dormir em cima → 30 min depois barulhos → erro 2: ir ver barulho às 3h → desce só com o celular, esquece as lâmpadas) estão em `boneco/script_completo.json`, **ainda não animadas**. Já passa de 1 min (~1:10): perguntar se aumenta o limite.
- **Roteiro completo do usuário** (15/11/2026) animado em `boneco/scene2.js` (`drawLate`): boneco na mesinha (com telefone fixo) → ERRO Nº1 (raio-X com microfone) → TV desliga, sobe a escada → quarto (`bedroom`, relógio 03:00, "30 MINUTOS DEPOIS…") → ERRO Nº2 → desce só com o celular (escuridão + cone da lanterna `darkness`, seta "INTERRUPTOR") → caixa vazia → balão do ladrão + "foto" do boneco → ERRO Nº3 (seta "LIGA 190!") → cozinha (`kitchen()` à direita da escada, porta-facas com um espaço vazio) "OI, QUEM É?" → boneco no balcão com a faca, olhos vermelhos → perseguição até o **porão, que fica ao lado da porta de entrada** (seta "PORTA DE ENTRADA") → ERRO Nº4 no porão sem janela (`basement`) → "15 MINUTOS DEPOIS…" → ÚLTIMO ERRO (seta "A SAÍDA TÁ AQUI!") → não acha o boneco, dá de ombros, vai dormir → **o boneco surge atrás dele em cima da cama** (cena `scare`), ele senta e grita "AAAAAAH!" → narrador: "Assim, Pedrinho ferra com tudo de vez e vira estampa de camisa." (camiseta "SAUDADES PEDRINHO" com a foto dele, trombone triste) → narrador: "E aí, quem vocês querem que o Pedrinho sobreviva agora?" ("QUEM É O PRÓXIMO?", silhuetas com "?", "COMENTA AÍ!"). (Antes o final era o boneco debaixo da cama; o usuário trocou.) → narrador: "Mas, aliás, você viu os feijões espalhados pela casa? Se sim, comenta aí." (**3 feijõezinhos escondidos**, `feijao()`: no gramado da frente, no parapeito da janela da sala e no balcão da cozinha; no fim aparece um feijão grande com "VIU OS 3 FEIJÕES?"). Revisão do usuário: **sem o risco no meio dos grãos** (tirado de todos), pipoca vai na boca (não no olho), ele entra só com a caixa na mão e depois põe na mesa, o microfone é um ícone no topo da tela (sem zoom/lente cobrindo o boneco), deitado na cama com os dois olhos iguais, braço e pés aparecendo, ladrão simples (gorro + máscara) segurando o boneco. Voz Piper mais rápida (length-scale 0.9). Duração ~2:36.
- Início do roteiro (do usuário): o protagonista relaxando em casa; narrador: "Você sobreviveria ao boneco assassino? É uma sexta-feira qualquer, você está na sua casa. Até que, de repente, a campainha toca." **O resto do roteiro o usuário vai mandar depois — não inventar sem ele pedir.**

## Como trabalhar com o usuário
- Fale sempre em português do Brasil, simples e direto: o usuário não é técnico. Explique o que mudou no vídeo, não o código.
- O usuário autorizou seguir sem pedir confirmação para tudo que faça parte da criação que ele pediu (renderizar, gerar áudio, commit/push no repositório).
- Entregue os vídeos com a ferramenta de envio de arquivos e sempre faça commit + push no `main` do repositório `pandogames2-a11y/Video-TTK` (um hook bloqueia o fim do turno se houver mudanças sem commit).
- Para o usuário apontar mudanças, monte um **storyboard** (um quadro por frase, com tempo, fala e campo de anotação) como Artifact. O do EP1 está em https://claude.ai/artifact/86bnEuyQsrzzPWyDPmLcRh e o do EP3 em https://claude.ai/artifact/S1hkucLQC37kCHcS6UzYkH
- Renderizações demoram ~30–40 min; avise o progresso de forma curta.

## O que o usuário gosta (aprendido nas revisões)
- **Duração: no máximo 3 minutos** por episódio.
- **Estilo**: animação 3D de grãos de café (inspiração "Killer Bean", mas personagens próprios), narração em segunda pessoa ("você"), tom **descontraído, sem exagero**, com piadas irônicas.
- **Coerência acima de tudo**: personagem não pode estar em dois lugares ao mesmo tempo; nada atravessa nada (personagens, carros, objetos) — confira quadros de teste; câmeras não podem ficar dentro de rosto/objeto nem bloqueadas.
- **Ação antes da reação**: se o personagem reage (fica branco, preto de fuligem…), mostre o que causou (teto desabando, explosão, choque).
- **Explique a ligação**: toda dica precisa deixar claro por que tem a ver com o desastre (ex.: gás → o tremor solta a mangueira/racha os canos).
- **Uma voz fixa por personagem**, sem variar entre falas.
- **Legendas**: palavra por palavra — a palavra dita fica amarela e dá um pulinho; falas de personagem entre aspas.
- **TikTok**: vertical 1080×1920, título fixo em cima (sem repetir o título no meio do vídeo), legendas grandes embaixo. Desde o EP4 o usuário quer **TikTok nativo, sem bordas** (nada de vídeo 16:9 com fundo desfocado): renderize na vertical (`VERT=1`) e monte com `make_vertical.py ... --native`.

## Fórmula do episódio (siga a mesma estrutura)
1. Título: "Você sobreviveria a um(a) X?" (GUIA DE SOBREVIVÊNCIA • EPISÓDIO N).
2. Momento tranquilo com o protagonista, o amigo e o cachorro; bordão **"Tudo tranquilo. Tranquilo até demais."**
3. O desastre começa ("Até que, de repente…") + **aviso na tela** (badge vermelho).
4. Amigo em pânico: **"E agora? O que a gente faz?!"** com pontos de interrogação girando.
5. **Explicação animada 2D** (infográfico rico: céu, sol, camadas, rótulos, ícones) do que é o fenômeno.
6. **Ideia errada do amigo** → narrador: "Péssima ideia…" → consequência cômica → **REPLAY em VHS** voltando no tempo.
7. Protagonista: **"Tenho uma ideia melhor. Vem comigo!"** (lâmpada) → **REGRA DE OURO** com passos na tela.
8. Dicas extras (situações diferentes) e um perigo "escondido" explicado com causa → efeito.
9. **Gag do amigo** que ignora a dica (choque, fuligem…) → protagonista põe a mão na testa (trombone triste) → amigo: **"Tô bem… tô bem!"**
10. Autoridades/esperar com segurança; callback aos episódios anteriores quando fizer sentido ("Lembra do EP. 1?").
11. Final irônico: **"E você? Seguiria as dicas… ou continuaria fazendo Y?"** → cena do "não seguir" com **ação visível** → **"Oh-oh…"** → desastre cômico.
12. "No próximo episódio: como sobreviver a …".

## Personagens e vozes (ElevenLabs, `voices.json`)
- **Protagonista**: grão marrom, chapéu de palha com faixa vermelha, cavanhaque, sapatos vermelhos, óculos escuros às vezes (na testa quando tira). Voz **Liam**.
- **Amigo surfista**: grão mais escuro, cabelo escuro cacheado (inspirado no estilo do Medina), prancha. Voz **Charlie**. Leva as gags (choque, fuligem).
- **Cachorro**: resgatado na fuga do EP1 e virou o cachorro deles.
- **Narrador**: voz **Brian**.
- Config de voz: `eleven_multilingual_v2`, stability 0.8, similarity 0.85, style 0, seed 4242, com `previous_text`/`next_text` do mesmo personagem.

## Estrutura de cada episódio (pasta por episódio)
- `script.json` — roteiro: lista de cenas `{scene, voice: narr|hero|friend|none, text, lead, tail, min, nocap}`.
- `build_audio.py` — gera as falas (`TTS=eleven` usa o ElevenLabs; sem isso usa a voz local Piper), trilha e efeitos sonoros por cena, `audio/mix.wav` e `timeline.json` (tempos de cada cena, legendas e boca dos personagens).
  - Áudios do ElevenLabs ficam em cache em `audio/cache/` (chave = texto + voz + falas vizinhas). **Mudar o texto de uma fala muda a chave dela e das vizinhas do mesmo personagem** → gasta crédito de novo.
  - `SPEED=1.12` acelera a fala sem mudar o tom; `TIGHT=1` encurta pausas longas dentro das falas (úteis para caber em 3 min sem gastar crédito).
- `align_words.py` (alinhamento do ElevenLabs, gasta crédito) ou `align_local.py` (grátis, pelas pausas) → `audio/words.json` com o tempo de cada palavra. **Rode sempre depois de mudar o áudio** e antes de renderizar (a cena usa esses tempos).
- `scene.js` — cena Three.js + direção de câmeras + overlays 2D. `index.html` carrega a cena; `render.js` renderiza no Chromium headless.
- `make_wide.py` (16:9 com legendas palavra por palavra) e `make_vertical.py` (TikTok).

## Passo a passo de produção
```bash
bash setup.sh                                   # máquina nova: instala e liga dependências
cd <episodio>
TTS=eleven python3 build_audio.py               # áudio + timeline.json
python3 align_words.py   # ou: python3 align_local.py (sem créditos)
node render.js stills 10,20,30 /caminho/saida   # quadros de teste (confira todas as cenas!)
# render completo sem legenda e sem título (3 processos em paralelo, ~30-40 min):
NOCAP=1 NOTITLE=1 node render.js frames 0 1800 F & NOCAP=1 NOTITLE=1 node render.js frames 1800 3600 F & NOCAP=1 NOTITLE=1 node render.js frames 3600 99999 F &
NOCAP=1 node render.js frames 0 150 T           # só a abertura com o título, para a versão 16:9
# junte os quadros (abertura de T + resto de F), gere os MP4 limpos com audio/mix.wav e depois:
python3 make_vertical.py limpo.mp4 <ep>_tiktok.mp4
python3 make_wide.py limpo_com_titulo.mp4 <ep>.mp4
```
Quadros: 1280×720, 30 fps. Use o scratchpad para quadros e arquivos temporários.

## EP3 Enchente — notas
- Cenário: casa térrea (set em `AO`, com sofá que boia, quadro de luz, tomada, janela com a rua desenhada em tempo real), rua alagada (`floodMesh`, nível em `floodD(t)`), bueiro na frente do prédio (`MAN`, tampa que salta + redemoinho), escada do prédio (`IO`) com o térreo alagado, telhado do prédio (`ROOF()`/`bw()` convertem coordenadas locais do prédio), chuva em 3D (`updateRain`) e relâmpagos (`bolt`).
- Áudio provisório: `python3 build_audio.py` (Piper) + `align_local.py`. Os .wav provisórios não vão para o git. Para a versão final: `TTS=eleven TIGHT=1 python3 build_audio.py` (≈1.950 caracteres de crédito), `align_local.py` ou `align_words.py`, quadros de teste, render.

## EP4 Incêndio — notas
- Mesmo formato de "planos" do EP3 (`PLANS`, `ASSIMS`, `WRONGS`), na mesma cidade. Apartamento agora no 3º andar (a janela mostra a rua desse andar).
- O usuário pediu: incêndio grande vindo do prédio (não de frigideira), explicação com fogão + tela de moléculas de oxigênio (sem "caixas"), roupa de bombeiro com extintores como opção 1 e 193 como opção 2, e episódios mais curtos (até 2 min).
- Prédio em chamas: `BFIRE` (uma chama por janela, `fireLevel`), `roofSmoke`, `fireGlow`; estilhaços `SHARDS`; roupa de bombeiro `suit`/`ext` no `Bean`; jato dos extintores `sprays`; explicação `dio` (fogão + zona das moléculas `MZ` + fumaça no apartamento).
- Fogo/fumaça: `makeFlame`/`updateFlame` (sprites com luz), `makeSmokeColumn`; cozinha com panela, tampa, botão do fogão, cortina (`fireState`); fumaça no teto (`aptParts.smoke`) e nos andares do prédio (`ioSmoke`); fogo na janela da fachada e na porta (`facadeFire`, `doorFire`); caminhão de bombeiros com escada e jato d'água (`truck`, `hose`); maquete do triângulo do fogo (`dio`, `dioCam`).
- Áudio final: `TTS=eleven TIGHT=1 python3 build_audio.py`, `align_words.py`, `TTS=eleven TIGHT=1 python3 build_audio.py` de novo (efeitos usam os tempos das palavras), quadros de teste, render.
- v3 (pedido do usuário): a explicação diz o que a fumaça causa (quente e tóxica, desmaio em poucos minutos, sobe/toma o teto/desce; cartões com termômetro/caveira e grão tonto); a ideia errada do elevador agora é **mostrada** (cena `elevgag`: luz apaga, luz vermelha, fumaça entra na cabine, "SOCORRO!", "COF!") antes do REPLAY; a escada é curta (`crawl`: poucos degraus e corte para eles saindo pela porta do prédio, "AR LIVRE!"). Duração 1:46.
- v4: corredor do 3º andar refeito (teto, parede da frente com portas 301–304, luzes, placa SAÍDA, guarda-corpo em volta da escada), cabine do elevador maior (2,4 m) filmada do canto de cima como câmera de segurança, sem `squint` (o olho bugava), e a ida até a escada é contínua: `idea` e `crawl` usam o mesmo caminho (`pathH`/`pathF`) e a mesma câmera, que passa por cima da escada para mostrar eles descendo de frente; pernas andam abaixadas (`legs:'crouch'` + `run`). Corte para a porta do prédio com um fade rápido.
- **Modo vertical nativo** (`?vertical=1` / `VERT=1 node render.js ...`): tela 720×1280; os overlays 2D são desenhados no espaço 1280×720 e mapeados com `UIK=0.75`, `UIOX`, `UIOY` (faixa visível do desenho em x = `UIL`…`UIR`); use `proj()` para projetar pontos 3D e `fullRect()` para pintar a tela toda; o `label()` se limita à faixa visível; o cartão do plano fica embaixo; `direct()` converte o fov (mantém 80% da largura do 16:9) e tem ajustes `if (VERT)` em algumas câmeras (elevador, janela, final).

## Como funciona o `scene.js` (para criar o próximo episódio)
- Comece copiando `terremoto/` (mar calmo, sem tsunami; já tem apartamento, escada e praia).
- Partes reaproveitáveis: terreno/praia/mar, morro de fuga (`TOP`, `HS`), prédio + interior com escadas (`IO`, `onStairs`), estrada com túneis (`ROAD`), carros (`cars`, `myCar`, escala `CAR_S` — personagens dentro do carro são filhos do carro com escala 1/CAR_S), apartamento (`AO`, `AP()`), espreguiçadeira, cachorro (`dogPose`), sol, gaivotas.
- `Bean.pose(t, p)`: `x,y,z,ry`, `run/phase`, `legs: 'sit'|'crouch'`, `lean`, `sitY`, braços `armL/armR` (poses em `A`: rest, up, wave, point, pointUp, thumb, facepalm, hips, stop, no, cheer…), rosto (`mouth`, `smile`, `smirk`, `brow`, `eyesWide`, `squint`, `look`, `shout`), extras (`shades`, `shadesUp`, `fish`, `ctrl`, `candle/flame`, `soot`, `zap`, `dust`, `hat`, `visible`).
- Direção: `direct()` decide posição/câmera por cena; sincronize com a fala usando `capAt('palavra', inicioDaCena)` (legendas) ou `wordAt('palavra', ...)` (palavra exata, de `words.json`).
- Overlays 2D em `overlay()`: `badge`, `outlined`, `pop`, `questionMarks`, `vhs`, `lightbulb`, `stars`, `smoke`, infográficos próprios (ex.: `quakeDiagram`, `richterScale`).
- Antes do render completo, gere uma folha de quadros de teste de **todas** as cenas e procure: objetos atravessando, câmera bloqueada, texto cortado/sobreposto, personagem fora do quadro.

## Ambiente e serviços
- **ElevenLabs — duas contas** (mesmas vozes; Liam/Charlie/Brian são vozes padrão de qualquer conta). As chaves são *network secrets* do ambiente de nuvem **video-ttk-elevenlabs**, uma por endereço (header `xi-api-key`, **sem prefixo**):
  - conta 1 → `api.elevenlabs.io` (desde 13/11/2026 é a conta "Nicolas", plano grátis, 10.000/mês; usados ~1.400 até o EP4 v3);
  - conta 2 ("Brasil", plano grátis) → `api.us.elevenlabs.io` (mesma API, servidores nos EUA).
  - `build_audio.py` e `align_words.py` (do EP3) tentam a conta 1 e, se der erro de crédito, a conta 2 (`ELEVEN_HOSTS` muda a ordem). Em código use o valor fictício `proxy-injected` — o proxy injeta a chave real.
- Créditos: cada conta tem **10.000/mês**. A conta 2 hoje é a "Maratonando" (plano grátis); em 12/11/2026, depois do EP3, as **duas ficaram zeradas** (a conta 2 renova por volta de 13/12/2026). Sem créditos: use `align_local.py` e reaproveite falas do cache; para falas novas é preciso renovar/plano maior (ou usar `TTS=piper`, qualidade inferior).
- Ver créditos da conta 2: `curl -s https://api.us.elevenlabs.io/v1/user/subscription -H 'xi-api-key: proxy-injected'`.
- Sem acesso ao HuggingFace; a voz Piper vem do GitHub (sherpa-onnx releases) via `setup.sh`.

## Arquivos do canal
- `canal/foto_perfil_protagonista.png` (1024×1024) e `canal/banner_canal.png` (2560×1440). Gerados por `renderPortrait()` / `renderBanner()` em `tsunami/scene.js` (`index.html?portrait=1`).
