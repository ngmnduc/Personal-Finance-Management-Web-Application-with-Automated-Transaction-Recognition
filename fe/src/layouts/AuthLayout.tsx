import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[url('/images/BG.jpg')] bg-cover bg-center bg-no-repeat overflow-hidden">
      {/* Lớp phủ mờ (Dark Overlay) */}
      <div className="absolute inset-0 bg-[#0f1f3d]/60"></div>
      
      {/* Lớp nội dung (Form) */}
      <div className="relative z-10 flex w-full justify-center px-4">
        <Outlet />
      </div>
    </div>
  )
}