import { t } from '@/Components/Translate/TranslateFn'
import _ from 'lodash'
import Yup from './YupMethod'

export const warehouseSchema = Yup.object().shape({
  warehouses: Yup.array().of(
    Yup.object().shape({
      warehouse: Yup.string().required(),
      description: Yup.string().required(),
      location: Yup.string().when('warehouseLocations', {
        is: (warehouseLocations) => warehouseLocations === 'Yes',
        then: (schema) => schema.required()
      }),
      locationDescription: Yup.string().when('warehouseLocations', {
        is: (warehouseLocations) => warehouseLocations === 'Yes',
        then: (schema) => schema.required()
      }),
      rack: Yup.string().when('warehouseRacks', {
        is: (warehouseRacks) => warehouseRacks === 'Yes',
        then: (schema) => schema.required()
      }),
      rackDescription: Yup.string().when('warehouseRacks', {
        is: (warehouseRacks) => warehouseRacks === 'Yes',
        then: (schema) => schema.required()
      })
    })
  )
})

export const warehouseProductSchema = Yup.object().shape({
  basic: Yup.object().shape({
    materialDescription: Yup.string().required(),
    materialType: Yup.string().required(),
    materialGroup: Yup.string().required(),
    division: Yup.string()
      .nullable()
      .when('isDivision', {
        is: true,
        then: (schema) => schema.required()
      }),
    unit: Yup.string().required(),
    grossWeight: Yup.number().nullable().decimal(),
    netWeight: Yup.number().nullable().decimal(),
    volume: Yup.number().nullable().decimal(),
    salesTime: Yup.number().nullable().decimal(),
    purchaseTime: Yup.number().nullable().decimal(),
    materialLeadTime: Yup.number()
      .nullable()
      .when('productionDateBasedOn', {
        is: (productionDateBasedOn) => productionDateBasedOn === 'Material Lead Time',
        then: (schema) => schema.required()
      })
  }),
  materialAccounts: Yup.object().shape({
    stockAccountLocal: Yup.number().required(),
    stockAccountForeign: Yup.number().required(),
    cogsAccountLocal: Yup.number().required(),
    cogsAccountForeign: Yup.number().required(),
    fixedAssetUnderConstructionAccount: Yup.number().test(
      'fixedAssetUnderConstructionAccount',
      `\${path} ${t('is a required field')}`,
      function (val) {
        return (
          this.from[1]?.value?.basic?.materialType &&
          (this.from[1]?.value?.basic?.materialType !== 'Asset' || val)
        )
      }
    )
  }),
  stockInfo: Yup.object().shape({
    safetyStock: Yup.number().nullable().decimal(),
    reorderLevel: Yup.number().nullable().decimal(),
    purchaseUnit: Yup.string().required(),
    salesUnit: Yup.string().required(),
    purchasePrice: Yup.number().decimal().required(),
    salesPrice: Yup.number().decimal().required()
  }),
  costInfo: Yup.object().shape({
    type: Yup.string().required(),
    cost: Yup.number().nullable().decimal().required()
  }),
  packaging: Yup.object().shape({
    length: Yup.number().nullable().decimal(),
    width: Yup.number().nullable().decimal(),
    height: Yup.number().nullable().decimal(),
    quantity: Yup.number().nullable().decimal()
  })
})

export const storageLocationSchema = {
  warehouse: Yup.string().required(),
  location: Yup.string().when('warehouseLocations', {
    is: (warehouseLocations) => warehouseLocations === 'Yes',
    then: (schema) => schema.required()
  }),
  rack: Yup.string().when('warehouseRacks', {
    is: (warehouseRacks) => warehouseRacks === 'Yes',
    then: (schema) => schema.required()
  })
}

export const materialTransferSchema = Yup.object().shape({
  transactionDate: Yup.date().required(),
  transactionType: Yup.string().required(),
  from: Yup.object().shape(storageLocationSchema),
  to: Yup.object().shape(storageLocationSchema),
  transactions: Yup.array()
    .of(
      Yup.object().shape({
        position: Yup.number().number().required(),
        materialCodeDesc: Yup.string().required(),
        unit: Yup.string().required(),
        quantity: Yup.number().nullable().decimal().required()
      })
    )
    .required()
})

