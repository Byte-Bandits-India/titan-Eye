import moment from 'moment'

export const arabicRegex = /[\u0600-\u06FF]/

export const YES_NO_OPTIONS = [
  { label: 'Yes', value: 'Yes' },
  { label: 'No', value: 'No' }
]

export const DEFAULT_TAX_ON_DATA = [
  { label: 'Inclusive', value: 'Inclusive' },
  { label: 'Exclusive', value: 'Exclusive' },
  { label: 'Both', value: 'Both' }
]

export const TAX_OPTIONS = [
  { label: 'VAT', value: 'VAT' },
  { label: 'GST', value: 'GST' },
  { label: 'TPN', value: 'TPN' }
]

export const INCOME_KIND_OPTIONS = [
  { label: 'Simplified Tax Invoice (B2C)', value: 'Simplified-Invoice', invoiceType: 'Invoice' },
  { label: 'Direct Tax Invoice (B2B)', value: 'Invoice', invoiceType: 'Invoice' },
  { label: 'Sales Tax Invoice (B2B)', value: 'Sales-Invoice', invoiceType: 'Invoice' },
  // { label: 'Recurring Invoice (B2B)', value: 'Recurring-Invoice', invoiceType: 'Invoice' },
  { label: 'Simplified Tax Debit Invoice (B2C)', value: 'Simplified-Debit-Note', invoiceType: 'Debit-Note' },
  { label: 'Direct Tax Debit Invoice (B2B)', value: 'Debit-Note', invoiceType: 'Debit-Note' },
  { label: 'Quick Invoice (B2C)', value: 'Quick-Invoice', invoiceType: 'Invoice' }
]

export const CREDIT_KIND_OPTIONS = [
  { label: 'Simplified invoice based Credit note', value: 'Simplified-Credit-Note' },
  { label: 'Direct Credit Note', value: 'Direct-Credit-Note' },
  { label: 'Tax Invoice based credit note', value: 'Credit-Note' }
]

export const EXPENSE_KIND_OPTIONS = [
  { label: 'Direct Supplier Invoice', value: 'Invoice' },
  { label: 'PO based Supplier Invoice', value: 'Purchase-Invoice' }
]

export const DEBIT_KIND_OPTIONS = [
  { label: 'Direct Debit Note', value: 'Direct-Debit-Note' },
  { label: 'Tax Invoice based debit note', value: 'Debit-Note' }
]

export const MASTER_OPTION_TYPES = [
  { label: 'Service Module', value: 'ServiceModule' },
  { label: 'Service Category', value: 'ServiceCategory' },
  { label: 'Service Type', value: 'ServiceType' },
  { label: 'Income Type', value: 'IncomeType' },
  { label: 'Expense Type', value: 'ExpenseType' },
  { label: 'Account Type', value: 'AccountType' },
  { label: 'Payment Type', value: 'PaymentType' },
  { label: 'Unit Of Measurement', value: 'UnitOfMeasurement' },
  { label: 'Material Type', value: 'MaterialType' },
  { label: 'Material Group', value: 'MaterialGroup' },
  { label: 'Weight Unit', value: 'WeightUnit' },
  { label: 'Volume Unit', value: 'VolumeUnit' },
  { label: 'Material Status', value: 'MaterialStatus' },
  { label: 'Language Code', value: 'LanguageCode' },
  { label: 'Costing Type', value: 'CostingType' },
  { label: 'Pay Term', value: 'PayTerm' },
  { label: 'Nationality', value: 'Nationality' },
  { label: 'Type Of Visa', value: 'TypeOfVisa' },
  { label: 'Type Of Visa Entry', value: 'TypeOfVisaEntry' },
  { label: 'Relationship', value: 'Relationship' },
  { label: 'Location', value: 'Location' },
  { label: 'Customs', value: 'Customs' },
  { label: 'Supplier Charges', value: 'SupplierCharges' },
  { label: 'Employee Category', value: 'EmployeeCategory' },
  { label: 'Purchase Request Type', value: 'PurchaseRequestType' },
  { label: 'Asset Group', value: 'AssetGroup' },
  { label: 'Color', value: 'Color' },
  { label: 'Product Line', value: 'ProductLine' },
  { label: 'Color Front', value: 'colorFront' },
  { label: 'Color Back', value: 'ColorBack' },
  { label: 'Print Mode', value: 'PrintMode' },
  { label: 'Customer Group', value: 'CustomerGroup' },
  { label: 'Vendor Group', value: 'VendorGroup' },
  { label: 'Resources', value: 'resources' },
  { label: 'Portfolio', value: 'portfolio' },
  { label: 'Promotion', value: 'promotion' },
  { label: 'CRM Sources', value: 'crm' },
  { label: 'Products', value: 'products' },
  { label: 'Industry', value: 'industry' },
  { label: 'Lead Classification', value: 'classification' },
  { label: 'Duration', value: 'duration' },
  { label: 'Material Attribute', value: 'MaterialAttribute' },
  { label: 'Trade Term', value: 'TradeTerm' },
  { label: 'Cycle Count Reason', value: 'CycleCountReason' },
  { label: 'Instruction Note', value: 'InstructionNote' },
  { label: 'Employment Status', value: 'EmploymentStatus' },
  { label: 'Skill', value: 'Skill' },
  { label: 'Project Status', value: 'ProjectStatus' },
  { label: 'Expense Claim Type', value: 'ExpenseClaimType' },
  { label: 'Production Order Category', value: 'ProductionOrderCategory' },
  { label: 'Production Order Subcategory', value: 'ProductionOrderSubcategory' },
  { label: 'Project Estimation Others', value: 'ProjectEstimationOthers' },
  { label: 'Sales Type', value: 'SalesType' },
  { label: 'Sales Sub Type', value: 'SalesSubType' },
  { label: 'Project Task Priority', value: 'ProjectTaskPriority' },
  { label: 'Project Task Status', value: 'ProjectTaskStatus' },
  { label: 'Production Scrap Reason', value: 'ProductionScrapReason' },
  { label: 'Service Group', value: 'ServiceGroup' }
] as const

export type MasterOptionTypes = typeof MASTER_OPTION_TYPES[number]['value']

export const INVOICE_STATUS_OPTIONS = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Sent', value: 'Sent' },
  { label: 'Partially Paid', value: 'PartiallyPaid' },
  { label: 'Paid', value: 'Paid' }
]

export const CLIENT_TYPE_OPTIONS = [
  { label: 'Customer', value: 'Customer' },
  { label: 'Vendor', value: 'Vendor' }
]

export const BUSINESS_TYPE_OPTIONS = [
  { label: 'Company', value: 'Company' },
  { label: 'Individual', value: 'Individual' },
  { label: 'OneTime', value: 'OneTime' }
]

export const WAGE_MODE = [
  { label: 'Hourly', value: 'Hourly' },
  { label: 'Daily', value: 'Daily' },
  { label: 'Monthly', value: 'Monthly' }
]

export const STATUS = [
  { label: 'Active', value: 'Active' },
  { label: 'InActive', value: 'InActive' }
]

export const ACCESS_ARR = [
  'add-company',
  'edit-company',
  'divisions',
  'add-division',
  'edit-division',
  'roles',
  'add-role',
  'edit-role',
  'users',
  'add-user',
  'edit-user',
  'currencies',
  'add-currency',
  'edit-currency',
  'exchange-rates',
  'add-exchange-rate',
  'edit-exchange-rate',
  'categories',
  'add-category',
  'edit-category',
  'options',
  'add-option',
  'edit-option',
  'custom-templates',
  'add-custom-template',
  'edit-custom-template',
  'master-upload',
  'numbering-series',
  'company-configurations',
  'clients',
  'add-client',
  'edit-client',
  'products',
  'add-product',
  'edit-product',
  'projects',
  'add-project',
  'edit-project',
  'project-employee-rates',
  'add-project-employee-rate',
  'edit-project-employee-rate',
  'time-entries',
  'time-reports',
  'time-reports-all',
  'warehouses',
  'add-warehouse',
  'edit-warehouse',
  'warehouse-products',
  'add-warehouse-product',
  'edit-warehouse-product',
  'customer-prices',
  'add-customer-price',
  'edit-customer-price',
  'sales-quotations',
  'add-sales-quotation',
  'edit-sales-quotation',
  'sales-orders',
  'add-sales-order',
  'edit-sales-order',
  'sales-deliveries',
  'add-sales-delivery',
  'edit-sales-delivery',
  'sales-invoices',
  'add-income',
  'edit-sales-invoice',
  'vendor-prices',
  'add-vendor-price',
  'edit-vendor-price',
  'purchase-orders',
  'add-purchase-order',
  'edit-purchase-order',
  'purchase-receipts',
  'add-purchase-receipt',
  'edit-purchase-receipt',
  'customs-clearances',
  'add-customs-clearance',
  'edit-customs-clearance',
  'purchase-invoices',
  'add-expense',
  'edit-purchase-invoice',
  'stock-receipts',
  'add-stock-receipt',
  'edit-stock-receipt',
  'stock-issues',
  'add-stock-issue',
  'edit-stock-issue',
  'stock-checks',
  'stock-transfers',
  'add-stock-transfer',
  'edit-stock-transfer',
  'material-reports',
  'open-sales-reports',
  'open-purchase-reports',
  'financial-years',
  'account-groups',
  'account-charts',
  'account-setups',
  'finance-report-configuration',
  'incomes',
  'add-income',
  'edit-income',
  'income-receipts',
  'from-timesheet',
  'expenses',
  'add-expense',
  'edit-expense',
  'expense-payments',
  'upload-income-invoices',
  'upload-expense-invoices',
  'generate-invoice',
  'finance-postings',
  'journal-vouchers',
  'add-journal-voucher',
  'edit-journal-voucher',
  'sales-persons',
  'add-sales-person',
  'edit-sales-person',
  'terms-and-conditions',
  'add-terms-and-condition',
  'edit-terms-and-condition',
  'outbound-transmissions',
  'inbound-transmissions',
  'employees',
  'add-employee',
  'edit-employee',
  'asset',
  'transfer',
  'change-job',
  'change-compensation',
  'absence-management',
  'team-absence-application-list',
  'terminations',
  'goals',
  'goal-assignment',
  'appraisal-review',
  'taxdata',
  'MWST',
  'yearlyPayroll',
  'paymasters',
  'payrolls'
]

