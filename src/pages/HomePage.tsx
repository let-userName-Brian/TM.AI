import { Navigate } from 'react-router'
import { useStore } from '../store'
import { ROLE_HOME } from '../personas'

export default function HomePage() {
  const { state } = useStore()
  const user = state.currentUser
  if (!user) return <Navigate to="/" replace />
  return <Navigate to={ROLE_HOME[user.role]} replace />
}
