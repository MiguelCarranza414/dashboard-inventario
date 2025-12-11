const KPI_JSON_URL = "https://raw.githubusercontent.com/MiguelCarranza414/dashboard-inventario/refs/heads/main/KPI.json";
const selectors = {
  compliance: document.getElementById('global-compliance'),
  noncompliance: document.getElementById('global-noncompliance'),
  complianceProgress: document.getElementById('compliance-progress'),
  noncomplianceProgress: document.getElementById('noncompliance-progress'),
  codigoMayor: document.getElementById('codigo-mayor'),
  codigoMenor: document.getElementById('codigo-menor'),
  apuGrid: document.getElementById('apu-grid'),
  globalTotal: document.getElementById('global-total'),
  narrative: document.getElementById('narrative'),
  lastUpdated: document.getElementById('last-updated'),
  toast: document.getElementById('toast'),
  refreshBtn: document.getElementById('refresh-btn')
};
const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;
const formatDate = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(now);
};
function showToast(message) {
  selectors.toast.textContent = message;
  selectors.toast.hidden = false;
  setTimeout(() => { selectors.toast.hidden = true; }, 3800);
}
async function fetchKPI() {
  const response = await fetch(KPI_JSON_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudieron obtener los datos');
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('El JSON no tiene el formato esperado');
  return data;
}
function groupByStatus(data) {
  return data.reduce((acc, item) => {
    const key = item.Status || 'Desconocido';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}
function renderGlobal(globalData) {
  const cumplimiento = globalData.find((d) => d.Descripcion.toLowerCase() === 'cumplimiento');
  const incumplimiento = globalData.find((d) => d.Descripcion.toLowerCase() === 'incumplimiento');
  const codigoMayor = globalData.find((d) => d.Descripcion.toLowerCase() === 'c.diario mayor');
  const codigoMenor = globalData.find((d) => d.Descripcion.toLowerCase() === 'c.diario menor');
  const cumplimientoValue = cumplimiento ? Number(cumplimiento.Dato) : 0;
  const incumplimientoValue = incumplimiento ? Number(incumplimiento.Dato) : 0;
  selectors.compliance.textContent = formatPercent(cumplimientoValue);
  selectors.noncompliance.textContent = formatPercent(incumplimientoValue);
  selectors.complianceProgress.style.width = `${cumplimientoValue * 100}%`;
  selectors.noncomplianceProgress.style.width = `${incumplimientoValue * 100}%`;
  selectors.codigoMayor.textContent = codigoMayor?.Dato ?? '--';
  selectors.codigoMenor.textContent = codigoMenor?.Dato ?? '--';
  selectors.lastUpdated.textContent = `Actualizado: ${formatDate()}`;
}
function renderAPU(apus) {
  selectors.apuGrid.innerHTML = '';
  let totalGlobal = 0;
  let mejor = { status: null, rate: -Infinity };
  let peor = { status: null, rate: Infinity };
  Object.entries(apus).forEach(([status, rows]) => {
    if (status.toLowerCase() === 'global') return;
    const si = Number(rows.find((r) => r.Descripcion.toLowerCase().includes('si cont'))?.Dato || 0);
    const no = Number(rows.find((r) => r.Descripcion.toLowerCase().includes('no cont'))?.Dato || 0);
    const total = Number(rows.find((r) => r.Descripcion.toLowerCase().includes('tot'))?.Dato || si + no);
    const cumplimiento = total > 0 ? si / total : 0;
    totalGlobal += total;
    if (cumplimiento > mejor.rate) mejor = { status, rate: cumplimiento };
    if (cumplimiento < peor.rate) peor = { status, rate: cumplimiento };
    const complianceDeg = cumplimiento * 360;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="apu-header">
        <div>
          <div class="apu-title">${status}</div>
          <div class="apu-meta">Cumplimiento ${formatPercent(cumplimiento)}</div>
        </div>
        <span class="tag ${cumplimiento >= 0.5 ? 'success' : 'warn'}">${cumplimiento >= 0.5 ? 'On Track' : 'Atención'}</span>
      </div>
      <div class="apu-body">
        <div class="doughnut" style="background: conic-gradient(var(--primary) 0deg ${complianceDeg.toFixed(1)}deg, var(--danger) ${complianceDeg.toFixed(1)}deg 360deg)">
          <div class="doughnut-center">
            <div class="doughnut-title">Contratos</div>
            <div class="doughnut-value">${(total ? (si / total) * 100 : 0).toFixed(0)}%</div>
            <div class="doughnut-caption">Con contrato</div>
          </div>
        </div>
        <div class="bar-group">
          <div>
            <div class="bar-label"><span>Con contrato</span><span>${si}</span></div>
            <div class="bar"><div class="bar-fill" style="width: ${(total ? (si / total) * 100 : 0).toFixed(0)}%"></div></div>
          </div>
          <div>
            <div class="bar-label"><span>Sin contrato</span><span>${no}</span></div>
            <div class="bar"><div class="bar-fill danger" style="width: ${(total ? (no / total) * 100 : 0).toFixed(0)}%"></div></div>
          </div>
          <div class="bar-label muted">Total casos: ${total}</div>
        </div>
      </div>
    `;
    selectors.apuGrid.appendChild(card);
  });
  selectors.globalTotal.textContent = `Total conteos: ${totalGlobal}`;
  renderNarrative(mejor, peor);
}
function renderNarrative(mejor, peor) {
  if (!mejor.status || !peor.status) {
    selectors.narrative.textContent = 'Aún no hay suficientes datos para generar un resumen.';
    return;
  }
  selectors.narrative.innerHTML = `
    <strong>${mejor.status}</strong> lidera el cumplimiento con ${formatPercent(mejor.rate)},
    mientras que <strong>${peor.status}</strong> requiere atención inmediata (${formatPercent(peor.rate)}).
    Revisa la distribución de los conteos para equilibrar el desempeño y prioriza acciones correctivas en las lineas con baja cobertura.
  `;
}
function renderDashboard(data) {
  const grouped = groupByStatus(data);
  if (grouped.Global) renderGlobal(grouped.Global);
  renderAPU(grouped);
}
async function init() {
  selectors.narrative.textContent = 'Cargando datos...';
  selectors.refreshBtn.disabled = true;
  try {
    const data = await fetchKPI();
    renderDashboard(data);
  } catch (error) {
    showToast(error.message);
    selectors.narrative.textContent = 'No pudimos cargar la información. Intenta nuevamente en unos segundos.';
    console.error(error);
  } finally {
    selectors.refreshBtn.disabled = false;
  }
}
selectors.refreshBtn.addEventListener('click', init);
window.addEventListener('DOMContentLoaded', init);
