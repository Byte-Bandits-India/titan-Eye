import type { DefaultType } from '@/Components/TableBox'
import type { TContactPerson } from '@/NewComponents/ContactPerson/ContactPerson'
import type { TOption } from '@/NewComponents/Form'
import type { Address } from '@/NewComponents/PremadeFields'
import type { UserState } from '@/Reducers/types'
import type { Store } from '@/store/store'
import type { MasterOptionTypes } from '@/Util/Options'
import type { MessageInstance } from 'antd-v5/lib/message/interface'
import type { HookAPI } from 'antd-v5/lib/modal/useModal'
import type { NotificationInstance } from 'antd-v5/lib/notification/interface'
import type { FilterValue, SortOrder } from 'antd-v5/lib/table/interface'
import type { AxiosRequestConfig } from 'axios'
import type { Key } from 'react'
import type { ArrayPath, PathValue } from 'react-hook-form'
import type { RouteChildrenProps } from 'react-router-dom'

declare global {
  type Optional<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>

  type NonEmptyString = string & { __brand: 'NonEmptyString' }

  type ID = NonEmptyString | null

  type TNumber = number | ''

  type PercentageFormat = '%' | ''

  type YesNo = 'Yes' | 'No'

  type DefaultRouteProps<
    Params extends { [K in keyof Params]?: string } = never,
    State = never
  > = RouteChildrenProps<Params, State> &
    UserState &
    Store & {
      modal: HookAPI
      message: MessageInstance
      notification: NotificationInstance
    }

  type Params = {
    id: string
  }

  type DuplicateId = {
    duplicateId: string
  }

  type FilterProps<T> = {
    filterData?: Record<string, unknown>
    onSubmit?: (values: T & Partial<PageData>) => void
  }

  type TAddress = {
    buildingNo: string
    street: string
    additionalStreet: string
    city: string
    state: string
    postalCode: string
    country: string
    additionalNo: string
    neighbourhood: string
  }

  type TAttachment = {
    name: string
    path: string
    size: number
    type: string
  }

  type PageData = {
    totalCount: number
    page: number
    perPage: number
  }

  type Sorter = {
    order?: SortOrder
    field?: Key | readonly Key[]
    priority?: number
  }

  type QueryParams<T> =
    | (Partial<Pick<PageData, 'page' | 'perPage'>> & {
        filters?: Record<string, FilterValue | null>
        sortOrder?: Sorter[]
      })
    | T

  type Query<RecordType extends DefaultType> = (QueryParams<RecordType> | RecordType) &
    Omit<AxiosRequestConfig, 'params'>

  type AxiosQuery<RecordType extends DefaultType> = { query?: Query<RecordType> } & Omit<
    AxiosRequestConfig,
    'params'
  >

  type PageDataResponse<T> = {
    pageData: PageData
    result: T[]
    sorter: Sorter[]
  }

  type TSeparator = ',' | '.' | '-' | '_'

  interface String {
    capitalize(): string
  }

  type Result<T> = {
    success?: boolean
    result: T
    message?: string
  }

  type TemplateResponse = Result<string[]>

  type ExchangeRateResponse = Result<{ rate: number }>

  type OptionResponse = Result<Record<MasterOptionTypes, TOption[]>>

  type NetworkPolicy = 'cache-first' | 'cache-only' | 'network-only'

  type LineItem<T, K extends ArrayPath<T> = ArrayPath<T>> = K extends ArrayPath<T>
    ? {
        [P in K]: PathValue<T, K> | { length: number }
      } &
        Omit<T, K>
    : PathValue<T, K>

  type Prettify<T> = { [K in keyof T]: T[K] } & {}

  type Simplify<T> = { [K in keyof T]: T[K] }

  type BaseMaterial = {
    batch: boolean
    serial: boolean
    materialCode: string
    materialDescription: string
    materialDescriptionAlt: string
    materialCodeDesc: string
    materialType: string
    materialGroup: string
    hsnCode: string
    partNumber: string
    unit: string
    imageURL: string
    warehouse: string
    location: string
    rack: string
  }

  type StockConversion = {
    stockConversion?: TNumber
    conversionRate: number
    stockValue: TNumber
    stockRate: TNumber
    stockUnit?: string
  }

  type TableFilter<T, K extends keyof T = keyof T> = {
    [P in K]:
      | T[P]
      | {
          as: 'text'
          type:
            | 'Contains'
            | 'Does not contain'
            | 'Equals'
            | 'Does not equal'
            | 'Begins with'
            | 'Ends with'
            | 'Blank'
            | 'Not blank'
          value: T[P]
        }
      | {
          as: 'number'
          type:
            | 'Equals'
            | 'Does not equal'
            | 'Greater than'
            | 'Greater than or equal to'
            | 'Less than'
            | 'Less than or equal to'
            | 'Between'
            | 'Blank'
            | 'Not blank'
          value1: T[P]
          value2: T[P]
        }
      | {
          as: 'date'
          type: 'Equals' | 'Does not equal' | 'Before' | 'After' | 'Between' | 'Blank' | 'Not blank'
          value1: T[P]
          value2: T[P]
        }
  } & {
    sortOrder?: Sorter[]
  }

  type UOMConversion = {
    materialCode: string
    transactionUOM: string
    stockUOM: string
    conversion: number
    conversionRate: number
  }

  type BaseClient = {
    client: ID
    clientAlt?: string
    clientNo?: string
    clientName?: string
    clientNameAlt?: string
    billingAddress: Address | null
    shippingAddress: Address | null
    contactPerson: TContactPerson | null
    paymentTerm?: TNumber
    payTermOption?: string
    clientId?: string
    clientIdType?: string
    clientTaxNo?: string
    clientCRNo?: string
    clientTaxType?: string
  }
}

export {}
