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

// GET /api/v1/weather — WeatherController#show merges location_label onto
// OpenMeteoClient#forecast's { today, week } payload. location_label always
// comes from User#weather_location, which falls back to 'Your location' or
// the Greenwich default label — never nil.
export const weatherResponseSchema = z.object({
  today: currentWeatherSchema,
  week: z.array(forecastDaySchema),
  location_label: z.string(),
})

export type WeatherResponse = z.infer<typeof weatherResponseSchema>
