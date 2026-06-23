import type { CompanyConfiguration } from '@/Screens/MasterData/Companies/Components/type'
import type { Moment } from 'moment'

export type UserState = {
  userInfo: UserInfo
  adminUser: boolean
  companyInfo: CompanyInfo
  language: string
  translations: Record<string, Record<string, string>>
}

export type UserInfo = {
  status: string
  _id: string
  name: string
  email: string
  network: string
  createdAt: string
  updatedAt: string
  company: string
  userType: string
  id: string
  roleData?: {
    access: string[]
    status: string
    name: string
  }
  userData: {
    user: NonEmptyString
    email: string
    userType: string
  }
  currencies: TCurrency[]
  shouldChangePassword?: boolean
  shouldSetupMfa: boolean
}

export type CompanyInfo = {
  _id: string
  configurations: CompanyConfiguration
  status: string
  network: string
  name: string
  country: string
  currency: string
  crNo: string
  timeZone: string
  taxType: string
  taxNo: string
  tax: TNumber
  taxFormat: PercentageFormat
  email: string
  phone: string
  restaurantId?: string
  logsFrom?: Moment | null
  logsTo?: Moment | null
  buildingNo: string
  street: string
  additionalStreet: string
  city: string
  state: string
  postalCode: string
  additionalNo: string
  neighbourhood: string
  parentCompany?: ID
  banks: Bank[]
  logo?: string
  crmNo: string
}

export type Bank = {
  bankAccountHolderName: string
  bankAccountNo: string
  bankAddress: string
  bankCurrency: string
  bankName: string
  bankSwift: string
  status?: string
  account?: number
}

export type TCurrency = {
  name: string
  unit: string
  code: string
  format: string
  decimalLength: TNumber
  symbol: string
}
