const STORAGE_KEY = 'br_reis_data';

const formInicial = document.getElementById('formInicial');
const formLancamento = document.getElementById('formLancamento');
const tabelaBody = document.querySelector('#tabela tbody');

const cardSaldo = document.getElementById('cardSaldo');
const cardEntradas = document.getElementById('cardEntradas');
const cardSaidas = document.getElementById('cardSaidas');
const cardInicial = document.getElementById('cardInicial');

const filtroDataEl = document.getElementById('filtroData');
const filtroMesEl = document.getElementById('filtroMes');
const filtroMesGlobalEl = document.getElementById('filtroMesGlobal');
const totalDiaEl = document.getElementById('totalDia');
const totalMesEl = document.getElementById('totalMes');
const btnLimparFiltros = document.getElementById('btnLimparFiltros');

const topbarFiltro = document.querySelector('.topbar-filtro');

const btnFecharMes = document.createElement('button');
btnFecharMes.textContent = 'Fechar mês';
btnFecharMes.style.marginLeft = '8px';
btnFecharMes.className = 'btn-small';

const btnReabrirMes = document.createElement('button');
btnReabrirMes.textContent = 'Reabrir mês';
btnReabrirMes.style.marginLeft = '8px';
btnReabrirMes.className = 'btn-small';

topbarFiltro.appendChild(btnFecharMes);
topbarFiltro.appendChild(btnReabrirMes);

function formatarReais(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function gerarId() {
  return 'id_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

let store = {
  lancamentos: [],
  saldos: {}
};

let graficoMensal = null;

function carregarStore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      store.lancamentos = parsed;
      store.saldos = {};
    } else {
      store = parsed;
    }
  } catch (e) {
    store = { lancamentos: [], saldos: {} };
  }
}

function salvarStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function inicializarMesGlobal() {
  if (!filtroMesGlobalEl.value) {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    filtroMesGlobalEl.value = `${ano}-${mes}`;
  }
}

function garantirSaldoMes(mes) {
  if (!store.saldos[mes]) {
    store.saldos[mes] = { inicial: 0, atual: 0, fechado: false };
  }
}

function recalcularSaldoMes(mes) {
  garantirSaldoMes(mes);
  let saldo = store.saldos[mes].inicial;

  store.lancamentos
    .filter(l => l.mesRef === mes)
    .forEach(l => {
      if (l.tipo === 'entrada') saldo += l.valor;
      else saldo -= l.valor;
    });

  store.saldos[mes].atual = saldo;
}

formInicial.addEventListener('submit', function (e) {
  e.preventDefault();

  const mesAtual = filtroMesGlobalEl.value;
  garantirSaldoMes(mesAtual);

  if (store.saldos[mesAtual].fechado) {
    alert('Este mês está fechado. Reabra o mês para alterar o caixa inicial.');
    return;
  }

  const valorInicial = parseFloat(document.getElementById('valorInicial').value) || 0;
  store.saldos[mesAtual].inicial = valorInicial;

  recalcularSaldoMes(mesAtual);
  salvarStore();
  atualizarResumo();
  renderTabela();
  atualizarGraficoMensal();
});

formLancamento.addEventListener('submit', function (e) {
  e.preventDefault();

  const data = document.getElementById('data').value;
  const tipo = document.getElementById('tipo').value;
  const categoria = document.getElementById('categoria').value;
  const descricao = document.getElementById('descricao').value || '-';
  const valor = parseFloat(document.getElementById('valor').value) || 0;

  if (!data || valor <= 0) {
    alert('Informe data e valor válido.');
    return;
  }

  const mesAtual = filtroMesGlobalEl.value;
  garantirSaldoMes(mesAtual);

  if (store.saldos[mesAtual].fechado) {
    alert('Este mês está fechado. Reabra o mês para adicionar lançamentos.');
    return;
  }

  const lancamento = {
    id: gerarId(),
    data,
    tipo,
    categoria,
    descricao,
    valor,
    mesRef: mesAtual
  };

  store.lancamentos.push(lancamento);
  recalcularSaldoMes(mesAtual);
  salvarStore();
  renderTabela();
  atualizarResumo();
  atualizarGraficoMensal();

  formLancamento.reset();
});

