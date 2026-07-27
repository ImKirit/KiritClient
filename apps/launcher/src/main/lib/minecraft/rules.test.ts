import { describe, it, expect, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '' } }))

const { rulesAllow, resolveArguments, substitute, currentOsName } = await import('./rules')

/**
 * Diese Tests halten die beiden Fehler fest, an denen der alte Client scheiterte:
 * hartkodiertes Windows und übersprungene Feature-Regeln (→ Auflösung wirkungslos).
 */
describe('Mojang-Regeln', () => {
  const os = currentOsName()
  const other = os === 'windows' ? 'linux' : 'windows'

  it('erlaubt ohne Regeln', () => {
    expect(rulesAllow(undefined)).toBe(true)
    expect(rulesAllow([])).toBe(true)
  })

  it('erlaubt beim passenden Betriebssystem und sperrt beim fremden', () => {
    expect(rulesAllow([{ action: 'allow', os: { name: os } }])).toBe(true)
    expect(rulesAllow([{ action: 'allow', os: { name: other } }])).toBe(false)
  })

  it('wertet die letzte zutreffende Regel aus (allow mit Ausnahme)', () => {
    const rules = [
      { action: 'allow' as const },
      { action: 'disallow' as const, os: { name: os } }
    ]
    expect(rulesAllow(rules)).toBe(false)

    const forOther = [
      { action: 'allow' as const },
      { action: 'disallow' as const, os: { name: other } }
    ]
    expect(rulesAllow(forOther)).toBe(true)
  })

  it('prüft Feature-Regeln gegen die übergebenen Features', () => {
    const rules = [{ action: 'allow' as const, features: { has_custom_resolution: true } }]
    expect(rulesAllow(rules, { has_custom_resolution: true })).toBe(true)
    expect(rulesAllow(rules, {})).toBe(false)
  })
})

describe('Argumentauflösung', () => {
  it('übernimmt einfache Zeichenketten', () => {
    expect(resolveArguments(['--a', '--b'])).toEqual(['--a', '--b'])
  })

  it('nimmt --width/--height auf, wenn eine Auflösung gesetzt ist', () => {
    // Genau der Fall, den der alte Client übersprang.
    const entries = [
      {
        rules: [{ action: 'allow' as const, features: { has_custom_resolution: true } }],
        value: ['--width', '${resolution_width}', '--height', '${resolution_height}']
      }
    ]
    expect(resolveArguments(entries, { has_custom_resolution: true })).toEqual([
      '--width',
      '${resolution_width}',
      '--height',
      '${resolution_height}'
    ])
    expect(resolveArguments(entries, {})).toEqual([])
  })

  it('lässt Argumente für fremde Betriebssysteme weg', () => {
    const other = currentOsName() === 'windows' ? 'linux' : 'windows'
    const entries = [{ rules: [{ action: 'allow' as const, os: { name: other } }], value: '-XstartOnFirstThread' }]
    expect(resolveArguments(entries)).toEqual([])
  })
})

describe('Platzhalter', () => {
  it('ersetzt bekannte und lässt unbekannte stehen', () => {
    expect(substitute(['${a}', 'x${b}y', '${c}'], { a: '1', b: '2' })).toEqual([
      '1',
      'x2y',
      '${c}'
    ])
  })

  it('ersetzt mehrere Platzhalter in einem Argument', () => {
    expect(substitute(['${w}x${h}'], { w: '854', h: '480' })).toEqual(['854x480'])
  })
})
