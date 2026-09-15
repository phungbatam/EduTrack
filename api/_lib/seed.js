import { createSeedStudents, createSeedRules, createSeedViolations } from '../../src/data/mockData.js'

export const SEEDS = {
  students: createSeedStudents,
  rules: createSeedRules,
  violations: createSeedViolations,
  submissions: () => [],
  lockedWeeks: () => [],
  notifications: () => [],
  activityLog: () => [],
  appeals: () => [],
  penalties: () => [],
}