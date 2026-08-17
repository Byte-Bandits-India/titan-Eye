import * as XLSX from 'xlsx';

import type { Customer, OptometristRxValues, RxValues } from '../types';

function buildCustomerRow(cust: Customer) {
  const rx = cust.rxData;
  const opt = cust.optometristRxData;

  const autoRe: Partial<RxValues> = rx?.autoRefRe || {};
  const autoLe: Partial<RxValues> = rx?.autoRefLe || {};
  const pgpRe: Partial<RxValues> = rx?.pgpRe || {};
  const pgpLe: Partial<RxValues> = rx?.pgpLe || {};
  const finalRe: Partial<OptometristRxValues> = opt?.re || {};
  const finalLe: Partial<OptometristRxValues> = opt?.le || {};

  return [
    cust.lastUpdatedOn ? String(cust.lastUpdatedOn).split(',')[0] : new Date().toLocaleDateString(),
    cust.storeName || 'Store',
    cust.storeName || 'Store Location',
    cust.name || 'N/A',
    cust.age || '—',
    cust.gender || '—',
    cust.mobile || cust.customerType || '—',
    cust.callTakenBy || 'N/A',
    parseTimestampFormatted(cust.callStartTime),
    parseTimestampFormatted(cust.optometristCallStartTime),
    formatWaitTime(cust),
    parseTimestampFormatted(cust.lastUpdatedOn),
    cust.callActive ? 'Active' : 'Inactive',
    'Y/N',
    'N/A',
    cust.status || 'Created',
    cust.storeFeedback || '',
    cust.optometristFeedback || '',

    autoRe.sph || '0.00',
    autoRe.cyl || '0.00',
    autoRe.axis || '0',
    autoRe.prism || '0.00',
    autoRe.base || '0',
    autoRe.add || '0.00',
    autoLe.sph || '0.00',
    autoLe.cyl || '0.00',
    autoLe.axis || '0',
    autoLe.prism || '0.00',
    autoLe.base || '0',
    autoLe.add || '0.00',

    pgpRe.sph || '0.00',
    pgpRe.cyl || '0.00',
    pgpRe.axis || '0',
    pgpRe.prism || '0.00',
    pgpRe.base || '0',
    pgpRe.add || '0.00',
    pgpLe.sph || '0.00',
    pgpLe.cyl || '0.00',
    pgpLe.axis || '0',
    pgpLe.prism || '0.00',
    pgpLe.base || '0',
    pgpLe.add || '0.00',

    finalRe.sph || '0.00',
    finalRe.cyl || '0.00',
    finalRe.axis || '0',
    finalRe.prism || '0.00',
    finalRe.base || '0',
    finalRe.add || '0.00',
    finalLe.sph || '0.00',
    finalLe.cyl || '0.00',
    finalLe.axis || '0',
    finalLe.prism || '0.00',
    finalLe.base || '0',
    finalLe.add || '0.00',
  ];
}

function formatWaitTime(cust: Customer): string {
  if (!cust.callStartTime) {
    return '00m:00s';
  }

  const startMs = parseInt(cust.callStartTime, 10) || new Date(cust.callStartTime).getTime();

  if (isNaN(startMs)) {
    return '00m:00s';
  }

  const optometristCallStartTime = cust.optometristCallStartTime;
  const endMs = optometristCallStartTime
    ? parseInt(optometristCallStartTime, 10) || new Date(optometristCallStartTime).getTime()
    : cust.lastUpdatedOn
      ? parseInt(cust.lastUpdatedOn, 10) || new Date(cust.lastUpdatedOn).getTime()
      : Date.now();

  if (isNaN(endMs) || endMs < startMs) {
    return '00m:00s';
  }

  const diffSecs = Math.floor((endMs - startMs) / 1000);
  const capped = Math.min(diffSecs, 3540);
  const mins = Math.floor(capped / 60);
  const secs = capped % 60;

  return `${String(mins).padStart(2, '0')}m:${String(secs).padStart(2, '0')}s`;
}

function parseTimestampFormatted(val: null | number | string | undefined): string {
  if (!val) {
    return '—';
  }

  if (typeof val === 'number') {
    return new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const num = parseInt(val, 10);

  if (!isNaN(num) && String(num).length >= 10) {
    return new Date(num).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return String(val);
}

const GROUP_HEADER_ROW = [
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  'Auto Ref',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  'PGP',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  'Final RX',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
];

const COLUMN_HEADER_ROW = [
  'Date',
  'Store Code',
  'Location',
  'Customer Name',
  'Age',
  'Gender',
  'Customer Type',
  'Optometrist Name',
  'Ticket Raise Time',
  'Ticket Attended Time',
  'Time Taken',
  'Ticket Close Time',
  'Running Status',
  'Conversion',
  'Sales Order No',
  'Final Ticket Status',
  'Store comment',
  'Optometrist comment',
  'SPH-R',
  'CYL-R',
  'Axis-R',
  'Prism',
  'Base',
  'ADD',
  'SPH-L',
  'CYL-L',
  'Axis-L',
  'Prism',
  'Base',
  'ADD',
  'SPH-R',
  'CYL-R',
  'Axis-R',
  'Prism',
  'Base',
  'ADD',
  'SPH-L',
  'CYL-L',
  'Axis-L',
  'Prism',
  'Base',
  'ADD',
  'SPH-R',
  'CYL-R',
  'Axis-R',
  'Prism',
  'Base',
  'ADD',
  'SPH-L',
  'CYL-L',
  'Axis-L',
  'Prism',
  'Base',
  'ADD',
];

const REFERENCE_PARAMETERS_DATA = [
  ['Parameter', 'Maximum (+)', 'Minimum (-)', 'Remarks'],
  ['SPH (Sphere)', '+19.00 D', '-19.00 D', 'Supports both positive (+) and negative (-) powers'],
  ['CYL (Cylinder)', '0.00 D', '-8.75 D', 'Plus cylinder (+CYL) not supported'],
  ['Axis', '180°', '0°', 'Valid axis range: 0°–180°'],
  ['ADD', '+3.00 D', '-0.75 D', 'Reading addition power'],
  ['Prism', '10.00Δ', '0.00Δ', 'Prism power (if applicable)'],
  ['Base', '–', '–', 'Accepted values: Up, Down, In, Out'],
];

export function exportAllCustomersReport(customers: Customer[]) {
  const wb = generateCustomersWorkbook(customers);
  const filename = `Titan_Patients_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportSingleCustomerReport(cust: Customer) {
  const wb = generateCustomersWorkbook([cust]);
  const filename = `${cust.name ? cust.name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Patient'}_Report.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function generateCustomersWorkbook(customers: Customer[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const sheetData = [GROUP_HEADER_ROW, COLUMN_HEADER_ROW, ...customers.map(buildCustomerRow)];

  const ws1 = XLSX.utils.aoa_to_sheet(sheetData);

  ws1['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 20 },
    { wch: 6 },
    { wch: 8 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 18 },
    { wch: 24 },
    { wch: 24 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'Customer Report');

  const ws2 = XLSX.utils.aoa_to_sheet(REFERENCE_PARAMETERS_DATA);
  ws2['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Validation Parameters');

  return wb;
}