export const materialTransferApproveSchema = Yup.object().shape({
  transactionDate: Yup.date().required(),
  transactionType: Yup.string().required(),
  from: Yup.object().shape(storageLocationSchema),
  to: Yup.object().shape(storageLocationSchema),
  transactions: Yup.array()
    .of(
      Yup.object().shape({
        position: Yup.number().number().required(),
        materialCodeDesc: Yup.string().required(),
        unit: Yup.string().required(),
        quantity: Yup.number().nullable().decimal().required(),
        batchSerials: Yup.array().when(['batch', 'serial'], {
          is: (batch, serial) => batch || serial,
          then: (schema) =>
            schema
              .min(1)
              .required()
              .test('checkEqual', 'Del. Qty and Total Batch / Serial Qty not equal', function (value) {
                return (
                  _.sumBy(value, (batchSerial) => Number(batchSerial.quantity || 0)) ===
                  Number(this.parent.quantity)
                )
              })
        })
      })
    )
    .required()
})

export const addressFieldSchema = Yup.object().shape({
  street: Yup.string().required(),
  city: Yup.string().required(),
  postalCode: Yup.string().required(),
  country: Yup.string().required(),
  state: Yup.string().required(),
  buildingNo: Yup.string().required()
})

export const invoiceEmailSchema = Yup.object().shape({
  email: Yup.string()
    .email()
    .when('showEmail', {
      is: true,
      then: (schema) => schema.required()
    })
})

export const salesPersonSchema = Yup.object().shape({
  firstName: Yup.string().required(),
  lastName: Yup.string().required(),
  email: Yup.string().email().required(),
  phone: Yup.string().required(),
  commission: Yup.number(),
  status: Yup.string().required()
})

export const purchasePersonSchema = Yup.object().shape({
  firstName: Yup.string().required(),
  lastName: Yup.string().required(),
  email: Yup.string().email().required(),
  phone: Yup.string().required(),
  divisions: Yup.array().when('__configurations.division', {
    is: 'Yes',
    then: (schema) => schema.min(1, 'At least one division is required').required()
  }),
  costCenters: Yup.array().min(1, 'At least one cost center is required').required(),
  budget: Yup.number().decimal(),
  status: Yup.string().required(),
  user: Yup.string().nullable().required()
})

export const POLPODSchema = Yup.object().shape({
  code: Yup.string().required(),
  description: Yup.string().required(),
  status: Yup.string().required()
})

export const packagesTypeSchema = Yup.object().shape({
  type: Yup.string().required(),
  description: Yup.string().required(),
  unit: Yup.string().required(),
  length: Yup.number().decimal().required(),
  height: Yup.number().decimal().required(),
  breadth: Yup.number().decimal().required(),
  volume: Yup.number().decimal().required(),
  volumeUnit: Yup.string().required(),
  weight: Yup.number().decimal().required(),
  weightUnit: Yup.string().required()
})

export const priceChargeSchema = Yup.object().shape({
  type: Yup.string().required(),
  description: Yup.string().required(),
  country: Yup.string().required(),
  currency: Yup.string().required(),
  price: Yup.number().decimal().required()
})

export const operationSchema = Yup.object().shape({
  type: Yup.string().required(),
  value: Yup.string().required(),
  description: Yup.string().required()
})

export const salesCallEntrySchema = addressFieldSchema.shape({
  clientName: Yup.string().required(),
  contactPerson: Yup.string().required(),
  phone: Yup.string().required(),
  email: Yup.string().email().required(),
  salesPerson: Yup.string().required()
})

