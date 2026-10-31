import { describe, expect, it } from 'vitest'
import { dayKey, formatDate, formatDateLong, fromJalali, jalaliMonthGrid, toJalali, weekdayIndex } from '../src/lib/date'

describe('Jalali dates', () => {
  it('converts known dates', () => {
    expect(toJalali(new Date(2026, 9, 31))).toEqual({ jy: 1405, jm: 8, jd: 9 })
    expect(dayKey(fromJalali(1405, 1, 1))).toBe('2026-03-21')
    expect(formatDate('2026-10-31')).toBe('۱۴۰۵/۰۸/۰۹')
    expect(formatDateLong('2026-10-31')).toBe('۹ آبان ۱۴۰۵')
  })

  it('starts weeks on Saturday', () => {
    expect(weekdayIndex(new Date(2026, 9, 31))).toBe(0) // Saturday
    expect(weekdayIndex(new Date(2026, 9, 30))).toBe(6) // Friday
  })

  it('builds a full month grid', () => {
    const grid = jalaliMonthGrid(new Date(2026, 9, 31))
    const inMonth = grid.flat().filter((c) => c.inMonth)
    expect(inMonth).toHaveLength(30) // Aban has 30 days
    expect(grid.every((row) => row.length === 7)).toBe(true)
    expect(weekdayIndex(grid[0][0].date)).toBe(0)
  })
})
