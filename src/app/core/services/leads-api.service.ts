import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { expand, map, reduce } from 'rxjs/operators';
import { APP_CONFIG } from '../config/app.config';
import {
  AdvisorDto, AssignmentDto, LeadDetail, LeadListItem, PipelineRunDto,
  MotorcycleDto, ScoreDto
} from '../models/lead.models';

@Injectable({ providedIn: 'root' })
export class LeadsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = APP_CONFIG.apiBaseUrl;

  listLeads(status?: string | null, page = 1, pageSize = APP_CONFIG.pageSize): Observable<LeadListItem[]> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);
    if (status) params = params.set('status', status);
    return this.http.get<LeadListItem[]>(`${this.base}/leads`, { params });
  }

  listAllLeads(status?: string | null, pageSize = APP_CONFIG.pageSize): Observable<LeadListItem[]> {
    const fetchPage = (page: number): Observable<LeadListItem[]> => {
      let params = new HttpParams()
        .set('page', page)
        .set('pageSize', pageSize);
      if (status) params = params.set('status', status);
      return this.http.get<LeadListItem[]>(`${this.base}/leads`, { params });
    };

    return fetchPage(1).pipe(
      expand((rows, index) => rows.length < pageSize ? [] : fetchPage(index + 2)),
      reduce((all, rows) => all.concat(rows), [] as LeadListItem[])
    );
  }

  getLead(id: number): Observable<LeadDetail> {
    return this.http.get<LeadDetail>(`${this.base}/leads/${id}`);
  }

  getScore(id: number): Observable<ScoreDto> {
    return this.http.get<ScoreDto>(`${this.base}/leads/${id}/score`);
  }

  getAssignment(id: number): Observable<AssignmentDto> {
    return this.http.get<AssignmentDto>(`${this.base}/leads/${id}/assignment`);
  }

  advisors(active = true): Observable<AdvisorDto[]> {
    return this.http.get<AdvisorDto[]>(`${this.base}/advisors`, {
      params: new HttpParams().set('activo', active)
    });
  }

  motorcycles(): Observable<MotorcycleDto[]> {
    return this.http.get<MotorcycleDto[]>(`${this.base}/motorcycles`);
  }

  pipelineRuns(page = 1, pageSize = 20): Observable<PipelineRunDto[]> {
    return this.http.get<PipelineRunDto[]>(`${this.base}/pipeline-runs`, {
      params: new HttpParams().set('page', page).set('pageSize', pageSize)
    });
  }
}