export const offerSchema = addressFieldSchema.shape({
  quotationNo: Yup.string().required(),
  clientName: Yup.string().required(),
  contactPerson: Yup.string().required(),
  phone: Yup.string().required(),
  email: Yup.string().email().required(),
  POLPOD: Yup.string().required(),
  actualWeight: Yup.string().required(),
  chargeableWeight: Yup.string().required(),
  requestedDate: Yup.date().required(),
  operations: Yup.string().required(),
  packageList: Yup.array()
    .of(
      Yup.object().shape({
        packageType: Yup.string().required(),
        length: Yup.number().decimal().required(),
        breadth: Yup.number().decimal().required(),
        height: Yup.number().decimal().required(),
        unit: Yup.string().required(),
        weight: Yup.number().decimal().required(),
        weightUnit: Yup.string().required(),
        volume: Yup.number().decimal().required(),
        volumeUnit: Yup.string().required(),
        items: Yup.array()
          .of(
            Yup.object().shape({
              description: Yup.string().required(),
              quantity: Yup.number().nullable().decimal().required(),
              unit: Yup.string().required(),
              price: Yup.number().number().required(),
              currency: Yup.string().required(),
              charge: Yup.number().decimal(),
              taxType: Yup.string().required(),
              tax: Yup.number()
                .decimal()
                .when('taxType', {
                  is: (taxType) => taxType === 'Normal VAT',
                  then: (schema) => schema.required()
                })
            })
          )
          .required()
      })
    )
    .required()
})

export const jobCreationSchema = Yup.object().shape({
  forwarder: Yup.string().required(),
  creationDate: Yup.date().required(),
  departureDate: Yup.date().required(),
  arrivalDate: Yup.date().required(),

  tos: Yup.string().when('type', {
    is: (type) => type === 'Air',
    then: (schema) => schema.required()
  }),
  flightNo: Yup.string().when('type', {
    is: (type) => type === 'Air',
    then: (schema) => schema.required()
  }),
  MAWBNo: Yup.string().when('type', {
    is: (type) => type === 'Air',
    then: (schema) => schema.required()
  }),
  airline: Yup.string().when('type', {
    is: (type) => type === 'Air',
    then: (schema) => schema.required()
  }),
  shipper: Yup.string().when('type', {
    is: (type) => type === 'Air',
    then: (schema) => schema.required()
  }),
  consignee: Yup.string().when('type', {
    is: (type) => type === 'Air',
    then: (schema) => schema.required()
  }),
  commodity: Yup.string().when('type', {
    is: (type) => type === 'Air',
    then: (schema) => schema.required()
  }),
  idNo: Yup.string().when('type', {
    is: (type) => type === 'Air',
    then: (schema) => schema.required()
  }),
  issueDate: Yup.date().when('type', {
    is: (type) => type === 'Air',
    then: (schema) => schema.required()
  }),

  vessel: Yup.string().when('type', {
    is: (type) => type === 'Sea',
    then: (schema) => schema.required()
  }),
  vesselCode: Yup.string().when('type', {
    is: (type) => type === 'Sea',
    then: (schema) => schema.required()
  }),
  voyageNo: Yup.string().when('type', {
    is: (type) => type === 'Sea',
    then: (schema) => schema.required()
  })
})

export const jobCreationFilterSchema = Yup.object().shape({
  type: Yup.string().required()
})

export const clientChargeSchema = Yup.object().shape({
  client: Yup.string()
    .nullable()
    .when('category', {
      is: (category) => category === 'Client',
      then: (schema) => schema.required()
    }),
  clientGroup: Yup.string()
    .nullable()
    .when('category', {
      is: (category) => category === 'Group',
      then: (schema) => schema.required()
    }),
  materials: Yup.array()
    .of(
      Yup.object().shape({
        materialCodeDesc: Yup.string().required(),
        unit: Yup.string().required(),
        minQuantity: Yup.number().nullable().decimal().min(1).max(Yup.ref('maxQuantity')).required(),
        maxQuantity: Yup.number().nullable().decimal().min(Yup.ref('minQuantity')).max(999999).required(),
        currency: Yup.string().required(),
        price: Yup.number().decimal().required()
      })
    )
    .required()
})

export const POSSchema = Yup.object().shape({
  options: Yup.array().of(
    Yup.object().shape({
      category: Yup.string()
        .nullable()
        .when('POSCategories', {
          is: (POSCategories) => POSCategories === 'Yes',
          then: (schema) => schema.required()
        }),
      subCategory: Yup.string()
        .nullable()
        .when(['POSCategories', 'POSSubCategories'], {
          is: (POSCategories, POSSubCategories) => POSCategories === 'Yes' && POSSubCategories === 'Yes',
          then: (schema) => schema.required()
        })
    })
  )
})

