// Simulação sem Three.js: cópias somente nos eventos, nunca no avanço vazio do relógio.
export const TIMES = [
  { nome: 'PLANEJAMENTO', descricao: 'Transformar a ideia em um plano.', cor: '#eab56f', agentes: 2 },
  { nome: 'PESQUISA', descricao: 'Encontrar contexto e evidências.', cor: '#72c8bc', agentes: 1 },
  { nome: 'CÓDIGO', descricao: 'Construir e testar a solução.', cor: '#8f9be7', agentes: 3 },
  { nome: 'REVISÃO', descricao: 'Conferir antes de seguir.', cor: '#dc93bb', agentes: 2 },
  { nome: 'ENTREGA', descricao: 'Finalizar e colocar no mundo.', cor: '#a2cb83', agentes: 1 },
];
export const LIMITES = { agentes: 4, tarefas: 48, texto: 180 };
export const TEMPOS = { entrada: 1.8, viagem: 2.8, saida: 1.8, auto: 6, trabalho: 2.8, pensando: 1.6, esperando: 1.4, terminou: 1.1 };
export const EXEMPLOS = ['Criar a página de boas-vindas', 'Revisar a autenticação', 'Documentar a API', 'Investigar a busca', 'Melhorar a navegação', 'Testar o novo cadastro'];
export const ETAPAS = { codigo: 2, revisao: 3 };
const FREQUENCIA_RETORNO = 4, FREQUENCIA_ESPERA = 3;
const normaliza = (nome) => nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const FASES = ['trabalhando', 'pensando', 'esperando', 'trabalhando', 'terminou'];
const DURACOES = [TEMPOS.trabalho, TEMPOS.pensando, TEMPOS.esperando, TEMPOS.trabalho, TEMPOS.terminou];
const agenteNovo = (posto) => ({ posto, estado: 'ocioso', tarefa: null, passo: 0, proximo: Infinity });
const copia = (estado) => ({ ...estado, tarefas: estado.tarefas.map((t) => ({ ...t })), times: estado.times.map((t) => ({ ...t, fila: [...t.fila], agentes: t.agentes.map((a) => ({ ...a })) })) });
function distribui(estado, agora) {
  for (const time of estado.times) for (const agente of time.agentes) {
    if (agente.tarefa !== null || !time.fila.length) continue;
    const id = time.fila.shift(), tarefa = estado.tarefas.find((t) => t.id === id);
    agente.tarefa = id; agente.estado = FASES[0]; agente.passo = 0; agente.proximo = agora + DURACOES[0];
    tarefa.fase = 'mesa'; tarefa.agente = agente.posto; tarefa.inicio = agora;
  }
}
function agenda(estado) {
  let proximo = Infinity;
  for (const tarefa of estado.tarefas) if (tarefa.fase === 'transito' || tarefa.fase === 'saida') proximo = Math.min(proximo, tarefa.chegaEm);
  for (const time of estado.times) for (const agente of time.agentes) proximo = Math.min(proximo, agente.proximo);
  return proximo;
}
function evento(anterior, agora) {
  const estado = copia(anterior);
  for (const tarefa of estado.tarefas) {
    if (tarefa.fase !== 'transito' || tarefa.chegaEm > agora) continue;
    tarefa.fase = 'fila'; estado.times[tarefa.time].fila.push(tarefa.id);
  }
  estado.entregues += estado.tarefas.filter((t) => t.fase === 'saida' && t.chegaEm <= agora).length;
  estado.tarefas = estado.tarefas.filter((t) => t.fase !== 'saida' || t.chegaEm > agora);
  for (let i = 0; i < estado.times.length; i++) for (const agente of estado.times[i].agentes) {
    if (agente.proximo > agora) continue;
    const tarefa = estado.tarefas.find((t) => t.id === agente.tarefa);
    if (agente.passo < FASES.length - 1) {
      agente.passo++;
      if (agente.passo === 2 && tarefa.id % FREQUENCIA_ESPERA !== 0) agente.passo++;
      agente.estado = FASES[agente.passo]; agente.proximo = agora + DURACOES[agente.passo]; continue;
    }
    const retorno = i === ETAPAS.revisao && tarefa.devolucoes === 0 && tarefa.id % FREQUENCIA_RETORNO === 0;
    tarefa.de = i; tarefa.deAgente = agente.posto; tarefa.time = retorno ? ETAPAS.codigo : Math.min(i + 1, TIMES.length - 1);
    tarefa.devolucoes += retorno ? 1 : 0; tarefa.inicio = agora; tarefa.agente = null;
    tarefa.fase = i === TIMES.length - 1 ? 'saida' : 'transito';
    tarefa.chegaEm = agora + (tarefa.fase === 'saida' ? TEMPOS.saida : TEMPOS.viagem);
    agente.tarefa = null; agente.estado = 'ocioso'; agente.proximo = Infinity;
  }
  distribui(estado, agora); return estado;
}

