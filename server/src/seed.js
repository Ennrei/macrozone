require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const mongoose = require('mongoose')
const Meal = require('./models/Meal')
const NutritionTarget = require('./models/NutritionTarget')

const daysAgo = (days, hour) => {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  date.setUTCHours(hour, 0, 0, 0)
  return date
}

async function seed() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required to seed the database')
  await mongoose.connect(process.env.MONGO_URI)
  let target = await NutritionTarget.findOne()
  if (!target) {
    target = await NutritionTarget.create({
      name: 'Everyday balance',
      calories: 2000,
      protein: 150,
      carbs: 250,
      fat: 65,
      active: true,
      effectiveFrom: new Date(),
    })
    console.info('Created sample nutrition target')
  } else if (!await NutritionTarget.exists({ active: true })) {
    target.active = true
    await target.save()
  }
  if (await Meal.estimatedDocumentCount() === 0) {
    await Meal.insertMany([
      { name: 'Berry overnight oats', category: 'breakfast', calories: 420, protein: 24, carbs: 58, fat: 11, loggedAt: daysAgo(0, 8), target: target._id, notes: 'Rolled oats, Greek yogurt, blueberries' },
      { name: 'Avocado toast & eggs', category: 'breakfast', calories: 510, protein: 27, carbs: 42, fat: 26, loggedAt: daysAgo(0, 10), target: target._id },
      { name: 'Salmon grain bowl', category: 'lunch', calories: 640, protein: 42, carbs: 68, fat: 22, loggedAt: daysAgo(1, 12), target: target._id, favorite: true },
      { name: 'Crispy chickpea salad', category: 'lunch', calories: 480, protein: 21, carbs: 56, fat: 18, loggedAt: daysAgo(1, 13), target: target._id },
      { name: 'Lemon chicken & greens', category: 'dinner', calories: 590, protein: 51, carbs: 38, fat: 24, loggedAt: daysAgo(2, 18), target: target._id },
      { name: 'Peanut butter apple', category: 'snack', calories: 245, protein: 8, carbs: 29, fat: 12, loggedAt: daysAgo(2, 15), target: target._id },
      { name: 'Tofu soba stir-fry', category: 'dinner', calories: 560, protein: 32, carbs: 73, fat: 17, loggedAt: daysAgo(3, 19), target: target._id },
      { name: 'Cottage cheese bowl', category: 'snack', calories: 280, protein: 25, carbs: 24, fat: 10, loggedAt: daysAgo(4, 16), target: target._id },
      { name: 'Turkey & quinoa plate', category: 'lunch', calories: 615, protein: 46, carbs: 61, fat: 20, loggedAt: daysAgo(5, 12), target: target._id },
      { name: 'Dark chocolate squares', category: 'snack', calories: 170, protein: 3, carbs: 19, fat: 10, loggedAt: daysAgo(6, 20), target: target._id },
    ])
    console.info('Inserted sample meals')
  } else {
    console.info('Meals already exist; leaving existing data untouched')
  }
}

seed()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error('Seed failed:', error)
    await mongoose.disconnect()
    process.exitCode = 1
  })
