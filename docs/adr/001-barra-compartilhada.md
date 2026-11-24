# 001 — Barra de prompt nas duas cenas

Data: 2026-11-13. Estado: aceita.

Contexto: as duas páginas repetiam botões e atalhos. A tarefa exige o mesmo
comportamento de comandos, foco e envio, preservando temas diferentes e o modo real.

Decisão: compartilhar o controlador em `site/js/prompt.js` e os estilos em
`site/css/prompt.css`. Receber um getter da demo para acompanhar a queda do modo real
para demo. Preservar o primeiro argumento de `Demo.mais(estado, tarefa)` para não
alterar o roteiro existente. Tarefas explícitas são validadas antes da criação.

Alternativas rejeitadas: duplicar controles manteria duas versões dos atalhos;
introduzir um framework ou build seria desnecessário para duas páginas estáticas.

Consequências: as páginas mantêm o HTML acessível do formulário e apenas definem
o tema. Atalhos respeitam campos editáveis e composição de texto. Comandos inválidos
e limite de agentes mantêm o texto para correção.

Código conferido: `ligaPrompt` ([site/js/prompt.js:9](../../site/js/prompt.js#L9)) e
`Demo.mais` ([site/js/dados.js:13](../../site/js/dados.js#L13)).
