import { t } from '@/Components/Translate/TranslateFn'
import store from '@/store/store'
import Decimal from 'decimal.js'
import { compact } from 'lodash'
import sum from 'lodash/sum'
import sumBy from 'lodash/sumBy'
import * as Yup from 'yup'
import zxcvbn from 'zxcvbn'

Yup.setLocale({
  mixed: {
    required: ({ path }) => `${path} ${t('is a required field')}`
  },
  string: {
    length: ({ path, length }) => `${path} ${t('must be exactly')} ${length} ${t('characters')}`,
    min: ({ path, min }) => `${path} ${t('must be at least')} ${min} ${t('characters')}`,
    max: ({ path, max }) => `${path} ${t('must be at most')} ${max} ${t('characters')}`,
    matches: ({ path, regex }) => `${path} ${t('must match the following:')} "${regex}"`,
    email: ({ path }) => `${path} ${t('must be a valid email')}`,
    url: ({ path }) => `${path} ${t('must be a valid URL')}`,
    uuid: ({ path }) => `${path} ${t('must be a valid UUID')}`,
    trim: ({ path }) => `${path} ${t('must be a trimmed string')}`,
    lowercase: ({ path }) => `${path} ${t('must be a lowercase string')}`,
    uppercase: ({ path }) => `${path} ${t('must be a upper case string')}`
  },
  number: {
    min: ({ path, min }) => `${path} ${t('must be greater than or equal to')} ${min}`,
    max: ({ path, max }) => `${path} ${t('must be less than or equal to')} ${max}`,
    lessThan: ({ path, less }) => `${path} ${t('must be less than')} ${less}`,
    moreThan: ({ path, more }) => `${path} ${t('must be greater than')} ${more}`,
    positive: ({ path }) => `${path} ${t('must be a positive number')}`,
    negative: ({ path }) => `${path} ${t('must be a negative number')}`,
    integer: ({ path }) => `${path} ${t('must be an integer')}`
  },
  array: {
    min: ({ path, min }) => `${path} ${t('field must have at least')} ${min} ${t('items')}`,
    max: ({ path, max }) => `${path} ${t('field must have less than or equal to')} ${max} ${t('items')}`,
    length: ({ path, length }) => `${path} ${t('must have')} ${length} ${t('items')}`
  },
  date: {
    min: ({ path, min }) => `${path} ${t('field must be later than')} ${min}`,
    max: ({ path, max }) => `${path} ${t('field must be at earlier than')} ${max}`
  },
  object: {
    noUnknown: ({ path, unknown }) => `${path} ${t('field has unspecified keys:')} ${unknown}`
  },
  boolean: {
    isValue: ({ path, value }) => `${path} ${t('field must be')} ${value}`
  }
})

Yup.addMethod<Yup.NumberSchema<number | null>>(
  Yup.number,
  'number',
  function (message = '${path} must be number') {
    return this.typeError(message)
      .transform((value) => (Number.isNaN(value) ? undefined : value))
      .nullable()
      .test('number', message, (value) => (value ? /^[0-9]*$/.test(value.toString()) : true))
  }
)

Yup.addMethod<Yup.NumberSchema<number | null>>(
  Yup.number,
  'decimal',
  function (round = 6, message = '${path} must be a valid decimal') {
    return this.typeError(message)
      .transform((value) =>
        Number.isNaN(value) ? undefined : new Decimal(Number(value || 0)).toDecimalPlaces(round).toNumber()
      )
      .nullable()
      .test('decimal', message, (value) => (value ? /^\d{1,13}(\.\d{1,6})?$/.test(value.toString()) : true))
  }
)

Yup.addMethod<Yup.NumberSchema<number | null>>(
  Yup.number,
  'negativeDecimal',
  function (round = 6, message = '${path} must be a valid decimal') {
    return this.typeError(message)
      .transform((value) =>
        Number.isNaN(value) ? undefined : new Decimal(Number(value || 0)).toDecimalPlaces(round).toNumber()
      )
      .nullable()
      .test('negativeDecimal', message, (value) =>
        value ? /^-?\d{1,13}(\.\d{1,6})?$/.test(value.toString()) : true
      )
  }
)

Yup.addMethod<Yup.StringSchema>(Yup.string, 'domain', function (message) {
  return this.test('domain', message || 'Enter a valid domain', (value) =>
    value ? /^(?=.{1,255}$)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(value) : true
  )
})

