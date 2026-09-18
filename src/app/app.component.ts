import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CompanyContextService } from './core/services/company-context.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">L</div>
          <div>
            <strong>Leads Intelligence</strong>
            <span>Gestión comercial</span>
          </div>
        </div>

        <nav class="nav">
          <a routerLink="/dashboard" routerLinkActive="active">
            <span>▦</span> Dashboard
          </a>
          <a routerLink="/leads" routerLinkActive="active">
            <span>◉</span> Mis leads
          </a>
        </nav>

        <div class="sidebar-note">
          <span class="dot"></span>
          Contexto activo
          <strong>{{ context.company().code }}</strong>
          <small>{{ context.site()?.code ?? 'Todas las sedes' }}</small>
        </div>
      </aside>

      <main class="main">
        <header class="topbar">
          <div>
            <div class="eyebrow">OPERACIÓN COMERCIAL</div>
            <h1>{{ context.company().name }}</h1>
          </div>

          <div class="selectors">
            <label>
              <span>Compañía</span>
              <select [value]="context.companyId()" (change)="onCompanyChange($event)">
                @for (company of context.companies; track company.id) {
                  <option [value]="company.id">{{ company.code }} · {{ company.name }}</option>
                }
              </select>
            </label>

            <label>
              <span>Sede</span>
              <select [value]="context.siteId() ?? ''" (change)="onSiteChange($event)">
                <option value="">Todas las sedes</option>
                @for (site of context.availableSites(); track site.id) {
                  <option [value]="site.id">{{ site.code }} · {{ site.name }}</option>
                }
              </select>
            </label>
          </div>
        </header>

        <div class="company-banner">
          <div>
            <span class="banner-label">Vista segmentada</span>
            <strong>{{ context.company().code }} · {{ context.company().name }}</strong>
            <span>{{ context.site()?.name ?? 'Consolidado de todas las sedes de la compañía' }}</span>
          </div>
          <span class="segmentation-badge">Empresa + sede</span>
        </div>

        <router-outlet />
      </main>
    </div>
  `
})
export class AppComponent {
  readonly context = inject(CompanyContextService);

  onCompanyChange(event: Event): void {
    this.context.setCompany(Number((event.target as HTMLSelectElement).value));
  }

  onSiteChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.context.setSite(value ? Number(value) : null);
  }
}