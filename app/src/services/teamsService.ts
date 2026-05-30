import type { AdminConfig, Assessment, UserProfile } from '../domain/types'
import { listActiveSpecialists, listSpecialistsForLeader } from './specialistsService'

export interface TeamSummary {
  leader: string
  specialists: number
  activeAssessments: number
  belowStandard: number
  pendingDecisions: number
}

export function buildTeamSummaries(admin: AdminConfig, assessments: Assessment[], user: UserProfile): TeamSummary[] {
  const leaders = user.role === 'admin' || user.role === 'director'
    ? admin.leaders
    : [user.leaderScope].filter(Boolean)

  return leaders.map((leader) => {
    const specialistList = listSpecialistsForLeader(admin, leader)
    const rows = assessments.filter((item) => item.status !== 'archived' && (item.leaderScope === leader || item.oce === leader))
    return {
      leader,
      specialists: specialistList.length,
      activeAssessments: rows.length,
      belowStandard: rows.filter((item) => item.rating === 'below').length,
      pendingDecisions: rows.filter((item) => item.status === 'submitted' || item.status === 'review').length,
    }
  })
}

export function buildTeamSpecialistRows(admin: AdminConfig, assessments: Assessment[], leader: string) {
  const specialists = listActiveSpecialists(admin).filter((item) => !leader || item.leader === leader)
  return specialists.map((specialist) => {
    const rows = assessments.filter((item) => item.spec === specialist.name)
    return {
      specialist,
      count: rows.length,
      latest: rows.sort((left, right) => right.data.localeCompare(left.data))[0] || null,
    }
  })
}

