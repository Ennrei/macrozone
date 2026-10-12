import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 12000,
})

export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || 'Could not reach the API.'
  }
  return error instanceof Error ? error.message : 'Something went wrong.'
}

export type Meal = {
  _id: string
  name: string
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories: number
  protein: number
  carbs: number
  fat: number
  loggedAt: string
  notes?: string
  favorite?: boolean
}

export type Target = {
  _id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  active: boolean
}

export type Totals = { calories: number; protein: number; carbs: number; fat: number }
