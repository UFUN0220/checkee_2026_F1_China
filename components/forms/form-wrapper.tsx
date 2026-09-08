'use client'

import clsx from 'clsx'
import type { FormHTMLAttributes, ReactNode } from 'react'
import {
  FormProvider,
  type FieldValues,
  type SubmitHandler,
  type UseFormReturn,
} from 'react-hook-form'

type FormWrapperProps<TFieldValues extends FieldValues, TTransformedValues extends FieldValues> = Omit<
  FormHTMLAttributes<HTMLFormElement>,
  'onSubmit'
> & {
  form: UseFormReturn<TFieldValues, unknown, TTransformedValues>
  onSubmit: SubmitHandler<TTransformedValues>
  children: ReactNode
}

export function FormWrapper<
  TFieldValues extends FieldValues,
  TTransformedValues extends FieldValues = TFieldValues,
>({ form, onSubmit, children, className, ...props }: FormWrapperProps<TFieldValues, TTransformedValues>) {
  return (
    <FormProvider {...form}>
      <form
        {...props}
        className={clsx('form-wrapper', className)}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {children}
      </form>
    </FormProvider>
  )
}
