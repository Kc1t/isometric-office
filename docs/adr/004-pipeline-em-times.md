# 004 — Pipeline independente, eventos e ilhas instanciadas

Data: 2026-11-14. Estado: aceita; inspeção visual da composição final pendente.

Contexto: a nova página precisa de filas e transferência de tarefas entre cinco
times, preservando o funcionamento da colmeia e o site estático sem build.
A cena também precisa de limites de trabalho e de memória e de verificação sem GPU.

Decisão: manter a simulação em `Pipeline`
([site/js/pipeline-logica.js:59](../../site/js/pipeline-logica.js#L59)), independente
de Three e DOM. O relógio só substitui o estado em eventos; as transições trabalham
sobre cópias. Limitar tarefas ativas e postos por time e retirar tarefas entregues.
Separar coordenadas e enquadramento em `criaLayout` e `enquadra`
([site/js/pipeline-layout.js:6](../../site/js/pipeline-layout.js#L6),
[site/js/pipeline-layout.js:23](../../site/js/pipeline-layout.js#L23)).

Na cena, usar os móveis existentes e o `Robo`, com `Lotes` para instâncias rígidas
e proxies para as articulações. `instanciaRobo`
([site/js/pipeline-modelos.js:5](../../site/js/pipeline-modelos.js#L5)) remapeia as
referências das articulações, conservando os métodos de animação existentes.
`geometriaIlha` ([site/js/pipeline-modelos.js:19](../../site/js/pipeline-modelos.js#L19))
extruda um piso com cantos arredondados em planta, sem paredes. Os rótulos são HTML;
no celular mostram somente nome e contagem. O enquadramento reserva as áreas do
título e do prompt e procura usar 80% da altura útil. A fita troca de cor nas
âncoras dos times. Sombras são invalidadas por movimento ou alterações da cena.

Alternativas rejeitadas: adaptar as salas fechadas do hive misturaria dois modelos
de organização; simular filas dentro do renderer impediria os testes puros; copiar
malhas por posto aumentaria submissões; recalcular geometrias a cada quadro teria
custo desnecessário; um RoundedBox fino limitaria o raio dos cantos pela espessura.
Não foram adicionados assets, dependências, pós-processamento ou build.

Consequências: a página tem seu controlador de comandos, pois os botões gerenciam
tarefas e não agentes individuais. Os lotes reservam capacidade para vinte robôs
e suas peças espelhadas. A simulação não mantém histórico ilimitado. Posições,
cores e limites ficam em constantes. No caminho de animação, vetores, matrizes,
buffers e transformações CSS Typed OM são reutilizados; navegadores sem Typed OM
recebem transformações textuais com atualização limitada a 10 Hz. Os testes de
colisão usam envelopes geométricos e tamanhos conservadores de texto, sem medir a
fonte efetivamente desenhada. A composição final, a interação e o desempenho ainda
precisam da inspeção por software feita pelo responsável pela delegação.
