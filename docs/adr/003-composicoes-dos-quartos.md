# 003 — Sete composições de decoração

Data: 2026-11-13. Estado: aceita, com inspeção visual pendente.

Contexto: quatro arranjos repetiam a mesma distribuição dos objetos. A colmeia
precisa de maior variedade usando o acervo existente e preservando o letreiro.

Decisão: descrever sete composições determinísticas em `site/js/decoracao.js`.
Alternar prateleiras entre paredes, dimensões e posições dos quadros, tapetes,
plantas e luminárias. Dois pisos têm acabamento fosco de carpete sem tapete.
Derivar a posição do letreiro de constantes e reservar a faixa acima da decoração.

Alternativas rejeitadas: novos assets violariam o escopo; aleatoriedade sem semente
dificultaria comparar capturas; mais objetos em todos os quartos aumentariam o
custo e a poluição visual.

Consequências: a distribuição se repete após sete quartos, enquanto as cores
continuam vindo da paleta existente. Os testes verificam variedade e limites da
faixa do nome; equivalência e composição visual exigem capturas ainda bloqueadas
pelo sandbox.

Código conferido: `DECORACOES` ([site/js/decoracao.js:6](../../site/js/decoracao.js#L6))
e `LETREIRO` ([site/js/decoracao.js:4](../../site/js/decoracao.js#L4)).