export const TRANSACTION_STATUS = [
  { label: 'Accepted', value: 'Accepted' },
  { label: 'Rejected', value: 'Rejected' }
]

export const STOCK_STATUS = [
  { label: 'Created', value: 'Created' },
  { label: 'Posted', value: 'Posted' }
]

export const FINANCIAL_REPORT = [
  { label: 'Balance Sheet', value: 'Balance Sheet' },
  { label: 'Profit & Loss', value: 'Profit & Loss' }
]

export const DEFAULT_MATERIAL_TRANSFER = {
  position: 1,
  materialCode: '',
  materialCodeDesc: '',
  materialDescription: '',
  unit: '',
  retailPrice: '',
  price: '',
  standardCost: '',
  quantity: '',
  tax: '',
  taxFormat: '%',
  amount: '',
  stockQuantity: '',
  stockBatchSerials: '',
  batchSerials: []
}

export const DEFAULT_ADDRESS_FIELDS = {
  buildingNo: '',
  street: '',
  additionalStreet: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  additionalNo: '',
  neighbourhood: ''
}

export const DEFAULT_JOB_ORDER_DETAILS = {
  position: 10,
  materialCode: '',
  quantity: '',
  warehouse: '',
  materialCodeDesc: '',
  unit: '',
  scrapQuantity: '',
  length: 100,
  breadth: 70
}

export const MONTHS = [
  { label: 'Jan', value: 'Jan' },
  { label: 'Feb', value: 'Feb' },
  { label: 'Mar', value: 'Mar' },
  { label: 'Apr', value: 'Apr' },
  { label: 'May', value: 'May' },
  { label: 'Jun', value: 'Jun' },
  { label: 'Jul', value: 'Jul' },
  { label: 'Aug', value: 'Aug' },
  { label: 'Sep', value: 'Sep' },
  { label: 'Oct', value: 'Oct' },
  { label: 'Nov', value: 'Nov' },
  { label: 'Dec', value: 'Dec' }
]

export const SALES_DELIVERY_STATUS_OPTIONS = [
  { label: 'Draft', value: 'Draft' },
  { label: 'Delivered', value: 'Delivered' }
]

export const PURCHASE_RECEIPT_STATUS_OPTIONS = [
  { label: 'Draft', value: 'Draft' },
  { label: 'Under clearance', value: 'Under clearance' },
  { label: 'Received', value: 'Received' }
]

export const RETURN_STATUS_OPTIONS = [
  { label: 'Draft', value: 'Draft' },
  { label: 'Returned', value: 'Returned' }
]

export const DEFAULT_WAREHOUSES = {
  warehouse: '',
  description: '',
  location: '',
  locationDescription: '',
  rack: '',
  rackDescription: ''
}

export const SALES_TAX_CATEGORIES = [
  {
    label: 'Standard',
    value: 'Standard'
  },
  {
    label: 'Export',
    value: 'Export'
  },
  {
    label: 'Intercompany',
    value: 'Intercompany'
  }
]

export const PURCHASE_TAX_CATEGORIES = [
  {
    label: 'Standard',
    value: 'Standard'
  },
  {
    label: 'Import',
    value: 'Import'
  },
  {
    label: 'Intercompany',
    value: 'Intercompany'
  }
]

const _TAX_TYPES = [
  {
    label: 'Normal VAT',
    value: 'Normal VAT',
    categories: ['Standard'],
    authority: ['', 'ZATCA'],
    code: 'SR'
  },
  {
    label: 'Exempt',
    value: 'Exempt',
    categories: ['Standard'],
    authority: ['', 'ZATCA'],
    code: 'EX'
  },
  {
    label: 'Zero VAT',
    value: 'Zero VAT',
    categories: ['Standard', 'Export', 'Import', 'Intercompany'],
    authority: ['', 'ZATCA'],
    code: 'ZR'
  },
  {
    label: 'Not Subject To VAT',
    value: 'Not Subject To VAT',
    categories: ['Standard', 'Export', 'Import', 'Intercompany'],
    authority: ['', 'ZATCA'],
    code: 'NS'
  },
  {
    label: 'Standard-rated',
    value: 'Standard-rated',
    categories: ['Standard', 'Export', 'Import', 'Intercompany'],
    authority: ['FTA-UAE'],
    code: 'SR'
  },
  {
    label: 'Subject to Reverse Charge',
    value: 'Subject to Reverse Charge',
    categories: ['Standard', 'Export', 'Import', 'Intercompany'],
    authority: ['FTA-UAE'],
    code: 'RC'
  },
  {
    label: 'Zero-rated',
    value: 'Zero-rated',
    categories: ['Standard', 'Export', 'Import', 'Intercompany'],
    authority: ['FTA-UAE'],
    code: 'ZR'
  },
  {
    label: 'Exempt',
    value: 'Exempt',
    categories: ['Standard', 'Export', 'Import', 'Intercompany'],
    authority: ['FTA-UAE'],
    code: 'EX'
  },
  {
    label: 'Intra GCC',
    value: 'Intra GCC',
    categories: ['Standard', 'Export', 'Import', 'Intercompany'],
    authority: ['FTA-UAE'],
    code: 'IG'
  },
  {
    label: 'Amendments',
    value: 'Amendments',
    categories: ['Standard', 'Export', 'Import', 'Intercompany'],
    authority: ['FTA-UAE'],
    code: 'OA'
  },
  {
    label: 'Out-of-Scope',
    value: 'Out-of-Scope',
    categories: ['Standard', 'Export', 'Import', 'Intercompany'],
    authority: ['FTA-UAE'],
    code: 'OS'
  }
] as const

export type TTaxAuthority =
  | ''
  | 'ZATCA'
  | 'ISTD-Jordan'
  | 'YPAHES-Greece'
  | 'FPS-Belgium'
  | 'BZSt-Germany'
  | 'DGFiP-France'
  | 'OTA-Oman'
  | 'FTA-UAE'
  | 'LHDNM-Malaysia'

export const GET_TAX_AUTHORITIES = (type: string) => {
  let options: TTaxAuthority[] = []

  switch (type) {
    case 'Direct':
      options = ['ZATCA', 'ISTD-Jordan', 'YPAHES-Greece']
      break
    case 'Peppol 4 Corner':
      options = ['FPS-Belgium', 'BZSt-Germany', 'DGFiP-France', 'OTA-Oman']
      break
    case 'Peppol 5 Corner':
      options = ['FTA-UAE', 'LHDNM-Malaysia']
      break
    default:
      break
  }

  return options.map((v) => ({ label: v, value: v }))
}

export type TTaxCategory = 'Standard' | 'Export' | 'Import' | 'Intercompany'

export type TTaxType = {
  label: string
  value: typeof _TAX_TYPES[number]['value']
  categories: ReadonlyArray<TTaxCategory>
  authority: ReadonlyArray<TTaxAuthority>
  code: string
}

export const TAX_TYPES: ReadonlyArray<TTaxType> = _TAX_TYPES

export const GET_TAX_TYPES = (authority: TTaxAuthority, category: TTaxCategory) =>
  _TAX_TYPES.filter(
    (v) =>
      ((v.authority || '') as ReadonlyArray<TTaxAuthority>).includes(authority) &&
      (category ? (v.categories as ReadonlyArray<TTaxCategory>).includes(category) : true)
  )

