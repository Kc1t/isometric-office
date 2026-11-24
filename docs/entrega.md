# Entrega de 13/11/2026

As três mudanças foram implementadas no workspace. A verificação em navegador,
as capturas, a comparação de desempenho e os commits estão pendentes por restrições
do sandbox desta sessão.

## Arquivos

| Arquivo | Mudança |
| --- | --- |
| `site/index.html` | Formulário sobre o canvas, envio, controles compactos, contador acessível, aviso de status e limite para etiquetas longas. |
| `site/hive.html` | Mesmo formulário e componentes, com tema escuro. |
| `site/css/prompt.css` | Barra centralizada, temas quente e roxo, foco visível, regras para 390 px e safe-area, sem filtros. Selo no canto superior. |
| `site/js/prompt.js` | Controlador comum: envio, `/sub`, `/sair`, `/limpar`, validação de comandos, foco por `/`, saída por Esc e bloqueio de atalhos em campos editáveis e durante composição. |
| `site/js/dados.js` | `Demo.mais(estado, tarefa)` recebe texto opcional, valida antes de criar e conserva tarefas padrão para os consumidores anteriores. |
| `site/js/hive.js` | Usa a barra e os lotes, aplica sete composições, atualiza matrizes antes das etiquetas, evita escritas repetidas no DOM e alocação do alvo da câmera, conta agentes sem criar uma lista por quadro, reutiliza sombras imóveis e pausa quando a aba fica oculta. Libera geometrias fundidas ao sumirem. |
| `site/js/malhas.js` | Fusão de decoração rígida por material e propriedades; instâncias de GLBs repetidos com proxies para manter animações e acompanhar ocultação e remoção. Mantém materiais e texturas compartilhados. |
| `site/js/decoracao.js` | Sete composições determinísticas, prateleiras nas duas paredes, quadros variados, tapetes, plantas, luminárias e dois pisos foscos sem tapete. Dimensões do letreiro em constantes. |
| `site/js/main.js` | Usa o controlador comum e pausa a renderização com a aba oculta. |
| `site/js/util.js` | `passoAnims` informa quando houve movimento, inclusive no último quadro da animação. |
| `tests/dados.test.mjs` | Tarefa explícita, estado, tarefa inválida e limite de agentes. |
| `tests/malhas.test.mjs` | Geometria e transformações preservadas, compartilhamento, instâncias animadas, ocultação, remoção e erros de capacidade e articulação. |
| `tests/decoracao.test.mjs` | Variedade das sete composições e faixa do letreiro livre de quadros e prateleiras. |
| `tests/anims.test.mjs` | Sinalização de movimento e término das animações. |
| `tests/three-local.mjs` | Resolve o próprio Three r170 vendorizado nos testes de Node. |
| `tools/software.mjs` | Playwright exclusivamente por software, viewport de até 800×800, limite de 55 s, fechamento e `pkill` no encerramento. |
| `tools/medir-software.mjs` | Mede 30 quadros animados e 30 imóveis, com contagem que inclui sombras e sincronização `gl.finish()`. Salva JSON e PNG em `shots/`. |
| `tools/verificar-software.mjs` | Cenários de interface nas duas páginas e qualidades, largura de 390 px, visibilidade simulada e três modos de captura. Um cenário por execução. |
| `docs/adr/001-barra-compartilhada.md` | Decisão sobre o controlador e os estilos comuns. |
| `docs/adr/002-malhas-e-atualizacoes.md` | Decisão sobre instâncias, fusão, matrizes e sombras. |
| `docs/adr/003-composicoes-dos-quartos.md` | Decisão sobre composições determinísticas com o acervo existente. |
| `README.md` | Uso da barra e instruções para verificação e capturas por software. |

Nenhum asset foi gerado ou baixado. Não há novas dependências ou build.

## Verificação executada

