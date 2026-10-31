/**
 * Dates are stored as plain `YYYY-MM-DD` strings (a calendar day, no time zone)
 * and shown in the Jalali (Shamsi) calendar.
 */
import { jalaaliMonthLength, toGregorian, toJalaali } from 'jalaali-js'

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
]

/** The Iranian week starts on Saturday. */
export const WEEK_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']
export const WEEK_DAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

export function fa(value: string | number): string {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)])
}

export function toLatinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
}

/** `2026-10-31` → local Date at midnight. */
export function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

export function todayKey(): string {
  return dayKey(new Date())
}

export interface JalaliParts {
  jy: number
  jm: number
  jd: number
}

export function toJalali(date: Date): JalaliParts {
  return toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

export function fromJalali(jy: number, jm: number, jd: number): Date {
  const g = toGregorian(jy, jm, jd)
  return new Date(g.gy, g.gm - 1, g.gd)
}

export function jalaliMonthLength(jy: number, jm: number): number {
  return jalaaliMonthLength(jy, jm)
}

function asDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  return parseDay(value) ?? (Number.isNaN(new Date(value).getTime()) ? null : new Date(value))
}

/** `۱۴۰۵/۰۸/۰۹` */
export function formatDate(value: string | Date | null | undefined): string {
  const d = asDate(value)
  if (!d) return '—'
  const p = toJalali(d)
  return fa(`${p.jy}/${String(p.jm).padStart(2, '0')}/${String(p.jd).padStart(2, '0')}`)
}

/** `۹ آبان ۱۴۰۵` */
export function formatDateLong(value: string | Date | null | undefined): string {
  const d = asDate(value)
  if (!d) return '—'
  const p = toJalali(d)
  return fa(`${p.jd} ${JALALI_MONTHS[p.jm - 1]} ${p.jy}`)
}

/** `۹ آبان` */
export function formatDayMonth(value: string | Date | null | undefined): string {
  const d = asDate(value)
  if (!d) return '—'
  const p = toJalali(d)
  return fa(`${p.jd} ${JALALI_MONTHS[p.jm - 1]}`)
}

/** `شنبه ۹ آبان ۱۴۰۵` */
export function formatWeekdayDate(value: string | Date | null | undefined): string {
  const d = asDate(value)
  if (!d) return '—'
  return `${WEEK_DAYS[weekdayIndex(d)]} ${formatDateLong(d)}`
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return ''
  return fa(value.slice(0, 5))
}

/** Saturday = 0 … Friday = 6. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 1) % 7
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function startOfWeek(date: Date): Date {
  const d = addDays(date, -weekdayIndex(date))
  d.setHours(0, 0, 0, 0)
  return d
}

export function addJalaliMonths(date: Date, delta: number): Date {
  const j = toJalali(date)
  let jy = j.jy
  let jm = j.jm + delta
  while (jm > 12) {
    jm -= 12
    jy += 1
  }
  while (jm < 1) {
    jm += 12
    jy -= 1
  }
  return fromJalali(jy, jm, Math.min(j.jd, jalaliMonthLength(jy, jm)))
}

export function jalaliMonthLabel(date: Date): string {
  const j = toJalali(date)
  return fa(`${JALALI_MONTHS[j.jm - 1]} ${j.jy}`)
}

export interface GridCell {
  date: Date
  key: string
  inMonth: boolean
}

/** A calendar grid (Saturday first) for the Jalali month containing `date`. */
export function jalaliMonthGrid(date: Date): GridCell[][] {
  const j = toJalali(date)
  const first = fromJalali(j.jy, j.jm, 1)
  const length = jalaliMonthLength(j.jy, j.jm)
  const lead = weekdayIndex(first)
  const cells: GridCell[] = []
  const push = (d: Date, inMonth: boolean) => cells.push({ date: d, key: dayKey(d), inMonth })

  for (let i = lead; i > 0; i--) push(addDays(first, -i), false)
  for (let i = 0; i < length; i++) push(addDays(first, i), true)
  while (cells.length % 7 !== 0) push(addDays(cells[cells.length - 1].date, 1), false)

  const rows: GridCell[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

export function daysBetween(a: string, b: string): number {
  const da = parseDay(a)
  const db = parseDay(b)
  if (!da || !db) return 0
  return Math.round((db.getTime() - da.getTime()) / 86_400_000)
}

export function formatRelative(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const diff = now.getTime() - d.getTime()
  const minutes = Math.round(Math.abs(diff) / 60_000)
  if (minutes < 1) return 'همین حالا'
  if (minutes < 60) return `${fa(minutes)} دقیقه پیش`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${fa(hours)} ساعت پیش`
  const days = Math.round(hours / 24)
  if (days < 30) return `${fa(days)} روز پیش`
  return formatDate(d)
}

/** Human description of how far away a due day is: `۳ روز مانده`, `۲ روز گذشته`, `امروز`. */
export function dueLabel(endDate: string, today = todayKey()): string {
  const n = daysBetween(today, endDate)
  if (n === 0) return 'امروز'
  if (n === 1) return 'فردا'
  if (n > 0) return `${fa(n)} روز مانده`
  return `${fa(-n)} روز گذشته`
}