export const ZATCA_TAX_EXEMPTION_REASONS = [
  {
    type: 'Exempt',
    label: 'VATEX-SA-29',
    value: 'VATEX-SA-29',
    description: 'Financial services mentioned in Article 29 of the VAT Regulations',
    descriptionAlt: 'الخدمات المالية'
  },
  {
    type: 'Exempt',
    label: 'VATEX-SA-29-7',
    value: 'VATEX-SA-29-7',
    description: 'Life insurance services mentioned in Article 29 of the VAT Regulations',
    descriptionAlt: 'عقد تأمين على الحياة'
  },
  {
    type: 'Exempt',
    label: 'VATEX-SA-30',
    value: 'VATEX-SA-30',
    description: 'Real estate transactions mentioned in Article 30 of the VAT Regulations',
    descriptionAlt: 'التوريدات العقارية المعفاة من الضريبة'
  },

  {
    type: 'Zero VAT',
    label: 'VATEX-SA-32',
    value: 'VATEX-SA-32',
    description: 'Export of goods',
    descriptionAlt: 'صادرات السلع من المملكة'
  },
  {
    type: 'Zero VAT',
    label: 'VATEX-SA-33',
    value: 'VATEX-SA-33',
    description: 'Export of services',
    descriptionAlt: 'صادرات الخدمات من المملكة'
  },
  {
    type: 'Zero VAT',
    label: 'VATEX-SA-34-1',
    value: 'VATEX-SA-34-1',
    description: 'The international transport of Goods',
    descriptionAlt: 'النقل الدولي للسلع'
  },
  {
    type: 'Zero VAT',
    label: 'VATEX-SA-34-2',
    value: 'VATEX-SA-34-2',
    description: 'international transport of passengers',
    descriptionAlt: 'النقل الدولي للركاب'
  },
  {
    type: 'Zero VAT',
    label: 'VATEX-SA-34-3',
    value: 'VATEX-SA-34-3',
    description:
      'services directly connected and incidental to a Supply of international passenger transport',
    descriptionAlt: 'الخدمات المرتبطة مباشرة أو عرضياً بتوريد النقل الدولي للركاب'
  },
  {
    type: 'Zero VAT',
    label: 'VATEX-SA-34-4',
    value: 'VATEX-SA-34-4',
    description: 'Supply of a qualifying means of transport',
    descriptionAlt: 'توريد وسائل النقل المؤهلة'
  },
  {
    type: 'Zero VAT',
    label: 'VATEX-SA-34-5',
    value: 'VATEX-SA-34-5',
    description:
      'Any services relating to Goods or passenger transportation, as defined in article twenty five of these Regulations',
    descriptionAlt:
      'الخدمات ذات الصلة بنقل السلع أو  الركاب، وفقاً للتعريف الوارد بالمادة  الخامسة والعشرين من اللائحة  التنفيذية لنظام ضريبة القيامة  المضافة'
  },
  {
    type: 'Zero VAT',
    label: 'VATEX-SA-35',
    value: 'VATEX-SA-35',
    description: 'Medicines and medical equipment',
    descriptionAlt: 'الأدوية والمعدات الطبية'
  },
  {
    type: 'Zero VAT',
    label: 'VATEX-SA-36',
    value: 'VATEX-SA-36',
    description: 'Qualifying metals',
    descriptionAlt: 'المعادن المؤهلة'
  },
  {
    type: 'Zero VAT',
    label: 'VATEX-SA-EDU',
    value: 'VATEX-SA-EDU',
    description: 'Private education to citizen',
    descriptionAlt: 'الخدمات التعليمية الخاصة للمواطنين'
  },
  {
    type: 'Zero VAT',
    label: 'VATEX-SA-HEA',
    value: 'VATEX-SA-HEA',
    description: 'Private healthcare to citizen',
    descriptionAlt: 'الخدمات الصحية الخاصة للمواطنين'
  },
  {
    type: 'Zero VAT',
    label: 'VATEX-SA-MLTRY',
    value: 'VATEX-SA-MLTRY',
    description: 'supply of qualified military goods',
    descriptionAlt: 'توريد السلع العسكرية المؤهلة'
  },

  {
    type: 'Not Subject To VAT',
    label: 'VATEX-SA-OOS',
    value: 'VATEX-SA-OOS',
    description: '',
    descriptionAlt: ''
  }
]

export const TIMEZONES = moment.tz
  .names()
  .map((item) => ({
    value: item,
    label: `(GMT${moment.tz(item).format('Z')}) ${new Date()
      .toLocaleDateString(undefined, { day: '2-digit', timeZone: item, timeZoneName: 'long' })
      .substring(4)} (${item})`
  }))
  .sort((a, b) => {
    const [ahh, amm] = a.label.split('GMT')[1].split(')')[0].split(':')
    const [bhh, bmm] = b.label.split('GMT')[1].split(')')[0].split(':')

    return +ahh * 60 + +amm - (+bhh * 60 + +bmm)
  })

export const PRICE_TYPES = [
  {
    label: 'Price',
    value: 'Price'
  },
  {
    label: 'Charge',
    value: 'Charge'
  }
]

export const OPERATION_TYPES = [
  {
    label: 'Air',
    value: 'Air'
  },
  {
    label: 'Sea',
    value: 'Sea'
  },
  {
    label: 'Land',
    value: 'Land'
  }
]

export const AIR_OPERATIONS = [
  {
    label: 'Back to Back',
    value: 'Back to Back'
  },
  {
    label: 'Direct',
    value: 'Direct'
  },
  {
    label: 'De-consolidation',
    value: 'De-consolidation'
  }
]

export const SEA_OPERATIONS = [
  {
    label: 'FCL',
    value: 'FCL'
  },
  {
    label: 'LCL',
    value: 'LCL'
  },
  {
    label: 'RORO',
    value: 'RORO'
  },
  {
    label: 'BULK',
    value: 'BULK'
  },
  {
    label: 'Others',
    value: 'Others'
  }
]

export const LAND_OPERATIONS = [
  {
    label: 'Overland (FTL, LTL)',
    value: 'Overland (FTL, LTL)'
  },
  {
    label: 'Inland (Containers, General Cargo)',
    value: 'Inland (Containers, General Cargo)'
  }
]

export const getOperationTypes = (type: string) => {
  switch (type) {
    case 'Air':
      return AIR_OPERATIONS
    case 'Sea':
      return SEA_OPERATIONS
    case 'Land':
      return LAND_OPERATIONS
    default:
      return []
  }
}

export const ACCOUNT_SETUP_TYPES = [
  {
    label: 'Invoice',
    value: 'Invoice'
  },
  {
    label: 'Credit Note',
    value: 'Credit-Note'
  },
  {
    label: 'Debit Note',
    value: 'Debit-Note'
  },
  {
    label: 'Expense',
    value: 'Expense'
  },
  {
    label: 'Invoice Receipt',
    value: 'Invoice Receipt'
  },
  {
    label: 'Credit Receipt',
    value: 'Credit Receipt'
  },
  {
    label: 'Expense Payment',
    value: 'Expense Payment'
  },
  {
    label: 'Debit Receipt',
    value: 'Debit Receipt'
  }
]
export const INVENTORY_STATUS = [
  {
    label: 'Good',
    value: 'Good'
  },
  {
    label: 'Damaged',
    value: 'Damaged'
  },
  {
    label: 'For Sale',
    value: 'For Sale'
  },
  {
    label: 'Lost',
    value: 'Lost'
  }
]

export const DEFAULT_PACKAGE_ITEMS = {
  description: '',
  quantity: '',
  unit: '',
  price: '',
  amount: 0,
  netAmount: '',
  currency: '',
  chargeType: '%',
  charge: '',
  taxType: '',
  tax: '',
  taxAmount: ''
}

export const DEFAULT_PACKAGE_DETAILS = {
  position: 10,
  packageType: '',
  length: '',
  breadth: '',
  height: '',
  unit: '',
  weight: '',
  weightUnit: '',
  volume: '',
  volumeUnit: '',
  items: [DEFAULT_PACKAGE_ITEMS]
}

export const LBH_UNITS = [
  {
    label: 'MT',
    value: 'MT'
  },
  {
    label: 'CM',
    value: 'CM'
  },
  {
    label: 'MM',
    value: 'MM'
  }
]

export const WEIGHT_UNITS = [
  {
    label: 'KG',
    value: 'KG'
  },
  {
    label: 'GM',
    value: 'GM'
  },
  {
    label: 'TO',
    value: 'TO'
  }
]

export const VOLUME_UNITS = [
  {
    label: 'M3',
    value: 'M3'
  },
  {
    label: 'CM3',
    value: 'CM3'
  },
  {
    label: 'MM3',
    value: 'MM3'
  }
]

export const PO_TYPES = [
  { label: 'Standard', value: 'Standard' },
  { label: 'Import', value: 'Import' }
]

export const TYPE_OF_PAYMENT = [
  { label: 'Payment', value: 'Payment' },
  { label: 'Advance', value: 'Advance' }
]

