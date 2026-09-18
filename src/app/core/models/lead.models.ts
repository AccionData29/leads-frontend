export type LeadStatus =
  | 'Nuevo'
  | 'Contactado'
  | 'En gestión'
  | 'Cerrado'
  | 'Perdido'
  | 'Sin gestión'
  | string;

export type LeadPriority = 'Alta' | 'Media' | 'Baja' | string;

export interface LeadListItem {
  leadId: number;
  fechaRegistro: string;
  canal: string;
  canalNormalizado?: string | null;
  empresaId: number;
  puntoVentaId: number;
  nombreCliente: string;
  ciudad?: string | null;
  modeloInteresTexto?: string | null;
  estadoGestion: LeadStatus;
  prioridad?: LeadPriority | null;
  score?: number | null;
  asesorId?: number | null;
}

export interface LeadDetail extends LeadListItem {
  telefono?: string | null;
  email?: string | null;
  fechaPrimerContacto?: string | null;
  campania?: string | null;
}

export interface ScoreDto {
  leadId: number;
  historicalProbability: number;
  finalScore: number;
  priority: LeadPriority;
  reasonsJson: string;
  modelVersion: string;
  createdAt: string;
}

export interface AssignmentDto {
  leadId: number;
  asesorId: number;
  assignedAt: string;
  reason: string;
}

export interface AdvisorDto {
  asesorId: number;
  nombre: string;
  puntoVentaId: number;
  empresaId: number;
  capacidadDiariaLeads: number;
  activo: boolean;
}

export interface MotorcycleDto {
  sku: string;
  marca: string;
  linea: string;
  cilindraje: number;
  segmento: string;
  precioLista: number;
  puntosVentaDisponibles: number;
  unidadesDisponibles: number;
}

export interface PipelineRunDto {
  runId: string;
  status: string;
  startedAt: string;
  finishedAt?: string | null;
  summaryJson?: string | null;
  error?: string | null;
}

export interface CompanyOption {
  id: number;
  code: string;
  name: string;
}

export interface SiteOption {
  id: number;
  code: string;
  name: string;
  companyId: number;
}

export interface LeadFilters {
  companyId: number;
  siteId: number | null;
  status: string | null;
}

/** Backend serializes LeadPriority/LeadStatus as their numeric enum value, not the name. */
const PRIORITY_BY_CODE: Record<number, LeadPriority> = { 0: 'Baja', 1: 'Media', 2: 'Alta' };
const STATUS_BY_CODE: Record<number, LeadStatus> = {
  0: 'Nuevo', 1: 'Contactado', 2: 'En gestión', 3: 'Cita agendada', 4: 'Cerrado', 5: 'Perdido',
};

export function priorityLabel(value: unknown): string {
  if (typeof value === 'number') { return PRIORITY_BY_CODE[value] ?? String(value); }
  return typeof value === 'string' && value ? value : '';
}

export function statusLabel(value: unknown): string {
  if (typeof value === 'number') { return STATUS_BY_CODE[value] ?? String(value); }
  return typeof value === 'string' && value ? value : '';
}