export const batchSerialSchema = Yup.object().shape({
  batchNo: Yup.string()
    .barcode()
    .when(['batch', 'serial'], {
      is: (batch, serial) => batch && !serial,
      then: (schema) => schema.required()
    }),
  serialNo: Yup.string()
    .barcode()
    .when('serial', {
      is: true,
      then: (schema) => schema.required()
    }),
  quantity: Yup.number().nullable().decimal().required(),
  price: Yup.number().nullable().decimal().required(),
  manufacturingDate: Yup.date().required(),
  expiryDate: Yup.date().required()
})

export const addBatchSerialSchema = Yup.object().shape({
  batchSerials: Yup.array()
    .of(batchSerialSchema)
    .when(['batch', 'serial'], {
      is: (batch, serial) => batch && !serial,
      then: (schema) => schema.unique('Duplicate Batch No exists', (a) => a.batchNo)
    })
    .when('serial', {
      is: true,
      then: (schema) => schema.unique('Duplicate Serial No exists', (a) => a.serialNo)
    })
    .min(1)
    .required()
})

export const selectBatchSerialSchema = Yup.object().shape({
  batchSerials: Yup.array()
    .of(
      Yup.object().shape({
        quantity: Yup.number()
          .nullable()
          .decimal()
          .max(Yup.ref('stockQuantity'))
          .when(['batchNo', 'serialNo'], {
            is: (batchNo, serialNo) => batchNo || serialNo,
            then: (schema) => schema.required()
          })
      })
    )
    .min(1)
    .required()
})

export const generateBatchSerialSchema = Yup.object().shape({
  count: Yup.number().required(),
  batchNo: Yup.string().barcode(),
  manufacturingDate: Yup.date().nullable().required(),
  expiryDate: Yup.date().nullable().required()
})

export const createPurchaseOrderSchema = Yup.object().shape({
  client: Yup.string().nullable().required()
})

export const paymentTypeSchema = Yup.object().shape({
  paymentTypes: Yup.array().of(
    Yup.object().shape({
      type: Yup.string().nullable().required(),
      account: Yup.number().required()
    })
  )
})

export const deleteReasonSchema = Yup.object().shape({
  deleteReasons: Yup.array().of(
    Yup.object().shape({
      reason: Yup.string().required()
    })
  )
})

export const createInventoryCountPlanSchema = Yup.object().shape({
  noOfPlans: Yup.number().number().required(),
  countReference: Yup.string().required(),
  plans: Yup.array()
    .of(
      Yup.object().shape({
        users: Yup.array().of(Yup.string().required()).min(1)
      })
    )
    .min(1)
})

export const inventoryTrackerByMaterialSchema = Yup.object().shape({
  stocks: Yup.object().shape({
    customer: Yup.string().when('warehouse', {
      is: (warehouse) => warehouse === 'VENSTK',
      then: (schema) => schema.required()
    }),
    supplier: Yup.string().when('warehouse', {
      is: (warehouse) => warehouse === 'VENSTK',
      then: (schema) => schema.required()
    })
  })
})

export const completeCountingSchema = Yup.object().shape({
  actualQuantity: Yup.number().required()
})

export const stockRevaluationSchema = Yup.object().shape({
  stocks: Yup.array().of(
    Yup.object().shape({
      actualQuantity: Yup.number().required(),
      actualPrice: Yup.number().required(),
      actualValue: Yup.number().required(),
      account: Yup.number().required()
    })
  )
})

export const UOMConversionSchema = Yup.object().shape({
  UOMConversions: Yup.array().of(
    Yup.object().shape({
      transactionUOM: Yup.string().required(),
      transactionQuantity: Yup.number().decimal().required(),
      stockUOM: Yup.string().required(),
      stockQuantity: Yup.string().required(),
      status: Yup.string().required()
    })
  )
})

