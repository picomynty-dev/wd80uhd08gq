import { esc, formatDate, isoDay } from './utils.js?v=51';
const number = n => new Intl.NumberFormat('es-ES',{maximumFractionDigits:1}).format(n);
const signed = n => `${n > 0 ? '+' : ''}${number(n)}`;

export function weightChartData(history = [], range = '90', now = new Date()) {
  const end = new Date(now); end.setHours(23,59,59,999);
  const byDate = new Map();
  for (const item of history) {
    const date = String(item.date || '').slice(0,10);
    const time = new Date(`${date}T12:00:00`).getTime();
    const weight = Number(item.weight);
    if (Number.isFinite(time) && time <= end.getTime() && weight > 0 && Number.isFinite(weight)) byDate.set(date,{date,time,weight});
  }
  const all = [...byDate.values()].sort((a,b) => a.time - b.time);
  const days = range === 'all' ? null : range === '30' ? 30 : 90;
  const start = new Date(end); start.setHours(0,0,0,0); if(days) start.setDate(start.getDate() - days + 1);
  const previousStart = new Date(start); if(days) previousStart.setDate(start.getDate() - days);
  const points = all.filter(p => !days || p.time >= start.getTime());
  const previous = days ? all.filter(p => p.time >= previousStart.getTime() && p.time < start.getTime()) : [];
  const average = list => list.length ? list.reduce((sum,p) => sum+p.weight,0)/list.length : null;
  const mean = average(points), previousMean = average(previous);
  return {points, mean, previousMean, comparison: mean !== null && previousMean !== null ? mean-previousMean : null,
    change: points.length > 1 ? points.at(-1).weight-points[0].weight : null,
    startLabel: days ? isoDay(start) : points[0]?.date, endLabel: isoDay(end), days};
}

export function renderWeightChart(history, range = '90', now = new Date()) {
  const data = weightChartData(history,range,now), p = data.points;
  const tabs = `<div class="v51-chart-tabs" role="group" aria-label="Periodo del peso">${[['30','30 días'],['90','90 días'],['all','Todo']].map(([value,label])=>`<button type="button" data-action="weight-range" data-range="${value}" aria-pressed="${range === value}">${label}</button>`).join('')}</div>`;
  if(!p.length) return `${tabs}<p class="v51-chart-empty">No hay mediciones en este periodo. Prueba «Todo» o registra tu peso.</p>`;
  const min = Math.floor((Math.min(...p.map(x=>x.weight))-0.5)*2)/2;
  const max = Math.ceil((Math.max(...p.map(x=>x.weight))+0.5)*2)/2;
  const from = p[0].time, span = p.at(-1).time-from || 1;
  const x = item => p.length === 1 ? 320 : 58+(item.time-from)/span*532;
  const y = weight => 182-(weight-min)/(max-min)*148;
  const coords = p.map(item=>`${x(item).toFixed(2)},${y(item.weight).toFixed(2)}`).join(' ');
  const grid = [0,1,2,3].map(i=>{const value=min+(max-min)*i/3, py=y(value);return `<line x1="58" x2="590" y1="${py}" y2="${py}"/><text x="48" y="${py+4}" text-anchor="end">${number(value)}</text>`;}).join('');
  const chart = `<svg class="v51-weight-chart" viewBox="0 0 640 235" role="img" aria-label="Peso en kilogramos. ${p.length} mediciones desde ${esc(formatDate(p[0].date))} hasta ${esc(formatDate(p.at(-1).date))}. Los valores completos están debajo.">
    <g class="v51-chart-grid">${grid}<text x="18" y="16">kg</text></g>
    ${p.length > 1 ? `<polygon class="v51-chart-area" points="${x(p[0])},182 ${coords} ${x(p.at(-1))},182"/>` : ''}
    <line class="v51-chart-mean" x1="58" x2="590" y1="${y(data.mean)}" y2="${y(data.mean)}"/>
    <polyline class="v51-chart-line" points="${coords}"/>
    ${p.map((item,i)=>`<circle class="v51-chart-point" cx="${x(item)}" cy="${y(item.weight)}" r="${i === p.length-1 ? 5 : 3.5}"><title>${esc(formatDate(item.date))}: ${number(item.weight)} kg</title></circle>`).join('')}
    <text class="v51-chart-end" x="${x(p.at(-1))}" y="${y(p.at(-1).weight)-12}" text-anchor="${p.length===1?'middle':'end'}">${number(p.at(-1).weight)} kg</text>
    <g class="v51-chart-grid"><text x="58" y="212">${esc(formatDate(p[0].date))}</text>${p.length>1?`<text x="590" y="212" text-anchor="end">${esc(formatDate(p.at(-1).date))}</text>`:''}</g></svg>`;
  return `<div class="v51-weight-panel">${tabs}<div class="v51-weight-metrics"><span><small>Cambio en el periodo</small><strong>${data.change === null ? '—' : signed(data.change)+' kg'}</strong></span><span><small>Media registrada</small><strong>${number(data.mean)} kg</strong></span><span><small>Media vs. periodo anterior</small><strong>${data.comparison === null ? '—' : signed(data.comparison)+' kg'}</strong></span></div>${chart}<p class="v51-chart-legend"><i></i>Mediciones <b></b>Media · ${p.length} registro${p.length===1?'':'s'}</p><p class="muted small">${data.days ? 'Comparación de medias con los '+data.days+' días anteriores; solo se usan los días con medición.' : 'Todos los registros disponibles; sin periodo anterior de comparación.'} ${data.previousMean === null && data.days ? 'Sin datos suficientes del periodo anterior.' : ''}</p><details class="v51-chart-table"><summary>Ver valores y fechas</summary><div><table><thead><tr><th>Fecha</th><th>Peso</th><th>Cambio anterior</th></tr></thead><tbody>${p.map((item,i)=>`<tr><td>${esc(formatDate(item.date))}</td><td>${number(item.weight)} kg</td><td>${i?signed(item.weight-p[i-1].weight)+' kg':'—'}</td></tr>`).join('')}</tbody></table></div></details></div>`;
}
