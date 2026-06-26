'use client'

import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { Slot } from '@radix-ui/react-slot'
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  useForm,
  useController,
  type Resolver,
  type UseFormProps,
  type UseFormReturn,
  type SubmitHandler,
  type SubmitErrorHandler,
  type DefaultValues
} from 'react-hook-form'
import {
  ErrorMessage,
  FieldValuesFromFieldErrors
} from '@hookform/error-message'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { Label } from '@/shared/components/shadcn/ui/label'
import { Input } from '@/shared/components/shadcn/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/shadcn/ui/select'
import { Checkbox } from '@/shared/components/shadcn/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/shared/components/shadcn/ui/radio-group'
import { Switch } from '@/shared/components/shadcn/ui/switch'
import { Textarea } from '@/shared/components/shadcn/ui/textarea'
import { Calendar } from '@/shared/components/shadcn/custom/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/shared/components/shadcn/ui/popover'
import { Button } from '@/shared/components/shadcn/ui/button'
import { Slider } from '@/shared/components/shadcn/ui/slider'
// import Form from 'next/form'

// --- Internal Components & Hooks ---

// const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState } = useFormContext()
  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>')
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    formState,
    ...fieldState
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn('grid gap-2', className)}
        {...props}
      />
    </FormItemContext.Provider>
  )
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { error, formItemId } = useFormField()

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn('data-[error=true]:text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    />
  )
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
}

function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { formDescriptionId } = useFormField()

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function FormMessage({ className, ...props }: React.ComponentProps<'p'>) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? '') : props.children

  if (!body) {
    return null
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn('text-destructive text-sm', className)}
      {...props}>
      {body}
    </p>
  )
}

/** @deprecated 테스트해봤으나 부적합 */
function FormMessageCustom({ className, ...props }: React.ComponentProps<'p'>) {
  const {
    name,
    formMessageId,
    formState: { errors }
  } = useFormField()

  return (
    <ErrorMessage
      errors={errors}
      name={name}
      render={({ message }) => (
        <p
          data-slot="form-message"
          id={formMessageId}
          className={cn('text-destructive text-sm', className)}
          {...props}>
          {message}
        </p>
      )}
    />
  )
}

/** @deprecated 부적합 */
function FormMessageMultiCustom({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  const { error, formMessageId } = useFormField()

  return (
    <ErrorMessage
      errors={error}
      name={formMessageId}
      render={({ messages }) =>
        messages &&
        Object.entries(messages).map(([type, message]) => (
          <p
            key={type}
            data-slot="form-message"
            id={`${formMessageId}${type}`}
            className={cn('text-destructive text-sm', className)}
            {...props}>
            {message}
          </p>
        ))
      }
    />
  )
}

// --- Main Form Component ---

type FormProps<TFormValues extends FieldValues> = {
  id?: string
  options?: UseFormProps<TFormValues>
  schema: z.ZodType<TFormValues, TFormValues>
  className?: string
  children: (methods: UseFormReturn<TFormValues>) => React.ReactNode
  onSubmit: SubmitHandler<TFormValues>
  onError?: SubmitErrorHandler<TFormValues>
}

const Form = <TFormValues extends FieldValues>({
  onSubmit,
  onError,
  children,
  className,
  options,
  id,
  schema
}: FormProps<TFormValues>) => {
  const form = useForm({ ...options, resolver: zodResolver(schema) })

  return (
    <FormProvider {...form}>
      <form
        className={cn('space-y-4', className)}
        onSubmit={form.handleSubmit(onSubmit, onError)}
        id={id}>
        {children(form)}
      </form>
    </FormProvider>
  )
}

// --- Specialized Form Fields ---

interface FormInputProps extends React.ComponentProps<typeof Input> {
  name: string
  label?: string
  description?: string
}

function FormInput({ name, label, description, ...props }: FormInputProps) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })

  return (
    <FormFieldContext.Provider value={{ name }}>
      <FormItem>
        {label && <FormLabel>{label}</FormLabel>}
        <FormControl>
          <Input
            {...props}
            {...field}
          />
        </FormControl>
        {description && <FormDescription>{description}</FormDescription>}
        <FormMessage />
      </FormItem>
    </FormFieldContext.Provider>
  )
}

