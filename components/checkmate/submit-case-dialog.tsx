'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useMemo, useState, type ChangeEvent, type FocusEvent, type FormEvent } from 'react'
import { CHECKMATE_LOCATIONS, type CheckmateLocation } from '~/data/checkmate/types'
import { submitCase, type SubmissionPayload } from './submit-case'
import styles from './checkmate-experience.module.css'

const LOCATION_NAMES: Record<CheckmateLocation, string> = {
  beijing: '北京',
  shanghai: '上海',
  guangzhou: '广州',
  shenyang: '沈阳',
  wuhan: '武汉',
}

const DEGREE_OPTIONS = ['Bachelor', 'Master', 'PhD'] as const
const STATUS_OPTIONS = ['Check', 'Approved', 'Issued', 'Refused'] as const

type FormState = {
  location: '' | CheckmateLocation
  degree: '' | (typeof DEGREE_OPTIONS)[number]
  major: string
  interviewDate: string
  status: '' | (typeof STATUS_OPTIONS)[number]
  endDate: string
  school: string
  note: string
}

const INITIAL_FORM: FormState = {
  location: '',
  degree: '',
  major: '',
  interviewDate: '',
  status: '',
  endDate: '',
  school: '',
  note: '',
}

type FieldName = keyof FormState

function fieldError(field: FieldName, form: FormState) {
  if (field === 'location' && !form.location) return '请选择面签地点'
  if (field === 'degree' && !form.degree) return '请选择学位'
  if (field === 'major' && !form.major.trim()) return '请输入专业'
  if (field === 'interviewDate' && !form.interviewDate) return '请选择面签日期'
  if (field === 'status' && !form.status) return '请选择状态'
  if (
    field === 'endDate' &&
    form.status !== 'Check' &&
    form.endDate &&
    form.interviewDate &&
    form.endDate < form.interviewDate
  ) {
    return '结束日期不能早于面签日期'
  }
  return ''
}

