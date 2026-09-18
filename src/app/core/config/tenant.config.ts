import { CompanyOption, SiteOption } from '../models/lead.models';

export const COMPANIES: CompanyOption[] = [
  { id: 1, code: 'EMP-01', name: 'Comercializadora Norte' },
  { id: 2, code: 'EMP-02', name: 'Comercializadora Centro' },
  { id: 3, code: 'EMP-03', name: 'Comercializadora Costa' }
];

/**
 * Las sedes corresponden al punto_venta_id del dataset.
 * La relación compañía -> sedes está modelada explícitamente para impedir
 * que el selector permita mezclar sedes de otra compañía.
 */
export const SITES: SiteOption[] = [
  ...[1,2,3,4,5].map(id => ({ id, code: `PV-${String(id).padStart(3,'0')}`, name: `Sede ${String(id).padStart(2,'0')}`, companyId: 1 })),
  ...[6,7,8,9,10].map(id => ({ id, code: `PV-${String(id).padStart(3,'0')}`, name: `Sede ${String(id).padStart(2,'0')}`, companyId: 2 })),
  ...[11,12,13,14,15].map(id => ({ id, code: `PV-${String(id).padStart(3,'0')}`, name: `Sede ${String(id).padStart(2,'0')}`, companyId: 3 }))
];