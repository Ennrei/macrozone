const mongoose = require('mongoose')

const mealSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    category: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
      default: 'snack',
    },
    calories: { type: Number, required: true, min: 0, max: 10000 },
    protein: { type: Number, default: 0, min: 0, max: 600 },
    carbs: { type: Number, default: 0, min: 0, max: 1200 },
    fat: { type: Number, default: 0, min: 0, max: 400 },
    loggedAt: { type: Date, default: Date.now, required: true },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    favorite: { type: Boolean, default: false },
    target: { type: mongoose.Schema.Types.ObjectId, ref: 'NutritionTarget', default: null },
    clientId: { type: String, trim: true, maxlength: 100, unique: true, sparse: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Meal', mealSchema)