export const getClientPriceNames = (type: 'customer' | 'vendor') => {
  const isCustomer = type === 'customer'
  const isVendor = type === 'vendor'
  const order = isCustomer ? 'sales' : isVendor ? 'purchase' : ''
  const altType = isVendor ? 'supplier' : type

  return {
    type,
    isCustomer,
    isVendor,
    typeName: type?.capitalize(),
    typeAltName: altType?.capitalize(),
    order,
    orderName: order?.capitalize()
  }
}

export const DEFAULT_CLIENT_PRICE = {
  materialCodeDesc: '',
  materialCode: '',
  materialDescription: '',
  unit: '',
  minQuantity: 1,
  maxQuantity: 999999,
  currency: '',
  price: '',
  exchangeRate: 1,
  basePrice: '',
  status: 'Active'
}

export const NUMBERING_MODULES_TRANSACTIONS = [
  // IMPORTANT: Numbering series should be sort by 'module','code'
  {
    code: 'asset-creations',
    module: 'Assets',
    transaction: 'Asset Creations'
  },
  {
    code: 'lead-lists',
    module: 'CRM',
    transaction: 'Lead Lists'
  },
  {
    code: 'lead-proposals',
    module: 'CRM',
    transaction: 'Lead Proposals'
  },
  {
    code: 'customers',
    module: 'Clients',
    transaction: 'Customers'
  },
  {
    code: 'vendors',
    module: 'Clients',
    transaction: 'Vendors'
  },
  {
    code: 'cycle-count-plans',
    module: 'Cycle Count',
    transaction: 'Cycle Count Plans'
  },
  {
    code: 'expense-debit-note',
    module: 'Expenses',
    transaction: 'Debit Note'
  },
  {
    code: 'expense-invoice',
    module: 'Expenses',
    transaction: 'Expense Invoice'
  },
  {
    code: 'amortizations',
    module: 'Finance',
    transaction: 'Amortizations'
  },
  {
    code: 'bank-account-transfers',
    module: 'Finance',
    transaction: 'Bank Account Transfers'
  },
  {
    code: 'bank-reconciliations',
    module: 'Finance',
    transaction: 'Bank Reconciliations'
  },
  {
    code: 'finance-postings',
    module: 'Finance',
    transaction: 'Finance Postings'
  },
  {
    code: 'journal-vouchers',
    module: 'Finance',
    transaction: 'Journal Vouchers'
  },
  {
    code: 'payments',
    module: 'Finance',
    transaction: 'Payments'
  },
  {
    code: 'petty-cash-transfers',
    module: 'Finance',
    transaction: 'Petty Cash Transfers'
  },
  {
    code: 'receipts',
    module: 'Finance',
    transaction: 'Receipts'
  },
  {
    code: 'bookings',
    module: 'Freight Management',
    transaction: 'Bookings'
  },
  {
    code: 'job-creations',
    module: 'Freight Management',
    transaction: 'Job Creations'
  },
  {
    code: 'offers',
    module: 'Freight Management',
    transaction: 'Offers'
  },
  {
    code: 'quotations',
    module: 'Freight Management',
    transaction: 'Quotations'
  },
  {
    code: 'gold-additions-stock',
    module: 'Gold',
    transaction: 'Gold Additions Stock'
  },
  {
    code: 'gold-customer-stock',
    module: 'Gold',
    transaction: 'Gold Customer Stock'
  },
  {
    code: 'gold-in-house-stock',
    module: 'Gold',
    transaction: 'Gold In-house Stock'
  },
  {
    code: 'gold-returns',
    module: 'Gold',
    transaction: 'Gold Returns'
  },
  {
    code: 'asset-transfers',
    module: 'HRMS',
    transaction: 'Asset Transfers'
  },
  {
    code: 'employee-loans',
    module: 'HRMS',
    transaction: 'Employee Loans'
  },
  {
    code: 'employee-overtimes',
    module: 'HRMS',
    transaction: 'Employee Overtime'
  },
  {
    code: 'employees',
    module: 'HRMS',
    transaction: 'Employees'
  },
  {
    code: 'expense-claims',
    module: 'HRMS',
    transaction: 'Expense Claims'
  },
  {
    code: 'hrms-assets',
    module: 'HRMS',
    transaction: 'Assets'
  },
  {
    code: 'payroll-definitions',
    module: 'HRMS',
    transaction: 'Payroll Definitions'
  },
  {
    code: 'payroll-postings',
    module: 'HRMS',
    transaction: 'Payroll Postings'
  },
  {
    code: 'income-credit-note',
    module: 'Incomes',
    transaction: 'Credit Note'
  },
  {
    code: 'income-invoice',
    module: 'Incomes',
    transaction: 'Income Invoice'
  },
  {
    code: 'proforma-invoices',
    module: 'Incomes',
    transaction: 'Proforma Invoices'
  },
  {
    code: 'pos-order-number',
    module: 'POS',
    transaction: 'POS Order Number'
  },
  {
    code: 'bill-of-materials',
    module: 'Production',
    transaction: 'Bill Of Materials'
  },
  {
    code: 'production-batch',
    module: 'Production',
    transaction: 'Production Batch'
  },
  {
    code: 'production-issues',
    module: 'Production',
    transaction: 'Production Issues'
  },
  {
    code: 'production-orders',
    module: 'Production',
    transaction: 'Production Orders'
  },
  {
    code: 'production-receipts',
    module: 'Production',
    transaction: 'Production Receipts'
  },
  {
    code: 'production-routings',
    module: 'Production',
    transaction: 'Production Routings'
  },
  {
    code: 'production-serial',
    module: 'Production',
    transaction: 'Production Serial'
  },
  {
    code: 'project-estimations',
    module: 'Project',
    transaction: 'Project Estimations'
  },
  {
    code: 'customs-clearances',
    module: 'Purchase',
    transaction: 'Customs Clearances'
  },
  {
    code: 'goods-returns',
    module: 'Purchase',
    transaction: 'Goods Returns'
  },
  {
    code: 'purchase-orders',
    module: 'Purchase',
    transaction: 'Purchase Orders'
  },
  {
    code: 'purchase-receipts',
    module: 'Purchase',
    transaction: 'Purchase Receipts'
  },
  {
    code: 'purchase-requests',
    module: 'Purchase',
    transaction: 'Purchase Requests'
  },
  {
    code: 'delivery-returns',
    module: 'Sales',
    transaction: 'Delivery Returns'
  },
  {
    code: 'job-orders',
    module: 'Sales',
    transaction: 'Job Orders'
  },
  {
    code: 'sales-deliveries',
    module: 'Sales',
    transaction: 'Sales Deliveries'
  },
  {
    code: 'sales-orders',
    module: 'Sales',
    transaction: 'Sales Orders'
  },
  {
    code: 'sales-quotations',
    module: 'Sales',
    transaction: 'Sales Quotations'
  },
  {
    code: 'service-requests',
    module: 'Services',
    transaction: 'Service Requests'
  },
  {
    code: 'batch',
    module: 'Stocks',
    transaction: 'Batch'
  },
  {
    code: 'container-receipts',
    module: 'Stocks',
    transaction: 'Container Receipts'
  },
  {
    code: 'material-transfers',
    module: 'Stocks',
    transaction: 'Material Request/Return'
  },
  {
    code: 'serial',
    module: 'Stocks',
    transaction: 'Serial'
  },
  {
    code: 'stock-adjustments',
    module: 'Stocks',
    transaction: 'Stock Adjustments'
  },
  {
    code: 'stock-issues',
    module: 'Stocks',
    transaction: 'Stock Issues'
  },
  {
    code: 'stock-receipts',
    module: 'Stocks',
    transaction: 'Stock Receipts'
  },
  {
    code: 'stock-revaluations',
    module: 'Stocks',
    transaction: 'Stock Revaluations'
  },
  {
    code: 'stock-transfers',
    module: 'Stocks',
    transaction: 'Stock Transfers'
  },
  {
    code: 'warehouse-products',
    module: 'Stocks',
    transaction: 'Warehouse Products'
  }
].map((item) => ({
  ...item,
  label: `${item.module} - ${item.transaction}`,
  value: `${item.module} - ${item.transaction}`
}))

export const GENDER = [
  'Male',
  'Female',
  'Non-Binary',
  'Transgender',
  'Genderqueer',
  'Other',
  'Prefer not to say'
].map((item) => ({ label: item, value: item }))

