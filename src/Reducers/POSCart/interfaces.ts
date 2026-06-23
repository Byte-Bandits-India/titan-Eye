import type { TTaxType } from '@/Util/Options'

export interface ICart {
  amount: number
  currency: string
  description: string
  discount: number
  discountFormat: string
  discountAmount: number
  documentNetAmount: number
  weightage: number
  documentChargeAmount: number
  netAmount: number
  grossAmount: number
  notes?: string
  product: string
  quantity: number
  tax: string | number
  taxAmount: number
  taxFormat: string
  taxType: TTaxType['value']
  unit: string
  unitPrice: number
  materialCode?: string
  materialDescription?: string
  warehouse?: string
  location?: string
  rack?: string
  stockable: boolean
}

export type TPageData = {
  totalCount: number
  page: number
  perPage: number
}

export type TBillsDiscount = {
  discount: number
  discountAmount: number
  discountFormat: string
}

export type TBillsCharge = {
  charge: number
  chargeAmount: number
  chargeFormat: string
}

export type POSState = {
  cartItems: ICart[]
  billsDiscount: TBillsDiscount | null
  billsCharge: TBillsCharge | null
}
