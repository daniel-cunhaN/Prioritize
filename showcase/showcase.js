/**
 * showcase.js — Motor Reativo do Showcase UI/UX "Prioritize"
 *
 * Sincroniza em tempo real as visualizações Desktop Web e iOS Mobile,
 * gerenciando métricas semanais, Matriz de Eisenhower, Bottom Sheet de criação
 * rápida, Checklist focado e Registro de Atividades com bolhas na linha do tempo.
 */

/* Definição dos quadrantes da Matriz de Prioridade de Eisenhower */
const QUADRANTES_EISENHOWER = {
  Q1: { codigo: 'Q1', nome: 'Fazer Agora', subtitulo: 'Urgente · Importante', destaque: true },
  Q2: { codigo: 'Q2', nome: 'Agendar', subtitulo: 'Planejado · Estratégico', destaque: false },
  Q3: { codigo: 'Q3', nome: 'Delegar', subtitulo: 'Urgente · Operacional', destaque: false },
  Q4: { codigo: 'Q4', nome: 'Pós-foco', subtitulo: 'Baixo Atrito · Revisão', destaque: false },
};

/* Séries de dados para o gráfico de linha de conclusão semanal e mensal */
const SERIES_GRAFICO = {
  '7D': [
    { rotulo: 'Seg', concluidas: 9, planejadas: 10 },
    { rotulo: 'Ter', concluidas: 12, planejadas: 13 },
    { rotulo: 'Qua', concluidas: 11, planejadas: 12 },
    { rotulo: 'Qui', concluidas: 15, planejadas: 16 },
    { rotulo: 'Sex', concluidas: 14, planejadas: 15 },
    { rotulo: 'Sáb', concluidas: 8, planejadas: 9 },
    { rotulo: 'Dom', concluidas: 10, planejadas: 11 },
  ],
  '30D': [
    { rotulo: 'Sem 1', concluidas: 44, planejadas: 52 },
    { rotulo: 'Sem 2', concluidas: 51, planejadas: 56 },
    { rotulo: 'Sem 3', concluidas: 58, planejadas: 62 },
    { rotulo: 'Sem 4', concluidas: 64, planejadas: 68 },
  ],
};

/* Estado centralizado da aplicação para manter Desktop e iOS sincronizados */
const estadoApp = {
  modoExibicaoEstudio: 'completo', // 'completo' | 'lado-a-lado' | 'quatro-telas'
  abaDesktopAtiva: 'dashboard',    // 'dashboard' | 'checklist' | 'atividades'
  abaIosAtiva: 'dashboard',        // 'dashboard' | 'criar' | 'checklist' | 'atividades'
  bottomSheetAberto: false,
  periodoGrafico: '7D',
  indicePontoSelecionado: 3,       // Quinta-feira selecionada inicialmente
  filtroChecklist: 'todas',        // 'todas' | 'pendentes' | 'concluidas'
  novaTarefaPrioridade: 'Q1',
  novaTarefaDuracao: '30m',

  /* Lista inicial de tarefas distribuídas na Matriz de Eisenhower */
  tarefas: [
    {
      id: 't-1',
      titulo: 'Finalizar tokens monocromáticos do Design System',
      quadrante: 'Q1',
      duracao: '45m',
      concluida: false,
      categoria: 'UI/UX Core',
    },
    {
      id: 't-2',
      titulo: 'Validar contraste WCAG AAA nos componentes iOS',
      quadrante: 'Q1',
      duracao: '30m',
      concluida: true,
      categoria: 'Acessibilidade',
    },
    {
      id: 't-3',
      titulo: 'Prototipar micro-interação da barra pílula flutuante',
      quadrante: 'Q1',
      duracao: '1h',
      concluida: false,
      categoria: 'Motion',
    },
    {
      id: 't-4',
      titulo: 'Mapear arquitetura responsiva Desktop + Mobile',
      quadrante: 'Q2',
      duracao: '1h',
      concluida: true,
      categoria: 'Arquitetura',
    },
    {
      id: 't-5',
      titulo: 'Estruturar sprint de testes de usabilidade',
      quadrante: 'Q2',
      duracao: '45m',
      concluida: false,
      categoria: 'Pesquisa',
    },
    {
      id: 't-6',
      titulo: 'Exportar assets vetoriais em resolução 8K',
      quadrante: 'Q3',
      duracao: '20m',
      concluida: true,
      categoria: 'Entrega',
    },
    {
      id: 't-7',
      titulo: 'Sincronizar notas da reunião com equipe de produto',
      quadrante: 'Q3',
      duracao: '15m',
      concluida: false,
      categoria: 'Operações',
    },
    {
      id: 't-8',
      titulo: 'Arquivar rascunhos antigos da biblioteca Figma',
      quadrante: 'Q4',
      duracao: '15m',
      concluida: true,
      categoria: 'Organização',
    },
  ],

  /* Histórico inicial do Registro de Atividades (Activity Log) */
  atividades: [
    {
      id: 'a-1',
      simbolo: '✓',
      escura: true,
      texto: 'Concluiu "Validar contraste WCAG AAA nos componentes iOS"',
      detalhe: 'Matriz Q1 · Fazer Agora',
      horario: 'Agora',
    },
    {
      id: 'a-2',
      simbolo: '+',
      escura: false,
      texto: 'Adicionou "Prototipar micro-interação da barra pílula"',
      detalhe: 'Criada via Quick Sheet · 1h',
      horario: '14 min',
    },
    {
      id: 'a-3',
      simbolo: '⇄',
      escura: false,
      texto: 'Moveu "Finalizar tokens monocromáticos" para Q1',
      detalhe: 'Reclassificação de prioridade',
      horario: '42 min',
    },
    {
      id: 'a-4',
      simbolo: '✓',
      escura: true,
      texto: 'Concluiu "Mapear arquitetura responsiva Desktop + Mobile"',
      detalhe: 'Matriz Q2 · Agendar',
      horario: '1h 15m',
    },
    {
      id: 'a-5',
      simbolo: '●',
      escura: false,
      texto: 'Meta diária de foco profundo atingida (5h 20m)',
      detalhe: 'Sequência ativa de 12 dias',
      horario: 'Ontem',
    },
  ],
};