export const COUNTRIES = [
  {
    label: 'Afghanistan',
    code: 'AF',
    value: 'Afghanistan'
  },
  {
    label: 'Åland Islands',
    code: 'AX',
    value: 'Åland Islands'
  },
  {
    label: 'Albania',
    code: 'AL',
    value: 'Albania'
  },
  {
    label: 'Algeria',
    code: 'DZ',
    value: 'Algeria'
  },
  {
    label: 'American Samoa',
    code: 'AS',
    value: 'American Samoa'
  },
  {
    label: 'AndorrA',
    code: 'AD',
    value: 'AndorrA'
  },
  {
    label: 'Angola',
    code: 'AO',
    value: 'Angola'
  },
  {
    label: 'Anguilla',
    code: 'AI',
    value: 'Anguilla'
  },
  {
    label: 'Antarctica',
    code: 'AQ',
    value: 'Antarctica'
  },
  {
    label: 'Antigua and Barbuda',
    code: 'AG',
    value: 'Antigua and Barbuda'
  },
  {
    label: 'Argentina',
    code: 'AR',
    value: 'Argentina'
  },
  {
    label: 'Armenia',
    code: 'AM',
    value: 'Armenia'
  },
  {
    label: 'Aruba',
    code: 'AW',
    value: 'Aruba'
  },
  {
    label: 'Australia',
    code: 'AU',
    value: 'Australia'
  },
  {
    label: 'Austria',
    code: 'AT',
    value: 'Austria'
  },
  {
    label: 'Azerbaijan',
    code: 'AZ',
    value: 'Azerbaijan'
  },
  {
    label: 'Bahamas',
    code: 'BS',
    value: 'Bahamas'
  },
  {
    label: 'Bahrain',
    code: 'BH',
    value: 'Bahrain'
  },
  {
    label: 'Bangladesh',
    code: 'BD',
    value: 'Bangladesh'
  },
  {
    label: 'Barbados',
    code: 'BB',
    value: 'Barbados'
  },
  {
    label: 'Belarus',
    code: 'BY',
    value: 'Belarus'
  },
  {
    label: 'Belgium',
    code: 'BE',
    value: 'Belgium'
  },
  {
    label: 'Belize',
    code: 'BZ',
    value: 'Belize'
  },
  {
    label: 'Benin',
    code: 'BJ',
    value: 'Benin'
  },
  {
    label: 'Bermuda',
    code: 'BM',
    value: 'Bermuda'
  },
  {
    label: 'Bhutan',
    code: 'BT',
    value: 'Bhutan'
  },
  {
    label: 'Bolivia',
    code: 'BO',
    value: 'Bolivia'
  },
  {
    label: 'Bosnia and Herzegovina',
    code: 'BA',
    value: 'Bosnia and Herzegovina'
  },
  {
    label: 'Botswana',
    code: 'BW',
    value: 'Botswana'
  },
  {
    label: 'Bouvet Island',
    code: 'BV',
    value: 'Bouvet Island'
  },
  {
    label: 'Brazil',
    code: 'BR',
    value: 'Brazil'
  },
  {
    label: 'British Indian Ocean Territory',
    code: 'IO',
    value: 'British Indian Ocean Territory'
  },
  {
    label: 'Brunei Darussalam',
    code: 'BN',
    value: 'Brunei Darussalam'
  },
  {
    label: 'Bulgaria',
    code: 'BG',
    value: 'Bulgaria'
  },
  {
    label: 'Burkina Faso',
    code: 'BF',
    value: 'Burkina Faso'
  },
  {
    label: 'Burundi',
    code: 'BI',
    value: 'Burundi'
  },
  {
    label: 'Cambodia',
    code: 'KH',
    value: 'Cambodia'
  },
  {
    label: 'Cameroon',
    code: 'CM',
    value: 'Cameroon'
  },
  {
    label: 'Canada',
    code: 'CA',
    value: 'Canada'
  },
  {
    label: 'Cape Verde',
    code: 'CV',
    value: 'Cape Verde'
  },
  {
    label: 'Cayman Islands',
    code: 'KY',
    value: 'Cayman Islands'
  },
  {
    label: 'Central African Republic',
    code: 'CF',
    value: 'Central African Republic'
  },
  {
    label: 'Chad',
    code: 'TD',
    value: 'Chad'
  },
  {
    label: 'Chile',
    code: 'CL',
    value: 'Chile'
  },
  {
    label: 'China',
    code: 'CN',
    value: 'China'
  },
  {
    label: 'Christmas Island',
    code: 'CX',
    value: 'Christmas Island'
  },
  {
    label: 'Cocos (Keeling) Islands',
    code: 'CC',
    value: 'Cocos (Keeling) Islands'
  },
  {
    label: 'Colombia',
    code: 'CO',
    value: 'Colombia'
  },
  {
    label: 'Comoros',
    code: 'KM',
    value: 'Comoros'
  },
  {
    label: 'Congo',
    code: 'CG',
    value: 'Congo'
  },
  {
    label: 'Congo, The Democratic Republic of the',
    code: 'CD',
    value: 'Congo, The Democratic Republic of the'
  },
  {
    label: 'Cook Islands',
    code: 'CK',
    value: 'Cook Islands'
  },
  {
    label: 'Costa Rica',
    code: 'CR',
    value: 'Costa Rica'
  },
  {
    label: "Cote D'Ivoire",
    code: 'CI',
    value: "Cote D'Ivoire"
  },
  {
    label: 'Croatia',
    code: 'HR',
    value: 'Croatia'
  },
  {
    label: 'Cuba',
    code: 'CU',
    value: 'Cuba'
  },
  {
    label: 'Cyprus',
    code: 'CY',
    value: 'Cyprus'
  },
  {
    label: 'Czech Republic',
    code: 'CZ',
    value: 'Czech Republic'
  },
  {
    label: 'Denmark',
    code: 'DK',
    value: 'Denmark'
  },
  {
    label: 'Djibouti',
    code: 'DJ',
    value: 'Djibouti'
  },
  {
    label: 'Dominica',
    code: 'DM',
    value: 'Dominica'
  },
  {
    label: 'Dominican Republic',
    code: 'DO',
    value: 'Dominican Republic'
  },
  {
    label: 'Ecuador',
    code: 'EC',
    value: 'Ecuador'
  },
  {
    label: 'Egypt',
    code: 'EG',
    value: 'Egypt'
  },
  {
    label: 'El Salvador',
    code: 'SV',
    value: 'El Salvador'
  },
  {
    label: 'Equatorial Guinea',
    code: 'GQ',
    value: 'Equatorial Guinea'
  },
  {
    label: 'Eritrea',
    code: 'ER',
    value: 'Eritrea'
  },
  {
    label: 'Estonia',
    code: 'EE',
    value: 'Estonia'
  },
  {
    label: 'Ethiopia',
    code: 'ET',
    value: 'Ethiopia'
  },
  {
    label: 'Falkland Islands (Malvinas)',
    code: 'FK',
    value: 'Falkland Islands (Malvinas)'
  },
  {
    label: 'Faroe Islands',
    code: 'FO',
    value: 'Faroe Islands'
  },
  {
    label: 'Fiji',
    code: 'FJ',
    value: 'Fiji'
  },
  {
    label: 'Finland',
    code: 'FI',
    value: 'Finland'
  },
  {
    label: 'France',
    code: 'FR',
    value: 'France'
  },
  {
    label: 'French Guiana',
    code: 'GF',
    value: 'French Guiana'
  },
  {
    label: 'French Polynesia',
    code: 'PF',
    value: 'French Polynesia'
  },
  {
    label: 'French Southern Territories',
    code: 'TF',
    value: 'French Southern Territories'
  },
  {
    label: 'Gabon',
    code: 'GA',
    value: 'Gabon'
  },
  {
    label: 'Gambia',
    code: 'GM',
    value: 'Gambia'
  },
  {
    label: 'Georgia',
    code: 'GE',
    value: 'Georgia'
  },
  {
    label: 'Germany',
    code: 'DE',
    value: 'Germany'
  },
  {
    label: 'Ghana',
    code: 'GH',
    value: 'Ghana'
  },
  {
    label: 'Gibraltar',
    code: 'GI',
    value: 'Gibraltar'
  },
  {
    label: 'Greece',
    code: 'GR',
    value: 'Greece'
  },
  {
    label: 'Greenland',
    code: 'GL',
    value: 'Greenland'
  },
  {
    label: 'Grenada',
    code: 'GD',
    value: 'Grenada'
  },
  {
    label: 'Guadeloupe',
    code: 'GP',
    value: 'Guadeloupe'
  },
  {
    label: 'Guam',
    code: 'GU',
    value: 'Guam'
  },
  {
    label: 'Guatemala',
    code: 'GT',
    value: 'Guatemala'
  },
  {
    label: 'Guernsey',
    code: 'GG',
    value: 'Guernsey'
  },
  {
    label: 'Guinea',
    code: 'GN',
    value: 'Guinea'
  },
  {
    label: 'Guinea-Bissau',
    code: 'GW',
    value: 'Guinea-Bissau'
  },
  {
    label: 'Guyana',
    code: 'GY',
    value: 'Guyana'
  },
  {
    label: 'Haiti',
    code: 'HT',
    value: 'Haiti'
  },
  {
    label: 'Heard Island and Mcdonald Islands',
    code: 'HM',
    value: 'Heard Island and Mcdonald Islands'
  },
  {
    label: 'Holy See (Vatican City State)',
    code: 'VA',
    value: 'Holy See (Vatican City State)'
  },
  {
    label: 'Honduras',
    code: 'HN',
    value: 'Honduras'
  },
  {
    label: 'Hong Kong',
    code: 'HK',
    value: 'Hong Kong'
  },
  {
    label: 'Hungary',
    code: 'HU',
    value: 'Hungary'
  },
  {
    label: 'Iceland',
    code: 'IS',
    value: 'Iceland'
  },
  {
    label: 'India',
    code: 'IN',
    value: 'India'
  },
  {
    label: 'Indonesia',
    code: 'ID',
    value: 'Indonesia'
  },
  {
    label: 'Iran, Islamic Republic Of',
    code: 'IR',
    value: 'Iran, Islamic Republic Of'
  },
  {
    label: 'Iraq',
    code: 'IQ',
    value: 'Iraq'
  },
  {
    label: 'Ireland',
    code: 'IE',
    value: 'Ireland'
  },
  {
    label: 'Isle of Man',
    code: 'IM',
    value: 'Isle of Man'
  },
  {
    label: 'Israel',
    code: 'IL',
    value: 'Israel'
  },
  {
    label: 'Italy',
    code: 'IT',
    value: 'Italy'
  },
  {
    label: 'Jamaica',
    code: 'JM',
    value: 'Jamaica'
  },
  {
    label: 'Japan',
    code: 'JP',
    value: 'Japan'
  },
  {
    label: 'Jersey',
    code: 'JE',
    value: 'Jersey'
  },
  {
    label: 'Jordan',
    code: 'JO',
    value: 'Jordan'
  },
  {
    label: 'Kazakhstan',
    code: 'KZ',
    value: 'Kazakhstan'
  },
  {
    label: 'Kenya',
    code: 'KE',
    value: 'Kenya'
  },
  {
    label: 'Kiribati',
    code: 'KI',
    value: 'Kiribati'
  },
  {
    label: "Korea, Democratic People'S Republic of",
    code: 'KP',
    value: "Korea, Democratic People'S Republic of"
  },
  {
    label: 'Korea, Republic of',
    code: 'KR',
    value: 'Korea, Republic of'
  },
  {
    label: 'Kuwait',
    code: 'KW',
    value: 'Kuwait'
  },
  {
    label: 'Kyrgyzstan',
    code: 'KG',
    value: 'Kyrgyzstan'
  },
  {
    label: "Lao People'S Democratic Republic",
    code: 'LA',
    value: "Lao People'S Democratic Republic"
  },
  {
    label: 'Latvia',
    code: 'LV',
    value: 'Latvia'
  },
  {
    label: 'Lebanon',
    code: 'LB',
    value: 'Lebanon'
  },
  {
    label: 'Lesotho',
    code: 'LS',
    value: 'Lesotho'
  },
  {
    label: 'Liberia',
    code: 'LR',
    value: 'Liberia'
  },
  {
    label: 'Libyan Arab Jamahiriya',
    code: 'LY',
    value: 'Libyan Arab Jamahiriya'
  },
  {
    label: 'Liechtenstein',
    code: 'LI',
    value: 'Liechtenstein'
  },
  {
    label: 'Lithuania',
    code: 'LT',
    value: 'Lithuania'
  },
  {
    label: 'Luxembourg',
    code: 'LU',
    value: 'Luxembourg'
  },
  {
    label: 'Macao',
    code: 'MO',
    value: 'Macao'
  },
  {
    label: 'Macedonia, The Former Yugoslav Republic of',
    code: 'MK',
    value: 'Macedonia, The Former Yugoslav Republic of'
  },
  {
    label: 'Madagascar',
    code: 'MG',
    value: 'Madagascar'
  },
  {
    label: 'Malawi',
    code: 'MW',
    value: 'Malawi'
  },
  {
    label: 'Malaysia',
    code: 'MY',
    value: 'Malaysia'
  },
  {
    label: 'Maldives',
    code: 'MV',
    value: 'Maldives'
  },
  {
    label: 'Mali',
    code: 'ML',
    value: 'Mali'
  },
  {
    label: 'Malta',
    code: 'MT',
    value: 'Malta'
  },
  {
    label: 'Marshall Islands',
    code: 'MH',
    value: 'Marshall Islands'
  },
  {
    label: 'Martinique',
    code: 'MQ',
    value: 'Martinique'
  },
  {
    label: 'Mauritania',
    code: 'MR',
    value: 'Mauritania'
  },
  {
    label: 'Mauritius',
    code: 'MU',
    value: 'Mauritius'
  },
  {
    label: 'Mayotte',
    code: 'YT',
    value: 'Mayotte'
  },
  {
    label: 'Mexico',
    code: 'MX',
    value: 'Mexico'
  },
  {
    label: 'Micronesia, Federated States of',
    code: 'FM',
    value: 'Micronesia, Federated States of'
  },
  {
    label: 'Moldova, Republic of',
    code: 'MD',
    value: 'Moldova, Republic of'
  },
  {
    label: 'Monaco',
    code: 'MC',
    value: 'Monaco'
  },
  {
    label: 'Mongolia',
    code: 'MN',
    value: 'Mongolia'
  },
  {
    label: 'Montserrat',
    code: 'MS',
    value: 'Montserrat'
  },
  {
    label: 'Morocco',
    code: 'MA',
    value: 'Morocco'
  },
  {
    label: 'Mozambique',
    code: 'MZ',
    value: 'Mozambique'
  },
  {
    label: 'Myanmar',
    code: 'MM',
    value: 'Myanmar'
  },
  {
    label: 'Namibia',
    code: 'NA',
    value: 'Namibia'
  },
  {
    label: 'Nauru',
    code: 'NR',
    value: 'Nauru'
  },
  {
    label: 'Nepal',
    code: 'NP',
    value: 'Nepal'
  },
  {
    label: 'Netherlands',
    code: 'NL',
    value: 'Netherlands'
  },
  {
    label: 'Netherlands Antilles',
    code: 'AN',
    value: 'Netherlands Antilles'
  },
  {
    label: 'New Caledonia',
    code: 'NC',
    value: 'New Caledonia'
  },
  {
    label: 'New Zealand',
    code: 'NZ',
    value: 'New Zealand'
  },
  {
    label: 'Nicaragua',
    code: 'NI',
    value: 'Nicaragua'
  },
  {
    label: 'Niger',
    code: 'NE',
    value: 'Niger'
  },
  {
    label: 'Nigeria',
    code: 'NG',
    value: 'Nigeria'
  },
  {
    label: 'Niue',
    code: 'NU',
    value: 'Niue'
  },
  {
    label: 'Norfolk Island',
    code: 'NF',
    value: 'Norfolk Island'
  },
  {
    label: 'Northern Mariana Islands',
    code: 'MP',
    value: 'Northern Mariana Islands'
  },
  {
    label: 'Norway',
    code: 'NO',
    value: 'Norway'
  },
  {
    label: 'Oman',
    code: 'OM',
    value: 'Oman'
  },
  {
    label: 'Pakistan',
    code: 'PK',
    value: 'Pakistan'
  },
  {
    label: 'Palau',
    code: 'PW',
    value: 'Palau'
  },
  {
    label: 'Palestinian Territory, Occupied',
    code: 'PS',
    value: 'Palestinian Territory, Occupied'
  },
  {
    label: 'Panama',
    code: 'PA',
    value: 'Panama'
  },
  {
    label: 'Papua New Guinea',
    code: 'PG',
    value: 'Papua New Guinea'
  },
  {
    label: 'Paraguay',
    code: 'PY',
    value: 'Paraguay'
  },
  {
    label: 'Peru',
    code: 'PE',
    value: 'Peru'
  },
  {
    label: 'Philippines',
    code: 'PH',
    value: 'Philippines'
  },
  {
    label: 'Pitcairn',
    code: 'PN',
    value: 'Pitcairn'
  },
  {
    label: 'Poland',
    code: 'PL',
    value: 'Poland'
  },
  {
    label: 'Portugal',
    code: 'PT',
    value: 'Portugal'
  },
  {
    label: 'Puerto Rico',
    code: 'PR',
    value: 'Puerto Rico'
  },
  {
    label: 'Qatar',
    code: 'QA',
    value: 'Qatar'
  },
  {
    label: 'Reunion',
    code: 'RE',
    value: 'Reunion'
  },
  {
    label: 'Romania',
    code: 'RO',
    value: 'Romania'
  },
  {
    label: 'Russian Federation',
    code: 'RU',
    value: 'Russian Federation'
  },
  {
    label: 'RWANDA',
    code: 'RW',
    value: 'RWANDA'
  },
  {
    label: 'Saint Helena',
    code: 'SH',
    value: 'Saint Helena'
  },
  {
    label: 'Saint Kitts and Nevis',
    code: 'KN',
    value: 'Saint Kitts and Nevis'
  },
  {
    label: 'Saint Lucia',
    code: 'LC',
    value: 'Saint Lucia'
  },
  {
    label: 'Saint Pierre and Miquelon',
    code: 'PM',
    value: 'Saint Pierre and Miquelon'
  },
  {
    label: 'Saint Vincent and the Grenadines',
    code: 'VC',
    value: 'Saint Vincent and the Grenadines'
  },
  {
    label: 'Samoa',
    code: 'WS',
    value: 'Samoa'
  },
  {
    label: 'San Marino',
    code: 'SM',
    value: 'San Marino'
  },
  {
    label: 'Sao Tome and Principe',
    code: 'ST',
    value: 'Sao Tome and Principe'
  },
  {
    label: 'Saudi Arabia',
    code: 'SA',
    value: 'Saudi Arabia'
  },
  {
    label: 'Senegal',
    code: 'SN',
    value: 'Senegal'
  },
  {
    label: 'Serbia and Montenegro',
    code: 'CS',
    value: 'Serbia and Montenegro'
  },
  {
    label: 'Seychelles',
    code: 'SC',
    value: 'Seychelles'
  },
  {
    label: 'Sierra Leone',
    code: 'SL',
    value: 'Sierra Leone'
  },
  {
    label: 'Singapore',
    code: 'SG',
    value: 'Singapore'
  },
  {
    label: 'Slovakia',
    code: 'SK',
    value: 'Slovakia'
  },
  {
    label: 'Slovenia',
    code: 'SI',
    value: 'Slovenia'
  },
  {
    label: 'Solomon Islands',
    code: 'SB',
    value: 'Solomon Islands'
  },
  {
    label: 'Somalia',
    code: 'SO',
    value: 'Somalia'
  },
  {
    label: 'South Africa',
    code: 'ZA',
    value: 'South Africa'
  },
  {
    label: 'South Georgia and the South Sandwich Islands',
    code: 'GS',
    value: 'South Georgia and the South Sandwich Islands'
  },
  {
    label: 'Spain',
    code: 'ES',
    value: 'Spain'
  },
  {
    label: 'Sri Lanka',
    code: 'LK',
    value: 'Sri Lanka'
  },
  {
    label: 'Sudan',
    code: 'SD',
    value: 'Sudan'
  },
  {
    label: 'Suriname',
    code: 'SR',
    value: 'Suriname'
  },
  {
    label: 'Svalbard and Jan Mayen',
    code: 'SJ',
    value: 'Svalbard and Jan Mayen'
  },
  {
    label: 'Swaziland',
    code: 'SZ',
    value: 'Swaziland'
  },
  {
    label: 'Sweden',
    code: 'SE',
    value: 'Sweden'
  },
  {
    label: 'Switzerland',
    code: 'CH',
    value: 'Switzerland'
  },
  {
    label: 'Syrian Arab Republic',
    code: 'SY',
    value: 'Syrian Arab Republic'
  },
  {
    label: 'Taiwan, Province of China',
    code: 'TW',
    value: 'Taiwan, Province of China'
  },
  {
    label: 'Tajikistan',
    code: 'TJ',
    value: 'Tajikistan'
  },
  {
    label: 'Tanzania, United Republic of',
    code: 'TZ',
    value: 'Tanzania, United Republic of'
  },
  {
    label: 'Thailand',
    code: 'TH',
    value: 'Thailand'
  },
  {
    label: 'Timor-Leste',
    code: 'TL',
    value: 'Timor-Leste'
  },
  {
    label: 'Togo',
    code: 'TG',
    value: 'Togo'
  },
  {
    label: 'Tokelau',
    code: 'TK',
    value: 'Tokelau'
  },
  {
    label: 'Tonga',
    code: 'TO',
    value: 'Tonga'
  },
  {
    label: 'Trinidad and Tobago',
    code: 'TT',
    value: 'Trinidad and Tobago'
  },
  {
    label: 'Tunisia',
    code: 'TN',
    value: 'Tunisia'
  },
  {
    label: 'Turkey',
    code: 'TR',
    value: 'Turkey'
  },
  {
    label: 'Turkmenistan',
    code: 'TM',
    value: 'Turkmenistan'
  },
  {
    label: 'Turks and Caicos Islands',
    code: 'TC',
    value: 'Turks and Caicos Islands'
  },
  {
    label: 'Tuvalu',
    code: 'TV',
    value: 'Tuvalu'
  },
  {
    label: 'Uganda',
    code: 'UG',
    value: 'Uganda'
  },
  {
    label: 'Ukraine',
    code: 'UA',
    value: 'Ukraine'
  },
  {
    label: 'United Arab Emirates',
    code: 'AE',
    value: 'United Arab Emirates'
  },
  {
    label: 'United Kingdom',
    code: 'GB',
    value: 'United Kingdom'
  },
  {
    label: 'United States',
    code: 'US',
    value: 'United States'
  },
  {
    label: 'United States Minor Outlying Islands',
    code: 'UM',
    value: 'United States Minor Outlying Islands'
  },
  {
    label: 'Uruguay',
    code: 'UY',
    value: 'Uruguay'
  },
  {
    label: 'Uzbekistan',
    code: 'UZ',
    value: 'Uzbekistan'
  },
  {
    label: 'Vanuatu',
    code: 'VU',
    value: 'Vanuatu'
  },
  {
    label: 'Venezuela',
    code: 'VE',
    value: 'Venezuela'
  },
  {
    label: 'Viet Nam',
    code: 'VN',
    value: 'Viet Nam'
  },
  {
    label: 'Virgin Islands, British',
    code: 'VG',
    value: 'Virgin Islands, British'
  },
  {
    label: 'Virgin Islands, U.S.',
    code: 'VI',
    value: 'Virgin Islands, U.S.'
  },
  {
    label: 'Wallis and Futuna',
    code: 'WF',
    value: 'Wallis and Futuna'
  },
  {
    label: 'Western Sahara',
    code: 'EH',
    value: 'Western Sahara'
  },
  {
    label: 'Yemen',
    code: 'YE',
    value: 'Yemen'
  },
  {
    label: 'Zambia',
    code: 'ZM',
    value: 'Zambia'
  },
  {
    label: 'Zimbabwe',
    code: 'ZW',
    value: 'Zimbabwe'
  }
]

