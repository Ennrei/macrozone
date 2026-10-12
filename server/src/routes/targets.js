const express = require('express')
const NutritionTarget = require('../models/NutritionTarget')
const Meal = require('../models/Meal')
const { httpError, requireId, localDayBounds } = require('../utils/http')

const router = express.Router()

router.get('/', async (_req, res) => {
  const targets = await NutritionTarget.find().sort({ active: -1, effectiveFrom: -1 }).lean()
  res.json({ data: targets, count: targets.length })
})

router.get('/current', async (_req, res) => {
  const target = await NutritionTarget.findOne({ active: true }).sort({ effectiveFrom: -1 }).lean()
  if (!target) throw httpError(404, 'No active nutrition target')
  res.json({ data: target })
})

router.get('/current/summary', async (_req, res) => {
  const target = await NutritionTarget.findOne({ active: true }).sort({ effectiveFrom: -1 }).lean()
  const { start, end } = localDayBounds()
  const meals = await Meal.find({ loggedAt: { $gte: start, $lt: end } }).lean()
  const totals = meals.reduce((sum, meal) => ({
    calories: sum.calories + meal.calories,
    protein: sum.protein + meal.protein,
    carbs: sum.carbs + meal.carbs,
    fat: sum.fat + meal.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
  res.json({
    data: {
      target,
      totals,
      percentages: target ? Object.fromEntries(['calories', 'protein', 'carbs', 'fat'].map((key) => [key, target[key] ? Math.round(totals[key] / target[key] * 100) : 0])) : null,
    },
  })
})

router.post('/', async (req, res) => {
  if (req.body.clientId) {
    const { clientId, active: _active, ...fields } = req.body
    const target = await NutritionTarget.findOneAndUpdate(
      { clientId },
      { $set: fields, $setOnInsert: { active: false } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    )
    res.status(200).json({ data: target, message: 'Nutrition target synchronized' })
    return
  }
  const target = await NutritionTarget.create({ ...req.body, active: false })
  res.status(201).json({ data: target, message: 'Target created; activate it to use it for progress' })
})

router.get('/:id/progress', async (req, res) => {
  requireId(NutritionTarget, req.params.id, 'Target')
  const target = await NutritionTarget.findById(req.params.id).lean()
  if (!target) throw httpError(404, 'Nutrition target not found')
  const { start, end } = localDayBounds()
  const meals = await Meal.find({ loggedAt: { $gte: start, $lt: end } }).lean()
  const consumed = meals.reduce((totals, meal) => ({
    calories: totals.calories + meal.calories,
    protein: totals.protein + meal.protein,
    carbs: totals.carbs + meal.carbs,
    fat: totals.fat + meal.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
  const progress = Object.fromEntries(['calories', 'protein', 'carbs', 'fat'].map((key) => [
    key,
    { consumed: consumed[key], target: target[key], remaining: Math.max(target[key] - consumed[key], 0), percent: target[key] ? Math.round(consumed[key] / target[key] * 100) : 0 },
  ]))
  res.json({ data: progress })
})

router.post('/:id/activate', async (req, res) => {
  requireId(NutritionTarget, req.params.id, 'Target')
  const target = await NutritionTarget.findById(req.params.id)
  if (!target) throw httpError(404, 'Nutrition target not found')
  await NutritionTarget.updateMany({ active: true }, { $set: { active: false } })
  target.active = true
  await target.save()
  res.json({ data: target, message: 'Nutrition target activated' })
})

router.get('/:id', async (req, res) => {
  requireId(NutritionTarget, req.params.id, 'Target')
  const target = await NutritionTarget.findById(req.params.id).lean()
  if (!target) throw httpError(404, 'Nutrition target not found')
  res.json({ data: target })
})

router.patch('/:id', async (req, res) => {
  requireId(NutritionTarget, req.params.id, 'Target')
  const target = await NutritionTarget.findById(req.params.id)
  if (!target) throw httpError(404, 'Nutrition target not found')
  target.set(req.body)
  await target.validate()
  if (target.active) {
    await NutritionTarget.updateMany({ _id: { $ne: target._id }, active: true }, { $set: { active: false } })
  }
  await target.save()
  res.json({ data: target, message: 'Nutrition target updated' })
})

router.delete('/:id', async (req, res) => {
  requireId(NutritionTarget, req.params.id, 'Target')
  const target = await NutritionTarget.findById(req.params.id)
  if (!target) throw httpError(404, 'Nutrition target not found')
  if (target.active) throw httpError(400, 'Activate another target before deleting the active one')
  await Meal.updateMany({ target: target._id }, { $set: { target: null } })
  await target.deleteOne()
  res.json({ data: { id: target._id }, message: 'Nutrition target deleted' })
})

module.exports = router
