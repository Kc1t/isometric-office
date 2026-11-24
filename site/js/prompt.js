// Controles compartilhados pelas duas cenas; o modo real pode cair para demo depois da montagem.
const COMANDOS = {
  '/sub': (demo) => demo.sub() || 'Adicione um agente com espaço para um subagente.',
  '/sair': (demo) => { demo.menos(); },
  '/limpar': (demo) => { demo.define(0); },
};
const editando = (alvo) => alvo instanceof Element && !!alvo.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');

export function ligaPrompt(pegaDemo, aviso) {
  const $ = (id) => document.getElementById(id), painel = $('painel'), campo = $('prompt');
  $('mais').onclick = () => { const demo = pegaDemo(); if (demo && !demo.mais()) aviso('Limite de agentes atingido. Remova um agente para continuar.'); };
  $('menos').onclick = () => { const demo = pegaDemo(); if (demo) demo.menos(); };
  painel.addEventListener('submit', (e) => {
    e.preventDefault();
    const demo = pegaDemo(), texto = campo.value.trim();
    if (!demo) return;
    if (!texto) { aviso('Digite uma tarefa para criar um agente.'); campo.focus(); return; }
    if (texto.startsWith('/') && !Object.hasOwn(COMANDOS, texto)) { aviso('Comando desconhecido. Use ' + Object.keys(COMANDOS).join(', ') + '.'); return; }
    const resultado = texto.startsWith('/') ? COMANDOS[texto](demo) : demo.mais('trabalhando', texto);
    if (typeof resultado === 'string') { aviso(resultado); return; }
    if (resultado === null) { aviso('Limite de agentes atingido. Remova um agente para continuar.'); return; }
    campo.value = ''; campo.focus();
  });
  campo.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); campo.blur(); }
    if (e.isComposing && e.key === 'Enter') e.preventDefault();
  });
  addEventListener('keydown', (e) => {
    const demo = pegaDemo();
    if (!demo || e.metaKey || e.ctrlKey || e.altKey || e.isComposing || editando(e.target) || editando(document.activeElement)) return;
    if (e.key === '/') { e.preventDefault(); painel.classList.remove('gravando'); $('modo').classList.remove('gravando'); campo.focus(); return; }
    if (e.key === '+' || e.key === '=') demo.mais();
    else if (e.key === '-' || e.key === '_') demo.menos();
    else if (/^[0-9]$/.test(e.key)) demo.define(+e.key);
    else if (e.key === 's') demo.sub();
    else if (e.key === 'h') { painel.classList.toggle('gravando'); $('modo').classList.toggle('gravando'); }
  });
}
