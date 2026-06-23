import type { FormProviderBag } from '@/NewComponents/Form'
import type { FieldValues } from 'react-hook-form'

declare module 'react-hook-form' {
  export function useFormContext<T extends FieldValues>(): FormProviderBag<T>
}

export {}
