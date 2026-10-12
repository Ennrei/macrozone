const express = require('express')
const Meal = require('../models/Meal')
const NutritionTarget = require('../models/NutritionTarget')
const { httpError, requireId, localDayBounds } = require('../utils/http')

const router = express.Router()

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

router.get('/', async (req, res) => {
  const query = {}
  if (req.query.category) query.category = req.query.category
  if (req.query.favorite === 'true') query.favorite = true
  if (req.query.from || req.query.to) {
    query.loggedAt = {}
    if (req.query.from) query.loggedAt.$gte = new Date(req.query.from)
    if (req.query.to) query.loggedAt.$lte = new Date(req.query.to)
  }
  if (query.loggedAt && Object.values(query.loggedAt).some((date) => Number.isNaN(date.getTime()))) {
    throw httpError(400, 'Invalid date filter')
  }
  if (req.query.q) {
    const search = String(req.query.q).trim()
    if (search.length > 80) throw httpError(400, 'Search query must be 80 characters or fewer')
    query.name = { $regex: escapeRegex(search), $options: 'i' }
  }
  const meals = await Meal.find(query).sort({ loggedAt: -1 }).limit(250).lean()
  res.json({ data: meals, count: meals.length })
})

router.get('/search', async (req, res) => {
  const search = String(req.query.q || '').trim()
  if (!search) throw httpError(400, 'A search query is required')
  if (search.length > 80) throw httpError(400, 'Search query must be 80 characters or fewer')
  const safeSearch = escapeRegex(search)
  const meals = await Meal.find({
    $or: [
      { name: { $regex: safeSearch, $options: 'i' } },
      { notes: { $regex: safeSearch, $options: 'i' } },
      { category: { $regex: safeSearch, $options: 'i' } },
    ],
  }).sort({ loggedAt: -1 }).limit(50).lean()
  res.json({ data: meals, count: meals.length, query: search })
})

router.get('/stats/today', async (_req, res) => {
  const { start, end } = localDayBounds()
  const meals = await Meal.find({ loggedAt: { $gte: start, $lt: end } }).lean()
  const totals = meals.reduce((sum, meal) => ({
    calories: sum.calories + meal.calories,
    protein: sum.protein + meal.protein,
    carbs: sum.carbs + meal.carbs,
    fat: sum.fat + meal.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
  const target = await NutritionTarget.findOne({ active: true }).lean()
  res.json({
    data: {
      date: start.toISOString().slice(0, 10),
      totals,
      target: target ? { calories: target.calories, protein: target.protein, carbs: target.carbs, fat: target.fat } : null,
      remainingCalories: target ? Math.max(target.calories - totals.calories, 0) : null,
      mealCount: meals.length,
    },
  })
})

router.get('/stats/weekly', async (req, res) => {
  const end = new Date()
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 6)
  start.setUTCHours(0, 0, 0, 0)
  const meals = await Meal.find({ loggedAt: { $gte: start, $lte: end } }).lean()
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + index)
    return { date: date.toISOString().slice(0, 10), calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 }
  })
  meals.forEach((meal) => {
    const day = days.find((item) => item.date === new Date(meal.loggedAt).toISOString().slice(0, 10))
    if (day) {
      day.calories += meal.calories
      day.protein += meal.protein
      day.carbs += meal.carbs
      day.fat += meal.fat
      day.meals += 1
    }
  })
  const averageCalories = Math.round(days.reduce((sum, day) => sum + day.calories, 0) / 7)
  res.json({ data: days, averageCalories })
})

router.get('/stats/macros', async (req, res) => {
  const { start, end } = req.query.from || req.query.to
    ? { start: new Date(req.query.from || 0), end: new Date(req.query.to || Date.now()) }
    : localDayBounds()
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw httpError(400, 'Invalid date range')
  }
  const [result] = await Meal.aggregate([
    { $match: { loggedAt: { $gte: start, $lte: end } } },
    { $group: { _id: null, calories: { $sum: '$calories' }, protein: { $sum: '$protein' }, carbs: { $sum: '$carbs' }, fat: { $sum: '$fat' }, count: { $sum: 1 } } },
  ])
  res.json({ data: result || { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 } })
})