export const LEAVE_APPLY_TYPES = [
  {
    label: 'Self',
    value: 'Self'
  },
  {
    label: 'Reportee',
    value: 'Reportee'
  }
]

export const LEAVE_TYPES = [
  {
    label: 'Half Day',
    value: 'Half day'
  },
  {
    label: 'Full Day',
    value: 'Full day'
  }
]

export const ASSET_TYPE = [
  { label: 'Furniture & Fixtures', value: 'Furniture & Fixtures' },
  { label: 'Buildings', value: 'Buildings' },
  { label: 'Computer', value: 'Computer' },
  { label: 'Machinery & Equipment', value: 'Machinery & Equipment' },
  { label: 'Office Equipment', value: 'Office Equipment' },
  { label: 'Motor Vehicle', value: 'Motor Vehicle' },
  { label: 'Lease/Maintenance', value: 'Lease/Maintenance' },
  { label: 'Automotive Equipment', value: 'Automotive Equipment' }
]

export const TRACKING_TYPE = [
  {
    label: 'Barcode',
    value: 'Barcode'
  },
  {
    label: 'QRcode',
    value: 'QRcode'
  },
  {
    label: 'RFID',
    value: 'RFID'
  }
]
export const DEPRECIATION_METHOD = [
  { label: 'Straight Line', value: 'Straight Line' },
  { label: 'Accelerated or Sum of Remaining Years', value: 'Accelerated or Sum of Remaining Years' },
  { label: 'Units of Production', value: 'Units of Production' },
  { label: 'Double Declining Balance', value: 'Double Declining Balance' }
]