/**
 * Escapa caracteres especiais HTML para evitar injeção ao renderizar textos do usuário.
 */
function escaparHtml(texto) {
  const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(texto).replace(/[&<>"']/g, (caractere) => mapa[caractere]);
}

/**
 * Calcula indicadores dinâmicos a partir do estado atual das tarefas.
 */
function calcularMetricas() {
  const total = estadoApp.tarefas.length;
  const concluidas = estadoApp.tarefas.filter((t) => t.concluida).length;
  const pendentesCriticas = estadoApp.tarefas.filter((t) => t.quadrante === 'Q1' && !t.concluida).length;
  const percentual = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  return {
    total,
    concluidas,
    pendentes: total - concluidas,
    pendentesCriticas,
    percentual,
  };
}

/**
 * Gera o ícone SVG de marcação limpa para os checkboxes minimalistas.
 */
function obterIconeCheck() {
  return `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <polyline points="3.2 8.5 6.6 11.8 12.8 4.5" stroke-linecap="round" stroke-linejoin="round"></polyline>
    </svg>
  `;
}

/**
 * Constrói uma curva suave (Catmull-Rom para Bezier cúbica) para o gráfico de linha em SVG.
 */
function gerarCaminhoCurvaSuave(pontos) {
  if (pontos.length === 0) return '';
  if (pontos.length === 1) return `M ${pontos[0].x} ${pontos[0].y}`;

  let caminho = `M ${pontos[0].x.toFixed(1)} ${pontos[0].y.toFixed(1)}`;
  for (let i = 0; i < pontos.length - 1; i++) {
    const p0 = pontos[i === 0 ? i : i - 1];
    const p1 = pontos[i];
    const p2 = pontos[i + 1];
    const p3 = pontos[i + 2 < pontos.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    caminho += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return caminho;
}

/**
 * Renderiza o gráfico SVG de conclusão semanal com suporte a seleção de pontos.
 */
function gerarGraficoSvg({ largura = 460, altura = 175, compacto = false } = {}) {
  const dados = SERIES_GRAFICO[estadoApp.periodoGrafico];
  const indiceAtivo = Math.min(estadoApp.indicePontoSelecionado, dados.length - 1);

  const padEsq = 24;
  const padDir = 18;
  const padTopo = 22;
  const padBase = 28;
  const larguraUtil = largura - padEsq - padDir;
  const alturaUtil = altura - padTopo - padBase;

  const maiorValor = Math.max(...dados.map((d) => d.planejadas), 10);

  /* Calcula coordenadas X e Y de cada ponto da série */
  const pontos = dados.map((item, idx) => {
    const x = padEsq + (idx / Math.max(dados.length - 1, 1)) * larguraUtil;
    const y = padTopo + alturaUtil - (item.concluidas / maiorValor) * alturaUtil;
    const yMeta = padTopo + alturaUtil - (item.planejadas / maiorValor) * alturaUtil;
    return { ...item, x, y, yMeta, idx };
  });

  const caminhoLinha = gerarCaminhoCurvaSuave(pontos);
  const caminhoMeta = gerarCaminhoCurvaSuave(pontos.map((p) => ({ x: p.x, y: p.yMeta })));
  const caminhoArea = `${caminhoLinha} L ${pontos[pontos.length - 1].x.toFixed(1)} ${(padTopo + alturaUtil).toFixed(1)} L ${pontos[0].x.toFixed(1)} ${(padTopo + alturaUtil).toFixed(1)} Z`;

  const idGradiente = compacto ? 'gradGraficoIos' : 'gradGraficoDesktop';
  const pontoFocado = pontos[indiceAtivo];

  /* Linhas horizontais de referência minimalistas */
  const linhasGrade = [0, 0.5, 1]
    .map((fator) => {
      const y = (padTopo + alturaUtil * fator).toFixed(1);
      return `<line x1="${padEsq}" y1="${y}" x2="${largura - padDir}" y2="${y}" stroke="#E4E4E7" stroke-dasharray="3 3" stroke-width="1" />`;
    })
    .join('');

  /* Pontos clicáveis sobre a curva */
  const circulosSvg = pontos
    .map((p) => {
      const selecionado = p.idx === indiceAtivo;
      return `
        <g data-acao="selecionar-ponto-grafico" data-indice="${p.idx}">
          ${selecionado ? `<line x1="${p.x.toFixed(1)}" y1="${padTopo}" x2="${p.x.toFixed(1)}" y2="${padTopo + alturaUtil}" stroke="#09090B" stroke-width="1" stroke-dasharray="2 2" opacity="0.35" />` : ''}
          <circle
            class="ponto-grafico"
            cx="${p.x.toFixed(1)}"
            cy="${p.y.toFixed(1)}"
            r="${selecionado ? '5.5' : '3.6'}"
            fill="${selecionado ? '#09090B' : '#FFFFFF'}"
            stroke="#09090B"
            stroke-width="2"
          />
          <text
            x="${p.x.toFixed(1)}"
            y="${altura - 6}"
            text-anchor="middle"
            font-size="10"
            font-weight="${selecionado ? '700' : '500'}"
            fill="${selecionado ? '#09090B' : '#8E8E93'}"
          >${p.rotulo}</text>
        </g>
      `;
    })
    .join('');

  return `
    <div class="container-grafico-svg">
      <svg viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Gráfico de linha de conclusão semanal">
        <defs>
          <linearGradient id="${idGradiente}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#09090B" stop-opacity="0.14" />
            <stop offset="100%" stop-color="#09090B" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        ${linhasGrade}
        <path d="${caminhoArea}" fill="url(#${idGradiente})" />
        <path d="${caminhoMeta}" fill="none" stroke="#D1D1D6" stroke-width="1.4" stroke-dasharray="4 4" />
        <path d="${caminhoLinha}" fill="none" stroke="#09090B" stroke-width="2.5" stroke-linecap="round" />
        ${circulosSvg}
      </svg>
      <div class="legenda-grafico-rodape">
        <span><strong>—</strong> Concluídas &nbsp; <span style="color:#8e8e93">- - Meta</span></span>
        <span class="detalhe-ponto-ativo">${pontoFocado.rotulo}: ${pontoFocado.concluidas}/${pontoFocado.planejadas} entregas</span>
      </div>
    </div>
  `;
}

/**
 * Renderiza um item individual de tarefa com checkbox interativo.
 */
function renderizarItemTarefa(tarefa, exibirTagQuadrante = false) {
  return `
    <div
      class="item-tarefa ${tarefa.concluida ? 'concluida' : ''}"
      data-acao="alternar-tarefa"
      data-id="${tarefa.id}"
      role="checkbox"
      aria-checked="${tarefa.concluida}"
      tabindex="0"
    >
      <div class="item-tarefa-esq">
        <span class="checkbox-minimal">${obterIconeCheck()}</span>
        <span class="titulo-item-tarefa">${escaparHtml(tarefa.titulo)}</span>
      </div>
      <div class="meta-item-tarefa">
        ${exibirTagQuadrante ? `<span class="tag-q ${tarefa.quadrante === 'Q1' ? 'preenchida' : ''}">${tarefa.quadrante}</span>` : ''}
        <span class="tempo-pilula">${escaparHtml(tarefa.duracao)}</span>
      </div>
    </div>
  `;
}

/**
 * Renderiza a lista de bolhas da linha do tempo (Activity Log).
 */
function renderizarTimeline(limite = 5) {
  return `
    <div class="lista-timeline">
      ${estadoApp.atividades
        .slice(0, limite)
        .map(
          (ev) => `
          <div class="evento-timeline">
            <div class="bolha-timeline ${ev.escura ? 'escura' : ''}">${ev.simbolo}</div>
            <div class="corpo-bolha-timeline">
              <p>${escaparHtml(ev.texto)}</p>
              <small>${escaparHtml(ev.detalhe)}</small>
            </div>
            <span class="horario-timeline">${escaparHtml(ev.horario)}</span>
          </div>
        `
        )
        .join('')}
    </div>
  `;
}

/**
 * Renderiza o formulário de criação rápida (usado no Bottom Sheet e no Artboard 2).
 */
function renderizarFormularioCriacaoRapida(idSufixo) {
  const opcoesPrioridade = [
    { codigo: 'Q1', texto: '● Fazer Agora · Q1' },
    { codigo: 'Q2', texto: '◐ Agendar · Q2' },
    { codigo: 'Q3', texto: '○ Delegar · Q3' },
    { codigo: 'Q4', texto: '◌ Pós-foco · Q4' },
  ];

  const opcoesDuracao = ['15m', '30m', '45m', '1h', '2h'];

  return `
    <form data-form-criacao="${idSufixo}">
      <div class="alca-arraste"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <strong style="font-size:0.98rem;letter-spacing:-0.02em;">Nova Prioridade Rápida</strong>
        <span class="dimensao-badge">Quick Sheet</span>
      </div>

      <input
        type="text"
        name="tituloTarefa"
        class="campo-entrada-limpo"
        placeholder="O que precisa ser priorizado agora?"
        autocomplete="off"
        required
      />

      <span class="rotulo-campo-sheet">Matriz de Prioridade (Tags Pílula)</span>
      <div class="grade-pilulas-prioridade">
        ${opcoesPrioridade
          .map(
            (op) => `
            <button
              type="button"
              class="tag-prioridade-pilula ${estadoApp.novaTarefaPrioridade === op.codigo ? 'selecionada' : ''}"
              data-acao="selecionar-prioridade-nova"
              data-valor="${op.codigo}"
            >${op.texto}</button>
          `
          )
          .join('')}
      </div>

      <span class="rotulo-campo-sheet">Bloco de Foco Estimado</span>
      <div class="grade-pilulas-prioridade">
        ${opcoesDuracao
          .map(
            (dur) => `
            <button
              type="button"
              class="tag-prioridade-pilula ${estadoApp.novaTarefaDuracao === dur ? 'selecionada' : ''}"
              data-acao="selecionar-duracao-nova"
              data-valor="${dur}"
            >${dur}</button>
          `
          )
          .join('')}
      </div>

      <button type="submit" class="botao-salvar-sheet">+ Adicionar à Matriz Prioritize</button>
    </form>
  `;
}

/**
 * Renderiza todo o painel principal do Desktop Web App.
 */
function renderizarDesktop() {
  const metricas = calcularMetricas();
  const containerConteudo = document.getElementById('desktop-area-dinamica');
  const barraLateralContadores = document.getElementById('desktop-menu-lateral');
  const focoSidebar = document.getElementById('desktop-progresso-foco');

  if (!containerConteudo) return;

  /* Atualiza menu lateral do Desktop */
  barraLateralContadores.innerHTML = `
    <button class="item-menu-lateral ${estadoApp.abaDesktopAtiva === 'dashboard' ? 'ativo' : ''}" data-acao="mudar-aba-desktop" data-aba="dashboard">
      <span class="item-menu-esq"><span>▣</span> Visão Geral & Matriz</span>
      <span class="contador-menu">04</span>
    </button>
    <button class="item-menu-lateral ${estadoApp.abaDesktopAtiva === 'checklist' ? 'ativo' : ''}" data-acao="mudar-aba-desktop" data-aba="checklist">
      <span class="item-menu-esq"><span>✓</span> Checklist Focado</span>
      <span class="contador-menu">${metricas.pendentes}</span>
    </button>
    <button class="item-menu-lateral ${estadoApp.abaDesktopAtiva === 'atividades' ? 'ativo' : ''}" data-acao="mudar-aba-desktop" data-aba="atividades">
      <span class="item-menu-esq"><span>●</span> Linha do Tempo</span>
      <span class="contador-menu">${estadoApp.atividades.length}</span>
    </button>
  `;

  /* Atualiza resumo de progresso na barra lateral */
  focoSidebar.innerHTML = `
    <small>Taxa de Execução Hoje</small>
    <strong>${metricas.percentual}% concluído</strong>
    <div class="barra-progresso-trilha">
      <div class="barra-progresso-preenchimento" style="width: ${metricas.percentual}%"></div>
    </div>
  `;

  /* Renderiza aba selecionada no Desktop */
  if (estadoApp.abaDesktopAtiva === 'checklist') {
    const tarefasFiltradas = estadoApp.tarefas.filter((t) => {
      if (estadoApp.filtroChecklist === 'pendentes') return !t.concluida;
      if (estadoApp.filtroChecklist === 'concluidas') return t.concluida;
      return true;
    });

    containerConteudo.innerHTML = `
      <div class="topo-conteudo-desktop">
        <div>
          <h3>Checklist de Execução Focada</h3>
          <p>Modo livre de distrações · Clique em qualquer item para concluir em todos os dispositivos</p>
        </div>
        <div class="grupo-pilulas-pequeno">
          <button class="pilula-filtro-mini ${estadoApp.filtroChecklist === 'todas' ? 'ativo' : ''}" data-acao="filtrar-checklist" data-filtro="todas">Todas (${metricas.total})</button>
          <button class="pilula-filtro-mini ${estadoApp.filtroChecklist === 'pendentes' ? 'ativo' : ''}" data-acao="filtrar-checklist" data-filtro="pendentes">Pendentes (${metricas.pendentes})</button>
          <button class="pilula-filtro-mini ${estadoApp.filtroChecklist === 'concluidas' ? 'ativo' : ''}" data-acao="filtrar-checklist" data-filtro="concluidas">Concluídas (${metricas.concluidas})</button>
        </div>
      </div>
      <div class="card-painel" style="display:flex;flex-direction:column;gap:8px;">
        ${tarefasFiltradas.map((t) => renderizarItemTarefa(t, true)).join('')}
      </div>
    `;
  } else if (estadoApp.abaDesktopAtiva === 'atividades') {
    containerConteudo.innerHTML = `
      <div class="topo-conteudo-desktop">
        <div>
          <h3>Registro de Atividades</h3>
          <p>Histórico cronológico minimalista sincronizado em tempo real</p>
        </div>
        <button class="botao-primario-pilula" data-acao="abrir-bottom-sheet">+ Nova Tarefa</button>
      </div>
      <div class="card-painel">
        ${renderizarTimeline(10)}
      </div>
    `;
  } else {
    /* Visão Completa do Dashboard Desktop: Métricas + Gráfico + Timeline + Matriz Eisenhower */
    const htmlQuadrantes = Object.values(QUADRANTES_EISENHOWER)
      .map((q) => {
        const itensQuadrante = estadoApp.tarefas.filter((t) => t.quadrante === q.codigo);
        return `
          <div class="quadrante-eisenhower ${q.destaque ? 'q1-destaque' : ''}">
            <div class="topo-quadrante">
              <div class="titulo-quadrante">
                <span class="tag-q ${q.destaque ? 'preenchida' : ''}">${q.codigo}</span>
                <span>${q.nome}</span>
              </div>
              <span class="subtitulo-quadrante">${q.subtitulo}</span>
            </div>
            <div class="lista-tarefas-quadrante">
              ${itensQuadrante.map((t) => renderizarItemTarefa(t, false)).join('')}
            </div>
          </div>
        `;
      })
      .join('');

    containerConteudo.innerHTML = `
      <div class="topo-conteudo-desktop">
        <div>
          <h3>Painel de Prioridades</h3>
          <p> Terça-feira · Ciclo Semanal de Alta Precisão</p>
        </div>
        <div class="acoes-topo-desktop">
          <button class="botao-primario-pilula" data-acao="abrir-bottom-sheet">
            <span>+</span> Criar Tarefa Rápida
          </button>
        </div>
      </div>

      <div class="grade-metricas-desktop">
        <div class="card-metrica invertido">
          <div class="card-metrica-topo">
            <span>Taxa Semanal</span>
            <span class="variacao-pilula">+12%</span>
          </div>
          <div class="valor-metrica">${metricas.percentual}%</div>
        </div>
        <div class="card-metrica">
          <div class="card-metrica-topo">
            <span>Críticas Q1</span>
            <span class="variacao-pilula">Foco</span>
          </div>
          <div class="valor-metrica">0${metricas.pendentesCriticas}</div>
        </div>
        <div class="card-metrica">
          <div class="card-metrica-topo">
            <span>Horas Focadas</span>
            <span class="variacao-pilula">Meta 36h</span>
          </div>
          <div class="valor-metrica">34.5h</div>
        </div>
        <div class="card-metrica">
          <div class="card-metrica-topo">
            <span>Sequência Ativa</span>
            <span class="variacao-pilula">Recorde</span>
          </div>
          <div class="valor-metrica">12d</div>
        </div>
      </div>

      <div class="grade-central-desktop">
        <div class="card-painel">
          <div class="cabecalho-card">
            <div>
              <h4>Curva de Conclusão Semanal</h4>
              <span>Clique nos vértices para inspecionar entregas diárias</span>
            </div>
            <div class="grupo-pilulas-pequeno">
              <button class="pilula-filtro-mini ${estadoApp.periodoGrafico === '7D' ? 'ativo' : ''}" data-acao="mudar-periodo-grafico" data-periodo="7D">7D</button>
              <button class="pilula-filtro-mini ${estadoApp.periodoGrafico === '30D' ? 'ativo' : ''}" data-acao="mudar-periodo-grafico" data-periodo="30D">30D</button>
            </div>
          </div>
          ${gerarGraficoSvg({ largura: 470, altura: 172, compacto: false })}
        </div>

        <div class="card-painel">
          <div class="cabecalho-card">
            <div>
              <h4>Atividade Recente</h4>
              <span>Bolhas de linha do tempo ao vivo</span>
            </div>
          </div>
          ${renderizarTimeline(3)}
        </div>
      </div>

      <div>
        <div class="cabecalho-card" style="margin-bottom:10px;">
          <div>
            <h4>Matriz de Prioridade de Eisenhower</h4>
            <span>Classificação estruturada por urgência e impacto decisório</span>
          </div>
        </div>
        <div class="grade-eisenhower">
          ${htmlQuadrantes}
        </div>
      </div>
    `;
  }

  /* Atualiza estado visual da barra flutuante pílula no Desktop */
  document.querySelectorAll('[data-nav-desktop]').forEach((botao) => {
    botao.classList.toggle('ativo', botao.dataset.navDesktop === estadoApp.abaDesktopAtiva);
  });

  /* Atualiza modal/drawer de criação rápida no Desktop */
  const camadaModalDesktop = document.getElementById('desktop-camada-sheet');
  const corpoModalDesktop = document.getElementById('desktop-corpo-sheet');
  if (camadaModalDesktop && corpoModalDesktop) {
    camadaModalDesktop.classList.toggle('aberto', estadoApp.bottomSheetAberto);
    corpoModalDesktop.innerHTML = renderizarFormularioCriacaoRapida('desktop');
  }
}

/**
 * Gera o HTML interno de uma tela iOS específica ('dashboard' | 'criar' | 'checklist' | 'atividades').
 */
function obterHtmlTelaIos(tipoTela, sufixoForm = 'ios') {
  const metricas = calcularMetricas();

  if (tipoTela === 'criar') {
    return `
      <div class="cabecalho-ios">
        <div>
          <small>Captura Instantânea</small>
          <h3>Nova Tarefa</h3>
        </div>
      </div>
      <div class="card-ios" style="background:#fafafa;">
        <div style="font-size:0.76rem;color:#52525b;margin-bottom:8px;">Próximo bloco livre sugerido: <strong>14:30 — 15:15</strong></div>
        <div class="barra-progresso-trilha"><div class="barra-progresso-preenchimento" style="width:${metricas.percentual}%"></div></div>
      </div>
      <div class="sheet-embutido">
        ${renderizarFormularioCriacaoRapida(sufixoForm)}
      </div>
    `;
  }

  if (tipoTela === 'checklist') {
    return `
      <div class="cabecalho-ios">
        <div>
          <small>Modo Foco Profundo</small>
          <h3>Checklist</h3>
        </div>
        <span class="tag-q preenchida">${metricas.concluidas}/${metricas.total}</span>
      </div>

      <div class="card-ios escura">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:0.75rem;color:#a1a1aa;">Progresso da Sessão</span>
          <strong style="font-family:var(--fonte-mono);font-size:0.85rem;">${metricas.percentual}%</strong>
        </div>
        <div class="barra-progresso-trilha" style="background:#27272a;">
          <div class="barra-progresso-preenchimento" style="width:${metricas.percentual}%;background:#ffffff;"></div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:7px;">
        ${estadoApp.tarefas.map((t) => renderizarItemTarefa(t, true)).join('')}
      </div>
    `;
  }

  if (tipoTela === 'atividades') {
    return `
      <div class="cabecalho-ios">
        <div>
          <small>Rastreamento Limpo</small>
          <h3>Atividades</h3>
        </div>
        <span class="dimensao-badge">Ao vivo</span>
      </div>
      ${renderizarTimeline(5)}
    `;
  }

  /* Tela 1 Padrão: Dashboard iOS com Gráfico + Métricas + Matriz Eisenhower */
  return `
    <div class="cabecalho-ios">
      <div>
        <small>Prioritize iOS</small>
        <h3>Dashboard</h3>
      </div>
      <button class="botao-icone-ios" data-acao="abrir-sheet-ios" title="Criar tarefa rápida">+</button>
    </div>

    <div class="metricas-duplas-ios">
      <div class="card-metrica invertido" style="padding:13px;">
        <div class="card-metrica-topo"><span>Conclusão</span><span>+12%</span></div>
        <div class="valor-metrica" style="font-size:1.4rem;">${metricas.percentual}%</div>
      </div>
      <div class="card-metrica" style="padding:13px;">
        <div class="card-metrica-topo"><span>Críticas Q1</span><span>Hoje</span></div>
        <div class="valor-metrica" style="font-size:1.4rem;">0${metricas.pendentesCriticas}</div>
      </div>
    </div>

    <div class="card-ios" style="background:#ffffff;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong style="font-size:0.82rem;">Conclusão Semanal</strong>
        <span class="dimensao-badge">${estadoApp.periodoGrafico}</span>
      </div>
      ${gerarGraficoSvg({ largura: 310, altura: 132, compacto: true })}
    </div>

    <div class="secao-titulo-ios">
      <h4>Matriz Eisenhower</h4>
      <span>Q1 — Q4</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:7px;">
      ${estadoApp.tarefas.slice(0, 5).map((t) => renderizarItemTarefa(t, true)).join('')}
    </div>
  `;
}

/**
 * Renderiza o dispositivo iOS principal (sincronizado ao lado do Desktop)
 * e também os 4 Artboards simultâneos da Galeria Estilo Behance/Dribbble.
 */
function renderizarDispositivosIos() {
  const corpoIosPrincipal = document.getElementById('ios-conteudo-principal');
  const camadaSheetIos = document.getElementById('ios-camada-sheet');
  const corpoSheetIos = document.getElementById('ios-corpo-sheet');

  if (corpoIosPrincipal) {
    corpoIosPrincipal.innerHTML = obterHtmlTelaIos(estadoApp.abaIosAtiva, 'ios-aba');
  }

  /* Atualiza abas da barra flutuante pílula no iPhone principal */
  document.querySelectorAll('[data-nav-ios]').forEach((aba) => {
    aba.classList.toggle('ativo', aba.dataset.navIos === estadoApp.abaIosAtiva);
  });

  /* Atualiza Bottom Sheet deslizante sobreposto no iPhone principal */
  if (camadaSheetIos && corpoSheetIos) {
    camadaSheetIos.classList.toggle('aberto', estadoApp.bottomSheetAberto);
    corpoSheetIos.innerHTML = renderizarFormularioCriacaoRapida('ios-modal');
  }

  /* Atualiza as 4 telas simultâneas da Prancha de Portfólio Behance */
  const mapaArtboards = [
    { id: 'artboard-1-corpo', tela: 'dashboard', sufixo: 'ab1' },
    { id: 'artboard-2-corpo', tela: 'criar', sufixo: 'ab2' },
    { id: 'artboard-3-corpo', tela: 'checklist', sufixo: 'ab3' },
    { id: 'artboard-4-corpo', tela: 'atividades', sufixo: 'ab4' },
  ];

  mapaArtboards.forEach(({ id, tela, sufixo }) => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.innerHTML = obterHtmlTelaIos(tela, sufixo);
    }
  });
}

/**
 * Atualiza a visibilidade das seções conforme o modo de apresentação escolhido no topo.
 */
function atualizarModoEstudio() {
  const secaoLadoALado = document.getElementById('secao-lado-a-lado');
  const secaoQuatroTelas = document.getElementById('secao-quatro-telas');

  if (estadoApp.modoExibicaoEstudio === 'lado-a-lado') {
    secaoLadoALado.classList.remove('oculto');
    secaoQuatroTelas.classList.add('oculto');
  } else if (estadoApp.modoExibicaoEstudio === 'quatro-telas') {
    secaoLadoALado.classList.add('oculto');
    secaoQuatroTelas.classList.remove('oculto');
  } else {
    secaoLadoALado.classList.remove('oculto');
    secaoQuatroTelas.classList.remove('oculto');
  }

  document.querySelectorAll('[data-modo-estudio]').forEach((btn) => {
    btn.classList.toggle('ativo', btn.dataset.modoEstudio === estadoApp.modoExibicaoEstudio);
  });
}

/**
 * Função mestre de renderização reativa da interface.
 */
function renderizarTudo() {
  atualizarModoEstudio();
  renderizarDesktop();
  renderizarDispositivosIos();
}

/**
 * Alterna o estado de conclusão de uma tarefa e grava um novo evento na linha do tempo.
 */
function alternarConclusaoTarefa(idTarefa) {
  const tarefa = estadoApp.tarefas.find((item) => item.id === idTarefa);
  if (!tarefa) return;

  tarefa.concluida = !tarefa.concluida;

  estadoApp.atividades.unshift({
    id: `a-${Date.now()}`,
    simbolo: tarefa.concluida ? '✓' : '↺',
    escura: tarefa.concluida,
    texto: `${tarefa.concluida ? 'Concluiu' : 'Reabriu'} "${tarefa.titulo}"`,
    detalhe: `Matriz ${tarefa.quadrante} · ${QUADRANTES_EISENHOWER[tarefa.quadrante].nome}`,
    horario: 'Agora',
  });

  renderizarTudo();
}

/**
 * Cria uma nova tarefa a partir de qualquer instância do Quick Task Creation Bottom Sheet.
 */
function adicionarNovaTarefa(tituloBruto) {
  const titulo = tituloBruto.trim();
  if (!titulo) return;

  const novaTarefa = {
    id: `t-${Date.now()}`,
    titulo,
    quadrante: estadoApp.novaTarefaPrioridade,
    duracao: estadoApp.novaTarefaDuracao,
    concluida: false,
    categoria: 'Criada Agora',
  };

  estadoApp.tarefas.unshift(novaTarefa);

  estadoApp.atividades.unshift({
    id: `a-${Date.now()}`,
    simbolo: '+',
    escura: true,
    texto: `Adicionou "${titulo}"`,
    detalhe: `${novaTarefa.quadrante} (${QUADRANTES_EISENHOWER[novaTarefa.quadrante].nome}) · ${novaTarefa.duracao}`,
    horario: 'Agora',
  });

  estadoApp.bottomSheetAberto = false;
  if (estadoApp.abaIosAtiva === 'criar') {
    estadoApp.abaIosAtiva = 'checklist';
  }

  renderizarTudo();
}

/* ==========================================================================
   Delegação Global de Eventos (Cliques, Formulários e Atalhos de Teclado)
   ========================================================================== */
document.addEventListener('click', (evento) => {
  /* Alternador de modo do estúdio no cabeçalho */
  const btnModo = evento.target.closest('[data-modo-estudio]');
  if (btnModo) {
    estadoApp.modoExibicaoEstudio = btnModo.dataset.modoEstudio;
    renderizarTudo();
    return;
  }

  /* Navegação da barra flutuante pílula no Desktop */
  const navDesktop = evento.target.closest('[data-nav-desktop]');
  if (navDesktop) {
    estadoApp.abaDesktopAtiva = navDesktop.dataset.navDesktop;
    renderizarTudo();
    return;
  }

  /* Navegação da barra flutuante pílula no iOS */
  const navIos = evento.target.closest('[data-nav-ios]');
  if (navIos) {
    estadoApp.abaIosAtiva = navIos.dataset.navIos;
    estadoApp.bottomSheetAberto = false;
    renderizarTudo();
    return;
  }

  /* Fechar Bottom Sheet ao clicar no fundo escurecido */
  if (evento.target.classList.contains('camada-bottom-sheet')) {
    estadoApp.bottomSheetAberto = false;
    renderizarTudo();
    return;
  }

  /* Ações gerais mapeadas via data-acao */
  const alvoAcao = evento.target.closest('[data-acao]');
  if (!alvoAcao) return;

  const acao = alvoAcao.dataset.acao;

  if (acao === 'alternar-tarefa') {
    alternarConclusaoTarefa(alvoAcao.dataset.id);
  } else if (acao === 'selecionar-ponto-grafico') {
    estadoApp.indicePontoSelecionado = Number(alvoAcao.dataset.indice);
    renderizarTudo();
  } else if (acao === 'mudar-periodo-grafico') {
    estadoApp.periodoGrafico = alvoAcao.dataset.periodo;
    estadoApp.indicePontoSelecionado = 0;
    renderizarTudo();
  } else if (acao === 'mudar-aba-desktop') {
    estadoApp.abaDesktopAtiva = alvoAcao.dataset.aba;
    renderizarTudo();
  } else if (acao === 'filtrar-checklist') {
    estadoApp.filtroChecklist = alvoAcao.dataset.filtro;
    renderizarTudo();
  } else if (acao === 'abrir-bottom-sheet' || acao === 'abrir-sheet-ios') {
    estadoApp.bottomSheetAberto = !estadoApp.bottomSheetAberto;
    renderizarTudo();
  } else if (acao === 'selecionar-prioridade-nova') {
    estadoApp.novaTarefaPrioridade = alvoAcao.dataset.valor;
    renderizarTudo();
  } else if (acao === 'selecionar-duracao-nova') {
    estadoApp.novaTarefaDuracao = alvoAcao.dataset.valor;
    renderizarTudo();
  }
});

/* Submissão do formulário de criação rápida de tarefas */
document.addEventListener('submit', (evento) => {
  const formulario = evento.target.closest('[data-form-criacao]');
  if (!formulario) return;

  evento.preventDefault();
  const campoTitulo = formulario.querySelector('input[name="tituloTarefa"]');
  if (campoTitulo && campoTitulo.value.trim()) {
    adicionarNovaTarefa(campoTitulo.value);
    campoTitulo.value = '';
  }
});

/* Atalho de teclado "N" para abrir rapidamente o Bottom Sheet e "Escape" para fechar */
document.addEventListener('keydown', (evento) => {
  const digitandoEmCampo = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if (evento.key === 'Escape' && estadoApp.bottomSheetAberto) {
    estadoApp.bottomSheetAberto = false;
    renderizarTudo();
  } else if ((evento.key === 'n' || evento.key === 'N') && !digitandoEmCampo) {
    evento.preventDefault();
    estadoApp.bottomSheetAberto = true;
    renderizarTudo();
  }
});

/* Inicializa a prancha interativa assim que o DOM estiver pronto */
document.addEventListener('DOMContentLoaded', renderizarTudo);
