import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { LeadsApiService } from '../../core/services/leads-api.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { LeadListItem, priorityLabel, statusLabel } from '../../core/models/lead.models';

function parseReasons(reasonsJson: string | null | undefined): string[] {
  if (!reasonsJson) { return []; }
  try {
    const parsed = JSON.parse(reasonsJson);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

interface ChannelSlice {
  name: string;
  count: number;
  percent: number;
  colorVar: string;
  path: string;
  showLabel: boolean;
  labelPos: { x: number; y: number };
  tooltipPos: { left: number; top: number };
}

const CHANNEL_LABELS: Record<string, string> = {
  'whatsapp': 'WhatsApp',
  'meta ads': 'Meta Ads',
  'formulario web': 'Formulario Web',
};
const MAX_DONUT_SLICES = 4;
const DONUT_CENTER = 100;
const DONUT_OUTER_R = 80;
const DONUT_INNER_R = 48;

function normalizeChannel(raw: string): string {
  const clean = (raw ?? '').trim();
  if (!clean) { return 'Sin canal'; }
  const lower = clean.toLowerCase();
  return CHANNEL_LABELS[lower] ?? clean.replace(/\b\w/g, c => c.toUpperCase());
}

function polarPoint(angleDeg: number, r: number): { x: number; y: number } {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: DONUT_CENTER + r * Math.cos(rad), y: DONUT_CENTER + r * Math.sin(rad) };
}

function donutSlicePath(startAngle: number, endAngle: number): string {
  const fullCircle = endAngle - startAngle >= 359.9;
  const gap = fullCircle ? 0 : 1.2;
  const s = startAngle + gap;
  const e = endAngle - gap;
  const largeArc = (e - s) > 180 ? 1 : 0;
  const startOuter = polarPoint(s, DONUT_OUTER_R);
  const endOuter = polarPoint(e, DONUT_OUTER_R);
  const endInner = polarPoint(e, DONUT_INNER_R);
  const startInner = polarPoint(s, DONUT_INNER_R);
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${DONUT_OUTER_R} ${DONUT_OUTER_R} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${DONUT_INNER_R} ${DONUT_INNER_R} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ');
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, NgClass],
  template: `
    <section class="page">
      <div class="page-heading">
        <div>
          <h2>Prioridad de gestión</h2>
          <p>Leads priorizados para la operación de hoy según compañía y sede.</p>
        </div>
        <button class="refresh" (click)="load()" [disabled]="loading()">
          {{ loading() ? 'Actualizando…' : '↻ Actualizar' }}
        </button>
      </div>

      @if (error()) {
        <div class="alert">
          <strong>No fue posible consultar el backend.</strong>
          <span>{{ error() }}</span>
        </div>
      }

      <div class="kpis">
        <article class="kpi">
          <span>Leads visibles</span>
          <strong>{{ leads().length | number }}</strong>
          <small>Segmentados por compañía/sede</small>
        </article>
        <article class="kpi">
          <span>Alta prioridad</span>
          <strong>{{ highPriority() | number }}</strong>
          <small>Atención comercial inmediata</small>
        </article>
        <article class="kpi">
          <span>Score promedio</span>
          <strong>{{ averageScore() | number:'1.0-0' }}%</strong>
          <small>Probabilidad/score del pipeline</small>
        </article>
        <article class="kpi">
          <span>Sin gestión</span>
          <strong>{{ untouched() | number }}</strong>
          <small>Oportunidad de recuperación</small>
        </article>
      </div>

      <div class="grid-2">
        <article class="card">
          <div class="card-head">
            <div>
              <span class="section-label">Distribución</span>
              <h3>Leads por temperatura</h3>
            </div>
          </div>
          <div class="priority-chart">
            <div class="bar-row">
              <span>Alta</span>
              <div class="bar"><i [style.width.%]="barWidth(highPriority())"></i></div>
              <strong>{{ highPriority() }}</strong>
            </div>
            <div class="bar-row">
              <span>Media</span>
              <div class="bar"><i [style.width.%]="barWidth(mediumPriority())"></i></div>
              <strong>{{ mediumPriority() }}</strong>
            </div>
            <div class="bar-row">
              <span>Baja</span>
              <div class="bar"><i [style.width.%]="barWidth(lowPriority())"></i></div>
              <strong>{{ lowPriority() }}</strong>
            </div>
          </div>
        </article>

        <article class="card">
          <div class="card-head">
            <div>
              <span class="section-label">Canales</span>
              <h3>Origen de los leads</h3>
            </div>
          </div>

          <div class="donut-card">
            <div class="donut-wrap">
              <svg viewBox="0 0 200 200">
                @for (slice of channelSlices(); track slice.name; let i = $index) {
                  <path
                    class="donut-slice"
                    [class.is-hovered]="hoveredSliceIndex() === i"
                    [attr.d]="slice.path"
                    [style.fill]="'var(' + slice.colorVar + ')'"
                    stroke="var(--card)"
                    stroke-width="3"
                    (mouseenter)="hoveredSliceIndex.set(i)"
                    (mouseleave)="hoveredSliceIndex.set(null)"
                  >
                    <title>{{ slice.name }}: {{ slice.count }} ({{ slice.percent | number:'1.0-0' }}%)</title>
                  </path>
                  @if (slice.showLabel) {
                    <text class="donut-slice-label" [attr.x]="slice.labelPos.x" [attr.y]="slice.labelPos.y">{{ slice.percent | number:'1.0-0' }}%</text>
                  }
                }
              </svg>
              <div class="donut-center">
                <strong>{{ leads().length | number }}</strong>
                <span>Leads</span>
              </div>
              @if (hoveredSlice(); as slice) {
                <div class="donut-tooltip" [style.left.%]="slice.tooltipPos.left" [style.top.%]="slice.tooltipPos.top">
                  <strong>{{ slice.name }}</strong>
                  <span>{{ slice.count }} leads · {{ slice.percent | number:'1.0-0' }}%</span>
                </div>
              }
            </div>

            <div class="donut-legend">
              @for (slice of channelSlices(); track slice.name; let i = $index) {
                <div
                  class="legend-row"
                  [class.is-hovered]="hoveredSliceIndex() === i"
                  (mouseenter)="hoveredSliceIndex.set(i)"
                  (mouseleave)="hoveredSliceIndex.set(null)"
                >
                  <span class="legend-swatch" [style.background]="'var(' + slice.colorVar + ')'"></span>
                  <div>
                    <strong>{{ slice.name }}</strong>
                    <span>{{ slice.count }} leads</span>
                  </div>
                  <span class="legend-pct">{{ slice.percent | number:'1.0-0' }}%</span>
                </div>
              } @empty {
                <span class="muted">Sin datos de canal.</span>
              }
            </div>
          </div>
        </article>
      </div>

      <article class="card">
        <div class="card-head">
          <div>
            <span class="section-label">Cola de trabajo</span>
            <h3>Leads prioritarios</h3>
          </div>
          <span class="muted">Ordenados por score descendente</span>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Lead</th>
                <th>Cliente</th>
                <th>Sede</th>
                <th>Canal</th>
                <th>Modelo</th>
                <th>Estado</th>
                <th>Score</th>
                <th>Motivos de priorización</th>
              </tr>
            </thead>
            <tbody>
              @for (lead of prioritizedLeads(); track lead.leadId) {
                <tr>
                  <td class="mono">#{{ lead.leadId }}</td>
                  <td>
                    <strong>{{ lead.nombreCliente }}</strong>
                    <small>{{ lead.ciudad || 'Sin ciudad' }}</small>
                  </td>
                  <td>{{ siteLabel(lead.puntoVentaId) }}</td>
                  <td>{{ lead.canal }}</td>
                  <td>{{ lead.modeloInteresTexto || 'Sin modelo' }}</td>
                  <td><span class="status" [ngClass]="statusClass(lead)">{{ priority(lead) }}</span></td>
                  <td><strong>{{ ((lead.score ?? 0) * 100) | number:'1.0-0' }}%</strong></td>
                  <td>
                    @if (loadingReasons()) {
                      <span class="muted">Cargando…</span>
                    } @else {
                      <div class="reason-list">
                        @for (reason of reasonsByLead().get(lead.leadId) ?? []; track reason) {
                          <span class="reason-chip">{{ reason }}</span>
                        } @empty {
                          <span class="reason-empty">Sin motivos registrados</span>
                        }
                      </div>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="empty">No hay leads para este contexto.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `
})
export class DashboardComponent {
  private readonly api = inject(LeadsApiService);
  private readonly context = inject(CompanyContextService);
  private readonly destroyRef = inject(DestroyRef);

