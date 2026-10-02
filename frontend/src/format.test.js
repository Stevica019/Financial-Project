import { expect, test } from 'vitest'
import { currencySymbol, dayLabel, formatDate, formatFlow, formatMoney, formatMonth } from './format'

test('formats exact decimal strings as money without float rounding', () => {
  expect(formatMoney('1250.50', 'EUR')).toBe('€1,250.50')
  expect(formatMoney('-0.10', 'EUR')).toBe('-€0.10')
  expect(formatMoney('12345678901234567.89', 'USD')).toBe('$12,345,678,901,234,567.89')
  expect(formatMoney('1234.56', 'RSD')).toBe('RSD\u00a01,234.56')
  expect(formatMoney('5.00', undefined)).toBe('5.00')
})

test('signs money flows by direction and leaves zero and neutral amounts unsigned', () => {
  expect(formatFlow('25.00', 'EUR', 'out')).toBe('-€25.00')
  expect(formatFlow('25.00', 'EUR', 'in')).toBe('+€25.00')
  expect(formatFlow('-25.00', 'EUR', 'in')).toBe('+€25.00')
  expect(formatFlow('0.00', 'EUR', 'in')).toBe('€0.00')
  expect(formatFlow('25.00', 'EUR', null)).toBe('€25.00')
  expect(currencySymbol('EUR')).toBe('€')
  expect(currencySymbol('CHF')).toBe('CHF')
})

test('labels days relative to the user\'s today and shows the year only when it differs', () => {
  expect(dayLabel('2026-03-01', '2026-03-01')).toBe('Today')
  expect(dayLabel('2026-02-28', '2026-03-01')).toBe('Yesterday')
  expect(dayLabel('2026-02-26', '2026-03-01')).toBe('Thu, Feb 26')
  expect(dayLabel('2025-12-31', '2026-01-02')).toBe('Wed, Dec 31, 2025')
  expect(formatDate('2026-01-01')).toBe('Jan 1, 2026')
  expect(formatMonth('2026-09')).toBe('September 2026')
})
