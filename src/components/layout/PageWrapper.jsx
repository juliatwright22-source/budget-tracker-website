import { Sidebar, BottomNav } from './Navbar'

export default function PageWrapper({ children }) {
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 px-4 sm:px-8 py-8 pb-24 md:pb-8 max-w-5xl">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
