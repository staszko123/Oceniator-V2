import type { DataProvider, Assessment, AssessmentDraft, AssessmentType, UserProfile } from '../domain/types'
import { mergeImportedAssessments, replaceAssessmentById } from '../domain/workflows'

export function createEvaluationsService(provider: DataProvider) {
  return {
    loadAssessments: () => provider.loadAssessments(),
    saveAssessment: (assessment: Assessment) => provider.saveAssessment(assessment),
    updateAssessment: (assessment: Assessment) => provider.updateAssessment(assessment),
    saveAssessments: (assessments: Assessment[]) => provider.saveAssessments?.(assessments) || Promise.resolve(),
    loadDrafts: () => provider.loadDrafts(),
    saveDrafts: (drafts: Record<AssessmentType, AssessmentDraft | undefined>) => provider.saveDrafts(drafts),
    importAssessments: async (existing: Assessment[], imported: Assessment[], user?: UserProfile) => {
      const merged = mergeImportedAssessments(existing, imported)
      if (provider.saveAssessments) {
        await provider.saveAssessments(merged)
      } else {
        await Promise.all(imported.map((item) => provider.saveAssessment(item)))
      }
      const all = await provider.loadAssessments()
      return user ? replaceAssessmentById(all, merged[0] || imported[0]) : all
    },
  }
}