router.get('/stats/calendar', async (req, res) => {
  const month = Number(req.query.month || new Date().getUTCMonth() + 1)
  const year = Number(req.query.year || new Date().getUTCFullYear())
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2200) {
    throw httpError(400, 'A valid month and year are required')
  }
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))
  const days = await Meal.aggregate([
    { $match: { loggedAt: { $gte: start, $lt: end } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$loggedAt', timezone: 'UTC' } }, calories: { $sum: '$calories' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
  res.json({ data: days.map((day) => ({ date: day._id, calories: day.calories, meals: day.count })) })
})

router.get('/stats/categories', async (_req, res) => {
  const categories = await Meal.aggregate([
    { $group: { _id: '$category', calories: { $sum: '$calories' }, meals: { $sum: 1 }, protein: { $sum: '$protein' } } },
    { $sort: { calories: -1 } },
  ])
  res.json({ data: categories.map((item) => ({ category: item._id, calories: item.calories, meals: item.meals, protein: item.protein })) })
})

router.get('/stats/foods', async (_req, res) => {
  const foods = await Meal.aggregate([
    { $group: { _id: { $toLower: '$name' }, name: { $first: '$name' }, entries: { $sum: 1 }, calories: { $avg: '$calories' }, protein: { $avg: '$protein' }, carbs: { $avg: '$carbs' }, fat: { $avg: '$fat' } } },
    { $sort: { entries: -1, name: 1 } },
    { $limit: 30 },
  ])
  res.json({ data: foods.map(({ _id, ...food }) => ({ id: _id, ...Object.fromEntries(Object.entries(food).map(([key, value]) => [key, key === 'name' || key === 'entries' ? value : Math.round(value)])) })) })
})

router.post('/', async (req, res) => {
  const payload = { ...req.body }
  if (payload.target) {
    requireId(NutritionTarget, payload.target, 'Target')
    if (!await NutritionTarget.exists({ _id: payload.target })) throw httpError(404, 'Nutrition target not found')
  }
  if (payload.clientId) {
    const meal = await Meal.findOneAndUpdate(
      { clientId: payload.clientId },
      { $set: payload },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    )
    res.status(200).json({ data: meal, message: 'Meal synchronized' })
    return
  }
  const meal = await Meal.create(payload)
  res.status(201).json({ data: meal, message: 'Meal created' })
})

router.get('/:id/goal-progress', async (req, res) => {
  requireId(Meal, req.params.id, 'Meal')
  const meal = await Meal.findById(req.params.id).populate('target').lean()
  if (!meal) throw httpError(404, 'Meal not found')
  const target = meal.target || await NutritionTarget.findOne({ active: true }).lean()
  res.json({
    data: {
      mealId: meal._id,
      target: target ? { calories: target.calories, protein: target.protein, carbs: target.carbs, fat: target.fat } : null,
      progress: target ? {
        calories: target.calories ? Math.round(meal.calories / target.calories * 100) : 0,
        protein: target.protein ? Math.round(meal.protein / target.protein * 100) : 0,
        carbs: target.carbs ? Math.round(meal.carbs / target.carbs * 100) : 0,
        fat: target.fat ? Math.round(meal.fat / target.fat * 100) : 0,
      } : null,
    },
  })
})

router.post('/:id/duplicate', async (req, res) => {
  requireId(Meal, req.params.id, 'Meal')
  const original = await Meal.findById(req.params.id).lean()
  if (!original) throw httpError(404, 'Meal not found')
  const { _id, createdAt, updatedAt, ...copy } = original
  const meal = await Meal.create({ ...copy, loggedAt: new Date(), favorite: false })
  res.status(201).json({ data: meal, message: 'Meal duplicated for today' })
})

router.patch('/:id/favorite', async (req, res) => {
  requireId(Meal, req.params.id, 'Meal')
  const meal = await Meal.findById(req.params.id)
  if (!meal) throw httpError(404, 'Meal not found')
  meal.favorite = !meal.favorite
  await meal.save()
  res.json({ data: meal, message: meal.favorite ? 'Meal saved to favorites' : 'Meal removed from favorites' })
})

router.get('/:id', async (req, res) => {
  requireId(Meal, req.params.id, 'Meal')
  const meal = await Meal.findById(req.params.id).populate('target', 'name calories protein carbs fat').lean()
  if (!meal) throw httpError(404, 'Meal not found')
  res.json({ data: meal })
})

router.patch('/:id', async (req, res) => {
  requireId(Meal, req.params.id, 'Meal')
  if (Object.prototype.hasOwnProperty.call(req.body, 'target') && req.body.target !== null) {
    requireId(NutritionTarget, req.body.target, 'Target')
    if (!await NutritionTarget.exists({ _id: req.body.target })) throw httpError(404, 'Nutrition target not found')
  }
  const meal = await Meal.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!meal) throw httpError(404, 'Meal not found')
  res.json({ data: meal, message: 'Meal updated' })
})

router.delete('/clear', async (_req, res) => {
  const result = await Meal.deleteMany({})
  res.json({ data: { deleted: result.deletedCount }, message: 'Meal log cleared' })
})

router.delete('/:id', async (req, res) => {
  requireId(Meal, req.params.id, 'Meal')
  const meal = await Meal.findByIdAndDelete(req.params.id)
  if (!meal) throw httpError(404, 'Meal not found')
  res.json({ data: { id: meal._id }, message: 'Meal deleted' })
})

module.exports = router