`node --test tests/*.test.mjs`: **11 testes passaram**. Os testes de tarefa,
fusão/instâncias e decoração foram executados antes da implementação e falharam
pelos critérios esperados. Usam o Three real do repositório, sem mock de renderer.
Também foram conferidas a sintaxe dos módulos alterados e as diferenças com
`git diff --check`.
Os dois formulários também foram lidos com o parser HTML de Python: IDs únicos,
elementos necessários presentes e tipos de botão corretos. A tentativa de acessar
os arquivos pelo servidor em `127.0.0.1:4421` via curl falhou com código 7, apesar
de `tools/servir.sh` informar que a porta já estava ocupada; não foi possível
confirmar a entrega HTTP dos arquivos nesta sessão.

O teste de geometria observou um vasinho passar de **10 para 2 malhas**, conservando
triângulos, limites e materiais. Isso comprova agrupamento local, não uma medição
de chamadas ou tempo de renderização da cena completa.

## Desempenho antes e depois

| Métrica, colmeia com 7 agentes | Referência anterior fornecida no pedido | Medido nesta sessão antes | Medido depois |
| --- | ---: | --- | --- |
| Draw calls, incluindo sombra | aproximadamente 475 | Indisponível | Indisponível |
| Triângulos, incluindo sombra | aproximadamente 391.000 | Indisponível | Indisponível |
| Tempo de quadro por software | Não informado | Indisponível | Indisponível |

O Chromium headless foi iniciado apenas com `--disable-gpu --use-gl=swiftshader
--enable-unsafe-swiftshader`, em 800×800. Ele encerrou antes de abrir a página com
`MachPortRendezvousServer: Permission denied (1100)`. A tentativa inicial de medição
e a tentativa final de verificar a interface tiveram o mesmo impedimento.
O registro final está em `shots/verificacao-software.log`, ignorado pelo Git.
O fechamento e `pkill` foram tentados; na primeira tentativa o sandbox também
negou a listagem de processos do `pkill`. O próprio Chromium informou término por
SIGTRAP. Não foi usado navegador com GPU real nem o Chrome do usuário.

O script de medição distingue média e mínimo/máximo de chamadas porque o modo leve
alterna as passadas de sombra. Comparar a média com o pico de 475 seria incorreto.
O agrupamento mantém a geometria original: não promete reduzir triângulos por
passada. Sombras economizam trabalho apenas em cenas imóveis; robôs ativos
continuam com sombras alternadas no modo leve e a cada quadro em alta.

## Capturas e testes pendentes

As capturas solicitadas **não foram geradas**. Os comandos abaixo estão prontos,
devem ser executados separadamente e salvam imagens 800×800 com a barra visível:

```sh
node tools/verificar-software.mjs captura-hive-1
node tools/verificar-software.mjs captura-hive-7
node tools/verificar-software.mjs captura-index-3
```

Não foram exercitados em navegador os comandos, foco, envio por Enter/botão,
animações e etiquetas, layout de 390 px, safe-area em dispositivo, modo real,
roteiro automático, retomada após troca de aba ou `?q=alta`. Os cenários preparados
cobrem parte disso, incluindo um teste sintético do evento de visibilidade; não
substituem uma troca de aba real nem um dispositivo móvel. Não há confirmação
visual de ausência de regressões nas duas páginas.

## Custos e possíveis pioras

Não é possível afirmar que o tempo de quadro melhorou ou que o visual permaneceu
equivalente sem a medição e as capturas. Os lotes passam a usar limites de culling
que abrangem várias instâncias: com zoom sobre poucos quartos, podem submeter
geometria de quartos fora da tela. As geometrias efetivamente fundidas passam a
usar vértices sem índices, aumentando o armazenamento desses objetos; geometrias
isoladas e GLBs continuam compartilhados e geometrias fundidas são liberadas na
remoção. Ambos os custos precisam ser comparados ao ganho de submissões. Os dois
pisos chamados de carpete usam acabamento mais fosco e cor existente, sem textura
nova de fibras.

## Git

Foram tentados os três commits locais em português, mas cada `git add` foi negado
com `Unable to create .git/index.lock: Operation not permitted`. Nenhum commit foi
criado e não houve push. Os ADRs estão no workspace, ainda sem versionamento.
Os títulos previstos são:

1. Adiciona barra de tarefas compartilhada nas duas cenas.
2. Agrupa móveis e reduz atualizações da colmeia.
3. Varia a decoração dos sete quartos da colmeia.
