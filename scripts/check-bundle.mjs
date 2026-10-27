// 빌드 결과물 크기 예산 점검: 초과하면 실패한다. (npm run build 뒤에 실행)
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST_ASSETS = join(import.meta.dirname, '..', 'dist', 'assets')
// 압축(gzip) 후 크기 예산(KB). 현재 JS 약 95KB, CSS 약 5KB. 늘릴 때는 이유를 문서에 남긴다.
const BUDGET_KB = { js: 120, css: 15 }

let failed = false
const totals = { js: 0, css: 0 }
for (const name of readdirSync(DIST_ASSETS)) {
  const kind = name.endsWith('.js') ? 'js' : name.endsWith('.css') ? 'css' : null
  if (!kind) continue
  const gzipKb = gzipSync(readFileSync(join(DIST_ASSETS, name))).length / 1024
  totals[kind] += gzipKb
  console.log(`  ${name}  ${gzipKb.toFixed(1)}KB (gzip)`)
}
for (const kind of ['js', 'css']) {
  const ok = totals[kind] <= BUDGET_KB[kind]
  if (!ok) failed = true
  console.log(`${ok ? '✓' : '✗'} ${kind.toUpperCase()} 합계 ${totals[kind].toFixed(1)}KB / 예산 ${BUDGET_KB[kind]}KB`)
}
if (failed) {
  console.error('번들 크기 예산을 초과했습니다. 불필요한 의존성이나 코드를 확인하세요.')
  process.exit(1)
}
