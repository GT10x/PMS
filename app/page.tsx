import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-8 text-primary-600">
          PMS
        </h1>
        <p className="text-xl mb-8 text-gray-700">
          Project Management System for School ERP Development
        </p>
        <div className="space-x-4">
          <Link
            href="/login"
            className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard"
            className="inline-block bg-gray-200 text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-300 transition"
          >
            Dashboard
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-semibold text-primary-600">Project Manager</h3>
            <p className="text-gray-600">Manage & Oversee</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-semibold text-primary-600">Developer</h3>
            <p className="text-gray-600">Build & Code</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-semibold text-primary-600">Tester</h3>
            <p className="text-gray-600">QC & Testing</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-semibold text-primary-600">Consultant</h3>
            <p className="text-gray-600">Advise & Refine</p>
          </div>
        </div>
      </div>
    </main>
  )
}
