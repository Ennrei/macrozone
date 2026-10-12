import type { ReactNode } from 'react'
import { AlertCircle, ArrowRight, Flame, LoaderCircle, Utensils } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Meal, Totals } from '../lib/api'

export function PageHeading({ eyebrow, title, description, action }: {
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return <div className="page-heading">
    <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="subhead">{description}</p>}</div>
    {action && <div className="heading-action">{action}</div>}
  </div>
}

export function Loading({ label = 'Loading your nutrition data' }: { label?: string }) {
  return <div className="state-card"><LoaderCircle className="spin" size={24} /><span>{label}…</span></div>
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="state-card error-state"><AlertCircle size={22} /><div><strong>We couldn’t load this view.</strong><p>{message}</p>{retry && <button className="text-button" onClick={retry}>Try again</button>}</div></div>
}

export function EmptyState({ title = 'Nothing logged yet', message = 'Add your first meal to start seeing useful patterns.' }: { title?: string; message?: string }) {
  return <div className="empty-state"><span className="empty-icon"><Utensils size={22} /></span><h3>{title}</h3><p>{message}</p><Link className="button button-primary" to="/meals/new">Log a meal <ArrowRight size={16} /></Link></div>
}

export function StatCard({ label, value, detail, icon = <Flame size={16} />, tone = '' }: {
  label: string; value: string; detail: string; icon?: ReactNode; tone?: string
}) {
  return <article className={`stat-card ${tone}`}><div className="stat-label">{label}<span>{icon}</span></div><strong>{value}</strong><p>{detail}</p></article>
}

export function MacroProgress({ label, value, goal, color, unit = 'g' }: {
  label: string; value: number; goal: number; color: string; unit?: string
}) {
  const percent = goal ? Math.round(value / goal * 100) : 0
  return <div className="macro-progress">
    <div className="macro-label"><span><i style={{ backgroundColor: color }} />{label}</span><span>{Math.round(value)}{unit} <em>/ {goal}{unit}</em></span></div>
    <div className="progress-track"><div style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: percent > 100 ? '#f08b72' : color }} /></div>
    <span className="progress-caption">{percent > 100 ? `${percent - 100}% above target` : `${Math.max(0, 100 - percent)}% of daily target left`}</span>
  </div>
}

export function MealCard({ meal, onDelete, onFavorite }: { meal: Meal; onDelete?: (meal: Meal) => void; onFavorite?: (meal: Meal) => void }) {
  return <article className="meal-card">
    <div className="meal-symbol"><Utensils size={18} /></div>
    <div className="meal-main">
      <div className="meal-title-row"><Link to={`/meals/${meal._id}`} className="meal-title">{meal.name}</Link><span className={`category-pill ${meal.category}`}>{meal.category}</span></div>
      <p>{new Date(meal.loggedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {meal.protein}g protein · {meal.carbs}g carbs · {meal.fat}g fat</p>
    </div>
    <strong className="meal-calories">{meal.calories.toLocaleString()} <small>kcal</small></strong>
    {onFavorite && <button className={`icon-button ${meal.favorite ? 'is-favorite' : ''}`} title="Toggle favorite" onClick={() => onFavorite(meal)}>★</button>}
    {onDelete && <button className="icon-button remove-button" title="Delete meal" onClick={() => onDelete(meal)}>×</button>}
  </article>
}

export function sumMeals(meals: Meal[]): Totals {
  return meals.reduce((sum, meal) => ({
    calories: sum.calories + meal.calories,
    protein: sum.protein + meal.protein,
    carbs: sum.carbs + meal.carbs,
    fat: sum.fat + meal.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
}

export function Feedback({ children, tone = 'success' }: { children: ReactNode; tone?: 'success' | 'error' }) {
  return <div className={`feedback ${tone}`} role="status">{children}</div>
}
