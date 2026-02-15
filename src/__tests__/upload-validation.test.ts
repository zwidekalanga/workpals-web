import { describe, expect, it } from 'vitest'
import { validateFile } from '@/lib/upload'

function makeFile(name: string, size: number, type = ''): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type })
}

describe('validateFile', () => {
  it('accepts a valid PDF', () => {
    const file = makeFile('resume.pdf', 1024, 'application/pdf')
    expect(validateFile(file)).toEqual({ valid: true })
  })

  it('accepts a valid DOCX', () => {
    const file = makeFile(
      'resume.docx',
      1024,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    expect(validateFile(file)).toEqual({ valid: true })
  })

  it('accepts a valid TXT', () => {
    const file = makeFile('resume.txt', 1024, 'text/plain')
    expect(validateFile(file)).toEqual({ valid: true })
  })

  it('accepts by extension when MIME type is empty', () => {
    const file = makeFile('resume.pdf', 1024, '')
    expect(validateFile(file)).toEqual({ valid: true })
  })

  it('accepts .docx by extension even with wrong MIME', () => {
    const file = makeFile('doc.docx', 1024, 'application/octet-stream')
    expect(validateFile(file)).toEqual({ valid: true })
  })

  it('rejects unsupported file types', () => {
    const file = makeFile('image.png', 1024, 'image/png')
    const result = validateFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/PDF, DOCX, and TXT/)
  })

  it('rejects .exe files', () => {
    const file = makeFile('virus.exe', 1024, 'application/x-msdownload')
    const result = validateFile(file)
    expect(result.valid).toBe(false)
  })

  it('rejects empty files (0 bytes)', () => {
    const file = makeFile('empty.pdf', 0, 'application/pdf')
    const result = validateFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/empty/)
  })

  it('rejects files over 10 MB', () => {
    const file = makeFile('huge.pdf', 11 * 1024 * 1024, 'application/pdf')
    const result = validateFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/10 MB/)
  })

  it('accepts files exactly at 10 MB', () => {
    const file = makeFile('big.pdf', 10 * 1024 * 1024, 'application/pdf')
    expect(validateFile(file)).toEqual({ valid: true })
  })
})
