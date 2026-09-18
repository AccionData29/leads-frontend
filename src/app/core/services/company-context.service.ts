import { Injectable, computed, signal } from '@angular/core';
import { CompanyOption, SiteOption } from '../models/lead.models';
import { COMPANIES, SITES } from '../config/tenant.config';

const COMPANY_KEY = 'leads.companyId';
const SITE_KEY = 'leads.siteId';

@Injectable({ providedIn: 'root' })
export class CompanyContextService {
  readonly companies = COMPANIES;
  readonly sites = SITES;

  readonly companyId = signal<number>(this.readCompanyId());
  readonly siteId = signal<number | null>(this.readSiteId());

  readonly company = computed<CompanyOption>(() =>
    this.companies.find(x => x.id === this.companyId()) ?? this.companies[0]
  );

  readonly availableSites = computed<SiteOption[]>(() =>
    this.sites.filter(x => x.companyId === this.companyId())
  );

  readonly site = computed<SiteOption | null>(() =>
    this.availableSites().find(x => x.id === this.siteId()) ?? null
  );

  setCompany(id: number): void {
    const company = this.companies.find(x => x.id === id);
    if (!company) return;

    this.companyId.set(id);
    localStorage.setItem(COMPANY_KEY, String(id));

    const currentSite = this.siteId();
    if (currentSite !== null && !this.sites.some(x => x.id === currentSite && x.companyId === id)) {
      this.setSite(null);
    }
  }

  setSite(id: number | null): void {
    if (id !== null && !this.sites.some(x => x.id === id && x.companyId === this.companyId())) {
      return;
    }
    this.siteId.set(id);
    if (id === null) localStorage.removeItem(SITE_KEY);
    else localStorage.setItem(SITE_KEY, String(id));
  }

  private readCompanyId(): number {
    const value = Number(localStorage.getItem(COMPANY_KEY));
    return this.companies.some(x => x.id === value) ? value : 1;
  }

  private readSiteId(): number | null {
    const value = Number(localStorage.getItem(SITE_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  }
}