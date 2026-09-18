import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LeadsApiService } from '../../core/services/leads-api.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { LeadListItem } from '../../core/models/lead.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, DatePipe, CurrencyPipe, NgClass],
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
          <div class="channel-list">
            @for (channel of channelRows(); track channel.name) {
              <div class="channel-row">
                <div>
                  <strong>{{ channel.name }}</strong>
                  <span>{{ channel.count }} leads</span>
                </div>
                <strong>{{ channel.percent | number:'1.0-0' }}%</strong>
              </div>
            }
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
                  <td><span class="status" [ngClass]="statusClass(lead)">{{ lead.prioridad || lead.estadoGestion }}</span></td>
                  <td><strong>{{ ((lead.score ?? 0) * 100) | number:'1.0-0' }}%</strong></td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="empty">No hay leads para este contexto.</td></tr>
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

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.listAllLeads()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: rows => { this.leads.set(rows); this.loading.set(false); },
        error: err => {
          this.loading.set(false);
          this.error.set(err?.error?.message ?? 'Verifique que Leads.Api esté ejecutándose y que el proxy apunte al backend.');
        }
      });
  }

  highPriority(): number { return this.leads().filter(x => this.priority(x) === 'Alta').length; }
  mediumPriority(): number { return this.leads().filter(x => this.priority(x) === 'Media').length; }
  lowPriority(): number { return this.leads().filter(x => this.priority(x) === 'Baja').length; }
  untouched(): number { return this.leads().filter(x => /sin gestión|nuevo/i.test(x.estadoGestion)).length; }

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

  channelRows(): Array<{name:string; count:number; percent:number}> {
    const rows = this.leads();
    const total = rows.length || 1;
    const counts = new Map<string, number>();
    rows.forEach(x => counts.set(x.canal, (counts.get(x.canal) ?? 0) + 1));
    return [...counts.entries()]
      .map(([name,count]) => ({name,count,percent:count/total*100}))
      .sort((a,b) => b.count-a.count);
  }

  priority(lead: LeadListItem): string {
    return lead.prioridad || (Number(lead.score ?? 0) >= .7 ? 'Alta' : Number(lead.score ?? 0) >= .4 ? 'Media' : 'Baja');
  }

  statusClass(lead: LeadListItem): string {
    return this.priority(lead).toLowerCase();
  }

  siteLabel(id: number): string {
    return this.context.sites.find(x => x.id === id)?.code ?? `PV-${id}`;
  }
}