export const PAYMENT_TRANSACTION_TYPE = [
  { label: 'Wire(Online)', value: 'Wire' },
  { label: 'Cheque', value: 'Cheque' },
  { label: 'Post Dated Cheque', value: 'Post Dated Cheque' },
  { label: 'Cash', value: 'Cash' },
  { label: 'Other', value: 'Other' },
  { label: 'Card', value: 'Card' },
  { label: 'Credit', value: 'Credit' }
]

export const JOB_ORDER_TYPE = [
  { label: 'Sales Order', value: 'Sales Order' },
  { label: 'Sales Quotation', value: 'Sales Quotation' },
  { label: 'Job Order', value: 'Job Order' }
]

export const PROBABILITY = [
  { label: '0% - 25%', value: '0% - 25%' },
  { label: '26% - 50%', value: '26% - 50%' },
  { label: '51% - 75%', value: '51% - 75%' },
  { label: '76% - 100%', value: '76% - 100%' }
]

export const CLASSIFICATION = [
  { label: 'Hot', value: 'Hot' },
  { label: 'Warm', value: 'Warm' },
  { label: 'Cold', value: 'Cold' },
  { label: 'Frozen', value: 'Frozen' }
]

export const SALES_ORDER_TYPES = [
  { label: 'Standard', value: 'Standard' },
  { label: 'Dropship', value: 'Dropship' }
]

