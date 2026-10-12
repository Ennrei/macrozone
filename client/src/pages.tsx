import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Copy, Heart, Pencil, Plus, Search, Sparkles, Target as TargetIcon, Trash2, TrendingUp, Utensils } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { ErrorState, EmptyState, Feedback, Loading, MacroProgress, MealCard, PageHeading, StatCard, sumMeals } from './components/ui'
import { MealForm, type MealFormValues } from './components/MealForm'
import { api, errorMessage, type Meal, type Target, type Totals } from './lib/api'
import { useApiData } from './hooks/useApiData'

type TodaySummary = { date: string; totals: Totals; target: Totals | null; remainingCalories: number | null; mealCount: number }
type WeeklyDay = { date: string; calories: number; protein: number; carbs: number; fat: number; meals: number }
type FoodInsight = { id: string; name: string; entries: number; calories: number; protein: number; carbs: number; fat: number }

const formatDate = (date: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) => new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, options)
const mealUrl = (values: MealFormValues) => ({ ...values, loggedAt: new Date(values.loggedAt).toISOString() })
const greeting = () => {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

export function LandingPage() {
  return <div className="landing">
    <nav className="landing-nav"><Link to="/" className="brand"><span className="brand-mark bg-lime text-ink"><Sparkles size={18} /></span><span>macro<span>zone</span></span></Link><div><a href="#how-it-works">How it works</a><a href="#approach">Our approach</a><Link className="button button-ghost" to="/dashboard">Open app <ArrowRight size={15} /></Link></div></nav>
    <section className="landing-hero">
      <div className="landing-copy"><span className="kicker"><span className="status-dot" /> YOUR FOOD, IN PERSPECTIVE</span><h1>Eat well.<br /><span>Feel the</span> difference.</h1><p>Good nutrition isn’t about being perfect. It’s about understanding your patterns and finding small, meaningful ways forward.</p><div className="landing-actions"><Link to="/dashboard" className="button button-primary">Explore your dashboard <ArrowRight size={17} /></Link><span>No streaks. No judgment. Just clarity.</span></div><div className="landing-proof"><div className="proof-avatars"><span>J</span><span>A</span><span>M</span><span>+</span></div><p><strong>Designed for real life</strong><br />Progress over perfection, every day.</p></div></div>
      <div className="hero-visual"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-sun"><span>today</span><strong>1,284</strong><small>of 2,000 kcal</small><div className="sun-progress"><span /></div><div className="sun-leaf">✳</div></div><div className="float-card float-protein"><span className="float-dot protein-dot" /><div><small>PROTEIN</small><strong>82 <em>/ 150g</em></strong></div><span className="sparkline">⌁</span></div><div className="float-card float-streak"><span className="streak-icon">✦</span><div><small>YOUR RHYTHM</small><strong>Steady & good</strong></div></div><div className="hero-plant">✳</div></div>
    </section>
    <section className="landing-strip" id="approach"><p><span>01</span> Track with intention</p><p><span>02</span> Notice what works</p><p><span>03</span> Keep what feels good</p></section>
    <section className="landing-bottom" id="how-it-works"><div><p className="eyebrow">A MORE HUMAN FOOD JOURNAL</p><h2>Numbers are useful.<br />How you feel matters, too.</h2></div><div><p>Log meals and macros, then let MacroZone do the adding. See how your week is shaping up, save goals that fit your routine, and make informed choices without chasing a perfect score.</p><Link to="/dashboard" className="inline-link">See your nutrition picture <ArrowRight size={16} /></Link></div></section>
    <footer className="landing-footer"><span>© 2026 MacroZone</span><span>Nutrition insights, with room to be human.</span></footer>
  </div>
}

export function DashboardPage() {
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1)
  todayEnd.setUTCMilliseconds(todayEnd.getUTCMilliseconds() - 1)
  const today = useApiData<TodaySummary>('/meals/stats/today')
  const meals = useApiData<Meal[]>(`/meals?from=${todayStart.toISOString()}&to=${todayEnd.toISOString()}`)
  const week = useApiData<WeeklyDay[]>('/meals/stats/weekly')
  if (today.loading || meals.loading || week.loading) return <Loading />
  const failed = [today.error, meals.error, week.error].filter(Boolean)
  if (failed.length) return <ErrorState message={failed.join(' · ')} retry={() => { void today.reload(); void meals.reload(); void week.reload() }} />
  const summary = today.data!
  const mealList = meals.data || []
  const activeTarget = summary.target || { calories: 2000, protein: 150, carbs: 250, fat: 65 }
  const currentWeek = week.data || []
  const maxCalories = Math.max(...currentWeek.map((day) => day.calories), activeTarget.calories, 1)
  const avg = currentWeek.length ? Math.round(currentWeek.reduce((total, day) => total + day.calories, 0) / currentWeek.length) : 0
  return <div className="page-stack">
    <PageHeading eyebrow={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()} title={`${greeting()}, friend.`} description="A little awareness goes a long way. Here's your nutrition, today." action={<Link to="/meals/new" className="button button-primary"><Plus size={17} /> Log a meal</Link>} />
    <section className="dashboard-grid">
      <article className="calorie-panel"><div className="panel-topline"><span>TODAY’S CALORIES</span><span className="live-indicator"><span className="status-dot" /> LIVE</span></div><div className="calorie-total">{summary.totals.calories.toLocaleString()}<span>kcal</span></div><p className="calorie-caption">{summary.remainingCalories == null ? 'Set a daily goal to see what remains.' : `${summary.remainingCalories.toLocaleString()} kcal left in your daily goal`}</p><div className="calorie-track"><span style={{ width: `${Math.min(summary.totals.calories / activeTarget.calories * 100, 100)}%` }} /></div><div className="track-labels"><span>0</span><span>{activeTarget.calories.toLocaleString()} goal</span></div><div className="calorie-panel-foot"><div className="little-avatar">M</div><span>{summary.mealCount} {summary.mealCount === 1 ? 'meal' : 'meals'} added today</span><Link to="/targets">Edit goal <ArrowRight size={14} /></Link></div></article>
      <article className="macro-panel"><div className="section-topline"><div><p className="eyebrow">THE BIG PICTURE</p><h2>Your macros</h2></div><span className="date-chip"><TargetIcon size={14} /> Daily goals</span></div><div className="macro-list"><MacroProgress label="Protein" value={summary.totals.protein} goal={activeTarget.protein} color="#C6FF3D" /><MacroProgress label="Carbs" value={summary.totals.carbs} goal={activeTarget.carbs} color="#FFB020" /><MacroProgress label="Fat" value={summary.totals.fat} goal={activeTarget.fat} color="#FF4FA3" /></div><Link to="/targets" className="panel-link">View your daily goals <ArrowRight size={15} /></Link></article>
    </section>
    <section className="dashboard-bottom">
      <article className="surface-card week-panel"><div className="section-topline"><div><p className="eyebrow">ONE WEEK AT A TIME</p><h2>Your week, at a glance</h2></div><Link to="/analytics" className="small-link">See insights <ArrowRight size={15} /></Link></div><div className="week-chart">{currentWeek.map((day) => <div className="week-column" key={day.date}><div className="bar-wrap"><span className="goal-line" /><span className="week-bar" style={{ height: `${Math.max(4, Math.round(day.calories / maxCalories * 100))}%` }} title={`${day.calories} kcal`} /></div><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2)}</small></div>)}</div><div className="chart-caption"><span><i className="legend-dot" /> Calories logged</span><strong>{avg.toLocaleString()} <small>kcal/day average</small></strong></div></article>
      <article className="surface-card recent-panel"><div className="section-topline"><div><p className="eyebrow">FRESH FROM YOUR JOURNAL</p><h2>Recent meals</h2></div><Link to="/meals" className="small-link">All meals <ArrowRight size={15} /></Link></div>{mealList.length ? <div className="compact-meals">{mealList.slice(0, 3).map((meal) => <MealCard key={meal._id} meal={meal} />)}</div> : <div className="mini-empty"><Utensils size={20} /><span>No meals recorded today yet.</span></div>}</article>
    </section>
  </div>
}

