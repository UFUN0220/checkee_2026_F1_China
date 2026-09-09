'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useForm, useWatch } from 'react-hook-form'
import { useState } from 'react'
import { FieldError, FormWrapper, SubmitButton } from '~/components/forms'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Select } from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import {
  caseSubmissionSchema,
  type CaseSubmissionFormValues,
  type CaseSubmissionValues,
  DEGREES,
  SUBMISSION_LOCATIONS,
  STATUSES,
} from '~/lib/validations/case-submission'
import { submitCase, type SubmissionPayload } from './submit-case'
import styles from './checkmate-experience.module.css'

const INITIAL_FORM: CaseSubmissionFormValues = {
  name: '',
  location: '',
  degree: '',
  major: '',
  interviewDate: '',
  status: '',
  endDate: '',
  school: '',
  note: '',
}

export function SubmitCaseButton() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const form = useForm<CaseSubmissionFormValues, unknown, CaseSubmissionValues>({
    resolver: zodResolver(caseSubmissionSchema),
    defaultValues: INITIAL_FORM,
  })
  const selectedStatus = useWatch({ control: form.control, name: 'status' })
  const interviewDate = useWatch({ control: form.control, name: 'interviewDate' })
  const isSubmitting = form.formState.isSubmitting

  const close = () => {
    if (!isSubmitting) setOpen(false)
  }

  const reset = () => {
    form.reset(INITIAL_FORM)
    setStatus('idle')
  }

  const handleOpen = () => {
    reset()
    setOpen(true)
  }

  const handleChange = () => {
    setStatus('idle')
  }

  const handleStatusChange = (event: { target: { value: string } }) => {
    handleChange()
    if (event.target.value === 'Check') {
      form.setValue('endDate', '', { shouldDirty: true, shouldValidate: false })
    }
  }

  const handleSubmit = async (values: CaseSubmissionValues) => {
    setStatus('idle')

    try {
      await submitCase(values as SubmissionPayload)
      form.reset(INITIAL_FORM)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.submitCaseButton}
        onClick={handleOpen}
        aria-expanded={open}
        aria-label="提交你的 F-1 时间线案例，审核后加入名人堂"
        title="提交你的 F-1 时间线案例，审核后加入名人堂"
        data-open={open ? 'true' : undefined}
      >
        <span aria-hidden="true">＋</span>
        提交案例
      </button>
      <Dialog open={open} onClose={close} className={styles.submitDialog}>
        <div className={styles.submitDialogBackdrop} aria-hidden="true" />
        <div className={styles.submitDialogViewport}>
          <DialogPanel className={`${styles.submitDialogPanel} ${styles.submitCaseDialogPanel}`}>
            <div className={styles.submitDialogHeader}>
              <div>
                <DialogTitle className={styles.submitDialogTitle}>提交案例</DialogTitle>
              </div>
              <button type="button" className={styles.submitDialogClose} onClick={close}>
                关闭
              </button>
            </div>

            {status === 'success' ? (
              <div className={styles.submitSuccess} role="status" aria-live="polite">
                <span aria-hidden="true">✓</span>
                <strong>提交成功</strong>
                <p>感谢你的案例贡献。</p>
                <p>提交后会经过人工整理和审核，符合展示标准的案例会进入名人堂。</p>
                <div className={styles.submitSuccessActions}>
                  <button
                    type="button"
                    className={styles.submitSecondaryButton}
                    onClick={() => setStatus('idle')}
                  >
                    返回
                  </button>
                  <button type="button" className={styles.submitPrimaryButton} onClick={close}>
                    关闭
                  </button>
                </div>
              </div>
            ) : (
              <FormWrapper
                form={form}
                onSubmit={handleSubmit}
                className={styles.submitForm}
                noValidate
              >
                <p className={styles.submitPrivacyHint}>
                  提交后，部分信息将在审核整理后展示于名人堂。姓名、联系方式等个人身份信息可选。
                  可以提交个人昵称，有一定信息量，唯一且有趣。
                </p>
                <div className={styles.submitFormGrid}>
                  <Label className={styles.submitField} htmlFor="submit-name">
                    <span>昵称（选填）</span>
                    <Input
                      id="submit-name"
                      type="text"
                      placeholder="请输入昵称（可选）"
                      aria-invalid={Boolean(form.formState.errors.name)}
                      aria-describedby={
                        form.formState.errors.name ? 'submit-name-error' : undefined
                      }
                      {...form.register('name', { onChange: handleChange })}
                    />
                    <span className="text-muted text-xs leading-5 font-normal">
                      将作为名人堂展示名称；可填写昵称，无需真实姓名。
                    </span>
                    <FieldError<CaseSubmissionFormValues> id="submit-name-error" name="name" />
                  </Label>

                  <Label className={styles.submitField} htmlFor="submit-location">
                    <span>面签地点</span>
                    <Select
                      id="submit-location"
                      aria-invalid={Boolean(form.formState.errors.location)}
                      aria-describedby={
                        form.formState.errors.location ? 'submit-location-error' : undefined
                      }
                      {...form.register('location', { onChange: handleChange })}
                    >
                      <option value="">选择面签地点</option>
                      {SUBMISSION_LOCATIONS.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </Select>
                    <FieldError<CaseSubmissionFormValues>
                      id="submit-location-error"
                      name="location"
                    />
                  </Label>

                  <Label className={styles.submitField} htmlFor="submit-degree">
                    <span>学位</span>
                    <Select
                      id="submit-degree"
                      aria-invalid={Boolean(form.formState.errors.degree)}
                      aria-describedby={
                        form.formState.errors.degree ? 'submit-degree-error' : undefined
                      }
                      {...form.register('degree', { onChange: handleChange })}
                    >
                      <option value="">选择学位</option>
                      {DEGREES.map((degree) => (
                        <option key={degree} value={degree}>
                          {degree}
                        </option>
                      ))}
                    </Select>
                    <FieldError<CaseSubmissionFormValues> id="submit-degree-error" name="degree" />
                  </Label>

                  <Label className={styles.submitField} htmlFor="submit-major">
                    <span>专业</span>
                    <Input
                      id="submit-major"
                      type="text"
                      placeholder="例如：Computer Science"
                      aria-invalid={Boolean(form.formState.errors.major)}
                      aria-describedby={
                        form.formState.errors.major ? 'submit-major-error' : undefined
                      }
                      {...form.register('major', { onChange: handleChange })}
                    />
                    <FieldError<CaseSubmissionFormValues> id="submit-major-error" name="major" />
                  </Label>

                  <Label className={styles.submitField} htmlFor="submit-interview-date">
                    <span>面签日期</span>
                    <Input
                      id="submit-interview-date"
                      type="date"
                      aria-invalid={Boolean(form.formState.errors.interviewDate)}
                      aria-describedby={
                        form.formState.errors.interviewDate
                          ? 'submit-interview-date-error'
                          : undefined
                      }
                      {...form.register('interviewDate', { onChange: handleChange })}
                    />
                    <FieldError<CaseSubmissionFormValues>
                      id="submit-interview-date-error"
                      name="interviewDate"
                    />
                  </Label>

                  <Label className={styles.submitField} htmlFor="submit-status">
                    <span>
                      状态
                      {selectedStatus === 'Check' ? (
                        <em className={styles.submitStatusHint}>Check 状态暂不需要填写结束日期</em>
                      ) : null}
                    </span>
                    <Select
                      id="submit-status"
                      aria-invalid={Boolean(form.formState.errors.status)}
                      aria-describedby={
                        form.formState.errors.status ? 'submit-status-error' : undefined
                      }
                      {...form.register('status', { onChange: handleStatusChange })}
                    >
                      <option value="">选择状态</option>
                      {STATUSES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                    <FieldError<CaseSubmissionFormValues> id="submit-status-error" name="status" />
                  </Label>

                  {selectedStatus === 'Check' ? null : (
                    <Label className={styles.submitField} htmlFor="submit-end-date">
                      <span>
                        结束日期 <em>选填</em>
                      </span>
                      <Input
                        id="submit-end-date"
                        type="date"
                        min={interviewDate || undefined}
                        aria-invalid={Boolean(form.formState.errors.endDate)}
                        aria-describedby={
                          form.formState.errors.endDate ? 'submit-end-date-error' : undefined
                        }
                        {...form.register('endDate', { onChange: handleChange })}
                      />
                      <FieldError<CaseSubmissionFormValues>
                        id="submit-end-date-error"
                        name="endDate"
                      />
                    </Label>
                  )}

                  <Label className={styles.submitField} htmlFor="submit-school">
                    <span>
                      学校 <em>选填</em>
                    </span>
                    <Input
                      id="submit-school"
                      type="text"
                      placeholder="学校（可选）"
                      aria-invalid={Boolean(form.formState.errors.school)}
                      aria-describedby={
                        form.formState.errors.school ? 'submit-school-error' : undefined
                      }
                      {...form.register('school', { onChange: handleChange })}
                    />
                    <FieldError<CaseSubmissionFormValues> id="submit-school-error" name="school" />
                  </Label>

                  <Label
                    className={`${styles.submitField} ${styles.submitFieldWide}`}
                    htmlFor="submit-note"
                  >
                    <span>
                      备注 <em>选填</em>
                    </span>
                    <Textarea
                      id="submit-note"
                      rows={3}
                      placeholder="想写什么都可以"
                      aria-invalid={Boolean(form.formState.errors.note)}
                      aria-describedby={
                        form.formState.errors.note ? 'submit-note-error' : undefined
                      }
                      {...form.register('note', { onChange: handleChange })}
                    />
                    <FieldError<CaseSubmissionFormValues> id="submit-note-error" name="note" />
                  </Label>
                </div>

                {status === 'error' ? (
                  <p className={styles.submitFormError} role="alert">
                    提交失败，请稍后再试
                  </p>
                ) : null}
                <div className={styles.submitFormActions}>
                  <button
                    type="button"
                    className={styles.submitSecondaryButton}
                    onClick={close}
                    disabled={isSubmitting}
                  >
                    取消
                  </button>
                  <SubmitButton
                    className={styles.submitPrimaryButton}
                    loadingText="提交中…"
                    aria-busy={isSubmitting}
                  >
                    提交案例
                  </SubmitButton>
                </div>
              </FormWrapper>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
