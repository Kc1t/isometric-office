// Fontes de dados: demo (botões, teclas e roteiro automático) e real (servidor local que lê ~/.claude/projects).
const NOMES = ['Íris', 'Otto', 'Luma', 'Tito', 'Nina', 'Zeca', 'Bento', 'Maia', 'Caio', 'Lia', 'Rui', 'Duda'];
const TAREFAS = ['revisando PR', 'escrevendo testes', 'refatorando API', 'lendo logs', 'migrando banco', 'documentando', 'corrigindo bug', 'criando componente', 'rodando build', 'analisando dados', 'ajustando CSS', 'planejando rota'];
const SUBS = ['busca no código', 'roda os testes', 'lê a documentação', 'confere tipos', 'procura bug'];
const rnd = (a, b) => a + Math.random() * (b - a);

export class Demo {
  constructor(esc, auto) {
    this.esc = esc; this.auto = auto; this.lista = []; this.seq = 0; this.t = 0; this.livre = !auto;
    if (auto) this.roteiro = this.fazRoteiro();
  }
  principais() { return this.lista.filter((a) => !a.pai); }
  mais(estado = 'trabalhando', tarefa) {
    if (tarefa !== undefined && (typeof tarefa !== 'string' || !tarefa.trim())) throw new TypeError('A tarefa deve ser um texto não vazio.');
    const n = this.principais().length; if (n >= 12) return null;
    const usados = new Set(this.principais().map((a) => a.nome)), nome = NOMES.find((x) => !usados.has(x));
    const a = { id: 'a' + (++this.seq), nome, tarefa: tarefa === undefined ? TAREFAS[this.seq % TAREFAS.length] : tarefa.trim(), estado, desde: Date.now(), prox: rnd(9, 15) };
    this.lista.push(a); this.envia(); return a;
  }
  menos() {
    const p = this.principais(); if (!p.length) return; const a = p[p.length - 1];
    this.lista = this.lista.filter((x) => x !== a && x.pai !== a.id); this.envia();
  }
  define(n) { n = Math.max(0, Math.min(12, n)); while (this.principais().length < n) this.mais(); while (this.principais().length > n) this.menos(); }
  sub(pai) {
    pai = pai || this.principais().filter((p) => this.lista.filter((x) => x.pai === p.id).length < 2).sort(() => Math.random() - .5)[0]; if (!pai) return null;
    const s = { id: 's' + (++this.seq), nome: 'sub', tarefa: SUBS[this.seq % SUBS.length], estado: 'trabalhando', desde: Date.now(), pai: pai.id, vida: rnd(13, 20) };
    this.lista.push(s); this.envia(); return s;
  }
  estado(a, e) { if (!a) return; a.estado = e; if (e === 'trabalhando' && a._fim) { a.tarefa = TAREFAS[Math.floor(rnd(0, TAREFAS.length))]; a.desde = Date.now(); a._fim = false; } if (e === 'terminou') a._fim = true; this.envia(); }
  envia() { this.esc.sync(this.lista.map((a) => ({ id: a.id, nome: a.nome, tarefa: a.tarefa, estado: a.estado, desde: a.desde, pai: a.pai }))); }

