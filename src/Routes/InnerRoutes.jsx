import LoaderBox from '@/Components/LoaderBox/LoaderBox'
import SideBarLoader from '@/Components/LoaderBox/SideBarLoader'
import UseDrawerFooterActionWidth from '@/Hooks/useDrawerFooterActionWidth'
import { useNotification } from '@/Theme'
import getUserToken from '@/Util/getUserToken'
import { memo } from '@/Util/Util'
import { Modal } from 'antd'
import { isEmpty } from 'lodash'
import { lazy, Suspense, useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { Redirect, Route, Switch } from 'react-router-dom'

const Layout = lazy(() => import('@/Layout/Layout'))
const NotFound = lazy(() => import('./NotFound'))
const ReleaseInfo = lazy(() => import('./ReleaseInfo'))
const AsyncRoute = lazy(() => import('./AsyncRoute'))

const getRoutes = (url) => [
  { path: `${url}/dashboard`, component: lazy(() => import('../Screens/Dashboard/NewDashboard')) },
  {
    path: `${url}/change-password`,
    component: lazy(() => import('../Screens/ChangePassword/ChangePassword'))
  },
  {
    path: `${url}/multi-factor-authentication`,
    component: lazy(() => import('../Screens/MultiFactorAuthentication/MultiFactorAuthentication'))
  },
  { path: `${url}/profile`, component: lazy(() => import('../Screens/Profile/Profile')) },
  {
    path: `${url}/manage-company`,
    component: lazy(() => import('../Screens/MasterData/Companies/SetCompany'))
  },
  {
    path: `${url}/inbox/:workflowId?`,
    component: lazy(() => import('../Screens/Workflows/Workflows'))
  },
  { path: `${url}/generate-invoice`, component: lazy(() => import('../Screens/Schedules/Schedules')) },
  {
    path: `${url}/master-upload`,
    component: lazy(() => import('../Screens/MasterData/MasterUploads/MasterUploads'))
  },
  { path: `${url}/qr-info/:type/:id`, component: lazy(() => import('../Screens/QrInfo/QrInfo')) },
  {
    path: `${url}/service-desk`,
    component: lazy(() => import('../Screens/ServiceDesk/ServiceDesks'))
  }
]

const getAsyncRoutes = (url) => [
  {
    path: `${url}/new-time-entries`,
    screen: lazy(() => import('../Screens/TimeSheet/TimeEntries/NewTimeEntries'))
  },
  {
    path: `${url}/new-time-entries-alt`,
    screen: lazy(() => import('../Screens/TimeSheet/TimeEntries/TimeEntriesAlt'))
  },
  {
    path: `${url}/time-entries`,
    screen: lazy(() => import('../Screens/TimeSheet/TimeEntries/TimeEntries'))
  },
  {
    path: `${url}/time-reports`,
    screen: lazy(() => import('../Screens/TimeSheet/TimeReports/TimeReports'))
  },
  {
    path: `${url}/time-reports-view`,
    screen: lazy(() => import('../Screens/TimeSheet/TimeReports/TimeReportView'))
  },
  { path: `${url}/incomes`, screen: SideBarLoader(() => import('../Screens/InvoiceData/Incomes/Incomes')) },
  {
    path: `${url}/recurring-invoices`,
    screen: SideBarLoader(() => import('../Screens/InvoiceData/Incomes/RecurringInvoices'))
  },
  {
    path: `${url}/add-recurring-invoice/:kind`,
    screen: lazy(() => import('../Screens/InvoiceData/Incomes/IncomeForm'))
  },
  {
    path: `${url}/edit-recurring-invoice/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/Incomes/IncomeForm'))
  },
  {
    path: `${url}/recurring-invoices/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/Incomes/IncomeView'))
  },
  {
    path: `${url}/create-sales-invoices/search`,
    screen: SideBarLoader(() => import('../Screens/SalesManagement/SalesInvoices/CreateSalesInvoice')),
    access: 'incomes'
  },
  {
    path: `${url}/add-income/:kind`,
    screen: lazy(() => import('../Screens/InvoiceData/Incomes/IncomeForm'))
  },
  {
    path: `${url}/edit-income/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/Incomes/IncomeForm'))
  },
  {
    path: `${url}/incomes/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/Incomes/IncomeView'))
  },
  {
    path: `${url}/credit-invoices`,
    screen: SideBarLoader(() => import('../Screens/InvoiceData/CreditInvoices/CreditInvoices'))
  },
  {
    path: `${url}/credit-invoices/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/CreditInvoices/CreditInvoiceView'))
  },
  {
    path: `${url}/add-credit-invoice/:kind`,
    screen: lazy(() => import('../Screens/InvoiceData/CreditInvoices/CreditInvoiceForm'))
  },
  {
    path: `${url}/edit-credit-invoice/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/CreditInvoices/CreditInvoiceForm'))
  },

  // e-invoicing starts

  {
    path: `${url}/einvoice-customers`,
    screen: SideBarLoader(() => import('../Screens/MasterData/Clients/Customers'))
  },
  {
    path: `${url}/add-einvoice-customer`,
    screen: lazy(() => import('../Screens/MasterData/Clients/CustomerForm'))
  },
  {
    path: `${url}/edit-einvoice-customer/:id`,
    screen: lazy(() => import('../Screens/MasterData/Clients/CustomerForm'))
  },

  {
    path: `${url}/einvoice-products`,
    screen: SideBarLoader(() => import('../Screens/MasterData/Products/MergedProducts'))
  },
  {
    path: `${url}/add-einvoice-product`,
    screen: lazy(() => import('../Screens/MasterData/Products/MergedProductForm'))
  },
  {
    path: `${url}/edit-einvoice-product/:id`,
    screen: lazy(() => import('../Screens/MasterData/Products/MergedProductForm'))
  },

  {
    path: `${url}/tax-invoices`,
    screen: SideBarLoader(() => import('../Screens/InvoiceData/Incomes/Incomes'))
  },
  {
    path: `${url}/tax-invoices/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/Incomes/IncomeView'))
  },
  {
    path: `${url}/add-tax-invoice/:kind`,
    screen: lazy(() => import('../Screens/InvoiceData/Incomes/IncomeForm'))
  },
  {
    path: `${url}/edit-tax-invoice/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/Incomes/IncomeForm'))
  },

  {
    path: `${url}/add-quick-invoice`,
    screen: lazy(() => import('../Screens/InvoiceData/Incomes/QuickInvoice/QuickInvoiceForm'))
  },
  {
    path: `${url}/edit-quick-invoice/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/Incomes/QuickInvoice/QuickInvoiceForm'))
  },

  {
    path: `${url}/tax-credit-invoices`,
    screen: SideBarLoader(() => import('../Screens/InvoiceData/CreditInvoices/CreditInvoices'))
  },
  {
    path: `${url}/tax-credit-invoices/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/CreditInvoices/CreditInvoiceView'))
  },
  {
    path: `${url}/add-tax-credit-invoice/:kind`,
    screen: lazy(() => import('../Screens/InvoiceData/CreditInvoices/CreditInvoiceForm'))
  },
  {
    path: `${url}/edit-tax-credit-invoice/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/CreditInvoices/CreditInvoiceForm'))
  },

  {
    path: `${url}/tax-debit-invoices`,
    screen: SideBarLoader(() => import('../Screens/InvoiceData/Incomes/Incomes'))
  },
  {
    path: `${url}/tax-debit-invoices/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/Incomes/IncomeView'))
  },
  {
    path: `${url}/add-tax-debit-invoice/:kind`,
    screen: lazy(() => import('../Screens/InvoiceData/Incomes/IncomeForm'))
  },
  {
    path: `${url}/edit-tax-debit-invoice/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/Incomes/IncomeForm'))
  },

  {
    path: `${url}/tax-advances`,
    screen: lazy(() => import('../Screens/InvoiceData/CustomerAdvances/CustomerAdvances'))
  },
  {
    path: `${url}/tax-advances/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/CustomerAdvances/CustomerAdvanceView'))
  },
  {
    path: `${url}/add-tax-advance`,
    screen: lazy(() => import('../Screens/InvoiceData/CustomerAdvances/CustomerAdvanceForm'))
  },
  {
    path: `${url}/edit-tax-advance/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/CustomerAdvances/CustomerAdvanceForm'))
  },

  {
    path: `${url}/einvoice-customer-statements`,
    screen: lazy(() => import('../Screens/Reports/CustomerStatements'))
  },
  {
    path: `${url}/einvoice-customer-invoice-ageing`,
    screen: lazy(() => import('../Screens/Reports/CustomerInvoiceAgeing'))
  },
  {
    path: `${url}/einvoice-output-vat`,
    screen: SideBarLoader(() => import('../Screens/StandardReports/OutputVAT/OutputVAT'))
  },

  {
    path: `${url}/zatca-transmissions`,
    screen: lazy(() => import('../Screens/Zatca/InvoiceTransmissions/InvoiceTransmissions'))
  },
  {
    path: `${url}/zatca-dashboard`,
    screen: lazy(() => import('../Screens/Zatca/ZatcaDashboard/ZatcaDashboard'))
  },
  {
    path: `${url}/restaurant-logs`,
    screen: lazy(() => import('../Screens/Zatca/RestaurantLogs/RestaurantLogs'))
  },
  {
    path: `${url}/emr-logs`,
    screen: lazy(() => import('../Screens/ExternalLogs/ExternalLogs'))
  },

  // e-invoicing ends

  {
    path: `${url}/account-groups`,
    screen: SideBarLoader(() => import('../Screens/FinanceManagement/AccountGroups/AccountGroups'))
  },
  {
    path: `${url}/add-account-group`,
    screen: lazy(() => import('../Screens/FinanceManagement/AccountGroups/AccountGroupForm'))
  },
  {
    path: `${url}/edit-account-group/:id`,
    screen: lazy(() => import('../Screens/FinanceManagement/AccountGroups/AccountGroupForm'))
  },
  {
    path: `${url}/account-charts`,
    screen: lazy(() => import('../Screens/FinanceManagement/AccountCharts/AccountCharts'))
  },
  {
    path: `${url}/add-account-chart`,
    screen: lazy(() => import('../Screens/FinanceManagement/AccountCharts/AccountChartForm'))
  },
  {
    path: `${url}/edit-account-chart/:id`,
    screen: lazy(() => import('../Screens/FinanceManagement/AccountCharts/AccountChartForm'))
  },
  {
    path: `${url}/account-setups`,
    screen: SideBarLoader(() => import('../Screens/FinanceManagement/AccountSetups/AccountSetups'))
  },
  {
    path: `${url}/add-account-setup`,
    screen: lazy(() => import('../Screens/FinanceManagement/AccountSetups/AccountSetupForm'))
  },
  {
    path: `${url}/edit-account-setup/:id`,
    screen: lazy(() => import('../Screens/FinanceManagement/AccountSetups/AccountSetupForm'))
  },
  {
    path: `${url}/expenses`,
    screen: SideBarLoader(() => import('../Screens/InvoiceData/Expenses/Expenses'))
  },
  {
    path: `${url}/create-purchase-invoices/search`,
    screen: SideBarLoader(() =>
      import('../Screens/PurchaseManagement/PurchaseInvoices/CreatePurchaseInvoice')
    ),
    access: 'expenses'
  },
  {
    path: `${url}/add-expense/:kind`,
    screen: lazy(() => import('../Screens/InvoiceData/Expenses/ExpenseForm'))
  },
  {
    path: `${url}/edit-expense/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/Expenses/ExpenseForm'))
  },
  {
    path: `${url}/expenses/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/Expenses/ExpenseView'))
  },

  {
    path: `${url}/debit-invoices`,
    screen: SideBarLoader(() => import('../Screens/InvoiceData/DebitInvoices/DebitInvoices'))
  },
  {
    path: `${url}/debit-invoices/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/DebitInvoices/DebitInvoiceView'))
  },
  {
    path: `${url}/add-debit-invoice/:kind`,
    screen: lazy(() => import('../Screens/InvoiceData/DebitInvoices/DebitInvoiceForm'))
  },
  {
    path: `${url}/edit-debit-invoice/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/DebitInvoices/DebitInvoiceForm'))
  },

  {
    path: `${url}/direct-expenses`,
    screen: lazy(() => import('../Screens/InvoiceData/DirectExpenses/DirectExpenses'))
  },
  {
    path: `${url}/direct-expenses/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/DirectExpenses/DirectExpenseView'))
  },
  {
    path: `${url}/edit-direct-expense/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/DirectExpenses/DirectExpenseForm'))
  },
  {
    path: `${url}/add-direct-expense`,
    screen: lazy(() => import('../Screens/InvoiceData/DirectExpenses/DirectExpenseForm'))
  },

  {
    path: `${url}/direct-receipts`,
    screen: lazy(() => import('../Screens/InvoiceData/DirectReceipts/DirectReceipts'))
  },
  {
    path: `${url}/direct-receipts/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/DirectReceipts/DirectReceiptView'))
  },
  {
    path: `${url}/add-direct-receipt`,
    screen: lazy(() => import('../Screens/InvoiceData/DirectReceipts/DirectReceiptForm'))
  },
  {
    path: `${url}/edit-direct-receipt/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/DirectReceipts/DirectReceiptForm'))
  },

  {
    path: `${url}/upload-income-invoices`,
    screen: lazy(() => import('../Screens/InvoiceData/Incomes/Upload/UploadIncomes'))
  },
  {
    path: `${url}/upload-expense-invoices`,
    screen: lazy(() => import('../Screens/InvoiceData/UploadInvoices/UploadExpenseInvoices'))
  },
  {
    path: `${url}/sap-invoice-upload`,
    screen: lazy(() => import('../Screens/InvoiceData/Incomes/SAPUpload/SAPUpload'))
  },
  {
    path: `${url}/upload-journal-vouchers`,
    screen: lazy(() => import('../Screens/FinanceManagement/JournalVouchers/UploadJournalVouchers'))
  },
  {
    path: `${url}/upload-direct-receipts`,
    screen: lazy(() => import('../Screens/InvoiceData/DirectReceipts/DirectReceiptUpload'))
  },
  {
    path: `${url}/upload-direct-expenses`,
    screen: lazy(() => import('../Screens/InvoiceData/DirectExpenses/DirectExpenseUpload'))
  },
  {
    path: `${url}/outbound-transmissions`,
    screen: SideBarLoader(() => import('../Screens/InvoiceData/Transmissions/OutboundTransmissions'))
  },
  {
    path: `${url}/outbound-transmissions/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/Transmissions/OutboundTransmissionView'))
  },
  {
    path: `${url}/inbound-transmissions`,
    screen: SideBarLoader(() => import('../Screens/InvoiceData/Transmissions/InboundTransmissions'))
  },
  {
    path: `${url}/inbound-transmissions/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/Transmissions/InboundTransmissionView'))
  },
  {
    path: `${url}/add-company`,
    screen: lazy(() => import('../Screens/MasterData/Companies/CompanyForm'))
  },
  {
    path: `${url}/edit-company/:id`,
    screen: lazy(() => import('../Screens/MasterData/Companies/CompanyForm'))
  },
  {
    path: `${url}/add-company-restaurant`,
    screen: lazy(() => import('../Screens/MasterData/Companies/CompanyForRestaurantForm')),
    access: 'add-company'
  },
  {
    path: `${url}/edit-company-restaurant/:id`,
    screen: lazy(() => import('../Screens/MasterData/Companies/CompanyForRestaurantForm')),
    access: 'edit-company'
  },
  {
    path: `${url}/divisions`,
    screen: SideBarLoader(() => import('../Screens/HRMS/Divisions/Divisions'))
  },
  {
    path: `${url}/add-division`,
    screen: lazy(() => import('../Screens/HRMS/Divisions/DivisionForm'))
  },
  {
    path: `${url}/edit-division/:id`,
    screen: lazy(() => import('../Screens/HRMS/Divisions/DivisionForm'))
  },
  {
    path: `${url}/departments`,
    screen: SideBarLoader(() => import('../Screens/HRMS/Departments/Departments'))
  },
  {
    path: `${url}/add-department`,
    screen: lazy(() => import('../Screens/HRMS/Departments/DepartmentForm'))
  },
  {
    path: `${url}/edit-department/:id`,
    screen: lazy(() => import('../Screens/HRMS/Departments/DepartmentForm'))
  },
  {
    path: `${url}/contract-templates`,
    screen: SideBarLoader(() => import('../Screens/ContractManagement/ContractTemplates/ContractTemplates'))
  },
  {
    path: `${url}/add-contract-template`,
    screen: lazy(() => import('../Screens/ContractManagement/ContractTemplates/ContractTemplateForm'))
  },
  {
    path: `${url}/edit-contract-template/:id`,
    screen: lazy(() => import('../Screens/ContractManagement/ContractTemplates/ContractTemplateForm'))
  },
  {
    path: `${url}/devices`,
    screen: lazy(() => import('../Screens/MasterData/Devices/Devices'))
  },
  {
    path: `${url}/add-device`,
    screen: lazy(() => import('../Screens/MasterData/Devices/DeviceForm'))
  },
  {
    path: `${url}/edit-device/:id`,
    screen: lazy(() => import('../Screens/MasterData/Devices/DeviceForm'))
  },
  {
    path: `${url}/expense-claim-requests`,
    screen: SideBarLoader(() =>
      import('../Screens/HRMS/ExpenseClaims/ExpenseClaimRequests/ExpenseClaimRequests')
    )
  },
  {
    path: `${url}/add-expense-claim-request`,
    screen: lazy(() => import('../Screens/HRMS/ExpenseClaims/ExpenseClaimRequests/ExpenseClaimRequestForm'))
  },
  {
    path: `${url}/edit-expense-claim-request/:id`,
    screen: lazy(() => import('../Screens/HRMS/ExpenseClaims/ExpenseClaimRequests/ExpenseClaimRequestForm'))
  },
  {
    path: `${url}/expense-claim-approvals`,
    screen: SideBarLoader(() =>
      import('../Screens/HRMS/ExpenseClaims/ExpenseClaimApprovals/ExpenseClaimsApprovals')
    )
  },
  {
    path: `${url}/edit-expense-claim-approval/:id`,
    screen: lazy(() => import('../Screens/HRMS/ExpenseClaims/ExpenseClaimApprovals/ExpenseClaimApprovalForm'))
  },
  { path: `${url}/users`, screen: SideBarLoader(() => import('../Screens/MasterData/Users/Users')) },
  {
    path: `${url}/currencies`,
    screen: SideBarLoader(() => import('../Screens/MasterData/Currencies/Currencies'))
  },
  {
    path: `${url}/add-currency`,
    screen: lazy(() => import('../Screens/MasterData/Currencies/CurrencyForm'))
  },
  {
    path: `${url}/edit-currency/:id`,
    screen: lazy(() => import('../Screens/MasterData/Currencies/CurrencyForm'))
  },
  {
    path: `${url}/categories`,
    screen: SideBarLoader(() => import('../Screens/MasterData/Categories/Categories'))
  },
  {
    path: `${url}/add-category`,
    screen: lazy(() => import('../Screens/MasterData/Categories/CategoryForm'))
  },
  {
    path: `${url}/edit-category/:id`,
    screen: lazy(() => import('../Screens/MasterData/Categories/CategoryForm'))
  },
  {
    path: `${url}/products`,
    screen: SideBarLoader(() => import('../Screens/MasterData/Products/MergedProducts'))
  },
  {
    path: `${url}/add-product`,
    screen: lazy(() => import('../Screens/MasterData/Products/MergedProductForm'))
  },
  {
    path: `${url}/edit-product/:id`,
    screen: lazy(() => import('../Screens/MasterData/Products/MergedProductForm'))
  },
  {
    path: `${url}/customers`,
    screen: SideBarLoader(() => import('../Screens/MasterData/Clients/Customers'))
  },
  {
    path: `${url}/add-customer`,
    screen: lazy(() => import('../Screens/MasterData/Clients/CustomerForm'))
  },
  {
    path: `${url}/edit-customer/:id`,
    screen: lazy(() => import('../Screens/MasterData/Clients/CustomerForm'))
  },

  {
    path: `${url}/vendors`,
    screen: SideBarLoader(() => import('../Screens/MasterData/Clients/Vendors'))
  },
  {
    path: `${url}/add-vendor`,
    screen: lazy(() => import('../Screens/MasterData/Clients/VendorForm'))
  },
  {
    path: `${url}/edit-vendor/:id`,
    screen: lazy(() => import('../Screens/MasterData/Clients/VendorForm'))
  },

  { path: `${url}/options`, screen: SideBarLoader(() => import('../Screens/MasterData/Options/Options')) },
  { path: `${url}/add-option`, screen: lazy(() => import('../Screens/MasterData/Options/OptionForm')) },
  {
    path: `${url}/edit-option/:id`,
    screen: lazy(() => import('../Screens/MasterData/Options/OptionForm'))
  },
  {
    path: `${url}/product-attributes`,
    screen: SideBarLoader(() => import('../Screens/MasterData/ProductAttributes/ProductAttributes'))
  },
  {
    path: `${url}/add-product-attribute`,
    screen: lazy(() => import('../Screens/MasterData/ProductAttributes/ProductAttributeForm'))
  },
  {
    path: `${url}/edit-product-attribute/:id`,
    screen: lazy(() => import('../Screens/MasterData/ProductAttributes/ProductAttributeForm'))
  },
  {
    path: `${url}/employees`,
    screen: SideBarLoader(() => import('../Screens/HRMS/Employees/Employees'))
  },
  {
    path: `${url}/add-employee`,
    screen: lazy(() => import('../Screens/HRMS/Employees/EmployeeForm'))
  },
  {
    path: `${url}/edit-employee/:id`,
    screen: lazy(() => import('../Screens/HRMS/Employees/EmployeeForm'))
  },
  { path: `${url}/roles`, screen: lazy(() => import('../Screens/MasterData/Roles/Roles')) },
  {
    path: `${url}/grades`,
    screen: SideBarLoader(() => import('../Screens/HRMS/Grades/Grades'))
  },
  {
    path: `${url}/add-grade`,
    screen: lazy(() => import('../Screens/HRMS/Grades/GradeForm'))
  },
  {
    path: `${url}/edit-grade/:id`,
    screen: lazy(() => import('../Screens/HRMS/Grades/GradeForm'))
  },

  {
    path: `${url}/designations`,
    screen: SideBarLoader(() => import('../Screens/HRMS/Designations/Designations'))
  },
  {
    path: `${url}/add-designation`,
    screen: lazy(() => import('../Screens/HRMS/Designations/DesignationForm'))
  },
  {
    path: `${url}/edit-designation/:id`,
    screen: lazy(() => import('../Screens/HRMS/Designations/DesignationForm'))
  },

  {
    path: `${url}/employee-transfers`,
    screen: SideBarLoader(() => import('../Screens/HumanResources/EmployeeTransfers/EmployeeTransfers'))
  },
  {
    path: `${url}/add-employee-transfer`,
    screen: lazy(() => import('../Screens/HumanResources/EmployeeTransfers/EmployeeTransferForm'))
  },
  {
    path: `${url}/edit-employee-transfer/:id`,
    screen: lazy(() => import('../Screens/HumanResources/EmployeeTransfers/EmployeeTransferForm'))
  },
  {
    path: `${url}/terminations`,
    screen: SideBarLoader(() => import('../Screens/HumanResources/Terminations/Terminations'))
  },
  {
    path: `${url}/add-termination`,
    screen: lazy(() => import('../Screens/HumanResources/Terminations/TerminationForm'))
  },
  {
    path: `${url}/edit-termination/:id`,
    screen: lazy(() => import('../Screens/HumanResources/Terminations/TerminationForm'))
  },
  {
    path: `${url}/termination-checklists`,
    screen: SideBarLoader(() =>
      import('../Screens/HumanResources/TerminationChecklists/TerminationChecklists')
    )
  },
  {
    path: `${url}/add-termination-checklist`,
    screen: lazy(() => import('../Screens/HumanResources/TerminationChecklists/TerminationChecklistForm'))
  },
  {
    path: `${url}/edit-termination-checklist/:id`,
    screen: lazy(() => import('../Screens/HumanResources/TerminationChecklists/TerminationChecklistForm'))
  },
  {
    path: `${url}/cv-formats`,
    screen: SideBarLoader(() => import('../Screens/HRMS/CVFormats/CVFormats'))
  },
  {
    path: `${url}/add-cv-format`,
    screen: lazy(() => import('../Screens/HRMS/CVFormats/CVFormatForm'))
  },
  {
    path: `${url}/edit-cv-format/:id`,
    screen: lazy(() => import('../Screens/HRMS/CVFormats/CVFormatForm'))
  },
  {
    path: `${url}/job-sequences`,
    screen: SideBarLoader(() => import('../Screens/HRMS/JobSequences/JobSequences'))
  },
  {
    path: `${url}/add-job-sequence`,
    screen: lazy(() => import('../Screens/HRMS/JobSequences/JobSequenceForm'))
  },
  {
    path: `${url}/edit-job-sequence/:id`,
    screen: lazy(() => import('../Screens/HRMS/JobSequences/JobSequenceForm'))
  },
  {
    path: `${url}/job-postings`,
    screen: SideBarLoader(() => import('../Screens/HRMS/JobPostings/JobPostings'))
  },
  {
    path: `${url}/add-job-posting`,
    screen: lazy(() => import('../Screens/HRMS/JobPostings/JobPostingForm'))
  },
  {
    path: `${url}/edit-job-posting/:id`,
    screen: lazy(() => import('../Screens/HRMS/JobPostings/JobPostingForm'))
  },
  {
    path: `${url}/applied-jobs`,
    screen: SideBarLoader(() => import('../Screens/HRMS/AppliedJobs/AppliedJobs'))
  },
  {
    path: `${url}/edit-applied-job/:id`,
    screen: lazy(() => import('../Screens/HRMS/AppliedJobs/AppliedJobForm'))
  },
  {
    path: `${url}/applied-job-dashboard`,
    screen: lazy(() => import('../Screens/HRMS/AppliedJobs/AppliedJobsDashboard'))
  },
  {
    path: `${url}/onboarding-links`,
    screen: SideBarLoader(() => import('../Screens/HRMS/OnboardingLinks/OnboardingLinks'))
  },
  {
    path: `${url}/payroll-components`,
    screen: lazy(() => import('../Screens/HRMS/PayrollComponents/PayrollComponents'))
  },
  {
    path: `${url}/payroll-definitions`,
    screen: SideBarLoader(() => import('../Screens/HRMS/PayrollDefinitions/PayrollDefinitions'))
  },
  {
    path: `${url}/add-payroll-definition`,
    screen: lazy(() => import('../Screens/HRMS/PayrollDefinitions/PayrollDefinitionForm'))
  },
  {
    path: `${url}/edit-payroll-definition/:id`,
    screen: lazy(() => import('../Screens/HRMS/PayrollDefinitions/PayrollDefinitionForm'))
  },
  {
    path: `${url}/paymasters`,
    screen: SideBarLoader(() => import('../Screens/HRMS/Paymasters/Paymasters'))
  },
  {
    path: `${url}/add-paymaster`,
    screen: lazy(() => import('../Screens/HRMS/Paymasters/PaymasterForm'))
  },
  {
    path: `${url}/edit-paymaster/:id`,
    screen: lazy(() => import('../Screens/HRMS/Paymasters/PaymasterForm'))
  },
  { path: `${url}/taxdata`, screen: SideBarLoader(() => import('../Screens/Payroll/Taxdata/Taxdata')) },
  { path: `${url}/add-taxdata`, screen: lazy(() => import('../Screens/Payroll/Taxdata/TaxdataForm')) },
  {
    path: `${url}/exchange-rates`,
    screen: SideBarLoader(() => import('../Screens/MasterData/ExchangeRates/ExchangeRates'))
  },
  {
    path: `${url}/add-exchange-rate`,
    screen: lazy(() => import('../Screens/MasterData/ExchangeRates/ExchangeRateForm'))
  },
  {
    path: `${url}/edit-exchange-rate/:id`,
    screen: lazy(() => import('../Screens/MasterData/ExchangeRates/ExchangeRateForm'))
  },
  {
    path: `${url}/warehouses`,
    screen: SideBarLoader(() => import('../Screens/MasterData/Warehouses/Warehouses'))
  },
  {
    path: `${url}/add-warehouse`,
    screen: lazy(() => import('../Screens/MasterData/Warehouses/WarehouseForm'))
  },
  {
    path: `${url}/edit-warehouse/:id`,
    screen: lazy(() => import('../Screens/MasterData/Warehouses/WarehouseForm'))
  },
  {
    path: `${url}/warehouse-products`,
    screen: SideBarLoader(() => import('../Screens/MasterData/WarehouseProduct/WarehouseProducts'))
  },
  {
    path: `${url}/add-warehouse-product`,
    screen: lazy(() => import('../Screens/MasterData/WarehouseProduct/WarehouseProductForm'))
  },
  {
    path: `${url}/edit-warehouse-product/:id`,
    screen: lazy(() => import('../Screens/MasterData/WarehouseProduct/WarehouseProductForm'))
  },
  {
    path: `${url}/uom-conversions`,
    screen: SideBarLoader(() => import('../Screens/MasterData/UOMConversions/UOMConversions'))
  },
  {
    path: `${url}/add-uom-conversion`,
    screen: lazy(() => import('../Screens/MasterData/UOMConversions/UOMConversionForm'))
  },
  {
    path: `${url}/edit-uom-conversion/:id`,
    screen: lazy(() => import('../Screens/MasterData/UOMConversions/UOMConversionForm'))
  },
  {
    path: `${url}/stock-receipts`,
    screen: SideBarLoader(() => import('../Screens/StockManagement/StockReceipts/StockReceipts'))
  },
  {
    path: `${url}/add-stock-receipt`,
    screen: lazy(() => import('../Screens/StockManagement/StockReceipts/StockReceiptForm'))
  },
  {
    path: `${url}/edit-stock-receipt/:id`,
    screen: lazy(() => import('../Screens/StockManagement/StockReceipts/StockReceiptForm'))
  },
  {
    path: `${url}/stock-issues`,
    screen: SideBarLoader(() => import('../Screens/StockManagement/StockIssues/StockIssues'))
  },
  {
    path: `${url}/stock-issues/reports`,
    access: 'stock-issues',
    screen: SideBarLoader(() =>
      import('../Screens/StandardReports/StockIssuanceReports/StockIssuanceReports')
    )
  },
  {
    path: `${url}/add-stock-issue`,
    screen: lazy(() => import('../Screens/StockManagement/StockIssues/StockIssueForm'))
  },
  {
    path: `${url}/edit-stock-issue/:id`,
    screen: lazy(() => import('../Screens/StockManagement/StockIssues/StockIssueForm'))
  },
  {
    path: `${url}/stock-checks`,
    screen: SideBarLoader(() => import('../Screens/StockManagement/StockChecks/StockChecks'))
  },
  {
    path: `${url}/stock-checks/view`,
    access: 'stock-checks',
    screen: lazy(() => import('../Screens/StockManagement/StockChecks/StockCheckView'))
  },
  {
    path: `${url}/stock-transfers`,
    screen: SideBarLoader(() => import('../Screens/StockManagement/StockTransfers/StockTransfers'))
  },
  {
    path: `${url}/add-stock-transfer`,
    screen: lazy(() => import('../Screens/StockManagement/StockTransfers/StockTransferForm'))
  },
  {
    path: `${url}/edit-stock-transfer/:id`,
    screen: lazy(() => import('../Screens/StockManagement/StockTransfers/StockTransferForm'))
  },
  {
    path: `${url}/material-reports`,
    screen: SideBarLoader(() => import('../Screens/StandardReports/MaterialReports/MaterialReports'))
  },
  {
    path: `${url}/material-reports/view`,
    access: 'material-reports',
    screen: lazy(() => import('../Screens/StandardReports/MaterialReports/MaterialReportView'))
  },
  {
    path: `${url}/projects`,
    screen: lazy(() => import('../Screens/ProjectManagement/Projects/Projects'))
  },
  {
    path: `${url}/add-project`,
    screen: lazy(() => import('../Screens/ProjectManagement/Projects/ProjectForm'))
  },
  {
    path: `${url}/edit-project/:id`,
    screen: lazy(() => import('../Screens/ProjectManagement/Projects/ProjectForm'))
  },
  {
    path: `${url}/project-tasks`,
    screen: lazy(() => import('../Screens/ProjectManagement/ProjectTasks/ProjectTasks'))
  },
  {
    path: `${url}/edit-project-task/:id`,
    screen: lazy(() => import('../Screens/ProjectManagement/ProjectTasks/ProjectTaskForm'))
  },
  {
    path: `${url}/project-estimations`,
    screen: lazy(() => import('../Screens/ProjectManagement/ProjectEstimations/ProjectEstimations'))
  },
  {
    path: `${url}/add-project-estimation`,
    screen: lazy(() => import('../Screens/ProjectManagement/ProjectEstimations/ProjectEstimationForm'))
  },
  {
    path: `${url}/edit-project-estimation/:id`,
    screen: lazy(() => import('../Screens/ProjectManagement/ProjectEstimations/ProjectEstimationForm'))
  },
  {
    path: `${url}/project-summary-configurations`,
    screen: lazy(() =>
      import('../Screens/ProjectManagement/ProjectSummaryConfigurations/ProjectSummaryConfigurations')
    )
  },
  {
    path: `${url}/project-employee-rates`,
    screen: lazy(() => import('../Screens/ProjectManagement/ProjectAndEmployeeRates/ProjectAndEmployeeRates'))
  },
  {
    path: `${url}/add-project-employee-rate`,
    screen: lazy(() =>
      import('../Screens/ProjectManagement/ProjectAndEmployeeRates/ProjectAndEmployeeRateForm')
    )
  },
  {
    path: `${url}/edit-project-employee-rate/:id`,
    screen: lazy(() =>
      import('../Screens/ProjectManagement/ProjectAndEmployeeRates/ProjectAndEmployeeRateForm')
    )
  },
  {
    path: `${url}/sales-orders`,
    screen: SideBarLoader(() => import('../Screens/SalesManagement/SalesOrders/SalesOrders'))
  },
  {
    path: `${url}/sales-orders/:id`,
    screen: lazy(() => import('../Screens/SalesManagement/SalesOrders/SalesOrderView'))
  },
  {
    path: `${url}/add-sales-order`,
    screen: lazy(() => import('../Screens/SalesManagement/SalesOrders/SalesOrderForm'))
  },
  {
    path: `${url}/edit-sales-order/:id`,
    screen: lazy(() => import('../Screens/SalesManagement/SalesOrders/SalesOrderForm'))
  },
  {
    path: `${url}/sales-deliveries`,
    screen: SideBarLoader(() => import('../Screens/SalesManagement/SalesDeliveries/SalesDeliveries'))
  },
  {
    path: `${url}/sales-deliveries/search`,
    access: 'sales-deliveries',
    screen: SideBarLoader(() => import('../Screens/SalesManagement/SalesDeliveries/CreateSalesDelivery'))
  },
  {
    path: `${url}/sales-deliveries/reports`,
    access: 'sales-deliveries',
    screen: lazy(() => import('../Screens/StandardReports/DeliveryReports/DeliveryReports'))
  },
  {
    path: `${url}/sales-deliveries/:id`,
    screen: lazy(() => import('../Screens/SalesManagement/SalesDeliveries/SalesDeliveryView'))
  },
  {
    path: `${url}/add-sales-delivery`,
    screen: lazy(() => import('../Screens/SalesManagement/SalesDeliveries/SalesDeliveryForm'))
  },
  {
    path: `${url}/edit-sales-delivery/:id`,
    screen: lazy(() => import('../Screens/SalesManagement/SalesDeliveries/SalesDeliveryForm'))
  },
  {
    path: `${url}/sales-invoices/search`,
    screen: SideBarLoader(() => import('../Screens/SalesManagement/SalesInvoices/CreateSalesInvoice'))
  },
  {
    path: `${url}/purchase-orders`,
    screen: SideBarLoader(() => import('../Screens/PurchaseManagement/PurchaseOrders/PurchaseOrders'))
  },
  {
    path: `${url}/purchase-orders/search`,
    access: 'purchase-orders',
    screen: SideBarLoader(() => import('../Screens/PurchaseManagement/PurchaseOrders/CreatePurchaseOrder'))
  },
  {
    path: `${url}/purchase-orders/:id`,
    screen: lazy(() => import('../Screens/PurchaseManagement/PurchaseOrders/PurchaseOrderView'))
  },
  {
    path: `${url}/add-purchase-order`,
    screen: lazy(() => import('../Screens/PurchaseManagement/PurchaseOrders/PurchaseOrderForm'))
  },
  {
    path: `${url}/edit-purchase-order/:id`,
    screen: lazy(() => import('../Screens/PurchaseManagement/PurchaseOrders/PurchaseOrderForm'))
  },
  {
    path: `${url}/purchase-receipts`,
    screen: SideBarLoader(() => import('../Screens/PurchaseManagement/PurchaseReceipts/PurchaseReceipts'))
  },
  {
    path: `${url}/purchase-receipts/search`,
    access: 'purchase-receipts',
    screen: SideBarLoader(() =>
      import('../Screens/PurchaseManagement/PurchaseReceipts/CreatePurchaseReceipt')
    )
  },
  {
    path: `${url}/purchase-receipts/:id`,
    screen: lazy(() => import('../Screens/PurchaseManagement/PurchaseReceipts/PurchaseReceiptView'))
  },
  {
    path: `${url}/add-purchase-receipt`,
    screen: lazy(() => import('../Screens/PurchaseManagement/PurchaseReceipts/PurchaseReceiptForm'))
  },
  {
    path: `${url}/edit-purchase-receipt/:id`,
    screen: lazy(() => import('../Screens/PurchaseManagement/PurchaseReceipts/PurchaseReceiptForm'))
  },
  {
    path: `${url}/purchase-invoices/search`,
    screen: SideBarLoader(() =>
      import('../Screens/PurchaseManagement/PurchaseInvoices/CreatePurchaseInvoice')
    )
  },
  { path: `${url}/payrolls`, screen: SideBarLoader(() => import('../Screens/HRMS/Payrolls/Payrolls')) },
  {
    path: `${url}/payrolls/:id`,
    screen: lazy(() => import('../Screens/HRMS/Payrolls/PayrollView'))
  },
  { path: `${url}/custom-templates`, screen: SideBarLoader(() => import('../Screens/Templates/Templates')) },
  { path: `${url}/custom-templates/:id`, screen: lazy(() => import('../Screens/Templates/editor')) },
  {
    path: `${url}/HTML-generations`,
    screen: lazy(() => import('../Screens/HTMLGenerations/HTMLGenerations'))
  },
  {
    path: `${url}/financial-years`,
    screen: lazy(() => import('../Screens/FinanceManagement/FinancialYears/FinancialYears'))
  },
  {
    path: `${url}/new-financial-years`,
    screen: lazy(() => import('../Screens/FinanceManagement/FinancialYears/NewFinancialYears'))
  },
  {
    path: `${url}/finance-postings`,
    screen: SideBarLoader(() => import('../Screens/FinanceManagement/FinancePostings/FinancePostings'))
  },
  {
    path: `${url}/numbering-series`,
    screen: lazy(() => import('../Screens/MasterData/NumberingSeries/NumberingSeries'))
  },
  {
    path: `${url}/company-configurations`,
    screen: lazy(() => import('../Screens/MasterData/Companies/CompanyConfigurations'))
  },
  {
    path: `${url}/journal-vouchers`,
    screen: SideBarLoader(() => import('../Screens/FinanceManagement/JournalVouchers/JournalVouchers'))
  },
  {
    path: `${url}/add-journal-voucher`,
    screen: lazy(() => import('../Screens/FinanceManagement/JournalVouchers/JournalVoucherForm'))
  },
  {
    path: `${url}/edit-journal-voucher/:id`,
    screen: lazy(() => import('../Screens/FinanceManagement/JournalVouchers/JournalVoucherForm'))
  },
  {
    path: `${url}/journal-vouchers/:id`,
    screen: lazy(() => import('../Screens/FinanceManagement/JournalVouchers/journalVoucherView'))
  },
  {
    path: `${url}/sales-persons`,
    screen: SideBarLoader(() => import('../Screens/MasterData/SalesPersons/SalesPersons'))
  },
  {
    path: `${url}/add-sales-person`,
    screen: lazy(() => import('../Screens/MasterData/SalesPersons/SalesPersonForm'))
  },
  {
    path: `${url}/edit-sales-person/:id`,
    screen: lazy(() => import('../Screens/MasterData/SalesPersons/SalesPersonForm'))
  },
  {
    path: `${url}/sales-person-by-clients`,
    screen: SideBarLoader(() => import('../Screens/MasterData/SalesPersonByClients/SalesPersonByClients'))
  },
  {
    path: `${url}/add-sales-person-by-client`,
    screen: lazy(() => import('../Screens/MasterData/SalesPersonByClients/SalesPersonByClientForm'))
  },
  {
    path: `${url}/edit-sales-person-by-client/:id`,
    screen: lazy(() => import('../Screens/MasterData/SalesPersonByClients/SalesPersonByClientForm'))
  },
  {
    path: `${url}/terms-and-conditions`,
    screen: SideBarLoader(() => import('../Screens/MasterData/TermsConditions/TermsConditions'))
  },
  {
    path: `${url}/add-terms-and-condition`,
    screen: lazy(() => import('../Screens/MasterData/TermsConditions/TermsConditionForm'))
  },
  {
    path: `${url}/edit-terms-and-condition/:id`,
    screen: lazy(() => import('../Screens/MasterData/TermsConditions/TermsConditionForm'))
  },
  {
    path: `${url}/leave-types`,
    screen: lazy(() => import('../Screens/HRMS/AbsenceManagement/LeaveTypes/LeaveTypes'))
  },
  {
    path: `${url}/edit-leave-type/:id`,
    screen: lazy(() => import('../Screens/HRMS/AbsenceManagement/LeaveTypes/LeaveTypeForm'))
  },
  {
    path: `${url}/add-leave-type`,
    screen: lazy(() => import('../Screens/HRMS/AbsenceManagement/LeaveTypes/LeaveTypeForm'))
  },
  {
    path: `${url}/company-calendars`,
    screen: lazy(() => import('../Screens/HRMS/AbsenceManagement/CompanyCalendars/CompanyCalendars'))
  },
  {
    path: `${url}/edit-company-calendar/:id`,
    screen: lazy(() => import('../Screens/HRMS/AbsenceManagement/CompanyCalendars/CompanyCalendarForm'))
  },
  {
    path: `${url}/add-company-calendar`,
    screen: lazy(() => import('../Screens/HRMS/AbsenceManagement/CompanyCalendars/CompanyCalendarForm'))
  },
  {
    path: `${url}/leave-balances`,
    screen: lazy(() => import('../Screens/HRMS/AbsenceManagement/LeaveBalances/LeaveBalances'))
  },
  {
    path: `${url}/leave-request-generation`,
    screen: lazy(() =>
      import('../Screens/HRMS/AbsenceManagement/LeaveRequestGeneration/LeaveRequestGeneration')
    )
  },
  {
    path: `${url}/leave-report`,
    screen: lazy(() => import('../Screens/HRMS/AbsenceManagement/LeaveReports/LeaveReports'))
  },
  // {
  //   path: `${url}/drive/:keywords`,
  //   screen: lazy(() => import('../Screens/DocumentManagements/DocumentManagements'))
  // },
  {
    path: `${url}/drive/:category/:id?/:fileId?`,
    screen: lazy(() => import('../Screens/DocumentManagements/DocumentManagements'))
  },

  {
    path: `${url}/transfer`,
    screen: lazy(() => import('../Screens/HumanResources/Transfer/Transfer'))
  },
  {
    path: `${url}/change-job`,
    screen: lazy(() => import('../Screens/HumanResources/ChangeJob/ChangeJob'))
  },
  {
    path: `${url}/change-compensation`,
    screen: lazy(() => import('../Screens/HumanResources/ChangeCompensation/ChangeCompensation'))
  },
  {
    path: `${url}/goals`,
    screen: SideBarLoader(() => import('../Screens/HumanResources/Performance/Goals'))
  },
  {
    path: `${url}/goal-assignment`,
    screen: lazy(() => import('../Screens/HumanResources/Performance/GoalsAssignment'))
  },
  {
    path: `${url}/appraisal-review`,
    screen: lazy(() => import('../Screens/HumanResources/Performance/AppraisalReview'))
  },
  {
    path: `${url}/add-appraisal-review`,
    screen: lazy(() => import('../Screens/HumanResources/Performance/AppraisalReviewForm'))
  },
  {
    path: `${url}/add-goal`,
    screen: lazy(() => import('../Screens/HumanResources/Performance/GoalsForm'))
  },
  {
    path: `${url}/assign-goal`,
    screen: lazy(() => import('../Screens/HumanResources/Performance/GoalsAssignmentForm'))
  },
  {
    path: `${url}/customs-clearances`,
    screen: SideBarLoader(() => import('../Screens/PurchaseManagement/CustomsClearances/CustomsClearances'))
  },
  {
    path: `${url}/customs-clearances/:id`,
    screen: lazy(() => import('../Screens/PurchaseManagement/CustomsClearances/CustomsClearanceView'))
  },
  {
    path: `${url}/search-customs-clearance`,
    access: 'customs-clearances',
    screen: SideBarLoader(() =>
      import('../Screens/PurchaseManagement/CustomsClearances/CreateCustomsClearances')
    )
  },
  {
    path: `${url}/add-customs-clearance`,
    screen: lazy(() => import('../Screens/PurchaseManagement/CustomsClearances/CustomsClearanceForm'))
  },
  {
    path: `${url}/edit-customs-clearance/:id`,
    screen: lazy(() => import('../Screens/PurchaseManagement/CustomsClearances/CustomsClearanceForm'))
  },
  {
    path: `${url}/sales-quotations`,
    screen: SideBarLoader(() => import('../Screens/SalesManagement/SalesQuotations/SalesQuotations'))
  },
  {
    path: `${url}/sales-quotations/:id`,
    screen: lazy(() => import('../Screens/SalesManagement/SalesQuotations/SalesQuotationContent'))
  },
  {
    path: `${url}/add-sales-quotation`,
    screen: lazy(() => import('../Screens/SalesManagement/SalesQuotations/SalesQuotationForm'))
  },
  {
    path: `${url}/edit-sales-quotation/:id`,
    screen: lazy(() => import('../Screens/SalesManagement/SalesQuotations/SalesQuotationForm'))
  },
  {
    path: `${url}/invoice-receipts`,
    screen: lazy(() => import('../Screens/InvoiceData/InvoiceReceipts/InvoiceReceipts'))
  },
  {
    path: `${url}/invoice-receipts/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/InvoiceReceipts/InvoiceReceiptView'))
  },
  {
    path: `${url}/add-invoice-receipt-search`,
    access: 'add-invoice-receipt',
    screen: lazy(() => import('../Screens/InvoiceData/InvoiceReceipts/InvoiceReceiptSearch'))
  },
  {
    path: `${url}/add-invoice-receipt`,
    screen: lazy(() => import('../Screens/InvoiceData/InvoiceReceipts/InvoiceReceiptFormMultiple'))
  },
  {
    path: `${url}/edit-invoice-receipt/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/InvoiceReceipts/InvoiceReceiptForm'))
  },
  {
    path: `${url}/expense-payments`,
    screen: lazy(() => import('../Screens/InvoiceData/ExpensePayments/ExpensePayments'))
  },
  {
    path: `${url}/expense-payments/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/ExpensePayments/ExpensePaymentView'))
  },
  {
    path: `${url}/add-expense-payment-search`,
    screen: lazy(() => import('../Screens/InvoiceData/ExpensePayments/ExpensePaymentSearch')),
    access: 'add-expense-payment'
  },
  {
    path: `${url}/add-expense-payment`,
    screen: lazy(() => import('../Screens/InvoiceData/ExpensePayments/ExpensePaymentFormMultiple'))
  },
  {
    path: `${url}/edit-expense-payment/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/ExpensePayments/ExpensePaymentForm'))
  },

  {
    path: `${url}/client-prices/:type`,
    access: 'customer-prices',
    screen: SideBarLoader(() => import('../Screens/SalesManagement/ClientPrices/ClientPrices'))
  },
  {
    path: `${url}/add-client-price/:type`,
    access: 'add-customer-price',
    screen: lazy(() => import('../Screens/SalesManagement/ClientPrices/ClientPriceForm'))
  },
  {
    path: `${url}/edit-client-price/:id`,
    access: 'edit-customer-price',
    screen: lazy(() => import('../Screens/SalesManagement/ClientPrices/ClientPriceForm'))
  },
  {
    path: `${url}/open-sales-order-reports`,
    screen: SideBarLoader(() =>
      import('../Screens/StandardReports/OpenSalesOrderReports/OpenSalesOrderReports')
    )
  },
  {
    path: `${url}/daily-sales-order-reports`,
    screen: SideBarLoader(() =>
      import('../Screens/StandardReports/DailySalesOrderReports/DailySalesOrderReports')
    )
  },
  {
    path: `${url}/output-vat`,
    screen: SideBarLoader(() => import('../Screens/StandardReports/OutputVAT/OutputVAT'))
  },
  {
    path: `${url}/open-purchase-order-reports`,
    screen: SideBarLoader(() =>
      import('../Screens/StandardReports/OpenPurchaseOrderReports/OpenPurchaseOrderReports')
    )
  },
  {
    path: `${url}/finance-report-configuration`,
    screen: lazy(() => import('../Screens/FinanceManagement/FinanceReportConfig/FinanceReportConfig'))
  },
  {
    path: `${url}/profit-and-loss`,
    screen: lazy(() => import('../Screens/FinanceManagement/ProfitAndLoss/ProfitAndLossView'))
  },
  {
    path: `${url}/profit-and-loss-consolidated`,
    screen: lazy(() => import('../Screens/FinanceManagement/ProfitAndLoss/ProfitAndLossConsolidated'))
  },
  {
    path: `${url}/profit-and-loss-divisions`,
    screen: lazy(() => import('../Screens/FinanceManagement/ProfitAndLoss/ProfitAndLossDivisionConsolidated'))
  },
  {
    path: `${url}/profit-and-loss-performances`,
    screen: lazy(() =>
      import('../Screens/FinanceManagement/ProfitAndLoss/ProfitAndLossPerformanceConsolidated')
    )
  },
  {
    path: `${url}/profit-and-loss-monthly`,
    screen: lazy(() => import('../Screens/FinanceManagement/ProfitAndLoss/ProfitAndLossMonthlyConsolidated'))
  },
  {
    path: `${url}/profit-and-loss-for-fyc`,
    access: 'profit-and-loss-for-fyc',
    screen: lazy(() => import('../Screens/FinanceManagement/ProfitAndLoss/ProfitAndLossForFYC'))
  },
  {
    path: `${url}/trial-balance`,
    screen: lazy(() => import('../Screens/FinanceManagement/TrialBalance/TrialBalanceView'))
  },
  {
    path: `${url}/trial-balance-consolidated`,
    screen: lazy(() => import('../Screens/FinanceManagement/TrialBalance/TrialBalanceConsolidated'))
  },
  {
    path: `${url}/cost-accounting-report`,
    screen: lazy(() => import('../Screens/Reports/CostAccountingReport'))
  },
  {
    path: `${url}/cash-flow`,
    screen: lazy(() => import('../Screens/Reports/CashFlowReport'))
  },
  {
    path: `${url}/account-balances`,
    screen: lazy(() => import('../Screens/Reports/AccountBalances'))
  },
  {
    path: `${url}/period-closure-balances`,
    screen: lazy(() => import('../Screens/FinanceManagement/PeriodClosureBalances/PeriodClosureBalances'))
  },
  {
    path: `${url}/general-ledger-balances`,
    screen: lazy(() => import('../Screens/Reports/GeneralLedgerBalances'))
  },
  {
    path: `${url}/expense-report-payee`,
    screen: lazy(() => import('../Screens/Reports/ExpenseReportPayee'))
  },
  {
    path: `${url}/balance-sheets`,
    screen: lazy(() => import('../Screens/FinanceManagement/BalanceSheets/BalanceSheetView'))
  },
  {
    path: `${url}/balance-sheet-performances`,
    screen: lazy(() =>
      import('../Screens/FinanceManagement/BalanceSheets/BalanceSheetPerformanceConsolidated')
    )
  },
  {
    path: `${url}/balance-sheet-consolidated`,
    screen: lazy(() => import('../Screens/FinanceManagement/BalanceSheets/BalanceSheetConsolidated'))
  },
  {
    path: `${url}/balance-sheet-monthly`,
    screen: lazy(() => import('../Screens/FinanceManagement/BalanceSheets/BalanceSheetMonthlyConsolidated'))
  },
  {
    path: `${url}/tax-declaration`,
    screen: lazy(() => import('../Screens/FinanceManagement/TaxDeclaration/TaxDeclaration'))
  },
  {
    path: `${url}/tax-declaration/:id`,
    screen: lazy(() => import('../Screens/FinanceManagement/TaxDeclaration/TaxDeclarationView'))
  },
  {
    path: `${url}/add-tax-declaration`,
    screen: lazy(() => import('../Screens/FinanceManagement/TaxDeclaration/TaxDeclarationForm'))
  },
  {
    path: `${url}/edit-tax-declaration/:id`,
    screen: lazy(() => import('../Screens/FinanceManagement/TaxDeclaration/TaxDeclarationForm'))
  },
  {
    path: `${url}/project-reports`,
    screen: lazy(() => import('../Screens/FinanceManagement/ProjectReports/ProjectReports'))
  },
  {
    path: `${url}/bank-accounts`,
    screen: lazy(() => import('../Screens/FinanceManagement/BankAccounts/BankAccounts'))
  },
  {
    path: `${url}/workflow-notifications`,
    screen: lazy(() => import('../Screens/HRMS/WorkflowNotifications/WorkflowNotifications'))
  },
  {
    path: `${url}/document-types`,
    screen: lazy(() => import('../Screens/HRMS/DocumentTypes/DocumentTypes'))
  },
  {
    path: `${url}/cost-centers`,
    screen: lazy(() => import('../Screens/FinanceManagement/CostCenters/CostCenters'))
  },
  {
    path: `${url}/chart-of-accounts`,
    screen: lazy(() => import('../Screens/FinanceManagement/ChartOfAccounts/ChartOfAccounts'))
  },
  {
    path: `${url}/default-chart-of-accounts`,
    screen: lazy(() => import('../Screens/FinanceManagement/DefaultChartOfAccounts/DefaultChartOfAccounts'))
  },
  {
    path: `${url}/chart-of-account-options`,
    screen: lazy(() => import('../Screens/FinanceManagement/ChartOfAccountOptions/ChartOfAccountOptions'))
  },
  {
    path: `${url}/cost-budgets`,
    screen: lazy(() => import('../Screens/FinanceManagement/CostBudgets/CostBudgets'))
  },
  {
    path: `${url}/add-cost-budget`,
    screen: lazy(() => import('../Screens/FinanceManagement/CostBudgets/CostBudgetForm'))
  },
  {
    path: `${url}/edit-cost-budget/:id`,
    screen: lazy(() => import('../Screens/FinanceManagement/CostBudgets/CostBudgetForm'))
  },
  {
    path: `${url}/cost-budget-report/:id`,
    screen: lazy(() => import('../Screens/FinanceManagement/CostBudgets/CostBudgetView'))
  },
  {
    path: `${url}/cost-center-report`,
    screen: SideBarLoader(() => import('../Screens/FinanceManagement/CostBudgets/CostCenterReport'))
  },
  {
    path: `${url}/accounting-dashboard`,
    screen: SideBarLoader(() => import('../Screens/Reports/AccountingDashboard'))
  },
  {
    path: `${url}/employee-salary-reports`,
    screen: SideBarLoader(() => import('../Screens/Reports/EmployeeReports/EmployeeSalaryReports'))
  },
  {
    path: `${url}/bank-reconciliations`,
    screen: SideBarLoader(() => import('../Screens/Reports/BankReconciliations/BankReconciliations'))
  },
  {
    path: `${url}/add-bank-reconciliation`,
    screen: lazy(() => import('../Screens/Reports/BankReconciliations/BankReconciliationsForm'))
  },
  {
    path: `${url}/edit-bank-reconciliation/:id`,
    screen: lazy(() => import('../Screens/Reports/BankReconciliations/BankReconciliationsSummary'))
  },
  {
    path: `${url}/bank-statements`,
    screen: lazy(() => import('../Screens/Reports/BankStatements'))
  },
  {
    path: `${url}/reports`,
    screen: lazy(() => import('../Screens/Reports/Reports'))
  },
  {
    path: `${url}/purchase-requests`,
    access: 'purchase-requests',
    screen: SideBarLoader(() => import('../Screens/PurchaseManagement/PurchaseRequests/PurchaseRequests'))
  },
  {
    path: `${url}/add-purchase-request`,
    access: 'add-purchase-request',
    screen: lazy(() => import('../Screens/PurchaseManagement/PurchaseRequests/PurchaseRequestForm'))
  },
  {
    path: `${url}/edit-purchase-request/:id`,
    screen: lazy(() => import('../Screens/PurchaseManagement/PurchaseRequests/PurchaseRequestForm'))
  },
  {
    path: `${url}/purchase-requests/:id`,
    access: 'purchase-requests',
    screen: lazy(() => import('../Screens/PurchaseManagement/PurchaseRequests/PurchaseRequestView'))
  },
  {
    path: `${url}/approvers`,
    screen: lazy(() => import('../Screens/MasterData/Approvers/Approvers'))
  },
  {
    path: `${url}/assets`,
    screen: SideBarLoader(() => import('../Screens/FixedAssets/Asset/Assets'))
  },
  {
    path: `${url}/add-asset`,
    screen: lazy(() => import('../Screens/FixedAssets/Asset/AssetForm'))
  },
  {
    path: `${url}/edit-asset/:asset`,
    access: 'edit-asset',
    screen: lazy(() => import('../Screens/FixedAssets/Asset/AssetLifecycle'))
  },
  {
    path: `${url}/asset-induction`,
    screen: lazy(() => import('../Screens/FixedAssets/AssetInduction/AssetInduction'))
  },
  {
    path: `${url}/bulk-depreciation`,
    screen: lazy(() => import('../Screens/FixedAssets/BulkDepreciation/BulkDepreciation'))
  },
  {
    path: `${url}/asset-inventories`,
    access: 'asset-inventories',
    screen: SideBarLoader(() => import('../Screens/FixedAssets/AssetInventory/AssetInventories'))
  },
  {
    path: `${url}/add-asset-inventory`,
    access: 'add-asset-inventory',
    screen: lazy(() => import('../Screens/FixedAssets/AssetInventory/AssetInventoryForm'))
  },
  {
    path: `${url}/edit-asset-inventory/:id`,
    access: 'edit-asset-inventory',
    screen: lazy(() => import('../Screens/FixedAssets/AssetInventory/AssetInventoryForm'))
  },
  {
    path: `${url}/view-asset-inventory/:id`,
    access: 'asset-inventories',
    screen: lazy(() => import('../Screens/FixedAssets/AssetInventory/ViewInventory'))
  },
  {
    path: `${url}/barcode-scan`,
    screen: lazy(() => import('../Screens/FixedAssets/Barcode/BarcodeScanner'))
  },
  {
    path: `${url}/tracked-assets/:tag`,
    access: 'asset-inventories',
    screen: lazy(() => import('../Screens/FixedAssets/Barcode/trackedAssets'))
  },
  {
    path: `${url}/asset-code-scan/:id`,
    access: 'edit-asset-inventory',
    screen: lazy(() => import('../Screens/FixedAssets/Barcode/AssetCode'))
  },
  {
    path: `${url}/employee-loans`,
    screen: SideBarLoader(() => import('../Screens/HRMS/EmployeeLoans/EmployeeLoans'))
  },
  {
    path: `${url}/add-employee-loan`,
    screen: lazy(() => import('../Screens/HRMS/EmployeeLoans/EmployeeLoanForm'))
  },
  {
    path: `${url}/edit-employee-loan/:id`,
    screen: lazy(() => import('../Screens/HRMS/EmployeeLoans/EmployeeLoanForm'))
  },
  {
    path: `${url}/employee-dashboard`,
    screen: lazy(() => import('../Screens/HumanResources/EmployeeDashboard/EmployeeDashboard'))
  },
  {
    path: `${url}/add-job-order`,
    screen: lazy(() => import('../Screens/SalesManagement/JobOrder/JobOrderForm'))
  },
  {
    path: `${url}/edit-job-order/:id`,
    screen: lazy(() => import('../Screens/SalesManagement/JobOrder/JobOrderForm'))
  },
  {
    path: `${url}/job-orders/:id`,
    screen: lazy(() => import('../Screens/SalesManagement/JobOrder/JobOrderView'))
  },
  {
    path: `${url}/job-orders`,
    screen: SideBarLoader(() => import('../Screens/SalesManagement/JobOrder/JobOrders'))
  },
  {
    path: `${url}/upload-bills`,
    screen: lazy(() => import('../Screens/UploadBills/UploadBills'))
  },
  {
    path: `${url}/bill-of-materials`,
    screen: SideBarLoader(() => import('../Screens/ProductionManagement/BillOfMaterials/BillOfMaterials'))
  },
  {
    path: `${url}/add-bill-of-material`,
    screen: lazy(() => import('../Screens/ProductionManagement/BillOfMaterials/BillOfMaterialsForm'))
  },
  {
    path: `${url}/edit-bill-of-material/:id`,
    screen: lazy(() => import('../Screens/ProductionManagement/BillOfMaterials/BillOfMaterialsForm'))
  },
  {
    path: `${url}/resources`,
    screen: SideBarLoader(() => import('../Screens/ProductionManagement/Resources/Resources'))
  },
  {
    path: `${url}/add-resource`,
    screen: lazy(() => import('../Screens/ProductionManagement/Resources/ResourcesForm'))
  },
  {
    path: `${url}/edit-resource/:id`,
    screen: lazy(() => import('../Screens/ProductionManagement/Resources/ResourcesForm'))
  },
  {
    path: `${url}/routings`,
    screen: SideBarLoader(() => import('../Screens/ProductionManagement/Routings/Routings'))
  },
  {
    path: `${url}/add-routing`,
    screen: lazy(() => import('../Screens/ProductionManagement/Routings/RoutingForm'))
  },
  {
    path: `${url}/edit-routing/:id`,
    screen: lazy(() => import('../Screens/ProductionManagement/Routings/RoutingForm'))
  },
  {
    path: `${url}/production-orders`,
    screen: SideBarLoader(() => import('../Screens/ProductionManagement/ProductionOrders/ProductionOrders'))
  },
  {
    path: `${url}/add-production-order`,
    screen: lazy(() =>
      import('../Screens/ProductionManagement/ProductionOrders/AddProductionOrder/AddProductionOrderForm')
    )
  },
  {
    path: `${url}/edit-production-order/:id`,
    screen: lazy(() =>
      import('../Screens/ProductionManagement/ProductionOrders/EditProductionOrder/EditProductionOrderForm')
    )
  },
  {
    path: `${url}/production-plannings`,
    screen: SideBarLoader(() =>
      import('../Screens/ProductionManagement/ProductionPlannings/ProductionPlannings')
    )
  },
  {
    path: `${url}/production-plannings/:id`,
    screen: lazy(() => import('../Screens/ProductionManagement/ProductionPlannings/ProductionPlanningForm'))
  },
  {
    path: `${url}/production-reportings`,
    screen: SideBarLoader(() =>
      import('../Screens/ProductionManagement/ProductionReportings/ProductionReportings')
    )
  },
  {
    path: `${url}/production-reportings/:id`,
    screen: lazy(() => import('../Screens/ProductionManagement/ProductionReportings/ProductionReportingForm'))
  },
  {
    path: `${url}/bill-of-material-reports`,
    screen: lazy(() => import('../Screens/StandardReports/BillOfMaterialReports/BillOfMaterialReports'))
  },
  {
    path: `${url}/routing-reports`,
    screen: lazy(() => import('../Screens/StandardReports/RoutingReports/RoutingReports'))
  },
  {
    path: `${url}/production-order-summary-reports`,
    screen: lazy(() => import('../Screens/StandardReports/ProductionSummaryReports/ProductionSummaryReports'))
  },
  {
    path: `${url}/production-order-detailed-reports`,
    screen: lazy(() =>
      import('../Screens/StandardReports/ProductionDetailedReports/ProductionDetailedReports')
    )
  },
  {
    path: `${url}/pos-categories`,
    screen: SideBarLoader(() => import('../Screens/FinanceManagement/POS/Setup/POSCategories/POSCategories'))
  },

  {
    path: `${url}/document-discount-and-charges`,
    screen: SideBarLoader(() =>
      import('../Screens/MasterData/DocumentDiscountAndCharges/DocumentDiscountAndCharges')
    )
  },
  {
    path: `${url}/add-document-discount-and-charge`,
    screen: lazy(() =>
      import('../Screens/MasterData/DocumentDiscountAndCharges/DocumentDiscountAndChargeForm')
    )
  },
  {
    path: `${url}/edit-document-discount-and-charge/:id`,
    screen: lazy(() =>
      import('../Screens/MasterData/DocumentDiscountAndCharges/DocumentDiscountAndChargeForm')
    )
  },
  {
    path: `${url}/pos-exchange-rates`,
    screen: SideBarLoader(() =>
      import('../Screens/FinanceManagement/POS/Setup/POSExchangeRates/POSExchangeRates')
    )
  },
  {
    path: `${url}/add-pos-exchange-rate`,
    screen: lazy(() => import('../Screens/FinanceManagement/POS/Setup/POSExchangeRates/POSExchangeRateForm'))
  },
  {
    path: `${url}/edit-pos-exchange-rate/:id`,
    screen: lazy(() => import('../Screens/FinanceManagement/POS/Setup/POSExchangeRates/POSExchangeRateForm'))
  },
  {
    path: `${url}/pos-warehouses`,
    screen: SideBarLoader(() => import('../Screens/FinanceManagement/POS/Setup/POSWarehouses/POSWarehouses'))
  },
  {
    path: `${url}/add-pos-warehouse`,
    screen: lazy(() => import('../Screens/FinanceManagement/POS/Setup/POSWarehouses/POSWarehouseForm'))
  },
  {
    path: `${url}/edit-pos-warehouse/:id`,
    screen: lazy(() => import('../Screens/FinanceManagement/POS/Setup/POSWarehouses/POSWarehouseForm'))
  },
  {
    path: `${url}/pos-material-pricing`,
    screen: SideBarLoader(() =>
      import('../Screens/FinanceManagement/POS/Setup/POSMaterialPricing/POSMaterialPricing')
    )
  },
  {
    path: `${url}/add-pos-material-pricing`,
    screen: lazy(() =>
      import('../Screens/FinanceManagement/POS/Setup/POSMaterialPricing/POSMaterialPricingForm')
    )
  },
  {
    path: `${url}/edit-pos-material-pricing/:id`,
    screen: lazy(() =>
      import('../Screens/FinanceManagement/POS/Setup/POSMaterialPricing/POSMaterialPricingForm')
    )
  },
  {
    path: `${url}/invoice-attributes`,
    screen: SideBarLoader(() =>
      import('../Screens/FinanceManagement/POS/Setup/InvoiceAttributes/InvoiceAttributes')
    )
  },
  {
    path: `${url}/add-invoice-attribute/`,
    screen: lazy(() =>
      import('../Screens/FinanceManagement/POS/Setup/InvoiceAttributes/InvoiceAttributeForm')
    )
  },
  {
    path: `${url}/edit-invoice-attribute/:id`,
    screen: lazy(() =>
      import('../Screens/FinanceManagement/POS/Setup/InvoiceAttributes/InvoiceAttributeForm')
    )
  },
  {
    path: `${url}/pos-promotions`,
    screen: SideBarLoader(() => import('../Screens/FinanceManagement/POS/Setup/POSPromotions/POSPromotions'))
  },
  {
    path: `${url}/add-pos-promotion/:type`,
    screen: lazy(() => import('../Screens/FinanceManagement/POS/Setup/POSPromotions/POSPromotionForm'))
  },
  {
    path: `${url}/edit-pos-promotion/:id`,
    screen: lazy(() => import('../Screens/FinanceManagement/POS/Setup/POSPromotions/POSPromotionForm'))
  },
  {
    path: `${url}/pos-options`,
    screen: SideBarLoader(() => import('../Screens/MasterData/POSOptions/POSOptions'))
  },
  {
    path: `${url}/add-pos-option`,
    screen: lazy(() => import('../Screens/MasterData/POSOptions/POSOptionForm'))
  },
  {
    path: `${url}/edit-pos-option/:id`,
    screen: lazy(() => import('../Screens/MasterData/POSOptions/POSOptionForm'))
  },
  {
    path: `${url}/pos-queues`,
    screen: SideBarLoader(() => import('../Screens/FinanceManagement/POS/POSQueue/POSQueues'))
  },
  {
    path: `${url}/pos-supervisor-configurations`,
    screen: lazy(() =>
      import('../Screens/FinanceManagement/POS/Setup/POSSupervisorConfigurations/POSSupervisorConfigurations')
    )
  },
  {
    path: `${url}/add-gold-stock`,
    screen: lazy(() => import('../Screens/GoldManagement/GoldStocks/GoldStockForm'))
  },

  {
    path: `${url}/customer-stock`,
    screen: lazy(() => import('../Screens/GoldManagement/GoldStocks/CustomerStock'))
  },

  {
    path: `${url}/edit-gold-stock/:id`,
    screen: lazy(() => import('../Screens/GoldManagement/GoldStocks/GoldStockForm'))
  },
  {
    path: `${url}/gold-stocks`,
    screen: lazy(() => import('../Screens/GoldManagement/GoldStocks/GoldStocks'))
  },

  {
    path: `${url}/view-gold-job-order`,
    screen: lazy(() => import('../Screens/GoldManagement/JobOrder/JobOrders'))
  },
  {
    path: `${url}/add-gold-job-order`,
    screen: lazy(() => import('../Screens/GoldManagement/JobOrder/JobOrderForm'))
  },
  {
    path: `${url}/edit-gold-job-order/:id`,
    screen: lazy(() => import('../Screens/GoldManagement/JobOrder/JobOrderForm'))
  },
  {
    path: `${url}/gold-job-orders`,
    screen: SideBarLoader(() => import('../Screens/GoldManagement/JobOrder/JobOrders'))
  },
  {
    path: `${url}/employee-balance-report`,
    screen: lazy(() => import('../Screens/GoldManagement/Report/EmployeeBalanceReport'))
  },

  {
    path: `${url}/employee-stock-screen`,
    screen: lazy(() => import('../Screens/GoldManagement/JobOrder/EmployeeStockScreen'))
  },

  {
    path: `${url}/employee-gold-return-form`,
    screen: lazy(() => import('../Screens/GoldManagement/GoldReturn/GoldReturnForm'))
  },

  {
    path: `${url}/employee-gold-return-report`,
    screen: lazy(() => import('../Screens/GoldManagement/GoldReturn/GoldReturn'))
  },

  {
    path: `${url}/add-lead`,
    screen: lazy(() => import('../Screens/LeadManagement/AddLeadForm'))
  },
  {
    path: `${url}/edit-lead/:id`,
    screen: lazy(() => import('../Screens/LeadManagement/EditLeadForm'))
  },
  {
    path: `${url}/lead-options`,
    screen: lazy(() => import('../Screens/LeadManagement/LeadOptions/LeadOptions'))
  },
  {
    path: `${url}/leads`,
    screen: SideBarLoader(() => import('../Screens/LeadManagement/Leads'))
  },
  {
    path: `${url}/lead-cockpit`,
    screen: lazy(() => import('../Screens/LeadManagement/LeadsCockpit'))
  },
  {
    path: `${url}/lead-dashboard`,
    screen: lazy(() => import('../Screens/LeadManagement/Reports/Dashboard'))
  },
  {
    path: `${url}/lead-analytics`,
    screen: lazy(() => import('../Screens/LeadManagement/Analytics/CrmAnalytics'))
  },
  {
    path: `${url}/leads/proposals/:id`,
    screen: lazy(() => import('../Screens/LeadManagement/LeadProposals/ProposalView'))
  },
  {
    path: `${url}/leads/add-proposal`,
    screen: lazy(() => import('../Screens/LeadManagement/LeadProposals/ProposalForm'))
  },
  {
    path: `${url}/leads/edit-proposal/:id`,
    screen: lazy(() => import('../Screens/LeadManagement/LeadProposals/ProposalForm'))
  },
  {
    path: `${url}/sla-definitions`,
    screen: lazy(() => import('../Screens/ServiceRequests/SLADefinition/SLADefinition'))
  },
  {
    path: `${url}/service-options`,
    screen: lazy(() => import('../Screens/ServiceRequests/Options/ServicesOptions'))
  },
  {
    path: `${url}/service-requests`,
    screen: lazy(() => import('../Screens/ServiceRequests/ServiceRequests'))
  },
  {
    path: `${url}/service-dashboards/:id?`,
    screen: lazy(() => import('../Screens/ServiceRequests/Dashboards/ServiceDashboards'))
  },
  {
    path: `${url}/service-dashboard`,
    screen: lazy(() => import('../Screens/ServiceRequests/Dashboards/NewDesignDashboard'))
  },
  {
    path: `${url}/pos-order`,
    screen: lazy(() => import('../Screens/FinanceManagement/POS/POSOrders'))
  },
  {
    path: `${url}/pos-invoices`,
    screen: lazy(() => import('../Screens/FinanceManagement/POS/POSInvoices'))
  },
  {
    path: `${url}/reports/purchase-clearing-account`,
    screen: lazy(() => import('../Screens/Reports/PurchaseClearingAccount'))
  },
  {
    path: `${url}/reports/customer-statements`,
    screen: lazy(() => import('../Screens/Reports/CustomerStatements'))
  },
  {
    path: `${url}/reports/customer-statement-from-book`,
    screen: lazy(() => import('../Screens/Reports/CustomerStatementFromBook'))
  },
  {
    path: `${url}/reports/customer-statement-summary`,
    screen: lazy(() => import('../Screens/Reports/CustomerStatementSummary'))
  },
  {
    path: `${url}/reports/supplier-statements`,
    screen: lazy(() => import('../Screens/Reports/SupplierStatements'))
  },
  {
    path: `${url}/reports/supplier-statement-from-book`,
    screen: lazy(() => import('../Screens/Reports/SupplierStatementFromBook'))
  },

  {
    path: `${url}/invoice-transmissions`,
    screen: lazy(() => import('../Screens/Zatca/InvoiceTransmissions/InvoiceTransmissions'))
  },
  {
    path: `${url}/zatca-dashboard`,
    screen: lazy(() => import('../Screens/Zatca/ZatcaDashboard/ZatcaDashboard'))
  },
  {
    path: `${url}/proforma-invoices`,
    screen: SideBarLoader(() => import('../Screens/InvoiceData/ProformaInvoices/ProformaInvoices'))
  },
  {
    path: `${url}/add-proforma-invoice`,
    screen: lazy(() => import('../Screens/InvoiceData/ProformaInvoices/ProformaInvoiceForm'))
  },
  {
    path: `${url}/edit-proforma-invoice/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/ProformaInvoices/ProformaInvoiceForm'))
  },
  {
    path: `${url}/proforma-invoices/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/ProformaInvoices/ProformaInvoiceView'))
  },
  {
    path: `${url}/reports/customer-invoice-ageing`,
    screen: lazy(() => import('../Screens/Reports/CustomerInvoiceAgeing'))
  },
  {
    path: `${url}/reports/supplier-invoice-ageing`,
    screen: lazy(() => import('../Screens/Reports/SupplierInvoiceAgeing'))
  },
  {
    path: `${url}/reports/customer-invoice-summary`,
    screen: lazy(() => import('../Screens/Reports/CustomerInvoiceSummary'))
  },
  {
    path: `${url}/reports/sales-by-customer`,
    screen: lazy(() => import('../Screens/Reports/SalesByCustomer'))
  },
  {
    path: `${url}/reports/sales-by-sales-person`,
    screen: lazy(() => import('../Screens/Reports/SalesBySalesPerson'))
  },
  {
    path: `${url}/reports/sales-by-country`,
    screen: lazy(() => import('../Screens/Reports/SalesByCountry'))
  },
  {
    path: `${url}/reports/sales-by-currency`,
    screen: lazy(() => import('../Screens/Reports/SalesByCurrency'))
  },
  {
    path: `${url}/reports/sales-by-product`,
    screen: lazy(() => import('../Screens/Reports/SalesByProduct'))
  },
  {
    path: `${url}/reports/tax-summary`,
    screen: lazy(() => import('../Screens/Reports/TaxSummary'))
  },
  {
    path: `${url}/reports/tax-summary-fta`,
    screen: lazy(() => import('../Screens/Reports/TaxSummaryFTA'))
  },
  {
    path: `${url}/reports/excise-summary`,
    screen: lazy(() => import('../Screens/Reports/ExciseSummary'))
  },
  {
    path: `${url}/reports/supplier-invoice-summary`,
    screen: lazy(() => import('../Screens/Reports/SupplierInvoiceSummary'))
  },
  {
    path: `${url}/reports/purchase-by-supplier`,
    screen: lazy(() => import('../Screens/Reports/PurchaseBySupplier'))
  },
  {
    path: `${url}/reports/purchase-by-country`,
    screen: lazy(() => import('../Screens/Reports/PurchaseByCountry'))
  },
  {
    path: `${url}/reports/purchase-by-currency`,
    screen: lazy(() => import('../Screens/Reports/PurchaseByCurrency'))
  },
  {
    path: `${url}/reports/purchase-by-product`,
    screen: lazy(() => import('../Screens/Reports/PurchaseByProduct'))
  },
  {
    path: `${url}/reports/daily-purchase-order-reports`,
    screen: lazy(() => import('../Screens/Reports/DailyPurchaseOrderReports'))
  },
  {
    path: `${url}/reports/input-vat`,
    screen: SideBarLoader(() => import('../Screens/Reports/InputVAT'))
  },
  {
    path: `${url}/sales-dashboard`,
    screen: lazy(() => import('../Screens/Reports/SalesDashboard'))
  },
  {
    path: `${url}/reports/purchase-dashboard`,
    screen: SideBarLoader(() => import('../Screens/Reports/PurchaseDashboard'))
  },
  {
    path: `${url}/reports/material-purchase-history`,
    screen: lazy(() => import('../Screens/Reports/MaterialPurchaseHistory'))
  },
  {
    path: `${url}/pick-orders`,
    screen: lazy(() => import('../Screens/SalesManagement/PickOrders/PickOrders'))
  },
  {
    path: `${url}/pick-orders/:id`,
    screen: lazy(() => import('../Screens/SalesManagement/PickOrders/PickOrderView'))
  },
  {
    path: `${url}/view-pick-order/:id`,
    screen: lazy(() => import('../Screens/SalesManagement/PickOrders/PickOrderForm'))
  },
  {
    path: `${url}/pick-requests`,
    screen: SideBarLoader(() => import('../Screens/SalesManagement/PickRequests/PickRequests'))
  },
  {
    path: `${url}/pick-requests/search`,
    access: 'pick-requests',
    screen: SideBarLoader(() => import('../Screens/SalesManagement/PickRequests/CreatePickRequest'))
  },
  {
    path: `${url}/pick-requests/:id`,
    screen: lazy(() => import('../Screens/SalesManagement/PickRequests/PickRequestView'))
  },
  {
    path: `${url}/add-pick-request`,
    screen: lazy(() => import('../Screens/SalesManagement/PickRequests/PickRequestForm'))
  },
  {
    path: `${url}/edit-pick-request/:id`,
    screen: lazy(() => import('../Screens/SalesManagement/PickRequests/PickRequestForm'))
  },
  {
    path: `${url}/material-transfers`,
    screen: SideBarLoader(() => import('../Screens/StockManagement/MaterialTransfers/MaterialTransfers'))
  },
  {
    path: `${url}/material-transfers/:id`,
    access: 'material-transfers',
    screen: SideBarLoader(() => import('../Screens/StockManagement/MaterialTransfers/MaterialTransferView'))
  },
  {
    path: `${url}/add-material-transfer`,
    screen: lazy(() => import('../Screens/StockManagement/MaterialTransfers/MaterialTransferForm'))
  },
  {
    path: `${url}/edit-material-transfer/:id`,
    screen: lazy(() => import('../Screens/StockManagement/MaterialTransfers/MaterialTransferForm'))
  },
  {
    path: `${url}/approve-material-transfer`,
    access: 'view-material-transfer',
    screen: SideBarLoader(() =>
      import('../Screens/StockManagement/MaterialTransferApprove/MaterialTransferApprove')
    )
  },
  {
    path: `${url}/approve-material-transfer/:id`,
    access: 'view-material-transfer',
    screen: lazy(() =>
      import('../Screens/StockManagement/MaterialTransferApprove/MaterialTransferApproveView')
    )
  },
  {
    path: `${url}/approve-material-transfer/:id/approve`,
    access: 'view-material-transfer',
    screen: lazy(() =>
      import('../Screens/StockManagement/MaterialTransferApprove/MaterialTransferApproveForm')
    )
  },
  {
    path: `${url}/reports/cogs`,
    screen: lazy(() => import('../Screens/Reports/CogsReport'))
  },
  {
    path: `${url}/reports/employee-expense-report`,
    screen: lazy(() => import('../Screens/Reports/EmployeeExpenseReport'))
  },
  {
    path: `${url}/reports/cost-center-report`,
    screen: lazy(() => import('../Screens/Reports/CostCenterReport/CostCenterReport'))
  },
  {
    path: `${url}/amortizations`,
    screen: lazy(() => import('../Screens/InvoiceData/Amortizations/Amortizations'))
  },
  {
    path: `${url}/add-amortization`,
    screen: lazy(() => import('../Screens/InvoiceData/Amortizations/AmortizationForm'))
  },
  {
    path: `${url}/edit-amortization/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/Amortizations/AmortizationForm'))
  },
  {
    path: `${url}/amortizations/search`,
    access: 'add-amortization',
    screen: lazy(() => import('../Screens/InvoiceData/Amortizations/AmortizationSearch'))
  },

  {
    path: `${url}/customer-advances`,
    screen: lazy(() => import('../Screens/InvoiceData/CustomerAdvances/CustomerAdvances'))
  },
  {
    path: `${url}/customer-advances/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/CustomerAdvances/CustomerAdvanceView'))
  },
  {
    path: `${url}/add-customer-advance`,
    screen: lazy(() => import('../Screens/InvoiceData/CustomerAdvances/CustomerAdvanceForm'))
  },
  {
    path: `${url}/edit-customer-advance/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/CustomerAdvances/CustomerAdvanceForm'))
  },
  {
    path: `${url}/stock-reconciliations`,
    screen: SideBarLoader(() =>
      import('../Screens/StockManagement/StockReconciliations/StockReconciliations')
    )
  },
  {
    path: `${url}/delivery-returns`,
    screen: SideBarLoader(() => import('../Screens/SalesManagement/DeliveryReturns/DeliveryReturns'))
  },
  {
    path: `${url}/delivery-returns/search`,
    access: 'delivery-returns',
    screen: SideBarLoader(() => import('../Screens/SalesManagement/DeliveryReturns/CreateDeliveryReturn'))
  },
  {
    path: `${url}/delivery-returns/:id`,
    screen: SideBarLoader(() => import('../Screens/SalesManagement/DeliveryReturns/DeliveryReturnView'))
  },
  {
    path: `${url}/add-delivery-return`,
    screen: lazy(() => import('../Screens/SalesManagement/DeliveryReturns/DeliveryReturnForm'))
  },
  {
    path: `${url}/edit-delivery-return/:id`,
    screen: lazy(() => import('../Screens/SalesManagement/DeliveryReturns/DeliveryReturnForm'))
  },
  {
    path: `${url}/goods-returns`,
    screen: SideBarLoader(() => import('../Screens/PurchaseManagement/GoodsReturns/GoodsReturns'))
  },
  {
    path: `${url}/goods-returns/search`,
    access: 'goods-returns',
    screen: SideBarLoader(() => import('../Screens/PurchaseManagement/GoodsReturns/CreateGoodsReturn'))
  },
  {
    path: `${url}/goods-returns/:id`,
    screen: SideBarLoader(() => import('../Screens/PurchaseManagement/GoodsReturns/GoodsReturnView'))
  },
  {
    path: `${url}/add-goods-return`,
    screen: lazy(() => import('../Screens/PurchaseManagement/GoodsReturns/GoodsReturnForm'))
  },
  {
    path: `${url}/edit-goods-return/:id`,
    screen: lazy(() => import('../Screens/PurchaseManagement/GoodsReturns/GoodsReturnForm'))
  },
  {
    path: `${url}/reports/stock-ageing`,
    screen: lazy(() => import('../Screens/Reports/StockAgeing'))
  },
  {
    path: `${url}/reports/batch-serial-stock-ageing`,
    screen: lazy(() => import('../Screens/Reports/BatchSerialStockAgeing'))
  },
  {
    path: `${url}/supplier-advances`,
    screen: lazy(() => import('../Screens/InvoiceData/SupplierAdvances/SupplierAdvances'))
  },
  {
    path: `${url}/supplier-advances/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/SupplierAdvances/SupplierAdvanceView'))
  },
  {
    path: `${url}/edit-supplier-advance/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/SupplierAdvances/SupplierAdvanceForm'))
  },
  {
    path: `${url}/add-supplier-advance`,
    screen: lazy(() => import('../Screens/InvoiceData/SupplierAdvances/SupplierAdvanceForm'))
  },
  {
    path: `${url}/employee-advances`,
    screen: lazy(() => import('../Screens/InvoiceData/EmployeeAdvances/EmployeeAdvances'))
  },
  {
    path: `${url}/employee-advances/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/EmployeeAdvances/EmployeeAdvanceView'))
  },
  {
    path: `${url}/edit-employee-advance/:id`,
    screen: lazy(() => import('../Screens/InvoiceData/EmployeeAdvances/EmployeeAdvanceForm'))
  },
  {
    path: `${url}/add-employee-advance`,
    screen: lazy(() => import('../Screens/InvoiceData/EmployeeAdvances/EmployeeAdvanceForm'))
  },
  {
    path: `${url}/organization-overview`,
    screen: lazy(() => import('../Screens/MasterData/OrganizationOverview/OrganizationOverview'))
  },
  {
    path: `${url}/vendor-stock-checks`,
    screen: SideBarLoader(() => import('../Screens/StockManagement/VendorStockChecks/VendorStockChecks'))
  },
  {
    path: `${url}/reports/purchase-reports`,
    screen: lazy(() => import('../Screens/Reports/PurchaseReport'))
  },
  {
    path: `${url}/reports/sales-reports`,
    screen: lazy(() => import('../Screens/Reports/SalesReport'))
  },
  {
    path: `${url}/pos-payment-types`,
    screen: lazy(() => import('../Screens/FinanceManagement/POS/PaymentTypes/PaymentTypes'))
  },
  {
    path: `${url}/pos-delete-reasons`,
    screen: lazy(() => import('../Screens/FinanceManagement/POS/DeleteReasons/DeleteReasons'))
  },
  {
    path: `${url}/pos-day-closure`,
    screen: lazy(() => import('../Screens/FinanceManagement/POS/POSDayClosure/POSDayClosure'))
  },
  {
    path: `${url}/pos-dashboard`,
    screen: lazy(() => import('../Screens/FinanceManagement/POS/POSDashboard/POSDashboard'))
  },
  {
    path: `${url}/pos-order-report`,
    screen: lazy(() => import('../Screens/Reports/POSOrderReport'))
  },
  {
    path: `${url}/pos-auditor-report`,
    screen: lazy(() => import('../Screens/Reports/POSAuditorReport'))
  },
  {
    path: `${url}/pos-posting-report`,
    screen: lazy(() => import('../Screens/Reports/POSPostingReport'))
  },
  {
    path: `${url}/pos-deleted-invoice-report`,
    screen: lazy(() => import('../Screens/Reports/POSVoidInvoiceReport'))
  },
  {
    path: `${url}/inventory-count-plans`,
    screen: lazy(() => import('../Screens/CycleCount/InventoryCountPlans/InventoryCountPlans'))
  },
  {
    path: `${url}/add-inventory-count-plan`,
    screen: lazy(() => import('../Screens/CycleCount/InventoryCountPlans/CreateInventoryCountPlan'))
  },
  {
    path: `${url}/inventory-count-plans/:id`,
    access: 'inventory-count-plans',
    screen: lazy(() => import('../Screens/CycleCount/InventoryCountPlans/InventoryCountPlanForm'))
  },
  {
    path: `${url}/inventory-tracker-by-material`,
    screen: lazy(() => import('../Screens/CycleCount/InventoryTrackerByMaterial/InventoryTrackerByMaterial'))
  },
  {
    path: `${url}/inventory-tracker-by-plan`,
    screen: lazy(() => import('../Screens/CycleCount/InventoryTrackerByPlan/InventoryTrackerByPlan'))
  },
  {
    path: `${url}/stock-revaluation`,
    screen: lazy(() => import('../Screens/CycleCount/StockRevaluation/StockRevaluation'))
  },
  {
    path: `${url}/stock-revaluation/:id`,
    access: 'stock-revaluation',
    screen: lazy(() => import('../Screens/CycleCount/StockRevaluation/StockRevaluationForm'))
  },
  {
    path: `${url}/old-customer-invoice-conversion`,
    access: 'old-customer-invoice-conversion',
    screen: lazy(() =>
      import('../Screens/SalesManagement/OldCustomerInvoiceConversion/OldCustomerInvoiceConversion')
    )
  },
  {
    path: `${url}/old-supplier-invoice-conversion`,
    access: 'old-supplier-invoice-conversion',
    screen: lazy(() =>
      import('../Screens/PurchaseManagement/OldSupplierInvoiceConversion/OldSupplierInvoiceConversion')
    )
  },
  {
    path: `${url}/stock-below-reorder-level`,
    screen: lazy(() => import('../Screens/StockManagement/StockBelowReorderLevel/StockBelowReorderLevel'))
  },
  {
    path: `${url}/quotation-sales-order-comparison`,
    screen: lazy(() => import('../Screens/Reports/QuotationSalesOrderComparison'))
  },
  {
    path: `${url}/payroll-postings`,
    screen: SideBarLoader(() => import('../Screens/HRMS/PayrollPostings/PayrollPostings'))
  },
  {
    path: `${url}/add-payroll-posting`,
    screen: lazy(() => import('../Screens/HRMS/PayrollPostings/PayrollPostingForm'))
  },
  {
    path: `${url}/edit-payroll-posting/:id`,
    screen: lazy(() => import('../Screens/HRMS/PayrollPostings/PayrollPostingForm'))
  },
  {
    path: `${url}/employee-salary-clearances`,
    screen: SideBarLoader(() =>
      import('../Screens/HRMS/PayrollPostingClearances/EmployeeSalaryClearances/EmployeeSalaryClearances')
    )
  },
  {
    path: `${url}/employee-salary-clearances/:id`,
    screen: lazy(() =>
      import('../Screens/HRMS/PayrollPostingClearances/EmployeeSalaryClearances/EmployeeSalaryClearanceForm')
    )
  },
  {
    path: `${url}/statutory-expense-clearances`,
    screen: SideBarLoader(() =>
      import('../Screens/HRMS/PayrollPostingClearances/StatutoryExpenseClearances/StatutoryExpenseClearances')
    )
  },
  {
    path: `${url}/statutory-expense-clearances/:id`,
    screen: lazy(() =>
      import(
        '../Screens/HRMS/PayrollPostingClearances/StatutoryExpenseClearances/StatutoryExpenseClearanceForm'
      )
    )
  },
  {
    path: `${url}/stock-adjustments`,
    screen: SideBarLoader(() => import('../Screens/StockManagement/StockAdjustments/StockAdjustments'))
  },
  {
    path: `${url}/add-stock-adjustment`,
    screen: lazy(() => import('../Screens/StockManagement/StockAdjustments/StockAdjustmentForm'))
  },
  {
    path: `${url}/edit-stock-adjustment/:id`,
    screen: lazy(() => import('../Screens/StockManagement/StockAdjustments/StockAdjustmentForm'))
  },
  {
    path: `${url}/employee-onboarding/:id`,
    screen: lazy(() => import('../Screens/HRMS/EmployeeOnboardings/EmployeeOnboardingForm'))
  },
  {
    path: `${url}/monthly-attendances`,
    screen: SideBarLoader(() => import('../Screens/HRMS/MonthlyAttendances/MonthlyAttendances'))
  },
  {
    path: `${url}/add-monthly-attendance`,
    screen: lazy(() => import('../Screens/HRMS/MonthlyAttendances/AddMonthlyAttendance'))
  },
  {
    path: `${url}/edit-monthly-attendance`,
    screen: lazy(() => import('../Screens/HRMS/MonthlyAttendances/EditMonthlyAttendance'))
  },
  {
    path: `${url}/employee-overtime-requests`,
    screen: SideBarLoader(() =>
      import('../Screens/HRMS/EmployeeOvertime/EmployeeOvertimeRequests/EmployeeOvertimeRequests')
    )
  },
  {
    path: `${url}/add-employee-overtime-request`,
    screen: lazy(() =>
      import('../Screens/HRMS/EmployeeOvertime/EmployeeOvertimeRequests/EmployeeOvertimeRequestForm')
    )
  },
  {
    path: `${url}/edit-employee-overtime-request/:id`,
    screen: lazy(() =>
      import('../Screens/HRMS/EmployeeOvertime/EmployeeOvertimeRequests/EmployeeOvertimeRequestForm')
    )
  },
  {
    path: `${url}/employee-overtime-approvals`,
    screen: SideBarLoader(() =>
      import('../Screens/HRMS/EmployeeOvertime/EmployeeOvertimeApprovals/EmployeeOvertimeApprovals')
    )
  },
  {
    path: `${url}/edit-employee-overtime-approval/:id`,
    screen: lazy(() =>
      import('../Screens/HRMS/EmployeeOvertime/EmployeeOvertimeApprovals/EmployeeOvertimeApprovalForm')
    )
  },
  {
    path: `${url}/checklists`,
    screen: SideBarLoader(() => import('../Screens/HRMS/Checklists/Checklists'))
  },
  {
    path: `${url}/add-checklist`,
    screen: lazy(() => import('../Screens/HRMS/Checklists/ChecklistForm'))
  },
  {
    path: `${url}/edit-checklist/:id`,
    screen: lazy(() => import('../Screens/HRMS/Checklists/ChecklistForm'))
  },
  {
    path: `${url}/employee-onboarding-details`,
    screen: SideBarLoader(() => import('../Screens/HRMS/EmployeeOnboardingDetails/EmployeeOnboardingDetails'))
  },
  {
    path: `${url}/add-employee-onboarding-details`,
    screen: lazy(() => import('../Screens/HRMS/EmployeeOnboardingDetails/EmployeeOnboardingDetailsForm'))
  },
  {
    path: `${url}/edit-employee-onboarding-details/:id`,
    screen: lazy(() => import('../Screens/HRMS/EmployeeOnboardingDetails/EmployeeOnboardingDetailsForm'))
  },
  {
    path: `${url}/asset-allocations`,
    screen: SideBarLoader(() => import('../Screens/HRMS/AssetManagement/AssetAllocation/AssetAllocations'))
  },
  {
    path: `${url}/add-asset-allocation`,
    screen: lazy(() => import('../Screens/HRMS/AssetManagement/AssetAllocation/AssetAllocationForm'))
  },
  {
    path: `${url}/edit-asset-allocation/:id`,
    screen: lazy(() => import('../Screens/HRMS/AssetManagement/AssetAllocation/AssetAllocationForm'))
  },
  {
    path: `${url}/asset-transfers`,
    screen: SideBarLoader(() => import('../Screens/HRMS/AssetManagement/AssetTransfers/AssetTransfers'))
  },
  {
    path: `${url}/add-asset-transfer`,
    screen: lazy(() => import('../Screens/HRMS/AssetManagement/AssetTransfers/AssetTransferForm'))
  },
  {
    path: `${url}/edit-asset-transfer/:id`,
    screen: lazy(() => import('../Screens/HRMS/AssetManagement/AssetTransfers/AssetTransferForm'))
  },
  {
    path: `${url}/container-receipts`,
    screen: SideBarLoader(() => import('../Screens/StockManagement/ContainerReceipts/ContainerReceipts'))
  },
  {
    path: `${url}/add-container-receipt`,
    screen: lazy(() => import('../Screens/StockManagement/ContainerReceipts/ContainerReceiptForm'))
  },
  {
    path: `${url}/edit-container-receipt/:id`,
    screen: lazy(() => import('../Screens/StockManagement/ContainerReceipts/ContainerReceiptForm'))
  },
  {
    path: `${url}/production-issues/search`,
    access: 'production-issues',
    screen: lazy(() => import('../Screens/ProductionManagement/ProductionIssues/CreateProductionIssue'))
  },
  {
    path: `${url}/production-issues`,
    screen: lazy(() => import('../Screens/ProductionManagement/ProductionIssues/ProductionIssues'))
  },
  {
    path: `${url}/add-production-issue`,
    screen: lazy(() => import('../Screens/ProductionManagement/ProductionIssues/ProductionIssueForm'))
  },
  {
    path: `${url}/edit-production-issue/:id`,
    screen: lazy(() => import('../Screens/ProductionManagement/ProductionIssues/ProductionIssueForm'))
  },
  {
    path: `${url}/production-receipts/search`,
    access: 'production-receipts',
    screen: lazy(() => import('../Screens/ProductionManagement/ProductionReceipts/CreateProductionReceipt'))
  },
  {
    path: `${url}/production-receipts`,
    screen: lazy(() => import('../Screens/ProductionManagement/ProductionReceipts/ProductionReceipts'))
  },
  {
    path: `${url}/add-production-receipt`,
    screen: lazy(() => import('../Screens/ProductionManagement/ProductionReceipts/ProductionReceiptForm'))
  },
  {
    path: `${url}/edit-production-receipt/:id`,
    screen: lazy(() => import('../Screens/ProductionManagement/ProductionReceipts/ProductionReceiptForm'))
  },
  {
    path: `${url}/refurbished-stock-reports`,
    screen: lazy(() => import('../Screens/StandardReports/RefurbishedStockReports/RefurbishedStockReports'))
  },
  {
    path: `${url}/petty-cash-transfers`,
    screen: lazy(() => import('../Screens/FinanceManagement/PettyCash/PettyCashTransfers/PettyCashTransfers'))
  },
  {
    path: `${url}/petty-cash-transfers/:id`,
    screen: lazy(() =>
      import('../Screens/FinanceManagement/PettyCash/PettyCashTransfers/PettyCashTransferView')
    )
  },
  {
    path: `${url}/add-petty-cash-transfer`,
    screen: lazy(() =>
      import('../Screens/FinanceManagement/PettyCash/PettyCashTransfers/PettyCashTransferForm')
    )
  },
  {
    path: `${url}/edit-petty-cash-transfer/:id`,
    screen: lazy(() =>
      import('../Screens/FinanceManagement/PettyCash/PettyCashTransfers/PettyCashTransferForm')
    )
  },
  {
    path: `${url}/petty-cash-payments`,
    screen: lazy(() => import('../Screens/FinanceManagement/PettyCash/PettyCashPayments/PettyCashPayments'))
  },
  {
    path: `${url}/campaigns`,
    screen: lazy(() => import('../Screens/LeadManagement/Campaigns/Campaigns'))
  },
  {
    path: `${url}/add-campaign`,
    screen: lazy(() => import('../Screens/LeadManagement/Campaigns/Campaign'))
  },
  {
    path: `${url}/edit-campaign/:id`,
    screen: lazy(() => import('../Screens/LeadManagement/Campaigns/Campaign'))
  },
  {
    path: `${url}/lead-configurations`,
    screen: lazy(() => import('../Screens/LeadManagement/LeadConfigurations/LeadConfigurations'))
  },
  {
    path: `${url}/stock-account-balances`,
    screen: lazy(() => import('../Screens/StandardReports/InventoryAccountBalances/StockAccountBalances'))
  },
  {
    path: `${url}/cogs-account-balances`,
    screen: lazy(() => import('../Screens/StandardReports/InventoryAccountBalances/CogsAccountBalances'))
  },
  {
    path: `${url}/employee-expenses`,
    screen: SideBarLoader(() => import('../Screens/HRMS/EmployeeExpenses/EmployeeExpenses'))
  },
  {
    path: `${url}/employee-expenses/:id`,
    screen: lazy(() => import('../Screens/HRMS/EmployeeExpenses/EmployeeExpenseView'))
  },
  {
    path: `${url}/add-employee-expense`,
    screen: lazy(() => import('../Screens/HRMS/EmployeeExpenses/EmployeeExpenseForm'))
  },
  {
    path: `${url}/edit-employee-expense/:id`,
    screen: lazy(() => import('../Screens/HRMS/EmployeeExpenses/EmployeeExpenseForm'))
  },
  {
    path: `${url}/production-cost-reports`,
    screen: lazy(() => import('../Screens/StandardReports/ProductionCostReports/ProductionCostReports'))
  },
  {
    path: `${url}/stock-movement-report`,
    screen: lazy(() => import('../Screens/Reports/StockMovementReport'))
  },
  {
    path: `${url}/stock-movement-inventory`,
    screen: lazy(() => import('../Screens/Reports/StockMovementInventory'))
  },
  {
    path: `${url}/tax-rules`,
    screen: lazy(() => import('../Screens/FinanceManagement/TaxRules/TaxRulesForm'))
  },
  {
    path: `${url}/tax-definitions`,
    screen: lazy(() => import('../Screens/FinanceManagement/TaxDefinitions/TaxDefinitionsForm'))
  },
  {
    path: `${url}/bank-account-transfers`,
    screen: SideBarLoader(() =>
      import('../Screens/FinanceManagement/BankAccountTransfers/BankAccountTransfers')
    )
  },
  {
    path: `${url}/add-bank-account-transfer`,
    screen: lazy(() => import('../Screens/FinanceManagement/BankAccountTransfers/BankAccountTransferForm'))
  },
  {
    path: `${url}/edit-bank-account-transfer/:id`,
    screen: lazy(() => import('../Screens/FinanceManagement/BankAccountTransfers/BankAccountTransferForm'))
  },
  {
    path: `${url}/peppol-invoice-onboarding`,
    screen: lazy(() => import('../Screens/Peppol/InvoiceOnboarding/InvoiceOnboarding'))
  },
  {
    path: `${url}/peppol-sending-logs`,
    screen: lazy(() => import('../Screens/Peppol/SendingLogs/SendingLogs'))
  },
  {
    path: `${url}/peppol-receiving-logs`,
    screen: lazy(() => import('../Screens/Peppol/ReceivingLogs/ReceivingLogs'))
  },
  {
    path: `${url}/purchase-persons`,
    screen: SideBarLoader(() => import('../Screens/MasterData/PurchasePersons/PurchasePersons'))
  },
  {
    path: `${url}/add-purchase-person`,
    screen: lazy(() => import('../Screens/MasterData/PurchasePersons/PurchasePersonForm'))
  },
  {
    path: `${url}/edit-purchase-person/:id`,
    screen: lazy(() => import('../Screens/MasterData/PurchasePersons/PurchasePersonForm'))
  },
  {
    path: `${url}/adjustment-accounts`,
    screen: lazy(() => import('../Screens/StockManagement/AdjustmentAccounts/AdjustmentAccounts'))
  },
  {
    path: `${url}/stock-revaluations`,
    screen: lazy(() => import('../Screens/StockManagement/StockRevaluations/StockRevaluations'))
  },
  {
    path: `${url}/add-stock-revaluation`,
    screen: lazy(() => import('../Screens/StockManagement/StockRevaluations/StockRevaluationForm'))
  },
  {
    path: `${url}/edit-stock-revaluation/:id`,
    screen: lazy(() => import('../Screens/StockManagement/StockRevaluations/StockRevaluationForm'))
  }
]

function InnerRoutes(props) {
  const {
    match: { url }
  } = props

  const notification = useNotification()
  const [loader, setLoader] = useState(true)

  useEffect(() => {
    if (!props.userInfo) {
      getUserToken().then((userInfo) => {
        if (userInfo) {
          redirectToCompany(userInfo)
        }

        setLoader(false)
      })
    } else {
      redirectToCompany(props.userInfo)
      setLoader(false)
    }

    if (localStorage.getItem('release_version') !== '1.0.23') {
      Modal.info({
        width: '60%',
        title: 'Dear Customer',
        content: (
          <Suspense fallback={<LoaderBox loader />}>
            <ReleaseInfo />
          </Suspense>
        ),
        onOk: () => localStorage.setItem('release_version', '1.0.23')
      })
    }
  }, [])

  useEffect(() => {
    const unRegister = props.history.listen(() => {
      redirectToCompany(props.userInfo)
    })

    return () => {
      unRegister()
    }
  }, [props.userInfo])

  const redirectToCompany = (userInfo) => {
    if (!isEmpty(userInfo)) {
      if (userInfo.shouldChangePassword && props.history.location.pathname !== `${url}/change-password`) {
        notification.warning({
          message: 'Password Change Required',
          description: 'You are required to change your password.'
        })
        props.history.push(`${url}/change-password`)
      } else if (
        userInfo.shouldSetupMfa &&
        !userInfo.shouldChangePassword &&
        props.history.location.pathname !== `${url}/multi-factor-authentication`
      ) {
        notification.warning({
          message: 'Multi-Factor Authentication Required',
          description: 'You are required to set up multi-factor authentication.'
        })
        props.history.push(`${url}/multi-factor-authentication`)
      } else if (
        !userInfo.company &&
        !userInfo.shouldChangePassword &&
        !userInfo.shouldSetupMfa &&
        ![
          `${url}/dashboard`,
          `${url}/change-password`,
          `${url}/multi-factor-authentication`,
          `${url}/profile`,
          `${url}/manage-company`,
          `${url}/generate-invoice`,
          `${url}/master-upload`,
          `${url}/service-desk`,
          `${url}/add-company`,
          `${url}/add-company-restaurant`
        ].includes(props.history.location.pathname)
      ) {
        props.history.push(`${url}/manage-company`)
      }
    }
  }

  if (loader) {
    return (
      <div>
        <LoaderBox style={{ height: '100vh' }} loader="Loading.." />
      </div>
    )
  }

  return (
    <Layout {...props}>
      <UseDrawerFooterActionWidth />
      <Suspense fallback={<LoaderBox loader />}>
        <Switch>
          {getRoutes(url).map((route) => (
            <Route key={route.path} exact {...route} />
          ))}

          {getAsyncRoutes(url).map(({ path, access, ...restProps }) => (
            <Route
              key={path}
              exact
              path={path}
              render={(props) => <AsyncRoute routeAccess={access} {...props} {...restProps} />}
            />
          ))}

          <Redirect exact from={`${url}/`} to={`${url}/dashboard`} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  )
}

function mapStateToProps(state) {
  return {
    userInfo: state.users.userInfo,
    masterOptions: state.users.masterOptions
  }
}

export default connect(mapStateToProps)(memo(InnerRoutes))