export function MealsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [notice, setNotice] = useState('')
  const location = useLocation()
  const url = query.trim() ? `/meals/search?q=${encodeURIComponent(query.trim())}` : '/meals'
  const { data, loading, error, reload } = useApiData<Meal[]>(url)
  useEffect(() => {
    const success = (location.state as { success?: string } | null)?.success
    if (success) setNotice(success)
  }, [location.state])
  const remove = async (meal: Meal) => {
    if (!window.confirm(`Delete “${meal.name}” from your journal? This cannot be undone.`)) return
    try {
      await api.delete(`/meals/${meal._id}`)
      setNotice(`${meal.name} was deleted.`)
      await reload()
    } catch (requestError) { setNotice(errorMessage(requestError)) }
  }
  const favorite = async (meal: Meal) => {
    try { await api.patch(`/meals/${meal._id}/favorite`); await reload() }
    catch (requestError) { setNotice(errorMessage(requestError)) }
  }
  const meals = data || []
  const totals = useMemo(() => sumMeals(meals), [meals])
  const submitSearch = (event: React.FormEvent) => { event.preventDefault(); setSearchParams(query ? { q: query } : {}) }
  return <div className="page-stack">
    <PageHeading eyebrow="YOUR PERSONAL FOOD JOURNAL" title="The meals that make you." description="Every entry adds a little more context to your nutrition story." action={<Link to="/meals/new" className="button button-primary"><Plus size={17} /> Add meal</Link>} />
    {notice && <Feedback tone={notice.includes('deleted') ? 'success' : 'error'}>{notice}</Feedback>}
    <div className="journal-summary"><div><span>MEALS RECORDED</span><strong>{loading ? '—' : meals.length}</strong></div><div><span>TOTAL ENERGY</span><strong>{loading ? '—' : totals.calories.toLocaleString()} <small>kcal</small></strong></div><div><span>PROTEIN LOGGED</span><strong>{loading ? '—' : Math.round(totals.protein)} <small>g</small></strong></div><form className="search-box" onSubmit={submitSearch}><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your journal" aria-label="Search meals" /><button type="submit">Search</button></form></div>
    {loading ? <Loading label="Loading your meal journal" /> : error ? <ErrorState message={error} retry={() => void reload()} /> : meals.length === 0 ? <EmptyState title={query ? 'No meals match that search' : 'Your journal is ready'} message={query ? 'Try another meal name, note, or category.' : 'Once you log a meal, you’ll find it here alongside its nutrition details.'} /> : <div className="journal-list">{meals.map((meal) => <MealCard key={meal._id} meal={meal} onDelete={remove} onFavorite={favorite} />)}</div>}
  </div>
}