function renderTabela() {
  tabelaBody.innerHTML = '';

  const diaFiltro = filtroDataEl.value;
  const mesFiltro = filtroMesEl.value;
  const mesGlobal = filtroMesGlobalEl.value;

  const lancs = store.lancamentos
    .filter(l => l.mesRef === mesGlobal)
    .sort((a, b) => a.data.localeCompare(b.data));

  let saldoCorrente = store.saldos[mesGlobal] ? store.saldos[mesGlobal].inicial : 0;

  for (const l of lancs) {
    if (diaFiltro && l.data !== diaFiltro) continue;
    if (mesFiltro && !l.data.startsWith(mesFiltro)) continue;

    if (l.tipo === 'entrada') saldoCorrente += l.valor;
    else saldoCorrente -= l.valor;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${l.data}</td>
      <td>${l.tipo === 'entrada' ? 'Entrada' : 'Saída'}</td>
      <td>${l.categoria}</td>
      <td>${l.descricao}</td>
      <td>${formatarReais(l.valor)}</td>
      <td>${formatarReais(saldoCorrente)}</td>
      <td><button class="btn-excluir" data-id="${l.id}">Apagar</button></td>
    `;
    tabelaBody.appendChild(tr);
  }

  calcularResumosDiaMes();
}

function atualizarResumo() {
  const mesGlobal = filtroMesGlobalEl.value;
  garantirSaldoMes(mesGlobal);

  let totalEntradas = 0;
  let totalSaidas = 0;

  store.lancamentos.forEach(l => {
    if (l.mesRef !== mesGlobal) return;
    if (l.tipo === 'entrada') totalEntradas += l.valor;
    else totalSaidas += l.valor;
  });

  recalcularSaldoMes(mesGlobal);

  cardSaldo.textContent = formatarReais(store.saldos[mesGlobal].atual || 0);
  cardEntradas.textContent = formatarReais(totalEntradas);
  cardSaidas.textContent = formatarReais(totalSaidas);
  cardInicial.textContent = formatarReais(store.saldos[mesGlobal].inicial || 0);

  btnFecharMes.disabled = store.saldos[mesGlobal].fechado;
  btnReabrirMes.disabled = !store.saldos[mesGlobal].fechado;
}

function calcularResumosDiaMes() {
  const dia = filtroDataEl.value;
  const mes = filtroMesEl.value;
  const mesGlobal = filtroMesGlobalEl.value;

  let totalDia = 0;
  let totalMes = 0;

  store.lancamentos.forEach(l => {
    if (l.mesRef !== mesGlobal) return;
    if (dia && l.data === dia && l.tipo === 'saida') totalDia += l.valor;
    if (mes && l.data.startsWith(mes) && l.tipo === 'saida') totalMes += l.valor;
  });

  totalDiaEl.textContent = formatarReais(totalDia);
  totalMesEl.textContent = formatarReais(totalMes);
}

filtroDataEl.addEventListener('change', renderTabela);
filtroMesEl.addEventListener('change', renderTabela);

filtroMesGlobalEl.addEventListener('change', () => {
  const mes = filtroMesGlobalEl.value;
  garantirSaldoMes(mes);
  recalcularSaldoMes(mes);
  salvarStore();
  renderTabela();
  atualizarResumo();
  atualizarGraficoMensal();
});

btnLimparFiltros.addEventListener('click', () => {
  filtroDataEl.value = '';
  filtroMesEl.value = '';
  renderTabela();
});

btnFecharMes.addEventListener('click', () => {
  const mes = filtroMesGlobalEl.value;
  if (!confirm(`Confirma fechar o mês ${mes}?`)) return;
  garantirSaldoMes(mes);
  store.saldos[mes].fechado = true;
  salvarStore();
  atualizarResumo();
  alert(`Mês ${mes} fechado.`);
});

btnReabrirMes.addEventListener('click', () => {
  const mes = filtroMesGlobalEl.value;
  if (!confirm(`Reabrir o mês ${mes}?`)) return;
  garantirSaldoMes(mes);
  store.saldos[mes].fechado = false;
  salvarStore();
  atualizarResumo();
  alert(`Mês ${mes} reaberto.`);
});

tabelaBody.addEventListener('click', function (e) {
  const botao = e.target.closest('.btn-excluir');
  if (!botao) return;
  apagarLancamento(botao.dataset.id);
});

function apagarLancamento(id) {
  const mesGlobal = filtroMesGlobalEl.value;
  const lancamento = store.lancamentos.find(l => l.id === id);
  if (!lancamento) return;

  if (store.saldos[mesGlobal] && store.saldos[mesGlobal].fechado) {
    alert('Este mês está fechado. Reabra o mês para apagar lançamentos.');
    return;
  }

  if (!confirm('Tem certeza que deseja apagar este lançamento?')) return;

  store.lancamentos = store.lancamentos.filter(l => l.id !== id);
  recalcularSaldoMes(lancamento.mesRef);
  salvarStore();
  renderTabela();
  atualizarResumo();
  atualizarGraficoMensal();
}

function inicializarGrafico() {
  const ctx = document.getElementById('graficoMensal').getContext('2d');
  graficoMensal = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        { label: 'Entradas', backgroundColor: 'rgba(34, 197, 94, 0.7)', data: [] },
        { label: 'Saídas', backgroundColor: 'rgba(239, 68, 68, 0.7)', data: [] }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#e5e7eb' } } },
      scales: {
        x: { ticks: { color: '#9ca3af' }, grid: { display: false } },
        y: { ticks: { color: '#9ca3af' }, grid: { color: '#1f2937' } }
      }
    }
  });
}

function atualizarGraficoMensal() {
  const mapaMeses = {};

  store.lancamentos.forEach(l => {
    const mes = l.mesRef || l.data.slice(0, 7);
    if (!mapaMeses[mes]) mapaMeses[mes] = { entrada: 0, saida: 0 };
    if (l.tipo === 'entrada') mapaMeses[mes].entrada += l.valor;
    else mapaMeses[mes].saida += l.valor;
  });

  const labels = Object.keys(mapaMeses).sort();
  const entradas = labels.map(m => mapaMeses[m].entrada);
  const saidas = labels.map(m => mapaMeses[m].saida);

  graficoMensal.data.labels = labels;
  graficoMensal.data.datasets[0].data = entradas;
  graficoMensal.data.datasets[1].data = saidas;
  graficoMensal.update();
}

function inicializarApp() {
  carregarStore();
  inicializarMesGlobal();
  garantirSaldoMes(filtroMesGlobalEl.value);

  for (const mes of Object.keys(store.saldos)) {
    recalcularSaldoMes(mes);
  }

  inicializarGrafico();
  renderTabela();
  atualizarResumo();
  atualizarGraficoMensal();
}

inicializarApp();