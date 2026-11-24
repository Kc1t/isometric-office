# 002 — Instanciar GLBs e fundir decoração estática na colmeia

Data: 2026-11-13. Estado: aceita, com verificação visual e de desempenho pendente.

Contexto: os GLBs existentes têm uma malha e um material opaco cada, mas se repetem
entre quartos. Vasos e prateleiras procedurais têm várias malhas rígidas. O modo
leve já alternava as passadas de sombra; os robôs se movem continuamente.

Decisão: instanciar GLBs repetidos com proxies que preservam a hierarquia animada;
fundir apenas objetos rígidos por material, atributos e propriedades de sombra.
Manter triângulos, materiais, texturas e articulações. Calcular matrizes antes dos
lotes e etiquetas, atualizar buffers e DOM só quando mudam e suspender ambos os
laços quando a aba fica oculta. Conservar sombras alternadas enquanto há movimento,
invalidando o mapa em mudanças; reutilizá-lo em uma cena imóvel.

Alternativas rejeitadas: fundir os GLBs internamente não economizaria chamadas;
fundir o quarto inteiro perderia as quedas individuais e as cadeiras articuladas;
reduzir a geometria ou a resolução de sombra arriscaria mudar o visual;
congelar sombras de robôs ativos deixaria movimentos sem sombra correspondente.

Consequências: os lotes guardam geometria compartilhada e recalculam seus limites
somente quando mudam. Proxies removidos saem do lote. O limite de instâncias deriva
da quantidade máxima de salas e subagentes. Os módulos novos não mudam os móveis
do escritório. O tempo de rasterização e a equivalência visual não foram medidos:
o sandbox impede iniciar o navegador por software. Testes locais usam o Three r170
vendorizado, sem substituir a inspeção visual ainda necessária.

Código conferido: `fundeEstatico` ([site/js/malhas.js:5](../../site/js/malhas.js#L5)),
`Lotes` ([site/js/malhas.js:44](../../site/js/malhas.js#L44)) e `quadro`
([site/js/hive.js:364](../../site/js/hive.js#L364)).