export function NewMealPage() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const submit = async (values: MealFormValues) => {
    setSaving(true); setError('')
    try { await api.post('/meals', mealUrl(values)); navigate('/meals', { state: { success: 'Meal added to your journal.' } }) }
    catch (requestError) { setError(errorMessage(requestError)); setSaving(false) }
  }
  return <div className="page-stack narrow-page"><PageHeading eyebrow="ADD TO YOUR JOURNAL" title="Log a meal." description="A useful estimate is better than a perfect guess." />{error && <Feedback tone="error">{error}</Feedback>}<MealForm onSubmit={submit} saving={saving} submitLabel="Save meal" /></div>
}

export function MealDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const meal = useApiData<Meal>(`/meals/${id}`)
  const progress = useApiData<{ target: Totals | null; progress: Totals | null }>(`/meals/${id}/goal-progress`)
  if (meal.loading || progress.loading) return <Loading />
  if (meal.error || progress.error) return <ErrorState message={meal.error || progress.error} retry={() => { void meal.reload(); void progress.reload() }} />
  const item = meal.data!
  const goalData = progress.data!
  const success = (location.state as { success?: string } | null)?.success
  return <div className="page-stack narrow-page">{success && <Feedback>{success}</Feedback>}<PageHeading eyebrow="MEAL DETAILS" title={item.name} description={`${item.category} · ${formatDate(item.loggedAt, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`} action={<Link to={`/meals/${item._id}/edit`} className="button button-ghost"><Pencil size={16} /> Edit meal</Link>} /><article className="detail-card"><div className="detail-calories">{item.calories.toLocaleString()} <span>kcal</span></div><div className="detail-macros">{[['Protein', item.protein, '#C6FF3D'], ['Carbs', item.carbs, '#FFB020'], ['Fat', item.fat, '#FF4FA3']].map(([label, amount, color]) => <div key={String(label)}><i style={{ backgroundColor: String(color) }} /><span>{label}</span><strong>{amount}g</strong></div>)}</div><div className="detail-meta"><span><Clock3 size={15} /> {new Date(item.loggedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span><span className={`category-pill ${item.category}`}>{item.category}</span></div>{item.notes && <div className="notes-block"><span>NOTES</span><p>{item.notes}</p></div>}<div className="goal-compare"><h3>One meal, in context</h3><p>{goalData.target ? `${item.calories.toLocaleString()} calories is ${goalData.progress?.calories ?? 0}% of your daily energy goal.` : 'Set a daily goal to compare this meal with your nutrition plan.'}</p><Link to="/targets" className="inline-link">Your daily goals <ArrowRight size={14} /></Link></div></article><Link to="/meals" className="back-link"><ChevronLeft size={16} /> Back to journal</Link></div>
}

export function EditMealPage() {
  const { id = '' } = useParams()
  const meal = useApiData<Meal>(`/meals/${id}`)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const submit = async (values: MealFormValues) => {
    setSaving(true); setError('')
    try { await api.patch(`/meals/${id}`, mealUrl(values)); navigate(`/meals/${id}`, { state: { success: 'Meal updated successfully.' } }) }
    catch (requestError) { setError(errorMessage(requestError)); setSaving(false) }
  }
  if (meal.loading) return <Loading label="Loading this meal" />
  if (meal.error || !meal.data) return <ErrorState message={meal.error || 'Meal not found'} retry={() => void meal.reload()} />
  return <div className="page-stack narrow-page"><PageHeading eyebrow="UPDATE YOUR JOURNAL" title="Edit this meal." description="Adjust your details or nutrition estimate." />{error && <Feedback tone="error">{error}</Feedback>}<MealForm initial={meal.data} onSubmit={submit} saving={saving} submitLabel="Save changes" /></div>
}

export function AnalyticsPage() {
  const weekly = useApiData<WeeklyDay[]>('/meals/stats/weekly')
  const categories = useApiData<{ category: string; calories: number; meals: number; protein: number }[]>('/meals/stats/categories')
  if (weekly.loading || categories.loading) return <Loading label="Finding your nutrition patterns" />
  const message = weekly.error || categories.error
  if (message) return <ErrorState message={message} retry={() => { void weekly.reload(); void categories.reload() }} />
  const days = weekly.data || []
  const cats = categories.data || []
  const average = days.length ? Math.round(days.reduce((sum, day) => sum + day.calories, 0) / days.length) : 0
  const activeDays = days.filter((day) => day.meals > 0).length
  const highDay = days.reduce<WeeklyDay | null>((best, day) => !best || day.calories > best.calories ? day : best, null)
  const chartMax = Math.max(1, ...days.map((day) => day.calories))
  const colors = ['#C6FF3D', '#FFB020', '#FF4FA3', '#d7a6e8']
  return <div className="page-stack"><PageHeading eyebrow="PATTERNS, NOT PRESSURE" title="A week in perspective." description="Your last seven days, thoughtfully summed up." action={<span className="date-chip"><TrendingUp size={15} /> Last 7 days</span>} />
    <div className="stats-grid"><StatCard label="DAILY AVERAGE" value={average.toLocaleString()} detail="calories per day, this week" icon={<ActivityIcon />} /><StatCard label="LOGGING RHYTHM" value={`${activeDays} / 7`} detail="days with at least one meal" icon={<CalendarDays size={16} />} tone="stat-peach" /><StatCard label="HIGHEST DAY" value={highDay ? highDay.calories.toLocaleString() : '0'} detail={highDay ? formatDate(highDay.date, { weekday: 'long' }) : 'No meals logged yet'} icon={<ArrowUpRight size={16} />} tone="stat-blue" /></div>
    <div className="analytics-grid"><article className="surface-card analytics-chart-card"><div className="section-topline"><div><p className="eyebrow">ENERGY THROUGH THE WEEK</p><h2>Calories, day by day</h2></div><div className="chart-legend"><i /> Logged</div></div>{days.every((day) => !day.meals) ? <div className="inline-empty">Log a few meals to reveal your weekly rhythm.</div> : <div className="large-chart">{days.map((day) => <div className="large-chart-column" key={day.date}><div className="large-bar-area"><span className="large-bar" style={{ height: `${Math.max(day.calories ? 5 : 0, day.calories / chartMax * 100)}%` }} /><span className="large-chart-value">{day.calories || ''}</span></div><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</small></div>)}</div>}<div className="analytics-note"><Sparkles size={16} /><span>Numbers help reveal patterns; they don’t measure your worth.</span></div></article>
    <article className="surface-card category-card"><div className="section-topline"><div><p className="eyebrow">WHERE IT ADDS UP</p><h2>Meal mix</h2></div></div>{cats.length ? cats.map((category, index) => <div className="category-row" key={category.category}><span className="category-color" style={{ backgroundColor: colors[index % colors.length] }} /><span className="category-row-name">{category.category}<small>{category.meals} {category.meals === 1 ? 'meal' : 'meals'}</small></span><strong>{category.calories.toLocaleString()} <small>kcal</small></strong></div>) : <div className="inline-empty">Meal categories will show here as you log food.</div>}<Link to="/meals" className="panel-link">Explore your journal <ArrowRight size={15} /></Link></article></div>
  </div>
}

function ActivityIcon() { return <TrendingUp size={16} /> }

export function CalendarPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const data = useApiData<{ date: string; calories: number; meals: number }[]>(`/meals/stats/calendar?month=${month}&year=${year}`)
  const days = data.data || []
  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  const offset = (monthStart.getUTCDay() + 6) % 7
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const byDate = new Map(days.map((day) => [Number(day.date.slice(-2)), day]))
  const shiftMonth = (delta: number) => { const date = new Date(Date.UTC(year, month - 1 + delta, 1)); setMonth(date.getUTCMonth() + 1); setYear(date.getUTCFullYear()) }
  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })
  if (data.loading) return <Loading label="Loading your food calendar" />
  if (data.error) return <ErrorState message={data.error} retry={() => void data.reload()} />
  const loggedDays = days.filter((day) => day.meals > 0).length
  const totalCalories = days.reduce((sum, day) => sum + day.calories, 0)
  return <div className="page-stack"><PageHeading eyebrow="YOUR JOURNAL, OVER TIME" title="A month of moments." description="See when you logged meals and how your days add up." />
    <section className="calendar-layout"><article className="surface-card calendar-card"><div className="calendar-head"><div><p className="eyebrow">MONTH VIEW</p><h2>{monthName}</h2></div><div className="calendar-controls"><button className="icon-button" aria-label="Previous month" onClick={() => shiftMonth(-1)}><ChevronLeft size={17} /></button><button className="icon-button" aria-label="Next month" onClick={() => shiftMonth(1)}><ChevronRight size={17} /></button></div></div><div className="calendar-grid">{['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}{Array.from({ length: offset }, (_, index) => <span className="calendar-cell empty" key={`blank-${index}`} />)}{Array.from({ length: totalDays }, (_, index) => { const dayNumber = index + 1; const day = byDate.get(dayNumber); const isToday = year === now.getFullYear() && month === now.getMonth() + 1 && dayNumber === now.getDate(); return <div className={`calendar-cell ${day?.meals ? 'has-entry' : ''} ${isToday ? 'is-today' : ''}`} key={dayNumber} title={day ? `${day.calories} kcal · ${day.meals} meals` : 'No entries'}><span>{dayNumber}</span>{day?.meals ? <small>{day.calories} kcal</small> : null}</div> })}</div><div className="calendar-legend"><span><i className="status-dot" /> Logged day</span><span><i className="today-ring" /> Today</span></div></article><aside className="calendar-aside"><div className="side-summary"><span className="summary-icon"><CalendarDays size={18} /></span><p>THIS MONTH</p><strong>{loggedDays}<small> / {totalDays}</small></strong><span>days with a meal logged</span></div><div className="side-summary side-summary-alt"><span className="summary-icon"><Utensils size={18} /></span><p>ENERGY RECORDED</p><strong>{totalCalories.toLocaleString()}</strong><span>calories across {loggedDays} logged days</span></div><Link to="/meals/new" className="button button-primary"><Plus size={16} /> Log a meal</Link></aside></section>
  </div>
}

const targetSchema = z.object({
  name: z.string().trim().min(2, 'Name this goal').max(48),
  calories: z.coerce.number().min(500).max(10000),
  protein: z.coerce.number().min(0).max(600),
  carbs: z.coerce.number().min(0).max(1200),
  fat: z.coerce.number().min(0).max(400),
})
type TargetFormValues = z.infer<typeof targetSchema>

export function TargetsPage() {
  const targets = useApiData<Target[]>('/targets')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.input<typeof targetSchema>, unknown, TargetFormValues>({
    resolver: zodResolver(targetSchema),
    defaultValues: { name: 'Everyday balance', calories: 2000, protein: 150, carbs: 250, fat: 65 },
  })
  const addTarget = async (values: TargetFormValues) => {
    setSaving(true); setError(''); setNotice('')
    try { await api.post('/targets', values); setNotice('Your new goal is ready. Activate it when you want to use it.'); reset(); await targets.reload() }
    catch (requestError) { setError(errorMessage(requestError)) }
    finally { setSaving(false) }
  }
  const activate = async (target: Target) => {
    try { await api.post(`/targets/${target._id}/activate`); setNotice(`${target.name} is now your active goal.`); setError(''); await targets.reload() }
    catch (requestError) { setError(errorMessage(requestError)) }
  }
  const remove = async (target: Target) => {
    if (!window.confirm(`Delete the “${target.name}” goal?`)) return
    try { await api.delete(`/targets/${target._id}`); setNotice('Goal deleted.'); setError(''); await targets.reload() }
    catch (requestError) { setError(errorMessage(requestError)) }
  }
  const field = (name: keyof TargetFormValues, label: string, unit: string) => <label className="form-field"><span>{label} <small>({unit})</small></span><input type="number" step="any" {...register(name)} />{errors[name] && <em className="field-error">{errors[name]?.message}</em>}</label>
  if (targets.loading) return <Loading label="Loading your nutrition goals" />
  if (targets.error) return <ErrorState message={targets.error} retry={() => void targets.reload()} />
  return <div className="page-stack"><PageHeading eyebrow="A GUIDE, NOT A RULEBOOK" title="Goals that fit your life." description="Set a daily reference point that supports your routine. You can change it any time." />
    {notice && <Feedback>{notice}</Feedback>}{error && <Feedback tone="error">{error}</Feedback>}
    <div className="targets-layout"><section className="goals-list"><h2>Saved goals <span>{targets.data?.length || 0}</span></h2>{targets.data?.length ? targets.data.map((target) => <article className={`goal-card ${target.active ? 'goal-active' : ''}`} key={target._id}><div className="goal-card-top"><div><span className={target.active ? 'active-label' : 'saved-label'}>{target.active ? <><Check size={12} /> CURRENT GOAL</> : 'SAVED PLAN'}</span><h3>{target.name}</h3></div>{!target.active && <button className="icon-button remove-button" aria-label={`Delete ${target.name}`} onClick={() => void remove(target)}><Trash2 size={16} /></button>}</div><div className="goal-values">{[['Energy', target.calories, 'kcal'], ['Protein', target.protein, 'g'], ['Carbs', target.carbs, 'g'], ['Fat', target.fat, 'g']].map(([label, value, unit]) => <div key={String(label)}><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>)}</div>{!target.active && <button className="button button-ghost activate-button" onClick={() => void activate(target)}>Make this my daily goal <ArrowRight size={15} /></button>}</article>) : <div className="inline-empty">No goals saved yet. Create one to start tracking your progress.</div>}</section>
      <form className="form-card target-create" onSubmit={handleSubmit(addTarget)}><div className="form-section-title"><span><TargetIcon size={17} /></span><div><strong>Create a nutrition goal</strong><small>Your target is a compass, not a test.</small></div></div><label className="form-field"><span>Goal name</span><input {...register('name')} placeholder="e.g. Training day" />{errors.name && <em className="field-error">{errors.name.message}</em>}</label><div className="form-grid form-grid-two">{field('calories', 'Calories', 'kcal')}{field('protein', 'Protein', 'g')}{field('carbs', 'Carbs', 'g')}{field('fat', 'Fat', 'g')}</div><button className="button button-primary full-width" disabled={saving}><Plus size={16} />{saving ? 'Saving goal…' : 'Save new goal'}</button></form></div>
  </div>
}

export function FoodsPage() {
  const foods = useApiData<FoodInsight[]>('/meals/stats/foods')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const filtered = useMemo(() => (foods.data || []).filter((food) => food.name.toLowerCase().includes(query.trim().toLowerCase())), [foods.data, query])
  const repeat = async (food: FoodInsight) => {
    try { const response = await api.get<{ data: Meal[] }>(`/meals/search?q=${encodeURIComponent(food.name)}`); const match = response.data.data.find((meal) => meal.name.toLowerCase() === food.name.toLowerCase()); if (!match) throw new Error('This meal is no longer in your journal.'); await api.post(`/meals/${match._id}/duplicate`); setNotice(`${food.name} was added again with its last nutrition estimate.`); await foods.reload() }
    catch (requestError) { setNotice(errorMessage(requestError)) }
  }
  if (foods.loading) return <Loading label="Summarizing your foods" />
  if (foods.error) return <ErrorState message={foods.error} retry={() => void foods.reload()} />
  return <div className="page-stack"><PageHeading eyebrow="YOUR MOST-LOGGED MEALS" title="Food, at a glance." description="See average nutrition from repeated meals and use favorites as a quick reference." action={<div className="food-search"><Search size={16} /><input placeholder="Find a meal" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Find a meal" /></div>} />
    {notice && <Feedback tone={notice.includes('added') ? 'success' : 'error'}>{notice}</Feedback>}
    {filtered.length ? <div className="food-grid">{filtered.map((food) => <article className="food-card" key={food.id}><div className="food-card-top"><span className="food-icon"><Utensils size={17} /></span><span className="repeat-count"><Heart size={13} /> {food.entries} {food.entries === 1 ? 'entry' : 'entries'}</span></div><h3>{food.name}</h3><div className="food-calories">{food.calories.toLocaleString()} <small>kcal average</small></div><div className="food-macros"><span><i className="protein-dot" />{food.protein}g protein</span><span><i className="carb-dot" />{food.carbs}g carbs</span><span><i className="fat-dot" />{food.fat}g fat</span></div><button className="repeat-button" onClick={() => void repeat(food)}><Copy size={15} /> Log this again</button></article>)}</div> : <EmptyState title={query ? 'No foods found' : 'Your food insights are on their way'} message={query ? 'Try another search term.' : 'Log the same meal more than once to see average nutrition here.'} />}
  </div>
}
