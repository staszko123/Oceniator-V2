import type { DataProvider } from '../domain/types'
import { createEvaluationsService } from './evaluationsService'
import { createUsersService } from './usersService'
import { buildTeamSummaries } from './teamsService'
import { buildReportTable, exportTableCsv, exportTableExcel } from './reportsService'

export function createAppServices(provider: DataProvider) {
  const evaluations = createEvaluationsService(provider)
  const users = createUsersService(provider)

  return {
    provider,
    evaluations,
    users,
    buildTeamSummaries,
    buildReportTable,
    exportTableCsv,
    exportTableExcel,
  }
}