  readonly leads = signal<LeadListItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly reasonsByLead = signal<Map<number, string[]>>(new Map());
  readonly loadingReasons = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.listAllLeads()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: rows => {
          this.leads.set(rows);
          this.loading.set(false);
          this.loadReasons(this.prioritizedLeads().map(x => x.leadId));
        },
        error: err => {
          this.loading.set(false);
          this.error.set(err?.error?.message ?? 'Verifique que Leads.Api esté ejecutándose y que el proxy apunte al backend.');
        }
      });
  }

  private loadReasons(leadIds: number[]): void {
    this.reasonsByLead.set(new Map());
    if (!leadIds.length) { return; }

    this.loadingReasons.set(true);
    forkJoin(
      leadIds.map(id => this.api.getScore(id).pipe(
        map(score => [id, parseReasons(score?.reasonsJson)] as const),
        catchError(() => of([id, [] as string[]] as const))
      ))
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(results => {
        this.reasonsByLead.set(new Map(results));
        this.loadingReasons.set(false);
      });
  }

  highPriority(): number { return this.leads().filter(x => this.priority(x) === 'Alta').length; }
  mediumPriority(): number { return this.leads().filter(x => this.priority(x) === 'Media').length; }
  lowPriority(): number { return this.leads().filter(x => this.priority(x) === 'Baja').length; }
  untouched(): number { return this.leads().filter(x => /sin gestión|nuevo/i.test(statusLabel(x.estadoGestion))).length; }

  averageScore(): number {
    const values = this.leads().map(x => Number(x.score)).filter(Number.isFinite);
    return values.length ? values.reduce((a,b) => a+b, 0) / values.length * 100 : 0;
  }

  barWidth(value: number): number {
    const max = Math.max(this.highPriority(), this.mediumPriority(), this.lowPriority(), 1);
    return value / max * 100;
  }

  prioritizedLeads(): LeadListItem[] {
    return [...this.leads()].sort((a,b) => Number(b.score ?? 0) - Number(a.score ?? 0)).slice(0, 12);
  }

  readonly hoveredSliceIndex = signal<number | null>(null);

  channelSlices(): ChannelSlice[] {
    const rows = this.leads();
    const total = rows.length || 1;
    const counts = new Map<string, number>();
    rows.forEach(x => {
      const name = normalizeChannel(x.canalNormalizado || x.canal);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });

    let entries = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    if (entries.length > MAX_DONUT_SLICES) {
      const head = entries.slice(0, MAX_DONUT_SLICES);
      const tailCount = entries.slice(MAX_DONUT_SLICES).reduce((sum, x) => sum + x.count, 0);
      entries = [...head, { name: 'Otro', count: tailCount }];
    }

    let cumulative = 0;
    return entries.map((entry, i) => {
      const startAngle = cumulative / total * 360;
      cumulative += entry.count;
      const endAngle = cumulative / total * 360;
      const midAngle = (startAngle + endAngle) / 2;
      const percent = entry.count / total * 100;
      const labelPos = polarPoint(midAngle, (DONUT_OUTER_R + DONUT_INNER_R) / 2);
      const tooltipPoint = polarPoint(midAngle, DONUT_OUTER_R + 6);
      return {
        name: entry.name,
        count: entry.count,
        percent,
        colorVar: i < MAX_DONUT_SLICES ? `--series-${i + 1}` : '--series-other',
        path: donutSlicePath(startAngle, endAngle),
        showLabel: percent >= 6,
        labelPos,
        tooltipPos: { left: tooltipPoint.x / 200 * 100, top: tooltipPoint.y / 200 * 100 },
      };
    });
  }

  hoveredSlice(): ChannelSlice | null {
    const i = this.hoveredSliceIndex();
    if (i === null) { return null; }
    return this.channelSlices()[i] ?? null;
  }

  priority(lead: LeadListItem): string {
    const fromApi = priorityLabel(lead.prioridad);
    if (fromApi) { return fromApi; }
    const score = Number(lead.score ?? 0);
    return score >= .7 ? 'Alta' : score >= .4 ? 'Media' : 'Baja';
  }

  statusClass(lead: LeadListItem): string {
    return this.priority(lead).toLowerCase();
  }

  siteLabel(id: number): string {
    return this.context.sites.find(x => x.id === id)?.code ?? `PV-${id}`;
  }
}