import { z } from 'zod'

export const forecastDaySchema = z.object({
  date: z.string(),
  scheme: z.string(),
  icon: z.string(),
  icon_name: z.string(),
  label: z.string(),
  temperature: z.number().nullable(),
})

export type ForecastDay = z.infer<typeof forecastDaySchema>

// OpenMeteoClient#next_day_payload — nested inside currentWeatherSchema,
// same field set as a forecast day minus `date` plus `rain_probability`.
const nextDayWeatherSchema = z.object({
  label: z.string(),
  icon: z.string(),
  icon_name: z.string(),
  scheme: z.string(),
  temperature: z.number().nullable(),
  rain_probability: z.number().nullable(),
})

export const currentWeatherSchema = z.object({
  scheme: z.string(),
  icon: z.string(),
  icon_name: z.string(),
  label: z.string(),
  temperature: z.number().nullable(),
  detail: z.string(),
  overnight_low: z.number().nullable(),
  rain_probability: z.number().nullable(),
  next_day: nextDayWeatherSchema,
  advice: z.string(),
})

export type CurrentWeather = z.infer<typeof currentWeatherSchema>
