import type { Assessment, AssessmentDraft, AssessmentType, ManagedUser } from './types'

export function commitDraftAfterSave(
  drafts: Record<AssessmentType, AssessmentDraft | undefined>,
  type: AssessmentType,
): Record<AssessmentType, AssessmentDraft | undefined> {
  return { ...drafts, [type]: undefined }
}

export function clearDraft(
  drafts: Record<AssessmentType, AssessmentDraft | undefined>,
  type: AssessmentType,
): Record<AssessmentType, AssessmentDraft | undefined> {
  return { ...drafts, [type]: undefined }
}

export function mergeImportedAssessments(existing: Assessment[], imported: Assessment[]): Assessment[] {
  return [
    ...imported,
    ...existing.filter((item) => !imported.some((next) => next.id === item.id)),
  ]
}

export function replaceAssessmentById(assessments: Assessment[], assessment: Assessment): Assessment[] {
  return assessments.map((item) => (item.id === assessment.id ? assessment : item))
}

export function replaceManagedUserById(users: ManagedUser[], user: ManagedUser): ManagedUser[] {
  return users.map((item) => (item.id === user.id ? user : item))
}

export function prependManagedUser(users: ManagedUser[], user: ManagedUser): ManagedUser[] {
  return [user, ...users.filter((item) => item.id !== user.id)]
}