interface FormSelectItem {
  label: string
  value: string
}

interface FormSelectProps extends React.ComponentProps<typeof Select> {
  name: string
  label?: string
  description?: string
  placeholder?: string
  items: FormSelectItem[]
}

function FormSelect({
  name,
  label,
  description,
  placeholder,
  items,
  ...props
}: FormSelectProps) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })

  /* const { control, formState: { isReady, isLoading } } = useFormContext()
  if (!isReady) return (<div>loading...</div>) */

  return (
    <FormFieldContext.Provider value={{ name }}>
      <FormItem>
        {label && <FormLabel>{label}</FormLabel>}
        <FormControl>
          <Select
            onValueChange={field.onChange}
            value={field.value || undefined}
            {...props}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent position="popper">
              {items?.map(item => (
                <SelectItem
                  key={String(item.value)}
                  value={String(item.value)}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormControl>
        {description && <FormDescription>{description}</FormDescription>}
        <FormMessage />
      </FormItem>
    </FormFieldContext.Provider>
  )
}

function FormSelect2({
  name,
  label,
  description,
  items,
  ...props
}: FormSelectProps) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })

  const selectedValue = items.find(option => option.value === field.value)

  return (
    <FormFieldContext.Provider value={{ name }}>
      <FormItem>
        {label && <FormLabel>{label}</FormLabel>}
        <FormControl>
          <Select
            onValueChange={field.onChange}
            value={field.value || undefined}
            {...props}>
            <SelectTrigger className="w-full">
              {/* <SelectValue placeholder={props.placeholder} /> */}
              {selectedValue?.label ?? props.placeholder ?? '- 선택 -'}
            </SelectTrigger>
            <SelectContent position="popper">
              {items?.map(item => (
                <SelectItem
                  key={String(item.value)}
                  value={String(item.value)}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormControl>
        {description && <FormDescription>{description}</FormDescription>}
        <FormMessage />
      </FormItem>
    </FormFieldContext.Provider>
  )
}

interface FormCheckboxProps extends React.ComponentProps<typeof Checkbox> {
  name: string
  label?: string
  description?: string
}

function FormCheckbox({
  name,
  label,
  description,
  ...props
}: FormCheckboxProps) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })

  return (
    <FormFieldContext.Provider value={{ name }}>
      <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4 shadow-sm">
        <FormControl>
          <Checkbox
            checked={field.value}
            onCheckedChange={field.onChange}
            {...props}
          />
        </FormControl>
        <div className="space-y-1 leading-none">
          {label && <FormLabel>{label}</FormLabel>}
          {description && <FormDescription>{description}</FormDescription>}
        </div>
      </FormItem>
    </FormFieldContext.Provider>
  )
}

interface FormRadioGroupItem {
  label: string
  value: string
}

interface FormRadioGroupProps extends React.ComponentProps<typeof RadioGroup> {
  name: string
  label?: string
  description?: string
  items: FormRadioGroupItem[]
}

function FormRadioGroup({
  name,
  label,
  description,
  items,
  ...props
}: FormRadioGroupProps) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })

  return (
    <FormFieldContext.Provider value={{ name }}>
      <FormItem className="space-y-3">
        {label && <FormLabel>{label}</FormLabel>}
        <FormControl>
          <RadioGroup
            onValueChange={field.onChange}
            defaultValue={field.value}
            className="flex flex-col space-y-1"
            {...props}>
            {items.map(item => (
              <FormItem
                key={item.value}
                className="flex items-center space-y-0 space-x-3">
                <FormControl>
                  <RadioGroupItem value={item.value} />
                </FormControl>
                <Label className="font-normal">{item.label}</Label>
              </FormItem>
            ))}
          </RadioGroup>
        </FormControl>
        {description && <FormDescription>{description}</FormDescription>}
        <FormMessage />
      </FormItem>
    </FormFieldContext.Provider>
  )
}

