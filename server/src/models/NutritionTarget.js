const mongoose = require('mongoose')

const nutritionTargetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 48, unique: true },
    calories: { type: Number, required: true, min: 500, max: 10000 },
    protein: { type: Number, required: true, min: 0, max: 600 },
    carbs: { type: Number, required: true, min: 0, max: 1200 },
    fat: { type: Number, required: true, min: 0, max: 400 },
    effectiveFrom: { type: Date, default: Date.now },
    active: { type: Boolean, default: false },
    clientId: { type: String, trim: true, maxlength: 100, unique: true, sparse: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('NutritionTarget', nutritionTargetSchema)
