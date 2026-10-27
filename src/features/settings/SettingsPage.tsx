import { Link } from 'react-router-dom'
import { useTheme, type Theme } from '../../app/themeContext'
import { Card } from '../../components/Card'
import { Select } from '../../components/Field'
import { BackupSection } from './BackupSection'
import { ResetSection } from './ResetSection'

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: '시스템 설정 따름' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
]

export function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <section aria-labelledby="settings-title" className="flex flex-col gap-6">
      <h1 id="settings-title" className="text-xl font-bold">
        설정
      </h1>
      <Card className="flex flex-col gap-4">
        <Select label="테마" value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
          {THEME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Link to="/categories" className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline">
          카테고리 관리
        </Link>
      </Card>
      <BackupSection />
      <ResetSection />
    </section>
  )
}
