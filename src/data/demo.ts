import { addDays, dayKey } from '../lib/date'
import { emptyDatabase, PALETTE, type Database, type Priority, type Status } from './types'

/** Sample workspace for demo mode, with dates around today. */
export function demoDatabase(): Database {
  const today = new Date()
  const d = (n: number) => dayKey(addDays(today, n))
  const now = new Date().toISOString()
  const db = emptyDatabase('تیم رصا (نمایشی)')

  const people: [string, string, string][] = [
    ['m1', 'سارا احمدی', 'مدیر پروژه'],
    ['m2', 'علی رضایی', 'برنامه‌نویس'],
    ['m3', 'مریم کریمی', 'طراح'],
    ['m4', 'رضا محمدی', 'کارشناس محتوا'],
    ['m5', 'نگار حسینی', 'کارشناس بازاریابی'],
  ]
  db.members = people.map(([id, name, title], i) => ({
    id,
    name,
    title,
    color: PALETTE[i],
    createdAt: now,
    ...(i === 0 ? { githubLogin: 'demo' } : {}),
  }))

  const project = (
    id: string,
    title: string,
    status: Status,
    start: number,
    end: number,
    assigneeIds: string[],
    color: string,
    description: string,
    priority: Priority = 'medium',
  ) => ({
    id,
    title,
    description,
    status,
    priority,
    startDate: d(start),
    endDate: d(end),
    assigneeIds,
    color,
    createdAt: now,
    updatedAt: now,
  })
  db.projects = [
    project('p1', 'وب‌سایت جدید شرکت', 'in_progress', -20, 25, ['m1', 'm2', 'm3'], PALETTE[0], 'طراحی و پیاده‌سازی نسخه جدید وب‌سایت', 'high'),
    project('p2', 'کمپین تبلیغاتی پاییز', 'todo', 5, 40, ['m4', 'm5'], PALETTE[2], 'برنامه‌ریزی و اجرای کمپین فصل پاییز'),
    project('p3', 'گزارش سالانه', 'done', -60, -10, ['m1', 'm4'], PALETTE[1], 'تهیه و انتشار گزارش عملکرد سال'),
  ]

  const task = (
    id: string,
    title: string,
    status: Status,
    start: number | null,
    end: number | null,
    assigneeIds: string[],
    projectId?: string,
    priority: Priority = 'medium',
  ) => ({
    id,
    title,
    status,
    priority,
    startDate: start === null ? undefined : d(start),
    endDate: end === null ? undefined : d(end),
    assigneeIds,
    projectId,
    checklist: [],
    createdAt: now,
    updatedAt: now,
    ...(status === 'done' ? { completedAt: now } : {}),
  })
  db.tasks = [
    task('t1', 'طراحی صفحه اصلی', 'done', -18, -8, ['m3'], 'p1'),
    task('t2', 'پیاده‌سازی فرم تماس', 'in_progress', -5, 3, ['m2'], 'p1', 'high'),
    task('t3', 'نوشتن متن صفحه درباره ما', 'in_progress', -3, 1, ['m4'], 'p1'),
    task('t4', 'تست روی موبایل', 'todo', 10, 15, ['m2', 'm3'], 'p1'),
    task('t5', 'راه‌اندازی دامنه و هاست', 'on_hold', -7, -1, ['m1'], 'p1', 'urgent'),
    task('t6', 'تعیین بودجه کمپین', 'todo', 5, 8, ['m5', 'm1'], 'p2', 'high'),
    task('t7', 'طراحی پوستر', 'todo', 9, 16, ['m3'], 'p2'),
    task('t8', 'جمع‌آوری آمار سال', 'done', -55, -40, ['m4'], 'p3'),
    task('t9', 'تمدید قرارداد اینترنت', 'todo', 0, 2, ['m1']),
    task('t10', 'آموزش ابزار جدید به تیم', 'todo', 6, 6, ['m2', 'm4', 'm5']),
    task('t11', 'مرتب‌سازی آرشیو اسناد', 'in_progress', -10, -2, ['m5']),
  ]
  db.tasks[1].checklist = [
    { id: 'c1', text: 'فیلدهای فرم', done: true },
    { id: 'c2', text: 'ارسال ایمیل', done: false },
    { id: 'c3', text: 'پیام موفقیت', done: false },
  ]

  db.events = [
    { id: 'e1', title: 'جلسه هفتگی تیم', date: d(1), startTime: '10:00', endTime: '11:00', location: 'اتاق جلسات', attendeeIds: ['m1', 'm2', 'm3', 'm4', 'm5'], color: PALETTE[4], createdAt: now, updatedAt: now },
    { id: 'e2', title: 'ارائه طرح وب‌سایت به مدیریت', date: d(4), startTime: '14:00', attendeeIds: ['m1', 'm3'], projectId: 'p1', color: PALETTE[0], createdAt: now, updatedAt: now },
    { id: 'e3', title: 'نمایشگاه صنعت', date: d(12), endDate: d(14), attendeeIds: ['m5', 'm4'], color: PALETTE[3], createdAt: now, updatedAt: now },
    { id: 'e4', title: 'جلسه هفتگی تیم', date: d(8), startTime: '10:00', endTime: '11:00', attendeeIds: ['m1', 'm2', 'm3', 'm4', 'm5'], color: PALETTE[4], createdAt: now, updatedAt: now },
  ]
  return db
}
