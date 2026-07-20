// ------------------------
// Estado principal
// ------------------------

let saldoInicial = 0;
let saldoAtual = 0;

// Carrega lançamentos salvos (Barbearia Reis) ou começa vazio
let lancamentos = JSON.parse(localStorage.getItem('lancamentosReis')) || [];

// Referências de elementos
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

// Se não tiver período selecionado, usa o mês atual
if (!filtroMesGlobalEl.value) {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  filtroMesGlobalEl.value = `${ano}-${mes}`;
}

// ------------------------
// Utilidades
// ------------------------

function formatarReais(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function salvarLancamentos() {
  localStorage.setItem('lancamentosReis', JSON.stringify(lancamentos));
}

// ------------------------
// Caixa inicial
// ------------------------

formInicial.addEventListener('submit', function (e) {
  e.preventDefault();
  saldoInicial = parseFloat(document.getElementById('valorInicial').value) || 0;

  // Recalcula saldo atual para o mês selecionado
  const mesGlobal = filtroMesGlobalEl.value;
  saldoAtual = saldoInicial;

  lancamentos.forEach(l => {
    if (l.mesRef !== mesGlobal) return;
    if (l.tipo === 'entrada') {
      saldoAtual += l.valor;
    } else {
      saldoAtual -= l.valor;
    }
  });

  atualizarResumo();
  renderTabela();
});

// ------------------------
// Novo lançamento
// ------------------------

formLancamento.addEventListener('submit', function (e) {
  e.preventDefault();

  const data = document.getElementById('data').value;
  const tipo = document.getElementById('tipo').value;
  const categoria = document.getElementById('categoria').value;
  const descricao = document.getElementById('descricao').value || "-";
  const valor = parseFloat(document.getElementById('valor').value) || 0;

  if (!data || valor <= 0) {
    alert("Informe data e valor válido.");
    return;
  }

  const mesAtual = filtroMesGlobalEl.value; // AAAA-MM

  const lancamento = {
    data,      // AAAA-MM-DD
    tipo,      // "entrada" ou "saida"
    categoria,
    descricao,
    valor,
    mesRef: mesAtual
  };

  lancamentos.push(lancamento);

  // Atualiza saldo do mês corrente
  if (tipo === 'entrada') {
    saldoAtual += valor;
  } else {
    saldoAtual -= valor;
  }

  salvarLancamentos();
  renderTabela();
  atualizarResumo();
  atualizarGraficoMensal();
  formLancamento.reset();
});

// ------------------------
// Tabela e resumos
// ------------------------

function renderTabela() {
  tabelaBody.innerHTML = "";

  const diaFiltro = filtroDataEl.value;   // AAAA-MM-DD
  const mesFiltro = filtroMesEl.value;    // AAAA-MM
  const mesGlobal = filtroMesGlobalEl.value; // mês de caixa

  lancamentos.forEach(l => {
    // Primeiro: respeita o mês de caixa selecionado
    if (mesGlobal && l.mesRef !== mesGlobal) return;

    // Depois: filtros adicionais
    if (diaFiltro && l.data !== diaFiltro) return;
    if (mesFiltro && !l.data.startsWith(mesFiltro)) return;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${l.data}</td>
      <td>${l.tipo === 'entrada' ? 'Entrada' : 'Saída'}</td>
      <td>${l.categoria}</td>
      <td>${l.descricao}</td>
      <td>${formatarReais(l.valor)}</td>
      <td>${formatarReais(calcularSaldoApos(l))}</td>
    `;
    tabelaBody.appendChild(tr);
  });

  calcularResumosDiaMes();
}

function calcularSaldoApos(lancamentoAtual) {
  const mesGlobal = filtroMesGlobalEl.value;
  let saldo = saldoInicial;

  for (const l of lancamentos) {
    if (l.mesRef !== mesGlobal) continue;

    if (l.tipo === 'entrada') {
      saldo += l.valor;
    } else {
      saldo -= l.valor;
    }

    if (l === lancamentoAtual) break;
  }
  return saldo;
}

function atualizarResumo() {
  let totalEntradas = 0;
  let totalSaidas = 0;

  const mesGlobal = filtroMesGlobalEl.value;

  lancamentos.forEach(l => {
    if (mesGlobal && l.mesRef !== mesGlobal) return;

    if (l.tipo === 'entrada') {
      totalEntradas += l.valor;
    } else {
      totalSaidas += l.valor;
    }
  });

  cardSaldo.textContent = formatarReais(saldoAtual);
  cardEntradas.textContent = formatarReais(totalEntradas);
  cardSaidas.textContent = formatarReais(totalSaidas);
  cardInicial.textContent = formatarReais(saldoInicial);
}

function calcularResumosDiaMes() {
  const dia = filtroDataEl.value;
  const mes = filtroMesEl.value;
  const mesGlobal = filtroMesGlobalEl.value;

  let totalDia = 0;
  let totalMes = 0;

  lancamentos.forEach(l => {
    if (mesGlobal && l.mesRef !== mesGlobal) return;

    if (dia && l.data === dia && l.tipo === 'saida') {
      totalDia += l.valor;
    }
    if (mes && l.data.startsWith(mes) && l.tipo === 'saida') {
      totalMes += l.valor;
    }
  });

  totalDiaEl.textContent = formatarReais(totalDia);
  totalMesEl.textContent = formatarReais(totalMes);
}

// ------------------------
// Filtros
// ------------------------

filtroDataEl.addEventListener('change', () => {
  renderTabela();
});

filtroMesEl.addEventListener('change', () => {
  renderTabela();
});

filtroMesGlobalEl.addEventListener('change', () => {
  const mesGlobal = filtroMesGlobalEl.value;

  // Recalcula saldo do mês selecionado
  saldoAtual = saldoInicial;
  lancamentos.forEach(l => {
    if (l.mesRef !== mesGlobal) return;
    if (l.tipo === 'entrada') saldoAtual += l.valor;
    else saldoAtual -= l.valor;
  });

  renderTabela();
  atualizarResumo();
  atualizarGraficoMensal();
});

btnLimparFiltros.addEventListener('click', () => {
  filtroDataEl.value = "";
  filtroMesEl.value = "";
  renderTabela();
});

// ------------------------
// Gráfico Chart.js Entradas x Saídas por mês
// ------------------------

const ctx = document.getElementById('graficoMensal').getContext('2d');
let graficoMensal = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: [],
    datasets: [
      {
        label: 'Entradas',
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
        data: []
      },
      {
        label: 'Saídas',
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        data: []
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: '#e5e7eb' }
      }
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af' },
        grid: { display: false }
      },
      y: {
        ticks: { color: '#9ca3af' },
        grid: { color: '#1f2937' }
      }
    }
  }
});

function atualizarGraficoMensal() {
  const mapaMeses = {};

  lancamentos.forEach(l => {
    const mes = l.mesRef || l.data.slice(0, 7);

    if (!mapaMeses[mes]) {
      mapaMeses[mes] = { entrada: 0, saida: 0 };
    }

    if (l.tipo === 'entrada') {
      mapaMeses[mes].entrada += l.valor;
    } else {
      mapaMeses[mes].saida += l.valor;
    }
  });

  const labels = Object.keys(mapaMeses).sort();
  const entradas = labels.map(m => mapaMeses[m].entrada);
  const saidas = labels.map(m => mapaMeses[m].saida);

  graficoMensal.data.labels = labels;
  graficoMensal.data.datasets[0].data = entradas;
  graficoMensal.data.datasets[1].data = saidas;
  graficoMensal.update();
}

// ------------------------
// Inicialização
// ------------------------

renderTabela();
atualizarResumo();
atualizarGraficoMensal();