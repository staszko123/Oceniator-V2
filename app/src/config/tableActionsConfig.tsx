import { Edit3, Eye, FileText, ShieldCheck, Trash2 } from 'lucide-react'
import type { Assessment } from '../domain/types'
import type { TableAction } from '../types/table'

export interface AssessmentActionHandlers {
  onPreview?: (assessment: Assessment) => void
  onPrint?: (assessment: Assessment) => void
  onEdit?: (assessment: Assessment) => void
  onAdvance?: (assessment: Assessment) => void
  onDelete?: (assessment: Assessment) => void
}

export interface AssessmentActionAvailability {
  canEdit?: (assessment: Assessment) => boolean
  canAdvance?: (assessment: Assessment) => boolean
  canDelete?: (assessment: Assessment) => boolean
}

export function buildAssessmentActions(
  handlers: AssessmentActionHandlers,
  availability: AssessmentActionAvailability = {},
): Array<TableAction<Assessment>> {
  const actions: Array<TableAction<Assessment>> = []

  if (handlers.onPreview) {
    actions.push({
      key: 'view',
      labelKey: 'action.viewDetails',
      icon: <Eye size={15} />,
      permission: 'evaluations.read',
      onSelect: handlers.onPreview,
    })
  }

  if (handlers.onPrint) {
    actions.push({
      key: 'print',
      labelKey: 'action.print',
      icon: <FileText size={15} />,
      permission: 'evaluations.export',
      onSelect: handlers.onPrint,
    })
  }

  if (handlers.onEdit) {
    actions.push({
      key: 'edit',
      labelKey: 'action.edit',
      icon: <Edit3 size={15} />,
      permission: 'evaluations.edit',
      disabled: (row) => (availability.canEdit && !availability.canEdit(row) ? 'action.disabled.noPermission' : false),
      onSelect: handlers.onEdit,
    })
  }

  if (handlers.onAdvance) {
    actions.push({
      key: 'advance',
      labelKey: 'action.changeStatus',
      icon: <ShieldCheck size={15} />,
      permission: 'evaluations.edit',
      disabled: (row) => (availability.canAdvance && !availability.canAdvance(row) ? 'action.disabled.noPermission' : false),
      onSelect: handlers.onAdvance,
    })
  }

  if (handlers.onDelete) {
    actions.push({
      key: 'delete',
      labelKey: 'action.delete',
      icon: <Trash2 size={15} />,
      permission: 'evaluations.delete',
      danger: true,
      disabled: (row) => (availability.canDelete && !availability.canDelete(row) ? 'action.disabled.noPermission' : false),
      onSelect: handlers.onDelete,
    })
  }

  return actions
}

