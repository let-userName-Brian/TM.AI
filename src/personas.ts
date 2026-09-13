import type { UserRole, UserSession, Permission } from './store/types'
import { ROLE_PERMISSIONS } from './store/types'

export type Persona = {
  name: string
  role: UserRole
  roleLabel: string
  initials: string
  description: string
}

export const PERSONAS: Persona[] = [
  { name: 'Kyle',   role: 'ba',            initials: 'KY', roleLabel: 'Business Analyst', description: 'Writes the ask, reviews drafted stories' },
  { name: 'Scott',  role: 'scrum_master',  initials: 'ST', roleLabel: 'Scrum Master',     description: 'Assigns stories, watches flow, unblocks the team' },
  { name: 'Vikas',  role: 'dev',           initials: 'VK', roleLabel: 'Developer',        description: 'Iterates plans, implements approved work' },
  { name: 'Sachin', role: 'qa',            initials: 'SC', roleLabel: 'QA Engineer',      description: 'Approves generated tests, owns the quality bar' },
  { name: 'Bill',   role: 'delivery_lead', initials: 'BL', roleLabel: 'Delivery Lead',    description: 'Full team scope, cost and agent performance' },
]

export const ROLE_HOME: Record<UserRole, string> = {
  ba:            '/p/FACTS/ba',
  dev:           '/p/FACTS/dev',
  qa:            '/p/FACTS/qa',
  scrum_master:  '/p/FACTS/assign',
  delivery_lead: '/p/FACTS/always-on',
}

export function buildUserSession(persona: Persona): UserSession {
  return {
    name: persona.name,
    role: persona.role,
    roleLabel: persona.roleLabel,
    initials: persona.initials,
    permissions: ROLE_PERMISSIONS[persona.role] as Permission[],
  }
}
