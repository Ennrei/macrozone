import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import type { Meal } from '../lib/api'

const mealSchema = z.object({
  name: z.string().trim().min(2, 'Enter at least 2 characters').max(80, 'Keep the name under 80 characters'),
  category: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  calories: z.coerce.number().min(0, 'Calories cannot be negative').max(10000, 'Enter a realistic calorie amount'),
  protein: z.coerce.number().min(0, 'Protein cannot be negative').max(600, 'Maximum is 600g'),
  carbs: z.coerce.number().min(0, 'Carbohydrates cannot be negative').max(1200, 'Maximum is 1200g'),
  fat: z.coerce.number().min(0, 'Fat cannot be negative').max(400, 'Maximum is 400g'),
  loggedAt: z.string().min(1, 'Choose a date and time'),
  notes: z.string().max(500, 'Keep notes under 500 characters'),
})

export type MealFormValues = z.infer<typeof mealSchema>

export function MealForm({ initial, onSubmit, saving, submitLabel }: {
  initial?: Meal
  onSubmit: (values: MealFormValues) => void
  saving: boolean
  submitLabel: string
}) {
  const defaultDate = initial?.loggedAt ? new Date(initial.loggedAt) : new Date()
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof mealSchema>, unknown, MealFormValues>({
    resolver: zodResolver(mealSchema),
    defaultValues: {
      name: initial?.name || '',
      category: initial?.category || 'breakfast',
      calories: initial?.calories ?? 0,
      protein: initial?.protein ?? 0,
      carbs: initial?.carbs ?? 0,
      fat: initial?.fat ?? 0,
      loggedAt: new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
      notes: initial?.notes || '',
    },
  })
  const field = (name: keyof MealFormValues, label: string, type = 'number', suffix?: string) => <label className="form-field">
    <span>{label}{suffix && <small>({suffix})</small>}</span>
    <input type={type} step={type === 'number' ? 'any' : undefined} {...register(name)} />
    {errors[name] && <em className="field-error">{errors[name]?.message}</em>}
  </label>
  return <form className="form-card" onSubmit={handleSubmit(onSubmit)} noValidate>
    <div className="form-section-title"><span>01</span><div><strong>Meal details</strong><small>What did you have?</small></div></div>
    <div className="form-grid">
      {field('name', 'Meal name', 'text')}
      <label className="form-field"><span>Meal type</span><select {...register('category')}><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snack">Snack</option></select></label>
      {errors.category && <em className="field-error">{errors.category.message}</em>}
      {field('loggedAt', 'Date and time', 'datetime-local')}
    </div>
    <div className="form-section-title form-section-macros"><span>02</span><div><strong>Nutrition estimate</strong><small>Use the label or your best estimate</small></div></div>
    <div className="form-grid form-grid-four">
      {field('calories', 'Calories', 'number', 'kcal')}
      {field('protein', 'Protein', 'number', 'g')}
      {field('carbs', 'Carbohydrates', 'number', 'g')}
      {field('fat', 'Fat', 'number', 'g')}
    </div>
    <label className="form-field notes-field"><span>Notes <small>(optional)</small></span><textarea rows={3} placeholder="Ingredients, portion details, or how it made you feel…" {...register('notes')} />{errors.notes && <em className="field-error">{errors.notes.message}</em>}</label>
    <div className="form-actions"><Link className="button button-ghost" to="/meals"><ArrowLeft size={16} /> Cancel</Link><button className="button button-primary" disabled={saving}><Save size={16} />{saving ? 'Saving…' : submitLabel}</button></div>
  </form>
}