export const PURCHASE_ORDER_TYPES = [
  { label: 'Standard', value: 'Standard' },
  { label: 'Dropship', value: 'Dropship' },
  { label: 'Asset', value: 'Asset' }
]

export const PRINT_MODE = [
  { label: 'Offset', value: 'Offset' },
  { label: 'Digital Media', value: 'Digital Media' },
  { label: 'Screen Printing', value: 'Screen Printing' },
  { label: 'Canon Digital ', value: 'Canon Digital ' },
  { label: 'OutSide Printing', value: 'OutSide Printing' }
]

export const NO_OF_PRINT = [
  { label: '1x0', value: '1x0' },
  { label: '1x1', value: '1x1' },
  { label: '1x2', value: '1x2' },
  { label: '1x3', value: '1x3' },
  { label: '1x4', value: '1x4' },
  { label: '2x0', value: '2x0' },
  { label: '2x1', value: '2x1' },
  { label: '2x2', value: '2x2' },
  { label: '2x3', value: '2x3' },
  { label: '2x4', value: '2x4' },
  { label: '3x0', value: '3x0' },
  { label: '3x1', value: '3x1' },
  { label: '3x2', value: '3x2' },
  { label: '3x3', value: '3x3' },
  { label: '3x4', value: '3x4' },
  { label: '4x0', value: '4x0' },
  { label: '4x1', value: '4x1' },
  { label: '4x2', value: '4x2' },
  { label: '4x3', value: '4x3' },
  { label: '4x4', value: '4x4' }
]

export const COLOR_MODE = [
  { label: 'Black', value: 'Black' },
  { label: 'Blue', value: 'Blue' },
  { label: 'Green', value: 'Green' },
  { label: 'Red', value: 'Red' },
  { label: 'Reflex Blue', value: 'Reflex Blue' },
  { label: 'Violet', value: 'Violet' },
  { label: 'Cyan ', value: 'Cyan ' },
  { label: 'Magenta', value: 'Magenta' },
  { label: 'Yellow', value: 'Yellow' },
  { label: 'Pink', value: 'Pink' },
  { label: 'Brown', value: 'Brown' }
]

export const OPEN_CLOSE_SIZE = [
  { label: 'A6', value: 'A6' },
  { label: 'A5', value: 'A5' },
  { label: 'A4', value: 'A4' },
  { label: 'A3', value: 'A3' },
  { label: '48x33s', value: '48x33' }
]

export const BINDING = [
  { label: 'Saddle Stitch', value: 'Saddle Stitches' },
  { label: 'Perfect Binding', value: 'Perfect Bindings' },
  { label: 'Spiral Binding', value: 'Spiral Bindings' },
  { label: 'Hardcase Binding', value: 'Hardcase Bindings' },
  { label: 'Die Cutting', value: 'Die Cuttings' },
  { label: 'Glue  Pad', value: 'Glue  Pads' },
  { label: 'Perforation', value: 'Perforations' },
  { label: 'Top Pinning', value: 'Top Pinnings' },
  { label: 'Side Pinning', value: 'Side Pinnings' }
]

export const FOLDING = [
  { label: 'center Folding', value: 'center Folding' },
  { label: 'Single Folding', value: 'Single Folding' },
  { label: 'Two Folding', value: 'Two Folding' },
  { label: 'Three Folding', value: 'Three Folding' }
]

export const LAMINATION = [
  { label: 'One Side Glossy Lamination', value: 'One Side Glossy Lamination' },
  { label: 'BothSide Glossy Lamination', value: 'BothSide Glossy Lamination' },
  { label: 'One Side Matt Lamination', value: 'One Side Matt Lamination' },
  { label: 'BothSide Matt Lamination', value: 'BothSide Matt Lamination' },
  { label: 'Hard Glossy Lamination', value: 'Hard Glossy Lamination' },
  { label: 'Hard Matt Lamination', value: 'Hard Matt Lamination' }
]
export const DRILL = [{ label: 'Hole Punching', value: 'Hole Punching' }]

export const PACKING = [
  { label: 'Al Haram Box', value: 'Al Haram Box' },
  { label: 'White Box', value: 'White Box' },
  { label: 'ShrinkWrapping', value: 'ShrinkWrapping' }
]
export const FOILING = [
  { label: 'Gold Foiling', value: 'Gold Foiling' },
  { label: 'Silver Foiling', value: 'Silver Foiling' },
  { label: 'Purple Foiling', value: 'Purple Foiling' },
  { label: 'Green Foiling', value: 'Green Foiling' },
  { label: 'Red Foiling', value: 'Red Foiling' }
]

export const ORDER_STATUS = [
  { label: 'Created', value: 'Created' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Shortclosed', value: 'Shortclosed' }
]

export const EMPLOYEE_TRANSFER_TYPES = [
  { label: 'Permanent', value: 'Permanent' },
  { label: 'Temporary', value: 'Temporary' }
]

export const JOURNAL_VOUCHER = [
  { label: 'Journal Voucher', value: 'JORVOU' },
  { label: 'Bank Asset', value: 'BACAST' },
  { label: 'LoC issue', value: 'LCISSUE' },
  { label: 'LoC closure', value: 'LOCCLO' },
  { label: 'Prepaid Rent', value: 'ADVREN' },
  { label: 'Employee Loan', value: 'EMPLOAN' },
  { label: 'Employee interest booking', value: 'EMPLIR' },
  { label: 'Employee interest payment', value: 'EMPINP' },
  { label: 'Employee Loan Repayment', value: 'EMPREPAY' },
  { label: 'Cash Reserves', value: 'RESERV' },
  { label: 'Cash Reserves Reversal', value: 'RESERR' },
  { label: 'Opening Balance', value: 'OPENBAL' },
  { label: 'Customer Adjustment', value: 'JVCADJ' },
  { label: 'Customer Balance', value: 'JVCBAL' }
] as const

export const getTransactionCodeName = (code: string) => {
  switch (code) {
    case 'DSALINV':
      return 'Customer Sales Invoice'
    case 'SALDEL':
      return 'Customer Sales Delivery'
    case 'EXPINV':
      return 'Expense Invoice'
    case 'PURREC':
      return 'Purchase Goods Receipt'
    case 'EXPPAY':
      return 'Expense Payment'
    case 'DIREXP':
      return 'Direct Expense Payment'
    case 'ADVADJ':
      return 'Advance Adjustment'
    case 'AMORTI':
      return 'Amortisation'
    case 'DSALREC':
      return 'Direct Sales Receipt'
    case 'CUSADV':
      return 'Customer Advance Receipt'
    case 'DRINV':
      return 'Customer Invoice (Direct)'
    case 'JOROUT':
      return 'Job Order Issue'
    case 'STKREC':
      return 'Inventory Stock Receipt'
    case 'DIRREC':
      return 'Direct Receipts'
    case 'DSALADV':
      return 'Advance'
    case 'DELRET':
      return 'Delivery Return'
    case 'CRINV':
      return 'Credit Note'
    case 'JORVOU':
      return 'Journal Voucher'
    case 'CUSCLE':
      return 'Customs Clearance Expenses'
    case 'ASTCAP':
      return 'Asset Capitalisation'
    case 'OPENBAL':
      return 'Opening Balance'
    case 'STKISS':
      return 'Inventory Stock Issue'
    case 'PRDACT':
      return 'Production Activity Reporting'
    case 'PRODISS':
      return 'Production Issue'
    case 'PRDREC':
      return 'Production Receipt'
    case 'JORINP':
      return 'Job Order Receipt'
    case 'PURINV':
      return 'Supplier Invoice'
    case 'PURPAY':
      return 'Supplier Invoice Payment'
    default:
      return code
  }
}

export const MARITAL_STATUS = [
  'Single',
  'Married',
  'Divorced',
  'Widowed',
  'Separated',
  'Domestic Partnership'
].map((status) => ({ label: status, value: status }))

export const LANGUAGES = [
  { label: 'English', value: 'en' },
  { label: 'عربي', value: 'ar' }
]

export const TAX_ON_DATA = [
  { label: 'Inclusive', value: 'Yes' },
  { label: 'Exclusive', value: 'No' }
]

export const NEGATIVE_STOCKS_STATUS_OPTIONS = [
  { label: 'Success', value: 'Success' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Failed', value: 'Failed' }
]

export const POS_DISABLED_FIELDS = [
  { label: 'Tax', value: 'Tax' },
  { label: 'Charge', value: 'Charge' },
  { label: 'Discount', value: 'Discount' },
  { label: 'Unit Price', value: 'Unit Price' }
]
