import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LeadsApiService } from '../../core/services/leads-api.service';
import { CompanyContextService } from '../../core/services/company-context.service';
import { LeadListItem, priorityLabel } from '../../core/models/lead.models';

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe, NgClass],
  template: `
    <section class="page">
      <div class="page-heading">
        <div>
          <h2>Mis leads</h2>
          <p>Cola de gestión segmentada por compañía y sede.</p>
        </div>
        <button class="refresh" (click)="load()">↻ Actualizar</button>
      </div>

      <div class="filters card">
        <label>
          <span>Estado</span>
          <select [(ngModel)]="status" (ngModelChange)="load()">
            <option [ngValue]="''">Todos</option>
            <option>Nuevo</option>
            <option>Contactado</option>
            <option>En gestión</option>
            <option>Sin gestión</option>
            <option>Cerrado</option>
            <option>Perdido</option>
          </select>
        </label>
        <div class="filter-context">
          <span>Contexto</span>
          <strong>{{ context.company().code }} · {{ context.site()?.code ?? 'Todas las sedes' }}</strong>
        </div>
      </div>

      @if (error()) {
        <div class="alert">{{ error() }}</div>
      }

      <article class="card">
        <div class="card-head">
          <div>
            <span class="section-label">{{ leads().length }} resultados</span>
            <h3>Gestión diaria</h3>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Lead</th><th>Registro</th><th>Cliente</th><th>Sede</th>
                <th>Canal</th><th>Interés</th><th>Estado</th><th>Score</th>
              </tr>
            </thead>
            <tbody>
              @for (lead of leads(); track lead.leadId) {
                <tr>
                  <td class="mono">#{{ lead.leadId }}</td>
                  <td>{{ lead.fechaRegistro | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td><strong>{{ lead.nombreCliente }}</strong><small>{{ lead.ciudad || '—' }}</small></td>
                  <td>{{ siteLabel(lead.puntoVentaId) }}</td>
                  <td>{{ lead.canal }}</td>
                  <td>{{ lead.modeloInteresTexto || '—' }}</td>
                  <td><span class="status" [ngClass]="priority(lead).toLowerCase()">{{ priority(lead) }}</span></td>
                  <td>{{ ((lead.score ?? 0) * 100) | number:'1.0-0' }}%</td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="empty">No hay leads para los filtros seleccionados.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `
})
export class LeadsComponent {
  private readonly api = inject(LeadsApiService);
  readonly context = inject(CompanyContextService);
  private readonly destroyRef = inject(DestroyRef);

  readonly leads = signal<LeadListItem[]>([]);
  readonly error = signal('');
  status = '';

  constructor() {
    this.load();
  }

  load(): void {
    this.error.set('');
    this.api.listLeads(this.status || null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: rows => this.leads.set(rows),
        error: err => this.error.set(err?.error?.message ?? 'No fue posible consultar los leads.')
      });
  }

  priority(lead: LeadListItem): string {
    const fromApi = priorityLabel(lead.prioridad);
    if (fromApi) { return fromApi; }
    const score = Number(lead.score ?? 0);
    return score >= .7 ? 'Alta' : score >= .4 ? 'Media' : 'Baja';
  }

  siteLabel(id: number): string {
    return this.context.sites.find(x => x.id === id)?.code ?? `PV-${id}`;
  }
}