import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen w-full bg-cover items-center justify-center bg-navy overflow-hidden">
      {/* Outlet sẽ render LoginPage, RegisterPage, etc */}
      <Outlet />
    </div>
  )
}