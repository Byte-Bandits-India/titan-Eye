import { CompanyInfo } from '../Reducers/types'

type Menu = {
  label: string
  value?: string
  icon?: string
  access?: { label: string; value: string }[]
  children?: Menu[]
  type?: string
  className?: string
  dontShow?: boolean
  notInMenu?: boolean
}

const MENUS = (companyInfo: CompanyInfo): Menu[] => [
  {
    label: 'Setups',
    icon: 'fa fa-cogs',
    children: [
      {
        label: 'Masters',
        type: 'group',
        children: [
          {
            label: 'Companies',
            value: '/app/companies',
            icon: 'fa fa-sitemap',
            access: [
              { label: 'Add', value: 'add-company' },
              { label: 'Edit', value: 'edit-company' }
            ],
            notInMenu: true
          },
          {
            label: 'Divisions',
            value: '/app/divisions',
            icon: 'fa fa-building-o',
            access: [
              { label: 'View', value: 'divisions' },
              { label: 'Add', value: 'add-division' },
              { label: 'Edit', value: 'edit-division' }
            ],
            dontShow: companyInfo?.configurations?.division !== 'Yes'
          },
          {
            label: 'Departments',
            value: '/app/departments',
            icon: 'fa fa-sitemap',
            access: [
              { label: 'View', value: 'departments' },
              { label: 'Add', value: 'add-department' },
              { label: 'Edit', value: 'edit-department' }
            ]
          },
          {
            label: 'Roles',
            value: '/app/roles',
            icon: 'fa fa-user-secret',
            access: [
              { label: 'View', value: 'roles' },
              { label: 'Add', value: 'add-role' },
              { label: 'Edit', value: 'edit-role' }
            ]
          },
          {
            label: 'Users',
            value: '/app/users',
            icon: 'fa fa-users',
            access: [
              { label: 'View', value: 'users' },
              { label: 'Add', value: 'add-user' },
              { label: 'Edit', value: 'edit-user' }
            ]
          },
          {
            label: 'Currencies',
            value: '/app/currencies',
            icon: 'fa fa-money',
            access: [
              { label: 'View', value: 'currencies' },
              { label: 'Add', value: 'add-currency' },
              { label: 'Edit', value: 'edit-currency' }
            ]
          },
          {
            label: 'Exchange Rate',
            value: '/app/exchange-rates',
            icon: 'fa fa-exchange',
            access: [
              { label: 'View', value: 'exchange-rates' },
              { label: 'Add', value: 'add-exchange-rate' },
              { label: 'Edit', value: 'edit-exchange-rate' }
            ]
          },
          {
            label: 'Categories',
            value: '/app/categories',
            icon: 'fa fa-th-list',
            access: [
              { label: 'View', value: 'categories' },
              { label: 'Add', value: 'add-category' },
              { label: 'Edit', value: 'edit-category' }
            ]
          },
          {
            label: 'Options',
            value: '/app/options',
            icon: 'fa fa-bars',
            access: [
              { label: 'View', value: 'options' },
              { label: 'Add', value: 'add-option' },
              { label: 'Edit', value: 'edit-option' }
            ]
          },
          {
            label: 'Custom Templates',
            value: '/app/custom-templates',
            icon: 'fa fa-file-code-o',
            access: [
              { label: 'View', value: 'custom-templates' },
              { label: 'Add', value: 'add-custom-template' },
              { label: 'Edit', value: 'edit-custom-template' }
            ]
          },
          {
            label: 'Master Upload',
            value: '/app/master-upload',
            icon: 'fa fa-cloud-upload',
            access: [{ label: 'Full', value: 'master-upload' }]
          },
          {
            label: 'Generate Template',
            value: '/app/HTML-generations',
            icon: 'fa fa-file-text-o',
            access: [{ label: 'Full', value: 'HTML-generations' }]
          },
          {
            label: 'Numbering Series',
            value: '/app/numbering-series',
            icon: 'fa fa-sort-numeric-asc',
            access: [{ label: 'Full', value: 'numbering-series' }]
          },
          {
            label: 'Configurations',
            value: '/app/company-configurations',
            icon: 'fa fa-cog',
            access: [{ label: 'Full', value: 'company-configurations' }]
          },
          {
            label: 'Terms and Conditions',
            value: '/app/terms-and-conditions',
            icon: 'fa fa-file-text',
            access: [
              { label: 'View', value: 'terms-and-conditions' },
              { label: 'Add', value: 'add-terms-and-condition' },
              { label: 'Edit', value: 'edit-terms-and-condition' }
            ]
          }
        ]
      }
    ]
  },
  {
    label: 'Projects',
    className: 'mega-menu',
    icon: 'fa fa-folder-open',
    children: [
      {
        label: 'Projects',
        type: 'group',
        children: [
          {
            label: 'Projects',
            value: '/app/projects',
            icon: 'fa fa-folder-open',
            access: [
              { label: 'View', value: 'projects' },
              { label: 'Add', value: 'add-project' },
              { label: 'Edit', value: 'edit-project' }
            ]
          },
          {
            label: 'Project Tasks',
            value: '/app/project-tasks',
            icon: 'fa fa-tasks',
            access: [
              { label: 'View', value: 'project-tasks' },
              { label: 'Edit', value: 'edit-project-task' }
            ]
          },
          {
            label: 'Project Estimation',
            value: '/app/project-estimations',
            icon: 'fa fa-calculator',
            access: [
              { label: 'View', value: 'project-estimations' },
              { label: 'Add', value: 'add-project-estimation' },
              { label: 'Edit', value: 'edit-project-estimation' }
            ]
          },
          {
            label: 'Project Summary Configuration',
            value: '/app/project-summary-configurations',
            icon: 'fa fa-cogs',
            access: [{ label: 'View', value: 'project-summary-configurations' }]
          },
          {
            label: 'Project Rates',
            value: '/app/project-employee-rates',
            icon: 'fa fa-money',
            access: [
              { label: 'View', value: 'project-employee-rates' },
              { label: 'Add', value: 'add-project-employee-rate' },
              { label: 'Edit', value: 'edit-project-employee-rate' }
            ]
          }
        ]
      },
      {
        label: 'Process',
        type: 'group',
        children: [
          {
            label: 'Time Tracker',
            icon: 'fa fa-clock-o',
            //   value: '/app/new-time-entries',
            //   access: [{ label: 'Full', value: 'new-time-entries' }]
            // },
            // {
            //   label: 'New Time Entries Alt',
            value: '/app/new-time-entries-alt',
            access: [{ label: 'Full', value: 'new-time-entries-alt' }]
          }
          // {
          //   label: 'Old Time Entries',
          //   value: '/app/time-entries',
          //   access: [{ label: 'Full', value: 'time-entries' }]
          // },
          // {
          //   label: 'From Timesheet',
          //   value: '/app/from-timesheet',
          //   icon: 'fa fa-list-alt',
          //   access: [{ label: 'Full', value: 'from-timesheet' }]
          // }
        ]
      },
      {
        label: 'Reports',
        type: 'group',
        children: [
          {
            label: 'Time Reports',
            value: '/app/time-reports',
            icon: 'fa fa-pie-chart',
            access: [
              { label: 'View', value: 'time-reports' },
              { label: 'Full', value: 'time-reports-all' }
            ]
          },
          {
            label: 'Project Reports',
            value: '/app/project-reports',
            icon: 'fa fa-bar-chart',
            access: [{ label: 'View', value: 'project-reports' }]
          }
        ]
      }
    ]
  },
  {
    label: 'E-Invoicing',
    className: 'mega-menu',
    icon: 'fa fa-file-text-o',
    children: [
      {
        label: 'Setup',
        type: 'group',
        children: [
          {
            label: 'Customers',
            value: '/app/einvoice-customers',
            icon: 'fa fa-user',
            access: [
              { label: 'View', value: 'einvoice-customers' },
              { label: 'Add', value: 'add-einvoice-customer' },
              { label: 'Edit', value: 'edit-einvoice-customer' }
            ]
          },
          {
            label: 'Products/Services',
            value: '/app/einvoice-products',
            icon: 'fa fa-cubes',
            access: [
              { label: 'View', value: 'einvoice-products' },
              { label: 'Add', value: 'add-einvoice-product' },
              { label: 'Edit', value: 'edit-einvoice-product' }
            ]
          },
          {
            label: 'Product Attributes',
            value: '/app/product-attributes',
            icon: 'fa fa-tags',
            access: [
              { label: 'View', value: 'product-attributes' },
              { label: 'Add', value: 'add-product-attribute' },
              { label: 'Edit', value: 'edit-product-attribute' }
            ]
          },
          {
            label: 'Onboarding',
            value: '/app/peppol-invoice-onboarding',
            icon: 'fa fa-cogs',
            access: [{ label: 'Full', value: 'peppol-invoice-onboarding' }],
            dontShow: !['Peppol 4 Corner', 'Peppol 5 Corner'].includes(
              companyInfo?.configurations?.digitalTaxationIntegration
            )
          }
        ]
      },
      {
        label: 'Process',
        type: 'group',
        children: [
          {
            label: 'Tax Invoice',
            value: '/app/tax-invoices',
            icon: 'fa fa-file-text-o',
            access: [
              { label: 'View', value: 'tax-invoices' },
              { label: 'Add', value: 'add-tax-invoice' },
              { label: 'Edit', value: 'edit-tax-invoice' }
            ]
          },
          {
            label: 'Quick Invoice',
            value: '/app/add-quick-invoice',
            icon: 'fa fa-rocket',
            access: [
              { label: 'Add', value: 'add-quick-invoice' },
              { label: 'Edit', value: 'edit-quick-invoice' }
            ]
          },
          {
            label: 'Tax Credit Invoices',
            value: '/app/tax-credit-invoices',
            icon: 'fa fa-arrow-circle-left',
            access: [
              { label: 'View', value: 'tax-credit-invoices' },
              { label: 'Add', value: 'add-tax-credit-invoice' },
              { label: 'Edit', value: 'edit-tax-credit-invoice' }
            ]
          },
          {
            label: 'Tax Debit Invoices',
            value: '/app/tax-debit-invoices',
            icon: 'fa fa-arrow-circle-right',
            access: [
              { label: 'View', value: 'tax-debit-invoices' },
              { label: 'Add', value: 'add-tax-debit-invoice' },
              { label: 'Edit', value: 'edit-tax-debit-invoice' }
            ]
          },
          {
            label: 'Tax Advances',
            value: '/app/tax-advances',
            icon: 'fa fa-credit-card',
            access: [
              { label: 'Full', value: 'tax-advances' },
              { label: 'Add', value: 'add-tax-advance' },
              { label: 'Edit', value: 'edit-tax-advance' }
            ]
          }
        ]
      },
      {
        label: 'Reports',
        type: 'group',
        children: [
          {
            label: 'Customer Statement',
            value: '/app/einvoice-customer-statements',
            icon: 'fa fa-file-pdf-o',
            access: [{ label: 'View', value: 'einvoice-customer-statements' }]
          },
          {
            label: 'Customer Ageing',
            value: '/app/einvoice-customer-invoice-ageing',
            icon: 'fa fa-hourglass-half',
            access: [{ label: 'View', value: 'einvoice-customer-invoice-ageing' }]
          },
          {
            label: 'Output VAT Report',
            value: '/app/einvoice-output-vat',
            icon: 'fa fa-bar-chart',
            access: [{ label: 'View', value: 'einvoice-output-vat' }]
          }
        ]
      },
      {
        label: 'Monitoring',
        type: 'group',
        children: [
          {
            label: 'Zatca Transmissions',
            value: '/app/zatca-transmissions',
            icon: 'fa fa-exchange',
            access: [{ label: 'View', value: 'zatca-transmissions' }],
            dontShow: companyInfo?.configurations?.digitalTaxationIntegration !== 'Direct'
          },
          {
            label: 'Zatca Dashboard',
            value: '/app/zatca-dashboard',
            icon: 'fa fa-dashboard',
            access: [{ label: 'View', value: 'zatca-dashboard' }],
            dontShow: companyInfo?.configurations?.digitalTaxationIntegration !== 'Direct'
          },
          {
            label: 'Peppol Sending Logs',
            value: '/app/peppol-sending-logs',
            icon: 'fa fa-exchange',
            access: [{ label: 'View', value: 'peppol-sending-logs' }],
            dontShow: !['Peppol 4 Corner', 'Peppol 5 Corner'].includes(
              companyInfo?.configurations?.digitalTaxationIntegration
            )
          },
          {
            label: 'Peppol Receiving Logs',
            value: '/app/peppol-receiving-logs',
            icon: 'fa fa-exchange',
            access: [{ label: 'View', value: 'peppol-receiving-logs' }],
            dontShow: !['Peppol 4 Corner', 'Peppol 5 Corner'].includes(
              companyInfo?.configurations?.digitalTaxationIntegration
            )
          },
          {
            label: 'Restaurant Logs',
            value: '/app/restaurant-logs',
            icon: 'fa fa-cutlery',
            access: [{ label: 'View', value: 'restaurant-logs' }]
          },
          {
            label: 'EMR Logs',
            value: '/app/emr-logs',
            icon: 'fa fa-file-code-o',
            access: [{ label: 'View', value: 'emr-logs' }]
          }
        ]
      }
    ]
  },
  {
    label: 'Sales',
    className: 'mega-menu',
    icon: 'fa fa-shopping-cart',
    children: [
      {
        label: 'Setups',
        type: 'group',
        children: [
          {
            label: 'Customers',
            value: '/app/customers',
            icon: 'fa fa-user',
            access: [
              { label: 'View', value: 'customers' },
              { label: 'Add', value: 'add-customer' },
              { label: 'Edit', value: 'edit-customer' }
            ]
          },
          {
            label: 'Customer Prices',
            value: '/app/client-prices/customer',
            icon: 'fa fa-money',
            access: [
              { label: 'View', value: 'customer-prices' },
              { label: 'Add', value: 'add-customer-price' },
              { label: 'Edit', value: 'edit-customer-price' }
            ]
          },
          {
            label: 'Sales Person',
            value: '/app/sales-persons',
            icon: 'fa fa-user-circle',
            access: [
              { label: 'View', value: 'sales-persons' },
              { label: 'Add', value: 'add-sales-person' },
              { label: 'Edit', value: 'edit-sales-person' }
            ]
          },
          // {
          //   label: 'Sales Person By Clients',
          //   value: '/app/sales-person-by-clients',
          //   access: [
          //     { label: 'View', value: 'sales-person-by-clients' },
          //     { label: 'Add', value: 'add-sales-person-by-client' },
          //     { label: 'Edit', value: 'edit-sales-person-by-client' }
          //   ]
          // },
          {
            label: 'Products/Services',
            value: '/app/products',
            icon: 'fa fa-cubes',
            access: [
              { label: 'View', value: 'products' },
              { label: 'Add', value: 'add-product' },
              { label: 'Edit', value: 'edit-product' }
            ]
          },
          {
            label: 'Product Attributes',
            value: '/app/product-attributes',
            icon: 'fa fa-tags',
            access: [
              { label: 'View', value: 'product-attributes' },
              { label: 'Add', value: 'add-product-attribute' },
              { label: 'Edit', value: 'edit-product-attribute' }
            ]
          }
        ]
      },
      {
        label: 'Process',
        type: 'group',
        children: [
          {
            label: 'Sales Quotation',
            value: '/app/sales-quotations',
            icon: 'fa fa-file-text-o',
            access: [
              { label: 'View', value: 'sales-quotations' },
              { label: 'Add', value: 'add-sales-quotation' },
              { label: 'Edit', value: 'edit-sales-quotation' }
            ]
          },
          {
            label: 'Sales Order',
            value: '/app/sales-orders',
            icon: 'fa fa-shopping-cart',
            access: [
              { label: 'View', value: 'sales-orders' },
              { label: 'Add', value: 'add-sales-order' },
              { label: 'Edit', value: 'edit-sales-order' }
            ]
          },
          {
            label: 'Job Order',
            value: '/app/job-orders',
            icon: 'fa fa-tasks',
            access: [
              { label: 'View', value: 'job-orders' },
              { label: 'Add', value: 'add-job-order' },
              { label: 'Edit', value: 'edit-job-order' }
            ],
            dontShow: companyInfo?.configurations?.jobBasedOnSales !== 'Yes'
          },
          {
            label: 'Delivery',
            value: '/app/sales-deliveries',
            icon: 'fa fa-truck',
            access: [
              { label: 'View', value: 'sales-deliveries' },
              { label: 'Add', value: 'add-sales-delivery' },
              { label: 'Edit', value: 'edit-sales-delivery' }
            ]
          },
          {
            label: 'Delivery Returns',
            value: '/app/delivery-returns',
            icon: 'fa fa-undo',
            access: [
              { label: 'View', value: 'delivery-returns' },
              { label: 'Add', value: 'add-delivery-return' },
              { label: 'Edit', value: 'edit-delivery-return' }
            ]
          },
          {
            label: 'Proforma Invoices',
            value: '/app/proforma-invoices',
            icon: 'fa fa-file-o',
            access: [
              { label: 'View', value: 'proforma-invoices' },
              { label: 'Add', value: 'add-proforma-invoice' },
              { label: 'Edit', value: 'edit-proforma-invoice' }
            ]
          },
          {
            label: 'Customer Invoice',
            value: '/app/incomes',
            icon: 'fa fa-file-text',
            access: [
              { label: 'View', value: 'incomes' },
              { label: 'Add', value: 'add-income' },
              { label: 'Edit', value: 'edit-income' }
            ]
          },
          {
            label: 'Recurring Invoices',
            value: '/app/recurring-invoices',
            icon: 'fa fa-file-text',
            access: [
              { label: 'View', value: 'recurring-invoices' },
              { label: 'Add', value: 'add-recurring-invoice' },
              { label: 'Edit', value: 'edit-recurring-invoice' }
            ]
          },
          {
            label: 'Customer Invoice Receipt',
            value: '/app/invoice-receipts',
            icon: 'fa fa-check-square-o',
            access: [
              { label: 'Full', value: 'invoice-receipts' },
              { label: 'Add', value: 'add-invoice-receipt' },
              { label: 'Edit', value: 'edit-invoice-receipt' }
            ]
          },
          {
            label: 'Direct Customer Receipt',
            value: '/app/direct-receipts',
            icon: 'fa fa-arrow-circle-down',
            access: [
              { label: 'Full', value: 'direct-receipts' },
              { label: 'Add', value: 'add-direct-receipt' },
              { label: 'Edit', value: 'edit-direct-receipt' }
            ]
          },
          {
            label: 'Customer Advances',
            value: '/app/customer-advances',
            icon: 'fa fa-credit-card',
            access: [
              { label: 'Full', value: 'customer-advances' },
              { label: 'Add', value: 'add-customer-advance' },
              { label: 'Edit', value: 'edit-customer-advance' }
            ]
          },
          {
            label: 'Credit / Sales Return',
            value: '/app/credit-invoices',
            icon: 'fa fa-reply',
            access: [
              { label: 'Full', value: 'credit-invoices' },
              { label: 'Add', value: 'add-credit-invoice' },
              { label: 'Edit', value: 'edit-credit-invoice' }
            ]
          },
          {
            label: 'Tax Invoice (Migrated)',
            value: '/app/old-customer-invoice-conversion',
            icon: 'fa fa-file-archive-o',
            access: [{ label: 'View', value: 'old-customer-invoice-conversion' }]
          }
        ]
      },
      {
        label: 'Reports',
        type: 'group',
        children: [
          {
            label: 'Sales Reports',
            value: '/app/reports/sales-reports',
            icon: 'fa fa-line-chart',
            access: [{ label: 'View', value: 'reports/sales-reports' }]
          },
          {
            label: 'Customer Statement',
            value: '/app/reports/customer-statements',
            icon: 'fa fa-file-pdf-o',
            access: [{ label: 'View', value: 'reports/customer-statements' }]
          },
          {
            label: 'Customer Statement (Book)',
            value: '/app/reports/customer-statement-from-book',
            icon: 'fa fa-book',
            access: [{ label: 'View', value: 'reports/customer-statement-from-book' }]
          },
          {
            label: 'Customer Statement (Summary)',
            value: '/app/reports/customer-statement-summary',
            icon: 'fa fa-file-text',
            access: [{ label: 'View', value: 'reports/customer-statement-summary' }]
          },
          {
            label: 'Delivery Report',
            value: '/app/sales-deliveries/reports',
            icon: 'fa fa-truck',
            access: [{ label: 'View', value: 'sales-deliveries/reports' }]
          },
          {
            label: 'Customer Invoice Ageing',
            value: '/app/reports/customer-invoice-ageing',
            icon: 'fa fa-hourglass-half',
            access: [{ label: 'View', value: 'reports/customer-invoice-ageing' }]
          },
          {
            label: 'Customer Invoice Summary',
            value: '/app/reports/customer-invoice-summary',
            icon: 'fa fa-list-alt',
            access: [{ label: 'View', value: 'reports/customer-invoice-summary' }]
          },
          {
            label: 'Sales By Customer',
            value: '/app/reports/sales-by-customer',
            icon: 'fa fa-users',
            access: [{ label: 'View', value: 'reports/sales-by-customer' }]
          },
          {
            label: 'Sales By Sales Person',
            value: '/app/reports/sales-by-sales-person',
            icon: 'fa fa-user-circle',
            access: [{ label: 'View', value: 'reports/sales-by-sales-person' }]
          },
          {
            label: 'Sales By Country',
            value: '/app/reports/sales-by-country',
            icon: 'fa fa-globe',
            access: [{ label: 'View', value: 'reports/sales-by-country' }]
          },
          {
            label: 'Sales By Currency',
            value: '/app/reports/sales-by-currency',
            icon: 'fa fa-money',
            access: [{ label: 'View', value: 'reports/sales-by-currency' }]
          },
          {
            label: 'Sales By Product',
            value: '/app/reports/sales-by-product',
            icon: 'fa fa-cubes',
            access: [{ label: 'View', value: 'reports/sales-by-product' }]
          },
          {
            label: 'Open Sales Order',
            value: '/app/open-sales-order-reports',
            icon: 'fa fa-folder-open',
            access: [{ label: 'View', value: 'open-sales-order-reports' }]
          },
          {
            label: 'Daily Sales Order',
            value: '/app/daily-sales-order-reports',
            icon: 'fa fa-calendar',
            access: [{ label: 'View', value: 'daily-sales-order-reports' }]
          },
          {
            label: 'Output VAT Report',
            value: '/app/output-vat',
            icon: 'fa fa-bar-chart',
            access: [{ label: 'View', value: 'output-vat' }]
          },
          {
            label: 'Sales Dashboard',
            value: '/app/sales-dashboard',
            icon: 'fa fa-dashboard',
            access: [{ label: 'View', value: 'sales-dashboard' }]
          },
          {
            label: 'Quotation SalesOrder Comparison',
            value: '/app/quotation-sales-order-comparison',
            icon: 'fa fa-exchange',
            access: [{ label: 'View', value: 'quotation-sales-order-comparison' }],
            dontShow: companyInfo?.configurations?.quotationBasedSalesOrder !== 'Yes'
          }
        ]
      }
    ]
  },
  {
    label: 'Purchase',
    className: 'mega-menu',
    icon: 'fa fa-credit-card',
    children: [
      {
        label: 'Setups',
        type: 'group',
        children: [
          {
            label: 'Supplier/Vendor',
            value: '/app/vendors',
            icon: 'fa fa-user',
            access: [
              { label: 'View', value: 'vendors' },
              { label: 'Add', value: 'add-vendor' },
              { label: 'Edit', value: 'edit-vendor' }
            ]
          },
          {
            label: 'Supplier Prices',
            value: '/app/client-prices/vendor',
            icon: 'fa fa-money',
            access: [
              { label: 'View', value: 'vendor-prices' },
              { label: 'Add', value: 'add-vendor-price' },
              { label: 'Edit', value: 'edit-vendor-price' }
            ]
          },
          {
            label: 'Purchase Person',
            value: '/app/purchase-persons',
            icon: 'fa fa-user-circle',
            access: [
              { label: 'View', value: 'purchase-persons' },
              { label: 'Add', value: 'add-purchase-person' },
              { label: 'Edit', value: 'edit-purchase-person' }
            ]
          },
          {
            label: 'PR Approvers',
            value: '/app/approvers',
            icon: 'fa fa-check-circle',
            access: [{ label: 'Full', value: 'approvers' }]
          }
        ]
      },
      {
        label: 'Process',
        type: 'group',
        children: [
          {
            label: 'Purchase Requests',
            value: '/app/purchase-requests',
            icon: 'fa fa-sticky-note',
            access: [
              { label: 'View', value: 'purchase-requests' },
              { label: 'Add', value: 'add-purchase-request' },
              { label: 'Edit', value: 'edit-purchase-request' }
            ]
          },
          {
            label: 'Purchase Order',
            value: '/app/purchase-orders',
            icon: 'fa fa-shopping-cart',
            access: [
              { label: 'View', value: 'purchase-orders' },
              { label: 'Add', value: 'add-purchase-order' },
              { label: 'Edit', value: 'edit-purchase-order' }
            ]
          },
          {
            label: 'Goods Receipt',
            value: '/app/purchase-receipts',
            icon: 'fa fa-download',
            access: [
              { label: 'View', value: 'purchase-receipts' },
              { label: 'Add', value: 'add-purchase-receipt' },
              { label: 'Edit', value: 'edit-purchase-receipt' }
            ]
          },
          {
            label: 'Goods Returns',
            value: '/app/goods-returns',
            icon: 'fa fa-undo',
            access: [
              { label: 'View', value: 'goods-returns' },
              { label: 'Add', value: 'add-goods-return' },
              { label: 'Edit', value: 'edit-goods-return' }
            ]
          },
          {
            label: 'Customs Clearance',
            value: '/app/customs-clearances',
            icon: 'fa fa-ship',
            access: [
              { label: 'View', value: 'customs-clearances' },
              { label: 'Add', value: 'add-customs-clearance' },
              { label: 'Edit', value: 'edit-customs-clearance' }
            ]
          },
          {
            label: 'Supplier Invoice',
            value: '/app/expenses',
            icon: 'fa fa-file-text',
            access: [
              { label: 'View', value: 'expenses' },
              { label: 'Add', value: 'add-expense' },
              { label: 'Edit', value: 'edit-expense' }
            ]
          },
          {
            label: 'Supplier Invoice Payments',
            value: '/app/expense-payments',
            icon: 'fa fa-check-square-o',
            access: [
              { label: 'Full', value: 'expense-payments' },
              { label: 'Add', value: 'add-expense-payment' },
              { label: 'Edit', value: 'edit-expense-payment' }
            ]
          },
          {
            label: 'Direct Supplier Payments',
            value: '/app/direct-expenses',
            icon: 'fa fa-arrow-circle-up',
            access: [
              { label: 'Full', value: 'direct-expenses' },
              { label: 'Add', value: 'add-direct-expense' },
              { label: 'Edit', value: 'edit-direct-expense' }
            ]
          },
          {
            label: 'Prepaid - Amortizations',
            value: '/app/amortizations',
            icon: 'fa fa-calendar-check-o',
            access: [
              { label: 'Full', value: 'amortizations' },
              { label: 'Add', value: 'add-amortization' },
              { label: 'Edit', value: 'edit-amortization' }
            ]
          },
          {
            label: 'Supplier Advances',
            value: '/app/supplier-advances',
            icon: 'fa fa-credit-card',
            access: [
              { label: 'Full', value: 'supplier-advances' },
              { label: 'Add', value: 'add-supplier-advance' },
              { label: 'Edit', value: 'edit-supplier-advance' }
            ]
          },
          {
            label: 'Debit / Purchase Return',
            value: '/app/debit-invoices',
            icon: 'fa fa-reply',
            access: [
              { label: 'Full', value: 'debit-invoices' },
              { label: 'Add', value: 'add-debit-invoice' },
              { label: 'Edit', value: 'edit-debit-invoice' }
            ]
          },
          {
            label: 'Expense Invoice (Migrated)',
            value: '/app/old-supplier-invoice-conversion',
            icon: 'fa fa-history',
            access: [{ label: 'View', value: 'old-supplier-invoice-conversion' }]
          }
        ]
      },
      {
        label: 'Reports',
        type: 'group',
        children: [
          {
            label: 'Purchase Reports',
            value: '/app/reports/purchase-reports',
            icon: 'fa fa-line-chart',
            access: [{ label: 'View', value: 'reports/purchase-reports' }]
          },
          {
            label: 'Purchase Clearing Report',
            value: '/app/reports/purchase-clearing-account',
            icon: 'flaticon-invoice-3',
            access: [{ label: 'View', value: 'reports/purchase-clearing-account' }]
          },
          {
            label: 'Supplier Statement',
            value: '/app/reports/supplier-statements',
            icon: 'fa fa-file-pdf-o',
            access: [{ label: 'View', value: 'reports/supplier-statements' }]
          },
          {
            label: 'Supplier Statement (Book)',
            value: '/app/reports/supplier-statement-from-book',
            icon: 'fa fa-book',
            access: [{ label: 'View', value: 'reports/supplier-statement-from-book' }]
          },
          {
            label: 'Supplier Invoice Ageing',
            value: '/app/reports/supplier-invoice-ageing',
            icon: 'fa fa-hourglass-half',
            access: [{ label: 'View', value: 'reports/supplier-invoice-ageing' }]
          },
          {
            label: 'Supplier Invoice Summary',
            value: '/app/reports/supplier-invoice-summary',
            icon: 'fa fa-list-alt',
            access: [{ label: 'View', value: 'reports/supplier-invoice-summary' }]
          },
          {
            label: 'Purchase By Supplier',
            value: '/app/reports/purchase-by-supplier',
            icon: 'fa fa-users',
            access: [{ label: 'View', value: 'reports/purchase-by-supplier' }]
          },
          {
            label: 'Purchase By Country',
            value: '/app/reports/purchase-by-country',
            icon: 'fa fa-globe',
            access: [{ label: 'View', value: 'reports/purchase-by-country' }]
          },
          {
            label: 'Purchase By Currency',
            value: '/app/reports/purchase-by-currency',
            icon: 'fa fa-money',
            access: [{ label: 'View', value: 'reports/purchase-by-currency' }]
          },
          {
            label: 'Purchase By Product',
            value: '/app/reports/purchase-by-product',
            icon: 'fa fa-cubes',
            access: [{ label: 'View', value: 'reports/purchase-by-product' }]
          },
          {
            label: 'Open Purchase Order',
            value: '/app/open-purchase-order-reports',
            icon: 'fa fa-folder-open',
            access: [{ label: 'View', value: 'open-purchase-order-reports' }]
          },
          {
            label: 'Material Purchase History',
            value: '/app/reports/material-purchase-history',
            icon: 'fa fa-history',
            access: [{ label: 'View', value: 'reports/material-purchase-history' }]
          },
          {
            label: 'Daily Purchase Order',
            value: '/app/reports/daily-purchase-order-reports',
            icon: 'fa fa-calendar',
            access: [{ label: 'View', value: 'reports/daily-purchase-order-reports' }]
          },
          {
            label: 'Input VAT Report',
            value: '/app/reports/input-vat',
            icon: 'fa fa-bar-chart',
            access: [{ label: 'View', value: 'reports/input-vat' }]
          },
          {
            label: 'Purchase Dashboard',
            value: '/app/reports/purchase-dashboard',
            icon: 'fa fa-dashboard',
            access: [{ label: 'View', value: 'reports/purchase-dashboard' }]
          }
        ]
      }
    ]
  },
  {
    label: 'Accounting',
    className: 'mega-menu',
    icon: 'fa fa-calculator',
    children: [
      {
        label: 'Setups',
        type: 'group',
        children: [
          {
            label: 'Financial Year & Closure',
            value: '/app/new-financial-years',
            icon: 'fa fa-calendar',
            access: [
              { label: 'View', value: 'new-financial-years' },
              { label: 'FY Closure', value: 'profit-and-loss-for-fyc' }
            ]
          },
          {
            label: 'FY Months & Closure',
            value: '/app/financial-years',
            icon: 'fa fa-calendar',
            access: [{ label: 'View', value: 'financial-years' }]
          },
          {
            label: 'Chart Of Account',
            value: '/app/chart-of-accounts',
            icon: 'fa fa-sitemap',
            access: [{ label: 'View', value: 'chart-of-accounts' }]
          },
          {
            label: 'Default Accounts',
            value: '/app/default-chart-of-accounts',
            icon: 'fa fa-cogs',
            access: [{ label: 'View', value: 'default-chart-of-accounts' }]
          },
          {
            label: 'Account Options',
            value: '/app/chart-of-account-options',
            icon: 'fa fa-wrench',
            access: [{ label: 'View', value: 'chart-of-account-options' }]
          },
          {
            label: 'Report configuration',
            value: '/app/finance-report-configuration',
            icon: 'fa fa-sliders',
            access: [{ label: 'View', value: 'finance-report-configuration' }]
          },
          {
            label: 'Extract Options',
            value: '/app/options',
            icon: 'fa fa-bars',
            access: [
              { label: 'View', value: 'options' },
              { label: 'Add', value: 'add-option' },
              { label: 'Edit', value: 'edit-option' }
            ]
          }
        ]
      },
      {
        label: 'Ledger',
        type: 'group',
        children: [
          {
            label: 'Finance Book',
            value: '/app/finance-postings',
            icon: 'fa fa-book',
            access: [{ label: 'View', value: 'finance-postings' }]
          },
          {
            label: 'Journal Entries',
            value: '/app/journal-vouchers',
            icon: 'fa fa-pencil',
            access: [
              { label: 'View', value: 'journal-vouchers' },
              { label: 'Add', value: 'add-journal-voucher' },
              { label: 'Edit', value: 'edit-journal-voucher' }
            ]
          }
        ]
      },
      {
        label: 'Sundry',
        type: 'group',
        children: [
          {
            label: 'Direct Receipt',
            value: '/app/direct-receipts',
            icon: 'fa fa-arrow-circle-down',
            access: [
              { label: 'Full', value: 'direct-receipts' },
              { label: 'Add', value: 'add-direct-receipt' },
              { label: 'Edit', value: 'edit-direct-receipt' }
            ]
          },
          {
            label: 'Direct Payments',
            value: '/app/direct-expenses',
            icon: 'fa fa-arrow-circle-up',
            access: [
              { label: 'Full', value: 'direct-expenses' },
              { label: 'Add', value: 'add-direct-expense' },
              { label: 'Edit', value: 'edit-direct-expense' }
            ]
          },
          {
            label: 'Prepaid - Amortizations',
            value: '/app/amortizations',
            icon: 'fa fa-calendar-check-o',
            access: [
              { label: 'Full', value: 'amortizations' },
              { label: 'Add', value: 'add-amortization' },
              { label: 'Edit', value: 'edit-amortization' }
            ]
          },
          {
            label: 'Employee Advances',
            value: '/app/employee-advances',
            icon: 'fa fa-credit-card',
            access: [
              { label: 'Full', value: 'employee-advances' },
              { label: 'Add', value: 'add-employee-advance' },
              { label: 'Edit', value: 'edit-employee-advance' }
            ]
          },
          {
            label: 'Petty Cash Transfer',
            value: '/app/petty-cash-transfers',
            icon: 'fa fa-money',
            access: [
              { label: 'Full', value: 'petty-cash-transfers' },
              { label: 'Add', value: 'add-petty-cash-transfer' },
              { label: 'Edit', value: 'edit-petty-cash-transfer' }
            ]
          },
          {
            label: 'Petty Cash Payment',
            value: '/app/petty-cash-payments',
            icon: 'fa fa-arrow-circle-up',
            access: [{ label: 'Full', value: 'petty-cash-payments' }]
          },
          {
            label: 'Expense Report (Payee)',
            value: '/app/expense-report-payee',
            icon: 'fa fa-list',
            access: [{ label: 'View', value: 'expense-report-payee' }]
          }
        ]
      },
      {
        label: 'Uploads',
        type: 'group',
        children: [
          {
            label: 'Income Upload',
            value: '/app/upload-income-invoices',
            icon: 'fa fa-upload',
            access: [{ label: 'Full', value: 'upload-income-invoices' }]
          },
          {
            label: 'Expense Upload',
            value: '/app/upload-expense-invoices',
            icon: 'fa fa-upload',
            access: [{ label: 'Full', value: 'upload-expense-invoices' }]
          },
          {
            label: 'Direct Receipts Upload',
            value: '/app/upload-direct-receipts',
            icon: 'fa fa-sign-in',
            access: [{ label: 'Full', value: 'upload-direct-receipts' }]
          },
          {
            label: 'Direct Expenses Upload',
            value: '/app/upload-direct-expenses',
            icon: 'fa fa-sign-out',
            access: [{ label: 'Full', value: 'upload-direct-expenses' }]
          },
          {
            label: 'Journal Voucher upload',
            value: '/app/upload-journal-vouchers',
            icon: 'fa fa-pencil-square-o',
            access: [{ label: 'Full', value: 'upload-journal-vouchers' }]
          },
          {
            label: 'Bill Upload',
            value: '/app/upload-bills',
            icon: 'fa fa-file-text',
            access: [{ label: 'View', value: 'upload-bills' }]
          },
          {
            label: 'Generate Invoice',
            value: '/app/generate-invoice',
            icon: 'fa fa-file-text-o',
            access: [{ label: 'Full', value: 'generate-invoice' }]
          },
          {
            label: 'SAP Invoice Interface',
            value: '/app/sap-invoice-upload',
            icon: 'fa fa-plug',
            access: [{ label: 'Full', value: 'sap-invoice-upload' }]
          }
        ]
      },
      {
        label: 'Banks',
        type: 'group',
        children: [
          {
            label: 'Bank Reconciliation',
            value: '/app/bank-reconciliations',
            icon: 'fa fa-university',
            access: [
              { label: 'View', value: 'bank-reconciliations' },
              { label: 'Add', value: 'add-bank-reconciliation' },
              { label: 'Edit', value: 'edit-bank-reconciliation' }
            ]
          },
          {
            label: 'Bank Statements',
            value: '/app/bank-statements',
            icon: 'fa fa-book',
            access: [{ label: 'View', value: 'bank-statements' }]
          },
          {
            label: 'Bank Accounts',
            value: '/app/bank-accounts',
            icon: 'fa fa-bank',
            access: [{ label: 'View', value: 'bank-accounts' }]
          },
          {
            label: 'Bank Account Transfers',
            value: '/app/bank-account-transfers',
            icon: 'fa fa-exchange',
            access: [
              { label: 'View', value: 'bank-account-transfers' },
              { label: 'Add', value: 'add-bank-account-transfer' },
              { label: 'Edit', value: 'edit-bank-account-transfer' }
            ]
          }
        ]
      },
      {
        label: 'P&L Reports',
        type: 'group',
        children: [
          {
            label: 'P&L  Statement',
            value: '/app/profit-and-loss',
            icon: 'fa fa-line-chart',
            access: [{ label: 'View', value: 'profit-and-loss' }]
          },
          {
            label: 'P&L Performance',
            value: '/app/profit-and-loss-performances',
            icon: 'fa fa-bar-chart',
            access: [{ label: 'View', value: 'profit-and-loss-performances' }]
          },
          {
            label: 'P&L Monthly',
            value: '/app/profit-and-loss-monthly',
            icon: 'fa fa-calendar',
            access: [{ label: 'View', value: 'profit-and-loss-monthly' }]
          },
          {
            label: 'P&L Divisions',
            value: '/app/profit-and-loss-divisions',
            icon: 'fa fa-sitemap',
            access: [{ label: 'View', value: 'profit-and-loss-divisions' }]
          },
          {
            label: 'P&L Consolidated',
            value: '/app/profit-and-loss-consolidated',
            icon: 'fa fa-compress',
            access: [{ label: 'View', value: 'profit-and-loss-consolidated' }]
          }
        ]
      },
      {
        label: 'Balance Reports',
        type: 'group',
        children: [
          {
            label: 'Balance Sheet',
            value: '/app/balance-sheets',
            icon: 'fa fa-list-alt',
            access: [{ label: 'View', value: 'balance-sheets' }]
          },
          {
            label: 'Balance Sheet Performance',
            value: '/app/balance-sheet-performances',
            icon: 'fa fa-book',
            access: [{ label: 'View', value: 'balance-sheet-performances' }]
          },
          {
            label: 'Balance Sheet Monthly',
            value: '/app/balance-sheet-monthly',
            icon: 'fa fa-book',
            access: [{ label: 'View', value: 'balance-sheet-monthly' }]
          },
          {
            label: 'Balance Sheet Consolidated',
            value: '/app/balance-sheet-consolidated',
            icon: 'fa fa-book',
            access: [{ label: 'View', value: 'balance-sheet-consolidated' }]
          }
        ]
      },
      {
        label: 'Tax Reports',
        type: 'group',
        children: [
          {
            label: 'Tax Summary',
            value: '/app/reports/tax-summary',
            icon: 'fa fa-file-text-o',
            access: [{ label: 'View', value: 'reports/tax-summary' }]
          },
          {
            label: 'Tax Summary FTA',
            value: '/app/reports/tax-summary-fta',
            icon: 'fa fa-flag',
            access: [{ label: 'View', value: 'reports/tax-summary-fta' }]
          },
          {
            label: 'Excise Summary',
            value: '/app/reports/excise-summary',
            icon: 'fa fa-file-text-o',
            access: [{ label: 'View', value: 'reports/excise-summary' }]
          },
          {
            label: 'Tax Declaration',
            value: '/app/tax-declaration',
            icon: 'fa fa-file',
            access: [
              { label: 'View', value: 'tax-declaration' },
              { label: 'Add', value: 'add-tax-declaration' },
              { label: 'Edit', value: 'edit-tax-declaration' }
            ]
          }
        ]
      },
      {
        label: 'Ledger Reports',
        type: 'group',
        children: [
          {
            label: 'Account Balances',
            value: '/app/account-balances',
            icon: 'fa fa-book',
            access: [{ label: 'View', value: 'account-balances' }]
          },
          {
            label: 'Period Closure Balance',
            value: '/app/period-closure-balances',
            icon: 'fa fa-clock-o',
            access: [{ label: 'View', value: 'period-closure-balances' }]
          },
          {
            label: 'General Ledger Balance',
            value: '/app/general-ledger-balances',
            icon: 'fa fa-list',
            access: [{ label: 'View', value: 'general-ledger-balances' }]
          }
        ]
      },
      {
        label: 'Other Reports',
        type: 'group',
        children: [
          {
            label: 'Cost of Goods Sold',
            value: '/app/reports/cogs',
            icon: 'fa fa-cubes',
            access: [{ label: 'View', value: '/app/reports/cogs' }]
          },
          {
            label: 'Employee Expense Report',
            value: '/app/reports/employee-expense-report',
            icon: 'fa fa-user',
            access: [{ label: 'View', value: '/app/reports/employee-expense-report' }]
          },
          {
            label: 'Trial Balance',
            value: '/app/trial-balance',
            icon: 'fa fa-building',
            access: [{ label: 'View', value: 'trial-balance' }]
          },
          {
            label: 'Trial Balance Consolidated',
            value: '/app/trial-balance-consolidated',
            icon: 'fa fa-building',
            access: [{ label: 'View', value: 'trial-balance-consolidated' }]
          },
          {
            label: 'Cash Flow Report',
            value: '/app/cash-flow',
            icon: 'fa fa-money',
            access: [{ label: 'View', value: 'cash-flow' }]
          },
          {
            label: 'Cost Accounting Report',
            value: '/app/cost-accounting-report',
            icon: 'fa fa-calculator',
            access: [{ label: 'View', value: 'cost-accounting-report' }]
          },
          {
            label: 'Stock Movement Report',
            value: '/app/stock-movement-report',
            icon: 'fa fa-file-text-o',
            access: [{ label: 'View', value: 'stock-movement-report' }]
          },
          {
            label: 'Stock Account Balances',
            value: '/app/stock-account-balances',
            icon: 'fa fa-file-text-o',
            access: [{ label: 'View', value: 'stock-account-balances' }]
          },
          {
            label: 'Cogs Account Balances',
            value: '/app/cogs-account-balances',
            icon: 'fa fa-file-text-o',
            access: [{ label: 'View', value: 'cogs-account-balances' }]
          }
        ]
      },
      {
        label: 'Dashboard',
        type: 'group',
        children: [
          {
            label: 'Accounting Dashboard',
            value: '/app/accounting-dashboard',
            icon: 'fa fa-dashboard',
            access: [{ label: 'View', value: 'accounting-dashboard' }]
          }
        ]
      },
      {
        label: 'Employee Reports',
        type: 'group',
        children: [
          {
            label: 'Employee Salary Reports',
            value: '/app/employee-salary-reports',
            icon: 'fa fa-dashboard',
            access: [{ label: 'View', value: 'employee-salary-reports' }]
          }
        ]
      }
    ]
  },
  {
    label: 'Controlling',
    className: 'mega-menu',
    icon: 'fa fa-area-chart',
    children: [
      {
        label: 'Setups',
        type: 'group',
        children: [
          {
            label: 'Cost Center',
            value: '/app/cost-centers',
            icon: 'fa fa-building',
            access: [{ label: 'View', value: 'cost-centers' }],
            dontShow: companyInfo?.configurations?.costCenter !== 'Yes'
          }
        ]
      },
      {
        label: 'Process',
        type: 'group',
        children: [
          {
            label: 'Cost Budgeting',
            value: '/app/cost-budgets',
            icon: 'fa fa-calculator',
            access: [{ label: 'View', value: 'cost-budgets' }],
            dontShow: companyInfo?.configurations?.costCenter !== 'Yes'
          }
        ]
      },
      {
        label: 'Report',
        type: 'group',
        children: [
          {
            label: 'Cost Center Report',
            value: '/app/cost-center-report',
            icon: 'fa fa-bar-chart',
            access: [{ label: 'View', value: 'cost-center-report' }],
            dontShow: companyInfo?.configurations?.costCenter !== 'Yes'
          }
        ]
      }
    ]
  },
  {
    label: 'Inventory',
    className: 'mega-menu',
    icon: 'fa fa-archive',
    children: [
      {
        label: 'Setups',
        type: 'group',
        children: [
          {
            label: 'Warehouse',
            value: '/app/warehouses',
            icon: 'fa fa-archive',
            access: [
              { label: 'View', value: 'warehouses' },
              { label: 'Add', value: 'add-warehouse' },
              { label: 'Edit', value: 'edit-warehouse' }
            ]
          },
          {
            label: 'UOM Conversions',
            value: '/app/uom-conversions',
            icon: 'fa fa-exchange',
            access: [
              { label: 'View', value: 'uom-conversions' },
              { label: 'Add', value: 'add-uom-conversion' },
              { label: 'Edit', value: 'edit-uom-conversion' }
            ]
          },
          {
            label: 'Products/Services',
            value: '/app/products',
            icon: 'fa fa-cubes',
            access: [
              { label: 'View', value: 'products' },
              { label: 'Add', value: 'add-product' },
              { label: 'Edit', value: 'edit-product' }
            ]
          },
          {
            label: 'Adjustment Accounts',
            value: '/app/adjustment-accounts',
            icon: 'fa fa-wrench',
            access: [{ label: 'View', value: 'adjustment-accounts' }]
          }
        ]
      },
      {
        label: 'Process',
        type: 'group',
        children: [
          {
            label: 'Stock Checks',
            value: '/app/stock-checks',
            icon: 'fa fa-search',
            access: [{ label: 'View', value: 'stock-checks' }]
          },
          {
            label: 'Vendor Stock Checks',
            value: '/app/vendor-stock-checks',
            icon: 'fa fa-truck',
            access: [{ label: 'View', value: 'vendor-stock-checks' }]
          },
          {
            label: 'Stock Receipts',
            value: '/app/stock-receipts',
            icon: 'fa fa-sign-in',
            access: [
              { label: 'View', value: 'stock-receipts' },
              { label: 'Add', value: 'add-stock-receipt' },
              { label: 'Edit', value: 'edit-stock-receipt' }
            ]
          },
          {
            label: 'Stock Issues',
            value: '/app/stock-issues',
            icon: 'fa fa-sign-out',
            access: [
              { label: 'View', value: 'stock-issues' },
              { label: 'Add', value: 'add-stock-issue' },
              { label: 'Edit', value: 'edit-stock-issue' }
            ]
          },
          {
            label: 'Stock Transfer',
            value: '/app/stock-transfers',
            icon: 'fa fa-exchange',
            access: [
              { label: 'View', value: 'stock-transfers' },
              { label: 'Add', value: 'add-stock-transfer' },
              { label: 'Edit', value: 'edit-stock-transfer' }
            ]
          },
          {
            label: 'Pick Requests',
            value: '/app/pick-requests',
            icon: 'fa fa-retweet',
            access: [
              { label: 'View', value: 'pick-requests' },
              { label: 'Add', value: 'add-pick-request' },
              { label: 'Edit', value: 'edit-pick-request' }
            ],
            dontShow: companyInfo?.configurations?.deliveryByInventory !== 'Yes'
          },
          {
            label: 'Pick Order',
            value: '/app/pick-orders',
            icon: 'fa fa-check-square-o',
            access: [
              { label: 'View', value: 'pick-orders' },
              { label: 'Edit', value: 'view-pick-order' }
            ],
            dontShow: companyInfo?.configurations?.pickOrder !== 'Yes'
          },
          {
            label: 'Material Request/Return',
            value: '/app/material-transfers',
            icon: 'fa fa-retweet',
            access: [
              { label: 'View', value: 'material-transfers' },
              { label: 'Add', value: 'add-material-transfer' },
              { label: 'Edit', value: 'edit-material-transfer' },
              { label: 'Receive', value: 'receive-material-transfer' }
            ]
          },
          {
            label: 'Material Request Approve',
            value: '/app/approve-material-transfer',
            icon: 'fa fa-check-square-o',
            access: [
              { label: 'View', value: 'view-material-transfer' },
              { label: 'Release', value: 'release-material-transfer' },
              { label: 'Approve', value: 'approve-material-transfer' }
            ]
          },
          {
            label: 'Stock Below Reorder Level',
            value: '/app/stock-below-reorder-level',
            icon: 'fa fa-exclamation-triangle',
            access: [{ label: 'View', value: 'stock-below-reorder-level' }]
          },
          {
            label: 'Stock Adjustments',
            value: '/app/stock-adjustments',
            icon: 'fa fa-sliders',
            access: [
              { label: 'View', value: 'stock-adjustments' },
              { label: 'Add', value: 'add-stock-adjustment' },
              { label: 'Edit', value: 'edit-stock-adjustment' }
            ]
          },
          {
            label: 'Container Receipts',
            value: '/app/container-receipts',
            icon: 'fa fa-dropbox',
            access: [
              { label: 'View', value: 'container-receipts' },
              { label: 'Add', value: 'add-container-receipt' },
              { label: 'Edit', value: 'edit-container-receipt' }
            ]
          },
          {
            label: 'Stock Revaluations',
            value: '/app/stock-revaluations',
            icon: 'fa fa-sliders',
            access: [
              { label: 'View', value: 'stock-revaluations' },
              { label: 'Add', value: 'add-stock-revaluation' },
              { label: 'Edit', value: 'edit-stock-revaluation' }
            ]
          }
        ]
      },
      {
        label: 'Reports',
        type: 'group',
        children: [
          {
            label: 'Material Report',
            value: '/app/material-reports',
            icon: 'fa fa-file-text-o',
            access: [{ label: 'View', value: 'material-reports' }]
          },
          {
            label: 'Stock Reconciliations',
            value: '/app/stock-reconciliations',
            icon: 'fa fa-refresh',
            access: [{ label: 'View', value: 'stock-reconciliations' }]
          },
          {
            label: 'Stock Ageing',
            value: '/app/reports/stock-ageing',
            icon: 'fa fa-hourglass-half',
            access: [{ label: 'View', value: 'reports/stock-ageing' }]
          },
          {
            label: 'Batch Serial Stock Ageing',
            value: '/app/reports/batch-serial-stock-ageing',
            icon: 'fa fa-hourglass-half',
            access: [{ label: 'View', value: 'reports/batch-serial-stock-ageing' }]
          },
          {
            label: 'Stock Issuance Report',
            value: '/app/stock-issues/reports',
            icon: 'fa fa-file-text-o',
            access: [{ label: 'View', value: 'stock-issues/reports' }]
          },
          {
            label: 'Refurbished Stock Reports',
            value: '/app/refurbished-stock-reports',
            icon: 'fa fa-file-text-o',
            access: [{ label: 'View', value: 'refurbished-stock-reports' }]
          },
          {
            label: 'Stock Movement Inventory',
            value: '/app/stock-movement-inventory',
            icon: 'fa fa-file-text-o',
            access: [{ label: 'View', value: 'stock-movement-inventory' }]
          },
          {
            label: 'Negative stocks',
            value: '/app/pos-queues',
            icon: 'fa fa-table',
            access: [{ label: 'Full', value: 'pos-queues' }]
          }
        ]
      }
    ]
  },
  {
    label: 'HR & Payroll',
    className: 'mega-menu',
    icon: 'fa fa-users',
    children: [
      {
        label: 'Organization Setup',
        type: 'group',
        children: [
          {
            label: 'Divisions',
            value: '/app/divisions',
            icon: 'fa fa-th-large',
            access: [
              { label: 'View', value: 'divisions' },
              { label: 'Add', value: 'add-division' },
              { label: 'Edit', value: 'edit-division' }
            ]
          },
          {
            label: 'Departments',
            value: '/app/departments',
            icon: 'fa fa-th',
            access: [
              { label: 'View', value: 'departments' },
              { label: 'Add', value: 'add-department' },
              { label: 'Edit', value: 'edit-department' }
            ]
          },
          {
            label: 'Grades',
            value: '/app/grades',
            icon: 'fa fa-star',
            access: [
              { label: 'View', value: 'grades' },
              { label: 'Add', value: 'add-grade' },
              { label: 'Edit', value: 'edit-grade' }
            ]
          },
          {
            label: 'Designations',
            value: '/app/designations',
            icon: 'fa fa-id-badge',
            access: [
              { label: 'View', value: 'designations' },
              { label: 'Add', value: 'add-designation' },
              { label: 'Edit', value: 'edit-designation' }
            ]
          },
          {
            label: 'Organization Chart',
            value: '/app/organization-overview',
            icon: 'fa fa-sitemap',
            access: [{ label: 'View', value: 'organization-overview' }]
          },
          {
            label: 'Document Types',
            value: '/app/document-types',
            icon: 'fa fa-folder-open',
            access: [{ label: 'View', value: 'document-types' }]
          }
        ]
      },
      {
        label: 'Notifications',
        type: 'group',
        children: [
          {
            label: 'Workflow Notifications',
            value: '/app/workflow-notifications',
            icon: 'fa fa-bell',
            access: [{ label: 'View', value: 'workflow-notifications' }]
          }
        ]
      },
      {
        label: 'Recruitment',
        type: 'group',
        children: [
          {
            label: 'Company CV Format',
            value: '/app/cv-formats',
            icon: 'fa fa-file-word-o',
            access: [
              { label: 'View', value: 'cv-formats' },
              { label: 'Add', value: 'add-cv-format' },
              { label: 'Edit', value: 'edit-cv-format' }
            ]
          },
          {
            label: 'Job Sequence',
            value: '/app/job-sequences',
            icon: 'fa fa-list-ol',
            access: [
              { label: 'View', value: 'job-sequences' },
              { label: 'Add', value: 'add-job-sequence' },
              { label: 'Edit', value: 'edit-job-sequence' }
            ]
          },
          {
            label: 'Job Postings',
            value: '/app/job-postings',
            icon: 'fa fa-bullhorn',
            access: [
              { label: 'View', value: 'job-postings' },
              { label: 'Add', value: 'add-job-posting' },
              { label: 'Edit', value: 'edit-job-posting' }
            ]
          },
          {
            label: 'Profiles Evaluation',
            value: '/app/applied-jobs',
            icon: 'fa fa-check-circle',
            access: [
              { label: 'View', value: 'applied-jobs' },
              { label: 'Add', value: 'add-applied-job' },
              { label: 'Edit', value: 'edit-applied-job' }
            ]
          },
          {
            label: 'Job Dashboard',
            value: '/app/applied-job-dashboard',
            icon: 'fa fa-tachometer',
            access: [{ label: 'View', value: 'applied-job-dashboard' }]
          }
        ]
      },
      {
        label: 'Selection Process',
        type: 'group',
        children: [
          {
            label: 'Onboarding Link',
            value: '/app/onboarding-links',
            icon: 'fa fa-link',
            access: [
              { label: 'View', value: 'onboarding-links' },
              { label: 'Edit', value: 'employee-onboarding' }
            ]
          },
          {
            label: 'Contract Management',
            value: '/app/contract-templates',
            icon: 'fa fa-file-text-o',
            access: [
              { label: 'View', value: 'contract-templates' },
              { label: 'Add', value: 'add-contract-template' },
              { label: 'Edit', value: 'edit-contract-template' }
            ]
          }
        ]
      },
      {
        label: 'Employee',
        type: 'group',
        children: [
          {
            label: 'Employee Creation',
            value: '/app/employees',
            icon: 'fa fa-user-plus',
            access: [
              { label: 'View', value: 'employees' },
              { label: 'Add', value: 'add-employee' },
              { label: 'Edit', value: 'edit-employee' }
            ]
          },
          {
            label: 'Employee Transfers',
            value: '/app/employee-transfers',
            icon: 'fa fa-exchange',
            access: [
              { label: 'View', value: 'employee-transfers' },
              { label: 'Add', value: 'add-employee-transfer' },
              { label: 'Edit', value: 'edit-employee-transfer' }
            ]
          }
        ]
      },
      {
        label: 'Payroll',
        type: 'group',
        children: [
          {
            label: 'Payroll Components',
            value: '/app/payroll-components',
            icon: 'fa fa-cogs',
            access: [{ label: 'View', value: 'payroll-components' }]
          },
          {
            label: 'Payroll Definitions',
            value: '/app/payroll-definitions',
            icon: 'fa fa-list-alt',
            access: [
              { label: 'View', value: 'payroll-definitions' },
              { label: 'Add', value: 'add-payroll-definition' },
              { label: 'Edit', value: 'edit-payroll-definition' }
            ]
          },
          {
            label: 'Employee PayMaster',
            value: '/app/paymasters',
            icon: 'fa fa-user-circle',
            access: [
              { label: 'View', value: 'paymasters' },
              { label: 'Add', value: 'add-paymaster' },
              { label: 'Edit', value: 'edit-paymaster' }
            ]
          },
          {
            label: 'Payrolls',
            value: '/app/payrolls',
            icon: 'fa fa-money',
            access: [{ label: 'View', value: 'payrolls' }]
          },
          {
            label: 'Payroll GL Postings',
            value: '/app/payroll-postings',
            icon: 'fa fa-book',
            access: [
              { label: 'View', value: 'payroll-postings' },
              { label: 'Add', value: 'add-payroll-posting' },
              { label: 'Edit', value: 'edit-payroll-posting' }
            ]
          },
          {
            label: 'Salary Clearance',
            value: '/app/employee-salary-clearances',
            icon: 'fa fa-check-circle',
            access: [{ label: 'View', value: 'employee-salary-clearances' }]
          },
          {
            label: 'Statutory Clearance',
            value: '/app/statutory-expense-clearances',
            icon: 'fa fa-check-circle',
            access: [{ label: 'View', value: 'statutory-expense-clearances' }]
          }
        ]
      },
      {
        label: 'Absence Management',
        type: 'group',
        children: [
          {
            label: 'Company Calendar',
            value: '/app/company-calendars',
            icon: 'fa fa-calendar',
            access: [
              { label: 'View', value: 'company-calendars' },
              { label: 'Add', value: 'add-company-calendar' },
              { label: 'Edit', value: 'edit-company-calendar' }
            ]
          },
          {
            label: 'Leave Type',
            value: '/app/leave-types',
            icon: 'fa fa-cogs',
            access: [
              { label: 'View', value: 'leave-types' },
              { label: 'Add', value: 'add-leave-type' },
              { label: 'Edit', value: 'edit-leave-type' }
            ]
          },
          {
            label: 'Leave Balance Generation',
            value: '/app/leave-balances',
            icon: 'fa fa-refresh',
            access: [{ label: 'View', value: 'leave-balances' }]
          },
          {
            label: 'Leave Request Generation',
            value: '/app/leave-request-generation',
            icon: 'fa fa-pencil-square-o',
            access: [{ label: 'View', value: 'leave-request-generation' }]
          },
          {
            label: 'Leave Report',
            value: '/app/leave-report',
            icon: 'fa fa-file-text-o',
            access: [{ label: 'View', value: 'leave-report' }]
          }
        ]
      },
      {
        label: 'Termination',
        type: 'group',
        children: [
          {
            label: 'Termination Checklists',
            value: '/app/termination-checklists',
            icon: 'fa fa-check-square-o',
            access: [
              { label: 'View', value: 'termination-checklists' },
              { label: 'Add', value: 'add-termination-checklist' },
              { label: 'Edit', value: 'edit-termination-checklist' }
            ]
          },
          {
            label: 'Termination',
            value: '/app/terminations',
            icon: 'fa fa-user-times',
            access: [
              { label: 'View', value: 'terminations' },
              { label: 'Add', value: 'add-termination' },
              { label: 'Edit', value: 'edit-termination' }
            ]
          }
        ]
      },
      {
        label: 'Asset Management',
        type: 'group',
        children: [
          {
            label: 'Asset Allocation',
            value: '/app/asset-allocations',
            icon: 'fa fa-cogs',
            access: [
              { label: 'View', value: 'asset-allocations' },
              { label: 'Add', value: 'add-asset-allocation' },
              { label: 'Edit', value: 'edit-asset-allocation' }
            ]
          },
          {
            label: 'Asset Transfers',
            value: '/app/asset-transfers',
            icon: 'fa fa-exchange',
            access: [
              { label: 'View', value: 'asset-transfers' },
              { label: 'Add', value: 'add-asset-transfer' },
              { label: 'Edit', value: 'edit-asset-transfer' }
            ]
          }
        ]
      },
      {
        label: 'Performance',
        type: 'group',
        children: [
          {
            label: 'Organization Goals',
            value: '/app/goals',
            icon: 'fa fa-bullseye',
            access: [{ label: 'View', value: 'goals' }]
          },
          {
            label: 'Goal Assignment',
            value: '/app/goal-assignment',
            icon: 'fa fa-check-circle',
            access: [{ label: 'View', value: 'goal-assignment' }]
          },
          {
            label: 'Appraisal Review',
            value: '/app/appraisal-review',
            icon: 'fa fa-star-half-o',
            access: [{ label: 'View', value: 'appraisal-review' }]
          }
        ]
      },
      {
        label: 'Employee Finance',
        type: 'group',
        children: [
          {
            label: 'Employee Loans',
            value: '/app/employee-loans',
            icon: 'fa fa-credit-card',
            access: [
              { label: 'View', value: 'employee-loans' },
              { label: 'Add', value: 'add-employee-loan' },
              { label: 'Edit', value: 'edit-employee-loan' }
            ]
          },
          {
            label: 'Expense Claim Request',
            value: '/app/expense-claim-requests',
            icon: 'fa fa-file-text-o',
            access: [
              { label: 'View', value: 'expense-claim-requests' },
              { label: 'Add', value: 'add-expense-claim-request' },
              { label: 'Edit', value: 'edit-expense-claim-request' }
            ]
          },
          {
            label: 'Expense Claim Approval',
            value: '/app/expense-claim-approvals',
            icon: 'fa fa-thumbs-up',
            access: [
              { label: 'View', value: 'expense-claim-approvals' },
              { label: 'Edit', value: 'edit-expense-claim-approval' }
            ]
          },
          {
            label: 'Employee Expenses',
            value: '/app/employee-expenses',
            icon: 'fa fa-money',
            access: [
              { label: 'View', value: 'employee-expenses' },
              { label: 'Add', value: 'add-employee-expense' },
              { label: 'Edit', value: 'edit-employee-expense' }
            ]
          }
        ]
      },
      {
        label: 'Attendance Management',
        type: 'group',
        children: [
          // {
          //   label: 'Tax Data',
          //   value: '/app/taxdata',
          //   access: [{ label: 'View', value: 'taxdata' }]
          // },
          // {
          //   label: 'Employee Dashboard',
          //   value: '/app/employee-dashboard',
          //   access: [{ label: 'View', value: 'employee-dashboard' }]
          // },
          {
            label: 'Monthly Attendance',
            value: '/app/monthly-attendances',
            icon: 'fa fa-calendar-check-o',
            access: [
              { label: 'View', value: 'monthly-attendances' },
              { label: 'Add', value: 'add-monthly-attendance' },
              { label: 'Edit', value: 'edit-monthly-attendance' }
            ]
          },
          {
            label: 'Employee Overtime Request',
            value: '/app/employee-overtime-requests',
            icon: 'fa fa-file-text-o',
            access: [
              { label: 'View', value: 'employee-overtime-requests' },
              { label: 'Add', value: 'add-employee-overtime-request' },
              { label: 'Edit', value: 'edit-employee-overtime-request' }
            ]
          },
          {
            label: 'Employee Overtime Approval',
            value: '/app/employee-overtime-approvals',
            icon: 'fa fa-thumbs-up',
            access: [
              { label: 'View', value: 'employee-overtime-approvals' },
              { label: 'Edit', value: 'edit-employee-overtime-approval' }
            ]
          }
        ]
      },
      {
        label: 'Onboarding process',
        type: 'group',
        children: [
          {
            label: 'Joining checklist',
            value: '/app/checklists',
            icon: 'fa fa-list-ol',
            access: [
              { label: 'View', value: 'checklists' },
              { label: 'Add', value: 'add-checklist' },
              { label: 'Edit', value: 'edit-checklist' }
            ]
          },
          {
            label: 'Employee Onboarding',
            value: '/app/employee-onboarding-details',
            icon: 'fa fa-users',
            access: [
              { label: 'View', value: 'employee-onboarding-details' },
              { label: 'Add', value: 'add-employee-onboarding-details' },
              { label: 'Edit', value: 'edit-employee-onboarding-details' }
            ]
          }
        ]
      }
    ]
  },
  {
    label: 'Production',
    className: 'mega-menu',
    icon: 'fa fa-industry',
    children: [
      {
        label: 'Setups',
        type: 'group',
        children: [
          {
            label: 'Bill of Material',
            value: '/app/bill-of-materials',
            icon: 'fa fa-list-ul',
            access: [
              { label: 'View', value: 'bill-of-materials' },
              { label: 'Add', value: 'add-bill-of-material' },
              { label: 'Edit', value: 'edit-bill-of-material' }
            ]
          },
          {
            label: 'Resources',
            value: '/app/resources',
            icon: 'fa fa-cogs',
            access: [
              { label: 'View', value: 'resources' },
              { label: 'Add', value: 'add-resource' },
              { label: 'Edit', value: 'edit-resource' }
            ]
          },
          {
            label: 'Routing',
            value: '/app/routings',
            icon: 'fa fa-random',
            access: [
              { label: 'View', value: 'routings' },
              { label: 'Add', value: 'add-routing' },
              { label: 'Edit', value: 'edit-routing' }
            ]
          }
        ]
      },
      {
        label: 'Process',
        type: 'group',
        children: [
          {
            label: 'Production Planning',
            value: '/app/production-plannings',
            icon: 'fa fa-calendar-check-o',
            access: [{ label: 'View', value: 'production-plannings' }]
          },
          {
            label: 'Production Orders',
            value: '/app/production-orders',
            icon: 'fa fa-file-text-o',
            access: [
              { label: 'View', value: 'production-orders' },
              { label: 'Add', value: 'add-production-order' },
              { label: 'Edit', value: 'edit-production-order' }
            ]
          },
          {
            label: 'Production Reporting',
            value: '/app/production-reportings',
            icon: 'fa fa-file-text',
            access: [{ label: 'View', value: 'production-reportings' }]
          },
          {
            label: 'Production Issue',
            value: '/app/production-issues',
            icon: 'fa fa-truck',
            access: [
              { label: 'View', value: 'production-issues' },
              { label: 'Add', value: 'add-production-issue' },
              { label: 'Edit', value: 'edit-production-issue' }
            ]
          },
          {
            label: 'Production Receipt',
            value: '/app/production-receipts',
            icon: 'fa fa-download',
            access: [
              { label: 'View', value: 'production-receipts' },
              { label: 'Add', value: 'add-production-receipt' },
              { label: 'Edit', value: 'edit-production-receipt' }
            ]
          }
        ]
      },
      {
        label: 'Reports',
        type: 'group',
        children: [
          {
            label: 'Bill of Material Report',
            value: '/app/bill-of-material-reports',
            icon: 'fa fa-file-excel-o',
            access: [{ label: 'View', value: 'bill-of-material-reports' }]
          },
          {
            label: 'Routing Report',
            value: '/app/routing-reports',
            icon: 'fa fa-sitemap',
            access: [{ label: 'View', value: 'routing-reports' }]
          },
          {
            label: 'Production Order Summary',
            value: '/app/production-order-summary-reports',
            icon: 'fa fa-list-alt',
            access: [{ label: 'View', value: 'production-order-summary-reports' }]
          },
          {
            label: 'Production Order Detailed',
            value: '/app/production-order-detailed-reports',
            icon: 'fa fa-file-text',
            access: [{ label: 'View', value: 'production-order-detailed-reports' }]
          },
          {
            label: 'Production Cost Report',
            value: '/app/production-cost-reports',
            icon: 'fa fa-file-text',
            access: [{ label: 'View', value: 'production-cost-reports' }]
          }
        ]
      }
    ]
  },
  {
    label: 'POS',
    className: 'mega-menu',
    icon: 'fa fa-desktop',
    children: [
      {
        label: 'Setups',
        type: 'group',
        children: [
          {
            label: 'Divisions / Outlets',
            value: '/app/divisions',
            icon: 'fa fa-building-o',
            access: [
              { label: 'View', value: 'divisions' },
              { label: 'Add', value: 'add-division' },
              { label: 'Edit', value: 'edit-division' }
            ]
          },
          {
            label: 'POS Warehouses',
            value: '/app/pos-warehouses',
            icon: 'fa fa-cubes',
            access: [
              { label: 'View', value: 'pos-warehouses' },
              { label: 'Add', value: 'add-pos-warehouse' },
              { label: 'Edit', value: 'edit-pos-warehouse' }
            ]
          },
          {
            label: 'POS Devices',
            value: '/app/devices',
            icon: 'fa fa-desktop',
            access: [
              { label: 'View', value: 'devices' },
              { label: 'Add', value: 'add-device' },
              { label: 'Edit', value: 'edit-device' }
            ]
          },
          // {
          //   label: 'Discounts / Charges',
          //   value: '/app/document-discount-and-charges',
          //   access: [
          //     { label: 'View', value: 'document-discount-and-charges' },
          //     { label: 'Add', value: 'add-document-discount-and-charge' },
          //     { label: 'Edit', value: 'edit-document-discount-and-charge' }
          //   ]
          // },
          // {
          //   label: 'Exchange Rates',
          //   value: '/app/pos-exchange-rates',
          //   access: [
          //     { label: 'View', value: 'pos-exchange-rates' },
          //     { label: 'Add', value: 'add-pos-exchange-rate' },
          //     { label: 'Edit', value: 'edit-pos-exchange-rate' }
          //   ]
          // },
          {
            label: 'Material Pricing',
            value: '/app/pos-material-pricing',
            icon: 'fa fa-tag',
            access: [
              { label: 'View', value: 'pos-material-pricing' },
              { label: 'Add', value: 'add-pos-material-pricing' },
              { label: 'Edit', value: 'edit-pos-material-pricing' }
            ]
          },
          {
            label: 'POS Categories',
            value: '/app/pos-categories',
            icon: 'fa fa-th-large',
            access: [
              { label: 'View', value: 'pos-categories' },
              { label: 'Add', value: 'add-pos-category' },
              { label: 'Edit', value: 'edit-pos-category' }
            ]
          },
          {
            label: 'Invoice Attributes',
            value: '/app/invoice-attributes',
            icon: 'fa fa-file-text-o',
            access: [
              { label: 'View', value: 'invoice-attributes' },
              { label: 'Add', value: 'add-invoice-attribute' },
              { label: 'Edit', value: 'edit-invoice-attribute' }
            ]
          },
          {
            label: 'POS Promotions',
            value: '/app/pos-promotions',
            icon: 'fa fa-bullhorn',
            access: [
              { label: 'View', value: 'pos-promotions' },
              { label: 'Add', value: 'add-pos-promotion' },
              { label: 'Edit', value: 'edit-pos-promotion' }
            ]
          },
          // {
          //   label: 'POS Options',
          //   value: '/app/pos-options',
          //   access: [
          //     { label: 'View', value: 'pos-options' },
          //     { label: 'Add', value: 'add-pos-option' },
          //     { label: 'Edit', value: 'edit-pos-option' }
          //   ],
          //   dontShow: companyInfo?.configurations?.POSInvoice !== 'Yes'
          // },
          {
            label: 'Payment Types',
            value: '/app/pos-payment-types',
            icon: 'fa fa-credit-card',
            access: [{ label: 'View', value: 'pos-payment-types' }]
          },
          {
            label: 'Delete Reasons',
            value: '/app/pos-delete-reasons',
            icon: 'fa fa-trash-o',
            access: [{ label: 'View', value: 'pos-delete-reasons' }]
          },
          {
            label: 'POS Supervisor Configurations',
            value: '/app/pos-supervisor-configurations',
            icon: 'fa fa-user',
            access: [{ label: 'View', value: 'pos-supervisor-configurations' }]
          }
        ]
      },
      {
        label: 'Process',
        type: 'group',
        children: [
          {
            label: 'POS Invoices',
            value: '/app/pos-invoices',
            icon: 'fa fa-file-text',
            access: [
              { label: 'View', value: 'pos-invoices' },
              { label: 'Add', value: 'add-pos-invoice' },
              { label: 'Edit', value: 'edit-pos-invoice' }
            ]
          },
          {
            label: 'POS Day Closure',
            value: '/app/pos-day-closure',
            icon: 'fa fa-calendar-check-o',
            access: [
              { label: 'View', value: 'pos-day-closure' },
              { label: 'Report', value: 'pos-day-closure-report' }
            ]
          },
          {
            label: 'POS Dashboard',
            value: '/app/pos-dashboard',
            icon: 'fa fa-tachometer',
            access: [{ label: 'View', value: 'pos-dashboard' }]
          }
        ]
      },
      {
        label: 'Reports',
        type: 'group',
        children: [
          {
            label: 'POS Order Report',
            value: '/app/pos-order-report',
            icon: 'fa fa-file-text',
            access: [{ label: 'View', value: 'pos-order-report' }]
          },
          {
            label: 'POS Auditor Report',
            value: '/app/pos-auditor-report',
            icon: 'fa fa-search',
            access: [{ label: 'View', value: 'pos-auditor-report' }]
          },
          {
            label: 'POS Posting Report',
            value: '/app/pos-posting-report',
            icon: 'fa fa-share-square-o',
            access: [{ label: 'View', value: 'pos-posting-report' }]
          },
          {
            label: 'POS Void Invoice Report',
            value: '/app/pos-deleted-invoice-report',
            icon: 'fa fa-ban',
            access: [{ label: 'View', value: 'pos-deleted-invoice-report' }]
          },
          {
            label: 'Negative stocks',
            value: '/app/pos-queues',
            icon: 'fa fa-table',
            access: [{ label: 'Full', value: 'pos-queues' }]
          }
        ]
      }
    ]
  },
  {
    label: 'Fixed Assets',
    className: 'mega-menu',
    icon: 'fa fa-building-o',
    children: [
      {
        label: 'Setups',
        type: 'group',
        children: [
          {
            label: 'Asset Management',
            value: '/app/assets',
            icon: 'fa fa-cogs',
            access: [
              { label: 'View', value: 'assets' },
              { label: 'Add', value: 'add-asset' },
              { label: 'Edit', value: 'edit-asset' }
            ]
          },
          {
            label: 'Asset Induction',
            value: '/app/asset-induction',
            icon: 'fa fa-folder',
            access: [{ label: 'View', value: 'asset-induction' }]
          },
          {
            label: 'Bulk Depreciation',
            value: '/app/bulk-depreciation',
            icon: 'fa fa-calculator',
            access: [{ label: 'View', value: 'bulk-depreciation' }]
          }
        ]
      },
      {
        label: 'Process',
        type: 'group',
        children: [
          {
            label: 'Asset Inventory',
            value: '/app/asset-inventories',
            icon: 'fa fa-archive',
            access: [
              { label: 'View', value: 'asset-inventories' },
              { label: 'Add', value: 'add-asset-inventory' },
              { label: 'Edit', value: 'edit-asset-inventory' }
            ]
          },
          {
            label: 'Asset tracking',
            value: '/app/barcode-scan',
            icon: 'fa fa-map-marker',
            access: [{ label: 'View', value: 'barcode-scan' }]
          }
        ]
      }
    ]
  },
  {
    label: 'CRM',
    className: 'mega-menu',
    icon: 'fa fa-handshake-o',
    children: [
      {
        label: 'Setups',
        type: 'group',
        children: [
          {
            label: 'Lead Options',
            value: '/app/lead-options',
            icon: 'fa fa-cogs',
            access: [
              { label: 'View', value: 'lead-options' },
              { label: 'Add', value: 'add-lead-option' },
              { label: 'Edit', value: 'edit-lead-option' }
            ]
          },
          {
            label: 'Lead Configuration',
            value: '/app/lead-configurations',
            icon: 'fa fa-cogs',
            access: [{ label: 'View', value: 'lead-configurations' }]
          },
          {
            label: 'Sales Person',
            value: '/app/sales-persons',
            icon: 'fa fa-user-circle',
            access: [
              { label: 'View', value: 'sales-persons' },
              { label: 'Add', value: 'add-sales-person' },
              { label: 'Edit', value: 'edit-sales-person' }
            ]
          }
        ]
      },
      {
        label: 'Process',
        type: 'group',
        children: [
          {
            label: 'Lead Lists',
            value: '/app/leads',
            icon: 'fa fa-list',
            access: [
              { label: 'View', value: 'leads' },
              { label: 'Add', value: 'add-lead' },
              { label: 'Edit', value: 'edit-lead' }
            ]
          },
          {
            label: 'Campaign',
            value: '/app/campaigns',
            icon: 'fa fa-bullhorn',
            access: [
              { label: 'View', value: 'campaigns' },
              { label: 'Add', value: 'add-campaign' },
              { label: 'Edit', value: 'edit-campaign' }
            ]
          }
        ]
      },
      {
        label: 'Reports',
        type: 'group',
        children: [
          {
            label: 'Lead Cockpit',
            value: '/app/lead-cockpit',
            icon: 'fa fa-tachometer',
            access: [{ label: 'View', value: 'lead-cockpit' }]
          },
          {
            label: 'Dashboard',
            value: '/app/lead-dashboard',
            icon: 'fa fa-dashboard',
            access: [{ label: 'View', value: 'lead-dashboard' }]
          },
          {
            label: 'Lead Analytics',
            value: '/app/lead-analytics',
            icon: 'fa fa-bar-chart',
            access: [{ label: 'View', value: 'lead-analytics' }]
          }
        ]
      }
    ]
  },
  {
    label: 'Services',
    className: 'mega-menu',
    icon: 'fa fa-headphones',
    children: [
      {
        label: 'Setups',
        type: 'group',
        children: [
          {
            label: 'SLA Definition',
            value: '/app/sla-definitions',
            icon: 'fa fa-tasks',
            access: [
              { label: 'View', value: 'sla-definitions' },
              { label: 'Add', value: 'add-sla-definition' },
              { label: 'Edit', value: 'edit-sla-definition' }
            ]
          },
          {
            label: 'Service Options',
            value: '/app/service-options',
            icon: 'fa fa-cogs',
            access: [
              { label: 'View', value: 'service-options' },
              { label: 'Add', value: 'add-services-options' },
              { label: 'Edit', value: 'edit-services-options' }
            ]
          }
        ]
      },
      {
        label: 'Process',
        type: 'group',
        children: [
          {
            label: 'Service Requests',
            value: '/app/service-requests',
            icon: 'fa fa-headphones',
            access: [
              { label: 'View', value: 'service-requests' },
              { label: 'Add', value: 'add-service-request' },
              { label: 'Edit', value: 'edit-service-request' }
            ]
          }
        ]
      },
      {
        label: 'Reports',
        type: 'group',
        children: [
          {
            label: 'Impact and Status Board',
            value: '/app/service-dashboards',
            icon: 'fa fa-bullhorn',
            access: [{ label: 'View', value: 'service-dashboards' }]
          },
          {
            label: 'Service Dashboard',
            value: '/app/service-dashboard',
            icon: 'fa fa-dashboard',
            access: [{ label: 'View', value: 'service-dashboard' }]
          }
        ]
      }
    ]
  },
  {
    label: 'DMS',
    value: '/app/drive/my-drive',
    icon: 'fa fa-files-o',
    access: [
      { label: 'View', value: 'drive' },
      { label: 'Search', value: 'drive/search' }
    ]
  },
  {
    label: 'Gold Management',
    className: 'mega-menu',
    icon: 'fa fa-star',
    children: [
      {
        label: 'Setups',
        type: 'group',
        children: [
          {
            label: 'Add Customer Stock',
            value: '/app/add-gold-stock',
            icon: 'fa fa-plus',
            access: [{ label: 'View', value: 'add-gold-stocks' }]
          },
          {
            label: 'View Customer Stock',
            value: '/app/customer-stock',
            icon: 'fa fa-eye',
            access: [{ label: 'View', value: 'customer-stock' }]
          },
          {
            label: 'Gold Stock Overview',
            value: '/app/gold-stocks',
            icon: 'fa fa-diamond',
            access: [
              { label: 'View', value: 'gold-stocks' },
              { label: 'Add', value: 'add-gold-stock' },
              { label: 'Edit', value: 'edit-gold-stock' }
            ]
          },
          {
            label: 'Job Order',
            value: '/app/view-gold-job-order',
            icon: 'fa fa-cogs',
            access: [
              { label: 'View', value: 'gold-job-order' },
              { label: 'Add', value: 'add-gold-job-order' },
              { label: 'Edit', value: 'edit-gold-job-order' }
            ]
          },
          {
            label: 'Employee Stock Screen',
            value: '/app/employee-stock-screen',
            icon: 'fa fa-user',
            access: [
              { label: 'View', value: 'gold-job-order' },
              { label: 'Add', value: 'add-gold-job-order' },
              { label: 'Edit', value: 'edit-gold-job-order' }
            ]
          },

          {
            label: 'Employee Gold Return',
            value: '/app/employee-gold-return-report',
            icon: 'fa fa-repeat',
            access: [
              { label: 'View', value: 'gold-job-order' },
              { label: 'Add', value: 'add-gold-job-order' },
              { label: 'Edit', value: 'edit-gold-job-order' }
            ]
          },

          {
            label: 'Employee Balance Report',
            value: '/app/employee-balance-report',
            icon: 'fa fa-calculator',
            access: [{ label: 'View', value: 'employee-balance-report' }]
          }
        ]
      }
    ]
  },
  {
    label: 'Cycle Count',
    className: 'mega-menu',
    icon: 'fa fa-refresh',
    children: [
      {
        label: 'Process',
        type: 'group',
        children: [
          {
            label: 'Inventory count plans',
            value: '/app/inventory-count-plans',
            icon: 'fa fa-list-ol',
            access: [
              { label: 'View', value: 'inventory-count-plans' },
              { label: 'Add', value: 'add-inventory-count-plan' }
            ]
          },
          {
            label: 'Inventory tracker (by material)',
            value: '/app/inventory-tracker-by-material',
            icon: 'fa fa-cubes',
            access: [{ label: 'View', value: 'inventory-tracker-by-material' }]
          },
          {
            label: 'Inventory tracker (by plan)',
            value: '/app/inventory-tracker-by-plan',
            icon: 'fa fa-calendar-check-o',
            access: [{ label: 'View', value: 'inventory-tracker-by-plan' }]
          },
          {
            label: 'Stock revaluation',
            value: '/app/stock-revaluation',
            icon: 'fa fa-line-chart',
            access: [{ label: 'View', value: 'stock-revaluation' }]
          }
        ]
      }
    ]
  },
  {
    label: 'Tax',
    className: 'mega-menu',
    icon: 'fa fa-calculator',
    type: 'group',
    children: [
      {
        label: 'Process',
        type: 'group',
        children: [
          {
            label: 'Tax Rules',
            value: '/app/tax-rules',
            icon: 'fa fa-gavel',
            access: [{ label: 'Full', value: 'tax-rules' }]
          },
          {
            label: 'Tax Definitions',
            value: '/app/tax-definitions',
            icon: 'fa fa-globe',
            access: [{ label: 'Full', value: 'tax-definitions' }]
          }
        ]
      }
    ]
  }
]
export default MENUS