export function SubmitCaseButton() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const errors = useMemo(
    () => Object.fromEntries(Object.keys(form).map((field) => [field, fieldError(field as FieldName, form)])),
    [form]
  ) as Record<FieldName, string>
  const isValid = Object.values(errors).every((error) => !error)
  const isSubmitting = status === 'submitting'

  const close = () => {
    if (!isSubmitting) setOpen(false)
  }

  const reset = () => {
    setForm(INITIAL_FORM)
    setTouched({})
    setStatus('idle')
  }

  const handleOpen = () => {
    reset()
    setOpen(true)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'status' && value === 'Check' ? { endDate: '' } : {}),
    }))
    setStatus('idle')
  }

  const handleBlur = (event: FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setTouched((current) => ({ ...current, [event.target.name as FieldName]: true }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(Object.fromEntries(Object.keys(form).map((field) => [field, true])))
    if (!isValid || isSubmitting) return

    const payload: SubmissionPayload = {
      location: form.location as CheckmateLocation,
      degree: form.degree,
      major: form.major.trim(),
      interviewDate: form.interviewDate,
      status: form.status as SubmissionPayload['status'],
      endDate: form.status === 'Check' ? null : form.endDate || null,
      school: form.school.trim() || null,
      note: form.note.trim() || null,
    }

    setStatus('submitting')
    try {
      await submitCase(payload)
      setForm(INITIAL_FORM)
      setStatus('success')
      window.setTimeout(() => {
        setOpen(false)
        setStatus('idle')
      }, 900)
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <button type="button" className={styles.submitCaseButton} onClick={handleOpen}>
        <span aria-hidden="true">＋</span>
        提交案例
      </button>
      <Dialog open={open} onClose={close} className={styles.submitDialog}>
        <div className={styles.submitDialogBackdrop} aria-hidden="true" />
        <div className={styles.submitDialogViewport}>
          <DialogPanel className={styles.submitDialogPanel}>
            <div className={styles.submitDialogHeader}>
              <div>
                <DialogTitle className={styles.submitDialogTitle}>提交案例</DialogTitle>
                <p>分享你的面签与 Check 记录</p>
              </div>
              <button type="button" className={styles.submitDialogClose} onClick={close}>
                关闭
              </button>
            </div>

            {status === 'success' ? (
              <div className={styles.submitSuccess} role="status">
                <span aria-hidden="true">✓</span>
                提交成功
              </div>
            ) : (
              <form className={styles.submitForm} noValidate onSubmit={handleSubmit}>
                <div className={styles.submitFormGrid}>
                  <label className={styles.submitField}>
                    <span>面签地点</span>
                    <select
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      aria-invalid={Boolean(touched.location && errors.location)}
                      aria-describedby={touched.location && errors.location ? 'submit-location-error' : undefined}
                    >
                      <option value="">选择面签地点</option>
                      {CHECKMATE_LOCATIONS.map((location) => (
                        <option key={location} value={location}>
                          {LOCATION_NAMES[location]}
                        </option>
                      ))}
                    </select>
                    {touched.location && errors.location ? <small id="submit-location-error">{errors.location}</small> : null}
                  </label>

                  <label className={styles.submitField}>
                    <span>学位</span>
                    <select
                      name="degree"
                      value={form.degree}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      aria-invalid={Boolean(touched.degree && errors.degree)}
                      aria-describedby={touched.degree && errors.degree ? 'submit-degree-error' : undefined}
                    >
                      <option value="">选择学位</option>
                      {DEGREE_OPTIONS.map((degree) => (
                        <option key={degree} value={degree}>
                          {degree}
                        </option>
                      ))}
                    </select>
                    {touched.degree && errors.degree ? <small id="submit-degree-error">{errors.degree}</small> : null}
                  </label>

                  <label className={styles.submitField}>
                    <span>专业</span>
                    <input
                      name="major"
                      type="text"
                      value={form.major}
                      placeholder="例如：Computer Science"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      aria-invalid={Boolean(touched.major && errors.major)}
                      aria-describedby={touched.major && errors.major ? 'submit-major-error' : undefined}
                    />
                    {touched.major && errors.major ? <small id="submit-major-error">{errors.major}</small> : null}
                  </label>

                  <label className={styles.submitField}>
                    <span>面签日期</span>
                    <input
                      name="interviewDate"
                      type="date"
                      value={form.interviewDate}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      aria-invalid={Boolean(touched.interviewDate && errors.interviewDate)}
                      aria-describedby={touched.interviewDate && errors.interviewDate ? 'submit-interview-date-error' : undefined}
                    />
                    {touched.interviewDate && errors.interviewDate ? (
                      <small id="submit-interview-date-error">{errors.interviewDate}</small>
                    ) : null}
                  </label>

                  <label className={styles.submitField}>
                    <span>状态</span>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      aria-invalid={Boolean(touched.status && errors.status)}
                      aria-describedby={touched.status && errors.status ? 'submit-status-error' : undefined}
                    >
                      <option value="">选择状态</option>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {touched.status && errors.status ? <small id="submit-status-error">{errors.status}</small> : null}
                  </label>

                  {form.status !== 'Check' ? (
                    <label className={styles.submitField}>
                      <span>结束日期 <em>选填</em></span>
                      <input
                        name="endDate"
                        type="date"
                        value={form.endDate}
                        min={form.interviewDate || undefined}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        aria-invalid={Boolean(touched.endDate && errors.endDate)}
                        aria-describedby={touched.endDate && errors.endDate ? 'submit-end-date-error' : undefined}
                      />
                      {touched.endDate && errors.endDate ? (
                        <small id="submit-end-date-error">{errors.endDate}</small>
                      ) : null}
                    </label>
                  ) : null}

                  <label className={styles.submitField}>
                    <span>学校 <em>选填</em></span>
                    <input
                      name="school"
                      type="text"
                      value={form.school}
                      placeholder="学校（可选）"
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </label>

                  <label className={`${styles.submitField} ${styles.submitFieldWide}`}>
                    <span>备注 <em>选填</em></span>
                    <textarea
                      name="note"
                      rows={3}
                      value={form.note}
                      placeholder="想写什么都可以"
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </label>
                </div>

                {status === 'error' ? (
                  <p className={styles.submitFormError} role="alert">
                    提交失败，请稍后再试
                  </p>
                ) : null}
                <div className={styles.submitFormActions}>
                  <button type="button" className={styles.submitSecondaryButton} onClick={close} disabled={isSubmitting}>
                    取消
                  </button>
                  <button
                    type="submit"
                    className={styles.submitPrimaryButton}
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                  >
                    {isSubmitting ? '提交中…' : '提交'}
                  </button>
                </div>
              </form>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
