import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CompanyContextService } from './company-context.service';

export const apiContextInterceptor: HttpInterceptorFn = (req, next) => {
  const context = inject(CompanyContextService);
  const url = req.url;

  // Toda consulta de negocio se segmenta por compañía. No se agregan
  // parámetros a endpoints de salud ni a recursos externos.
  if (!url.includes('/api/v1/')) {
    return next(req);
  }

  if (url.includes('/health')) {
    return next(req);
  }

  let params = req.params.set('empresaId', String(context.companyId()));

  if (context.siteId() !== null) {
    params = params.set('puntoVentaId', String(context.siteId()));
  }

  return next(req.clone({ params }));
};