  fazRoteiro() {
    const P = () => this.principais(), R = [], em = (t, f) => R.push([t, f]);
    em(1.6, () => this.mais());
    em(8, () => this.estado(P()[0], 'pensando')); em(12, () => this.estado(P()[0], 'trabalhando'));
    em(15, () => this.mais()); em(19.5, () => this.mais());
    em(21, () => this.estado(P()[0], 'esperando')); em(24, () => this.sub(P()[1]));
    em(26, () => this.estado(P()[0], 'trabalhando')); em(27, () => this.estado(P()[2], 'pensando'));
    em(30, () => this.mais()); em(34, () => this.mais()); em(37, () => this.mais());
    em(38, () => this.estado(P()[1], 'ocioso')); em(40, () => this.estado(P()[2], 'trabalhando')); em(41, () => this.sub(P()[3]));
    em(43, () => this.estado(P()[4], 'esperando')); em(45, () => this.estado(P()[0], 'terminou'));
    em(48, () => this.mais());
    for (let i = 0; i < 5; i++) em(52 + i * 2.6, () => this.mais());
    em(53, () => this.estado(P()[4], 'trabalhando')); em(55, () => this.estado(P()[1], 'trabalhando')); em(57, () => this.estado(P()[5], 'pensando'));
    em(60, () => this.estado(P()[0], 'trabalhando')); em(62, () => this.sub(P()[7])); em(64, () => this.estado(P()[8], 'esperando')); em(66, () => this.estado(P()[5], 'trabalhando'));
    em(68, () => this.estado(P()[10], 'ocioso')); em(70, () => this.estado(P()[3], 'terminou')); em(72, () => this.estado(P()[8], 'trabalhando'));
    em(76, () => this.estado(P()[6], 'terminou')); em(78, () => this.estado(P()[10], 'trabalhando'));
    // final: todo mundo termina, em onda
    for (let i = 0; i < 12; i++) em(84 + i * .35, () => this.estado(P()[i], 'terminou'));
    return R.sort((a, b) => a[0] - b[0]);
  }

  update(dt) {
    this.t += dt;
    if (this.roteiro) { while (this.roteiro.length && this.roteiro[0][0] <= this.t) this.roteiro.shift()[1](); }
    let mudou = false;
    // subagentes têm vida curta: trabalham, terminam e saem
    for (const s of this.lista.filter((x) => x.pai)) {
      s.vida -= dt;
      if (s.vida < 3.5 && s.estado !== 'terminou') { s.estado = 'terminou'; mudou = true; }
      if (s.vida < 0) { this.lista = this.lista.filter((x) => x !== s); mudou = true; }
    }
    if (this.livre) for (const a of this.principais()) {
      a.prox -= dt; if (a.prox > 0) continue; mudou = true;
      if (a.estado === 'trabalhando') {
        const r = Math.random();
        if (r < .4) { a.estado = 'pensando'; a.prox = rnd(3.5, 6); } else if (r < .62) { a.estado = 'esperando'; a.prox = rnd(4.5, 8); }
        else if (r < .78) { a.estado = 'ocioso'; a.prox = rnd(7, 11); } else { a.estado = 'terminou'; a._fim = true; a.prox = rnd(5.5, 7.5); }
      } else {
        if (a._fim) { a.tarefa = TAREFAS[Math.floor(rnd(0, TAREFAS.length))]; a.desde = Date.now(); a._fim = false; }
        a.estado = 'trabalhando'; a.prox = rnd(8, 15);
        if (Math.random() < .22) this.sub(a);
      }
    }
    if (mudou) this.envia();
  }
}

// modo real: consulta o servidor local a cada 2 s
export class Real {
  constructor(esc, aviso, cai) { this.esc = esc; this.aviso = aviso; this.cai = cai; this.ok = false; this.falhas = 0; this.timer = null; }
  async comeca() {
    const ok = await this.busca();
    if (!ok) { this.aviso('Servidor local fora do ar (node server.mjs, porta 4422). Mostrando o modo demo.'); this.cai(); return false; }
    this.timer = setInterval(() => this.busca(), 2000); return true;
  }
  async busca() {
    try {
      const r = await fetch('http://127.0.0.1:4422/agents', { cache: 'no-store' }); if (!r.ok) throw new Error(r.status);
      const j = await r.json(), lista = [];
      const sess = j.agentes.slice().sort((a, b) => a.inicio - b.inicio).slice(0, 12);
      for (const s of sess) {
        lista.push({ id: s.id, nome: s.projeto, tarefa: s.id, estado: s.estado, desde: s.inicio, extra: s.mensagens + ' msgs' });
        for (const u of s.subagentes || []) lista.push({ id: s.id + '/' + u.id, nome: 'sub', tarefa: u.id, estado: u.estado, desde: u.inicio, pai: s.id });
      }
      this.esc.sync(lista); if (this.falhas > 2) this.aviso('Servidor local de volta.'); this.falhas = 0; return true;
    } catch (e) { this.falhas++; if (this.falhas === 3) this.aviso('Servidor local parou de responder. Mantendo o último estado.'); return false; }
  }
}