export const stockSchema = Yup.object().shape({
  materialCodeDesc: Yup.string().required(),
  unit: Yup.string().required(),
  warehouse: Yup.string().required(),
  location: Yup.string().when('warehouseLocations', {
    is: (warehouseLocations) => warehouseLocations === 'Yes',
    then: (schema) => schema.required()
  }),
  rack: Yup.string().when('warehouseRacks', {
    is: (warehouseRacks) => warehouseRacks === 'Yes',
    then: (schema) => schema.required()
  }),
  quantity: Yup.number().nullable().decimal().required(),
  rate: Yup.number().nullable().decimal().required(),
  value: Yup.number().nullable().decimal().required(),
  status: Yup.string().required()
})

export const stockReconciliationSchema = Yup.object().shape(
  {
    transactionDate: Yup.date().required(),
    transactionNo: Yup.string().required(),
    transactionType: Yup.string().required(),
    position: Yup.number().nullable().number().required(),
    materialCodeDesc: Yup.string().required(),
    unit: Yup.string().required(),
    warehouse: Yup.string().required(),
    location: Yup.string().when('warehouseLocations', {
      is: (warehouseLocations) => warehouseLocations === 'Yes',
      then: (schema) => schema.required()
    }),
    rack: Yup.string().when('warehouseRacks', {
      is: (warehouseRacks) => warehouseRacks === 'Yes',
      then: (schema) => schema.required()
    }),
    batchNo: Yup.string()
      .barcode()
      .when(['batch', 'serial'], {
        is: (batch, serial) => batch && !serial,
        then: (schema) => schema.required()
      }),
    serialNo: Yup.string()
      .barcode()
      .when('serial', {
        is: true,
        then: (schema) => schema.required()
      }),
    conversionRate: Yup.number().nullable().decimal().required(),
    stockUnit: Yup.string().required(),
    inStock: Yup.number()
      .nullable()
      .decimal()
      .when('outStock', {
        is: (outStock) => !outStock,
        then: (schema) => schema.required()
      }),
    outStock: Yup.number()
      .nullable()
      .decimal()
      .when('inStock', {
        is: (inStock) => !inStock,
        then: (schema) => schema.required()
      }),
    balance: Yup.number().nullable().decimal().required(),
    expiryDate: Yup.date()
      .nullable()
      .when(['batch', 'serial'], {
        is: (batch, serial) => batch || serial,
        then: (schema) => schema.required()
      }),
    manufacturingDate: Yup.date()
      .nullable()
      .when(['batch', 'serial'], {
        is: (batch, serial) => batch || serial,
        then: (schema) => schema.required()
      }),
    clientName: Yup.string().required(),
    createdAt: Yup.date().required(),
    currency: Yup.string().required(),
    exchangeRate: Yup.number().nullable().decimal().required(),
    stockRate: Yup.number().nullable().decimal().required()
  },
  ['inStock', 'outStock']
)

export const financePostingSchema = Yup.object().shape({
  transactionKey: Yup.string().required(),
  createdAt: Yup.date().required(),
  transactionDate: Yup.date().required(),
  transactionCode: Yup.string().required(),
  transactionNo: Yup.string().required(),
  transactionPosition: Yup.number().decimal().required(),
  transactionAmount: Yup.number().nullable().decimal().required(),
  transactionCurrency: Yup.string().required(),
  account: Yup.number().number().required(),
  transactionType: Yup.string().required(),
  exchangeRate: Yup.number().nullable().decimal().required(),
  baseCurrency: Yup.string().required(),
  baseAmount: Yup.number().nullable().decimal().required(),
  closeFlag: Yup.string().required()
})

export const quotationSalesOrderComparisonSchema = Yup.object().shape({
  quotationNo: Yup.string().required(),
  orderNo: Yup.array().of(Yup.string().required()).min(1).required()
})

export const staggeredSchedulesSchema = Yup.object().shape({
  schedules: Yup.array()
    .of(
      Yup.object().shape({
        quantity: Yup.number().nullable().decimal().required(),
        date: Yup.date().required()
      })
    )
    .min(1)
    .required()
})

export const timeEntryAddSchema = Yup.object().shape({
  task: Yup.string().required(),
  project: Yup.string().required()
})