Yup.addMethod<Yup.StringSchema>(Yup.string, 'url', function (message = 'Enter a valid url') {
  return this.test('url', message, function (value) {
    const { path, createError } = this

    if (!value) {
      return true
    }

    try {
      const url = new URL(value)
      const host = url.hostname

      const isDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(host)

      const rawHost = value.replace(/^[a-zA-Z]+:\/\//, '').split(/[/?#:]/)[0]

      const isIPv4 =
        /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(
          rawHost
        )

      if (isDomain || isIPv4) {
        return true
      }

      return createError({ path, message })
    } catch {
      return createError({ path, message })
    }
  })
})

Yup.addMethod<Yup.ArraySchema<Yup.AnyObject[] | undefined, Yup.AnyObject | undefined>>(
  Yup.array,
  'unique',
  function (message, mapper = (a: Yup.AnyObject) => a) {
    return this.test(
      'unique',
      message,
      (list) => list?.filter(mapper).length === new Set(list?.filter(mapper).map(mapper)).size
    )
  }
)

Yup.addMethod<Yup.ArraySchema<Yup.AnyObject[] | undefined, Yup.AnyObject | undefined>>(
  Yup.array,
  'atLeastOneOfFieldInObject',
  function (message = 'At least one of field is required', field) {
    return this.test('atLeastOneOfFieldInObject', '', (value, ref) =>
      !value?.some((obj) => obj[field])
        ? ref.createError({
            message,
            path: `${ref.path}[0].${field}`
          })
        : true
    )
  }
)

Yup.addMethod<Yup.StringSchema>(Yup.string, 'dateFormat', function (message) {
  return this.test('dateFormat', message || 'Enter a valid date format', (value) =>
    value ? /^.*\$\{.*((Y)|(M)|(D)).*\}.*/g.test(value) : true
  )
})

Yup.addMethod<Yup.ArraySchema<Yup.AnyObject[] | undefined, Yup.AnyObject | undefined>>(
  Yup.array,
  'batchTotal',
  function (quantityField: string | string[], message, abs = false) {
    return this.test('batchTotal', message, function (value) {
      const quantity =
        Number(this.parent.stockConversion) ||
        (typeof quantityField === 'string'
          ? Number(this.parent[quantityField])
          : sum(quantityField.map((field: string) => this.parent[field])))

      return sumBy(value, (o) => Number(o.quantity)) === (abs ? Math.abs(quantity) : quantity)
    })
  }
)

Yup.addMethod<Yup.StringSchema>(Yup.string, 'barcode', function (message) {
  return this.test('barcode', message || '${path} is not valid', (value) =>
    value ? /^\*?([0-9A-Z\-. $/+%]{1,})\*?$/.test(value) : true
  )
})

Yup.addMethod<Yup.StringSchema>(Yup.string, 'saudiTaxNo', function (message) {
  return this.test('saudiTaxNo', message || '${path} is not valid', (value) =>
    value ? /^3\d{13}3$/.test(value) : true
  )
})

Yup.addMethod<Yup.AnyObjectSchema>(Yup.object, 'stockConversion', function (message) {
  return this.test('stockConversion', message || "Stock conversion doesn't exist", (value) =>
    value.stockUnit && value.unit !== value.stockUnit ? !!value.stockConversion : true
  )
})

Yup.addMethod<Yup.StringSchema>(Yup.string, 'formula', function (message) {
  return this.test('formula', message || 'Enter a valid formula', (value) =>
    value
      ? /^(?:VALUE|UNIT|\${[0-9]+}[A-Za-z0-9]+)(?:[-+*/](?:VALUE|UNIT|\${[0-9]+}[A-Za-z0-9]+))*$/.test(value)
      : true
  )
})

Yup.addMethod<Yup.StringSchema>(Yup.string, 'password', function (message) {
  return this.min(8, 'Password must be 8 characters long')
    .matches(/[0-9]/, 'Password requires a number')
    .matches(/[a-z]/, 'Password requires a lowercase letter')
    .matches(/[A-Z]/, 'Password requires an uppercase letter')
    .matches(/[`!~[\]@#$%^&*()\-_=+{};:,<.>]/, 'Password requires a special character')
    .test('password', message || 'Password is too weak.', function (value) {
      if (!value) {
        return true
      }

      const { userInfo, companyInfo } = store.getState().users

      const result = zxcvbn(
        value,
        compact([userInfo.name, userInfo.email, companyInfo?.name, companyInfo?.email, companyInfo?.crNo])
      )
      const { score } = result

      if (score < 3) {
        const msg =
          result.feedback.warning ||
          result.feedback.suggestions?.join(' ') ||
          'Please use a stronger password.'

        return this.createError({ message: msg })
      }

      return true
    })
})

export default Yup
