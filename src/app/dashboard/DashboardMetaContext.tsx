// Dashboard metadata context — used by layout and all dashboard pages
'use client';

import { createContext, useContext, useState } from 'react';

export interface DashboardMeta {
  label?: string;
  lastUpdated?: Date;
}

export interface DashboardMetaContextValue {
  meta: DashboardMeta;
  setMeta: (m: DashboardMeta) => void;
}

export const DashboardMetaContext = createContext<DashboardMetaContextValue>({
  meta: {},
  setMeta: () => {},
});

export function useDashboardMeta() {
  return useContext(DashboardMetaContext);
}
