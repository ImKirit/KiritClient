import { defineConfig } from 'vitest/config'

/**
 * Tests laufen gegen den Main-Prozess-Code (Dateioperationen, Instanz-Logik).
 * `electron` wird in den Testdateien gemockt — hier läuft kein Electron.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true
  }
})
