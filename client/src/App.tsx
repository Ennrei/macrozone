import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import {
  AnalyticsPage,
  CalendarPage,
  DashboardPage,
  EditMealPage,
  FoodsPage,
  LandingPage,
  MealDetailPage,
  MealsPage,
  NewMealPage,
  TargetsPage,
} from './pages'

export default function App() {
  return <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route element={<AppLayout />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/meals" element={<MealsPage />} />
      <Route path="/meals/new" element={<NewMealPage />} />
      <Route path="/meals/:id" element={<MealDetailPage />} />
      <Route path="/meals/:id/edit" element={<EditMealPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/targets" element={<TargetsPage />} />
      <Route path="/foods" element={<FoodsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}
