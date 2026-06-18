import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Wifi,
  User,
  Maximize2,
  LogOut,
  History,
  ArrowLeft,
  Phone,
  UserCircle,
  ChevronDown,
  Monitor,
} from 'lucide-react'

function Navbar() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      {/* Left: Logo + Nav */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-0">
          <span className="text-xl font-bold text-gray-900 tracking-tight">TITAN</span>
          <span className="text-xl font-bold text-blue-600 tracking-tight ml-1">EYE+</span>
        </div>
        <nav className="flex items-center gap-1">
          <a
            href="#"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100 text-sm font-medium"
          >
            <LayoutDashboard size={16} />
            Dashboard
          </a>
          <a
            href="#"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100 text-sm font-medium"
          >
            <Users size={16} />
            Customer Records
          </a>
        </nav>
      </div>

      {/* Right: Status + User */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Wifi size={16} className="text-orange-400" />
          <span className="font-medium text-gray-700">0.4</span>
          <span className="text-xs text-gray-400">MBPS</span>
          <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded">
            LOW
          </span>
        </div>
        <div className="text-right text-xs text-gray-500 leading-tight">
          <div className="text-gray-400">Logged in as:</div>
          <div className="text-blue-600 font-medium">priyajitbanerjee@titan.co.in</div>
        </div>
        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
          <User size={16} className="text-white" />
        </div>
        <button className="text-gray-500 hover:text-gray-700">
          <Maximize2 size={18} />
        </button>
        <button className="text-red-500 hover:text-red-700">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}

function SelectField({ value, onChange, options, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
    </div>
  )
}

function InputField({ value, onChange, placeholder, icon: Icon, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      {Icon && (
        <Icon
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border border-gray-300 rounded-md py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${Icon ? 'pl-9 pr-3' : 'px-3'}`}
      />
    </div>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </div>
      <span className="text-sm text-gray-600">{label}</span>
    </label>
  )
}

export default function App() {
  const [form, setForm] = useState({
    name: 'eye',
    age: '21',
    gender: 'Male',
    mobile: '91',
    customerType: 'New',
    preferredLanguage: 'English',
    storeFeedback: '',
    optumFeedback: '',
    status: 'Accepted',
    activeProfile: false,
  })

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }))

  return (
    <div className="min-h-screen flex flex-col bg-[#e8eaf0]">
      <Navbar />

      <main className="flex-1 px-8 py-6">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center">
                <UserCircle size={16} className="text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Update Profile</h1>
            </div>
            <p className="text-sm text-gray-500 ml-9">
              <span className="text-blue-600 font-medium">ID: #0484</span>
              {'  '}Manage assessment details and feedback.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-full text-sm text-gray-600 bg-white hover:bg-gray-50">
              <History size={14} />
              View History
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-full text-sm text-gray-600 bg-white hover:bg-gray-50">
              <ArrowLeft size={14} />
              Back
            </button>
          </div>
        </div>

        {/* Customer Details Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Card Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Customer Details</h2>
            <span className="text-xs text-gray-400">
              Last Updated On: Jun 18, 2026, 9:47:04 PM
            </span>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Row 1: Name, Age, Gender */}
            <div className="grid grid-cols-[1fr_200px_200px] gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Name</label>
                <InputField
                  value={form.name}
                  onChange={set('name')}
                  icon={UserCircle}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Age</label>
                <InputField value={form.age} onChange={set('age')} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Gender</label>
                <SelectField
                  value={form.gender}
                  onChange={set('gender')}
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
              </div>
            </div>

            {/* Row 2: Mobile, Customer Type, Preferred Language */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Mobile Number</label>
                <InputField
                  value={form.mobile}
                  onChange={set('mobile')}
                  icon={Phone}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Customer Type</label>
                <SelectField
                  value={form.customerType}
                  onChange={set('customerType')}
                  options={[
                    { value: 'New', label: 'New' },
                    { value: 'Existing', label: 'Existing' },
                    { value: 'VIP', label: 'VIP' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Preferred Language</label>
                <SelectField
                  value={form.preferredLanguage}
                  onChange={set('preferredLanguage')}
                  options={[
                    { value: 'English', label: 'English' },
                    { value: 'Hindi', label: 'Hindi' },
                    { value: 'Tamil', label: 'Tamil' },
                    { value: 'Telugu', label: 'Telugu' },
                    { value: 'Kannada', label: 'Kannada' },
                  ]}
                />
              </div>
            </div>

            {/* Store Action / Feedback */}
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">
                Store Action / Feedback
              </label>
              <textarea
                value={form.storeFeedback}
                onChange={(e) => set('storeFeedback')(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 bg-white resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Optum Action / Feedback */}
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">
                Optum Action / Feedback
              </label>
              <textarea
                value={form.optumFeedback}
                onChange={(e) => set('optumFeedback')(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 bg-white resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Status</label>
              <SelectField
                value={form.status}
                onChange={set('status')}
                className="max-w-xs"
                options={[
                  { value: 'Accepted', label: 'Accepted' },
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Rejected', label: 'Rejected' },
                  { value: 'Completed', label: 'Completed' },
                ]}
              />
            </div>

            {/* Bottom Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Toggle
                checked={form.activeProfile}
                onChange={set('activeProfile')}
                label="Active Profile"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const platform = navigator.userAgent.toLowerCase()
                    if (platform.includes('win') || platform.includes('mac')) {
                      window.location.href = 'msteams://'
                    } else {
                      fetch('/api/open-teams', { method: 'POST' })
                    }
                  }}
                  className="flex items-center gap-2 bg-[#2d3a5e] hover:bg-[#232d4a] text-white text-sm font-medium px-5 py-2.5 rounded-full"
                >
                  <Phone size={14} />
                  Initiate Call
                </button>
                <button
                  onClick={() => {
  const platform = navigator.userAgent.toLowerCase()
  if (platform.includes('win') || platform.includes('mac')) {
    window.location.href = 'teamviewer10://'
  } else {
    fetch('/api/open-teamviewer', { method: 'POST' })
  }
}}
                  className="flex items-center gap-2 bg-[#2d3a5e] hover:bg-[#232d4a] text-white text-sm font-medium px-5 py-2.5 rounded-full"
                >
                  <Monitor size={14} />
                  Open Teams Viewer
                </button>
                <button className="bg-[#1a2b6e] hover:bg-[#152260] text-white text-sm font-medium px-5 py-2.5 rounded-full">
                  Update Customer Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>© 2026 Titan Company Limited. All Rights Reserved.</span>
          <span>
            Titan Company Limited, Veer Sandra, Electronic City, Bengaluru, Karnataka 560100
          </span>
          <span className="text-blue-600 font-medium">titan.co.in</span>
        </div>
      </footer>
    </div>
  )
}
