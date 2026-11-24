# Entrega da pipeline — 14/11/2026

## Arquivos

| Arquivo | Mudança |
| --- | --- |
| `site/pipeline.html` | Nova página, título com espaço após o ponto, barra de prompt, navegação e mapa de imports local. |
| `site/css/pipeline.css` | Tema escuro, rótulos ancorados, nome e contagem no celular, etiquetas compactas somente para agentes com tarefas. |
| `site/js/pipeline.js` | Montagem das cinco ilhas, fita colorida, pacotes, setas em movimento, retorno lateral, efeito de saída, câmera, controles e `window.__esc`. |
| `site/js/pipeline-logica.js` | Filas FIFO, distribuição, estados dos agentes, comandos, auto, limites e devolução única da revisão, sem dependência de Three. |
| `site/js/pipeline-layout.js` | Coordenadas da fita, dos times e dos postos, variantes responsivas e enquadramento. |
| `site/js/pipeline-modelos.js` | Proxies articulados para instanciar os robôs e geometria arredondada das plataformas. |
| `site/js/robo.js` | Retira closure e listas temporárias de `update`, mantendo a mesma aritmética e as mesmas poses para todos os consumidores. |
| `site/index.html`, `site/hive.html` | Somente a navegação entre as três cenas. |
| `site/css/prompt.css` | Estilo da navegação discreta, sem alterar a barra existente. |
| `tests/pipeline.test.mjs` | Filas, distribuição, comandos, limites, retorno, conclusão e conservação de tarefas. |
| `tests/pipeline-layout.test.mjs` | Continuidade, altura útil, limites e envelopes de colisão dos rótulos. |
| `tests/pipeline-modelos.test.mjs` | Vinte robôs em instâncias, articulações, ocultação, capacidade e formato da plataforma. |
| `README.md` | Uso e controles da página. |
| `docs/adr/004-pipeline-em-times.md` | Decisão de arquitetura e alternativas rejeitadas. |
| `docs/pipeline.md` | Este registro de entrega e coordenadas. |

## Composição e coordenadas

A câmera aponta na direção `(1, 1, 1)`, com projeção ortográfica. As coordenadas de
composição são `u`, direita na tela, e `d`, profundidade que desce na tela:
`x = (u + d) / √2`, `z = (d - u) / √2`. No piso, a altura projetada é `−d / √3`.
As ilhas têm rotação de 45° em y para alinhar sua largura com a tela.

| Time | d | u da ilha em 800×800 | u da ilha em 390×780 |
| --- | ---: | ---: | ---: |
| PLANEJAMENTO | −15 | 10,5 | 3,8 |
| PESQUISA | −7,5 | −10,5 | −3,8 |
| CÓDIGO | 0 | 10,5 | 3,8 |
| REVISÃO | 7,5 | −10,5 | −3,8 |
| ENTREGA | 15 | 10,5 | 3,8 |

A fita vai de `d = −19` até `19`, com largura **2,3**, em `y = 0,08`.
Seu centro é `u = −amplitude × cos((d + 15) × π / 7,5)`; a amplitude vale 3,57
em 800×800 e 1,05 no celular. Os trechos mudam de cor nas âncoras de cada time,
e o primeiro trecho inclui a entrada. As conexões finas vão da âncora à ilha.
O retorno REVISÃO → CÓDIGO passa pelo lado externo esquerdo e tem setas próprias.

As plataformas medem **6,4 × 4,8**, têm espessura **0,38**, raio de canto **0,65**,
topo em `y = 0,22` e um tom claro da cor do time. Os quatro postos possíveis estão
em `x = ±1,48`, `z = ±1,15` locais, com escala **1,05**. Postos inativos ficam ocultos.
Inicialmente há 2, 1, 3, 2 e 1 agentes, respectivamente.

Os rótulos ficam do lado oposto da ilha, em `u = −lado × (amplitude + 1,15 + 0,65)`,
`y = 0,85`, alinhados para fora da fita e centralizados verticalmente. Em 800×800,
o módulo desse u vale 5,37; no celular, 2,85. A descrição some até 640 px. Os rótulos
diminuem proporcionalmente ao afastar a câmera para conservar a separação. O
prompt tem espaço reservado pelo tamanho real do formulário; o enquadramento
busca ocupar 80% da altura útil, respeitando também limites horizontais.

## Desempenho e segurança

Uma luz direcional com mapa de 2048 e uma luz hemisférica, sem PointLight e sem
pós-processamento. O modo padrão usa pixel ratio 1 e limitador de 30 quadros/s;
`?q=alta` usa pixel ratio nativo, antialias e PCF suave. Móveis, partes rígidas dos
robôs, plataformas, pacotes e setas usam instâncias; a decoração rígida é fundida
antes de ser instanciada. Materiais animados individuais dos robôs continuam próprios.

Vetores, matrizes e buffers de animação são reutilizados. O estado só é copiado em
eventos; etiquetas usam objetos CSS Typed OM reutilizados quando disponíveis,
com alternativa textual limitada a 10 Hz. As sombras só são invalidadas em mudanças
e movimento; no padrão são atualizadas em quadros alternados. `vel = 0` conserva o
mapa depois de estabilizar as mudanças pendentes. A aba oculta interrompe o RAF;
três quadros consecutivos acima de um segundo param a cena. O limite é de 48 tarefas
ativas e 20 agentes. Tarefas entregues saem da lista, sem histórico crescente.

Não houve execução de navegador nesta implementação. Nenhum asset foi gerado ou
baixado, nenhuma dependência foi instalada e não foi usado nenhum script de captura.

## Verificação

- `node --test tests/*.test.mjs`: **25 testes passaram**, incluindo os 11 anteriores.
- `node --check`: **24 módulos** da aplicação e dos testes, incluindo todos os novos e `robo.js`.
- Comparação numérica temporária de `Robo.update` antes/depois: 480 passos, cobrindo
  oito estados, produziram o mesmo arquivo JSON de 145.125 bytes. Não é uma comparação visual.
- Enquadramento e envelopes dos rótulos exercitados em 800×800, 390×780, 390×600 e
  1440×900. Os testes usam tamanhos conservadores de texto e não medem o DOM renderizado.

O responsável pela delegação informou que a versão intermediária carregou por
software em 800×800 e 390×780, sem erro ou scroll horizontal, com tarefas andando,
`/time código +` funcionando e 98 draw calls. Esse número **não mede a versão final**.
A composição foi ampliada depois desse retorno: fita mais larga, plataformas maiores
com cor e cantos em planta, postos maiores e separados, rótulos dos times no lado
oposto e agentes livres sem etiqueta.

Pendente com o responsável: inspeção visual final, ausência de colisão com fontes
reais, comandos e câmera no navegador, pausa/retomada real da aba, `?q=alta`, trava
de quadros lentos e medição final de chamadas e tempo de quadro. A suíte verde não
confirma aparência, 30 fps efetivos ou ausência de regressão visual no hive.

## Git

A leitura do Git funcionou, mas o primeiro `git add` foi bloqueado pelo sandbox
com `Unable to create .git/index.lock: Operation not permitted`. Não houve nova
tentativa, commit ou push. Os arquivos e o ADR permanecem no workspace. Os commits
previstos eram “Cria pipeline de agentes com filas e ilhas instanciadas” e
“Documenta pipeline e conecta as três cenas”. `git diff --check` passou para
as alterações rastreadas; os arquivos novos também foram conferidos quanto
a espaços finais e quebra de linha no fim do arquivo.