interface FormSwitchProps extends React.ComponentProps<typeof Switch> {
  name: string
  label?: string
  description?: string
}

function FormSwitch({ name, label, description, ...props }: FormSwitchProps) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })

  return (
    <FormFieldContext.Provider value={{ name }}>
      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
        <div className="space-y-0.5">
          {label && <FormLabel>{label}</FormLabel>}
          {description && <FormDescription>{description}</FormDescription>}
        </div>
        <FormControl>
          <Switch
            checked={field.value}
            onCheckedChange={field.onChange}
            {...props}
          />
        </FormControl>
      </FormItem>
    </FormFieldContext.Provider>
  )
}

interface FormTextareaProps extends React.ComponentProps<typeof Textarea> {
  name: string
  label?: string
  description?: string
}

function FormTextarea({
  name,
  label,
  description,
  ...props
}: FormTextareaProps) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })

  return (
    <FormFieldContext.Provider value={{ name }}>
      <FormItem>
        {label && <FormLabel>{label}</FormLabel>}
        <FormControl>
          <Textarea
            {...props}
            {...field}
          />
        </FormControl>
        {description && <FormDescription>{description}</FormDescription>}
        <FormMessage />
      </FormItem>
    </FormFieldContext.Provider>
  )
}

interface FormDatePickerProps {
  name: string
  label?: string
  description?: string
  placeholder?: string
}

function FormDatePicker({
  name,
  label,
  description,
  placeholder = 'Pick a date'
}: FormDatePickerProps) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })

  return (
    <FormFieldContext.Provider value={{ name }}>
      <FormItem className="flex flex-col">
        {label && <FormLabel>{label}</FormLabel>}
        <Popover>
          <PopoverTrigger asChild>
            <FormControl>
              <Button
                variant={'outline'}
                className={cn(
                  'w-full pl-3 text-left font-normal',
                  !field.value && 'text-muted-foreground'
                )}>
                {field.value ? (
                  field.value instanceof Date ? (
                    field.value.toLocaleDateString()
                  ) : (
                    String(field.value)
                  )
                ) : (
                  <span>{placeholder}</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0"
            align="start">
            <Calendar
              mode="single"
              captionLayout="dropdown"
              selected={field.value}
              onSelect={field.onChange}
              disabled={date =>
                date > new Date() || date < new Date('1900-01-01')
              }
              autoFocus
            />
          </PopoverContent>
        </Popover>
        {description && <FormDescription>{description}</FormDescription>}
        <FormMessage />
      </FormItem>
    </FormFieldContext.Provider>
  )
}

interface FormSliderProps extends React.ComponentProps<typeof Slider> {
  name: string
  label?: string
  description?: string
}

function FormSlider({ name, label, description, ...props }: FormSliderProps) {
  const { control } = useFormContext()
  const { field } = useController({ name, control })

  return (
    <FormFieldContext.Provider value={{ name }}>
      <FormItem>
        {label && <FormLabel>{label}</FormLabel>}
        <FormControl>
          <Slider
            {...props}
            value={field.value}
            onValueChange={field.onChange}
          />
        </FormControl>
        {description && <FormDescription>{description}</FormDescription>}
        <FormMessage />
      </FormItem>
    </FormFieldContext.Provider>
  )
}

export {
  useFormField,
  Form,
  FormProvider,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  FormInput,
  FormSelect,
  FormSelect2,
  FormCheckbox,
  FormRadioGroup,
  FormSwitch,
  FormTextarea,
  FormDatePicker,
  FormSlider
}
