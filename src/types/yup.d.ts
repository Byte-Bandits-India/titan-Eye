import * as Yup from 'yup'

declare module 'yup' {
  interface StringSchema<
    TType extends Yup.Maybe<string> = string | undefined,
    TContext = Yup.AnyObject,
    TDefault = undefined,
    TFlags extends Yup.Flags = ''
  > extends Yup.Schema<TType, TContext, TDefault, TFlags> {
    password(message?: string): StringSchema<TType, TContext, TDefault, TFlags>

    phone(): StringSchema<TType, TContext, TDefault, TFlags>

    url(): StringSchema<TType, TContext, TDefault, TFlags>

    dateFormat(): StringSchema<TType, TContext, TDefault, TFlags>

    barcode(): StringSchema<TType, TContext, TDefault, TFlags>

    saudiTaxNo(): StringSchema<TType, TContext, TDefault, TFlags>

    formula(): StringSchema<TType, TContext, TDefault, TFlags>

    domain(): StringSchema<TType, TContext, TDefault, TFlags>
  }

  interface NumberSchema<
    TType extends Yup.Maybe<number> = number | undefined,
    TContext = Yup.AnyObject,
    TDefault = undefined,
    TFlags extends Yup.Flags = ''
  > extends Yup.Schema<TType, TContext, TDefault, TFlags> {
    number(message?: string): NumberSchema<TType | null, TContext, TDefault, TFlags>

    decimal(round?: number, message?: string): NumberSchema<TType | null, TContext, TDefault, TFlags>

    negativeDecimal(round?: number, message?: string): NumberSchema<TType | null, TContext, TDefault, TFlags>
  }

  interface ArraySchema<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TIn extends any[] | null | undefined,
    TContext = Yup.AnyObject,
    TDefault = undefined,
    TFlags extends Yup.Flags = ''
  > extends Yup.Schema<TIn, TContext, TDefault, TFlags> {
    unique(
      message?: Yup.Message,
      mapper?: (a: Yup.AnyObject) => Yup.AnyObject
    ): ArraySchema<TIn, TContext, TDefault, TFlags>

    atLeastOneOfFieldInObject(): ArraySchema<TIn, TContext, TDefault, TFlags>

    batchTotal(
      quantityField: string | string[],
      message: string,
      abs?: boolean
    ): ArraySchema<TIn, TContext, TDefault, TFlags>
  }

  interface ObjectSchema<
    TIn extends Yup.Maybe<Yup.AnyObject>,
    TContext = Yup.AnyObject,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TDefault = any,
    TFlags extends Yup.Flags = ''
  > extends Yup.Schema<TIn, TContext, TDefault, TFlags> {
    stockConversion(message?: string): ObjectSchema<TIn, TContext, TDefault, TFlags>
  }
}

export {}