export class Pipeline {
  constructor() {
    this.estado = { times: TIMES.map((t) => ({ ...t, fila: [], agentes: Array.from({ length: t.agentes }, (_, i) => agenteNovo(i)) })), tarefas: [], entregues: 0 };
    this.tempo = 0; this.proximo = Infinity; this.sequencia = 0; this.revisao = 0; this.auto = false; this.proximaAuto = Infinity;
  }
  get times() { return this.estado.times; }
  get tarefas() { return this.estado.tarefas; }
  get entregues() { return this.estado.entregues; }
  aplica(estado) { this.estado = estado; this.proximo = agenda(estado); this.revisao++; }
  novaTarefa(texto) {
    if (typeof texto !== 'string' || !texto.trim() || texto.trim().length > LIMITES.texto) throw new TypeError('A tarefa precisa de texto com até ' + LIMITES.texto + ' caracteres.');
    if (this.tarefas.length >= LIMITES.tarefas) throw new RangeError('Limite de ' + LIMITES.tarefas + ' tarefas atingido.');
    const tarefa = { id: ++this.sequencia, texto: texto.trim(), time: 0, de: -1, agente: null, fase: 'transito', inicio: this.tempo, chegaEm: this.tempo + TEMPOS.entrada, devolucoes: 0 };
    this.aplica({ ...this.estado, tarefas: [...this.tarefas, tarefa] }); return tarefa;
  }
  exemplo() { return this.novaTarefa(EXEMPLOS[this.sequencia % EXEMPLOS.length]); }
  ajustaTime(nome, delta) {
    if (typeof nome !== 'string') throw new TypeError('Time inválido.');
    if (delta !== 1 && delta !== -1) throw new TypeError('O delta deve ser +1 ou -1.');
    const i = TIMES.findIndex((t) => normaliza(t.nome) === normaliza(nome.trim()));
    if (i < 0) throw new Error('Time desconhecido: ' + nome);
    const anterior = this.times[i];
    if (delta > 0 && anterior.agentes.length === LIMITES.agentes) throw new RangeError('Cada time tem no máximo ' + LIMITES.agentes + ' agentes.');
    if (delta < 0 && anterior.agentes.length === 1) return anterior.agentes.length;
    const estado = copia(this.estado), time = estado.times[i];
    if (delta > 0) {
      let posto = 0; while (time.agentes.some((a) => a.posto === posto)) posto++;
      time.agentes.push(agenteNovo(posto));
    } else {
      const livre = time.agentes.findLastIndex((a) => a.tarefa === null), indice = livre < 0 ? time.agentes.length - 1 : livre;
      const [agente] = time.agentes.splice(indice, 1);
      if (agente.tarefa !== null) {
        const tarefa = estado.tarefas.find((t) => t.id === agente.tarefa);
        tarefa.fase = 'fila'; tarefa.agente = null; time.fila.unshift(tarefa.id);
      }
    }
    distribui(estado, this.tempo); this.aplica(estado); return time.agentes.length;
  }
  menos() {
    const ultima = this.tarefas.findLast((t) => t.fase === 'fila' || (t.fase === 'transito' && t.de === -1));
    if (!ultima) return null;
    const estado = copia(this.estado); estado.tarefas = estado.tarefas.filter((t) => t.id !== ultima.id);
    for (const time of estado.times) time.fila = time.fila.filter((id) => id !== ultima.id);
    this.aplica(estado); return ultima;
  }
  limpar() {
    const estado = copia(this.estado);
    estado.tarefas = estado.tarefas.filter((t) => t.fase !== 'fila' && !(t.fase === 'transito' && t.de === -1));
    for (const time of estado.times) time.fila = [];
    this.aplica(estado);
  }
  comando(texto) {
    if (typeof texto !== 'string') throw new TypeError('Comando inválido.');
    const valor = texto.trim();
    if (valor === '/limpar') { this.limpar(); return 'Filas esvaziadas. Tarefas em andamento continuam.'; }
    if (valor === '/auto') {
      this.auto = !this.auto; this.proximaAuto = this.auto ? this.tempo + TEMPOS.auto : Infinity; this.revisao++;
      return this.auto ? 'Chegada automática ligada.' : 'Chegada automática desligada.';
    }
    const time = /^\/time\s+(.+?)\s+([+-])$/i.exec(valor);
    if (time) { const n = this.ajustaTime(time[1], time[2] === '+' ? 1 : -1); return n + ' agente(s) no time.'; }
    if (valor.startsWith('/')) throw new Error('Comando desconhecido. Use /time código +, /time código -, /limpar ou /auto.');
    return this.novaTarefa(valor);
  }
  update(dt) {
    if (!Number.isFinite(dt) || dt < 0) throw new TypeError('O tempo precisa ser finito e positivo.');
    const fim = this.tempo + dt;
    while (Math.min(this.proximo, this.proximaAuto) <= fim) {
      this.tempo = Math.min(this.proximo, this.proximaAuto);
      if (this.proximo <= this.tempo) this.aplica(evento(this.estado, this.tempo));
      if (this.proximaAuto <= this.tempo) {
        if (this.tarefas.length < LIMITES.tarefas) this.exemplo();
        this.proximaAuto = this.tempo + TEMPOS.auto;
      }
    }
    this.tempo = fim;
  }
}
