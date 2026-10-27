import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { asMonthString } from '../../domain/date'
import type { CategoryShare } from '../../domain/summary'
import type { MonthlyTotal } from '../../domain/trend'
import { DONUT } from './donutGeometry'
import { DonutChart } from './DonutChart'
import { TrendChart } from './TrendChart'

const shares: CategoryShare[] = [
  { categoryId: 'a', name: '식비', color: '#4f46e5', amount: 20_000, permille: 800 },
  { categoryId: 'b', name: '교통', color: '#0ea5e9', amount: 5_000, permille: 200 },
]

describe('DonutChart', () => {
  it('이미지 역할과 수치가 담긴 설명을 가진다', () => {
    render(<DonutChart shares={shares} total={25_000} />)
    expect(screen.getByRole('img', { name: '카테고리별 지출 비율 도넛 차트: 식비 80.0%, 교통 20.0%' })).toBeInTheDocument()
  })

  it('카테고리마다 호 하나를 그리고 호 길이가 비율에 비례한다', () => {
    const { container } = render(<DonutChart shares={shares} total={25_000} />)
    const arcs = container.querySelectorAll<SVGCircleElement>('circle[data-category]')
    expect(arcs).toHaveLength(2)

    const lengths = [...arcs].map((arc) => Number(arc.getAttribute('stroke-dasharray')!.split(' ')[0]))
    expect(lengths[0] / DONUT.circumference).toBeCloseTo(0.8)
    expect(lengths[1] / DONUT.circumference).toBeCloseTo(0.2)
    // 두 번째 호는 첫 번째 호가 끝나는 지점에서 시작한다.
    expect(Number(arcs[1].getAttribute('stroke-dashoffset'))).toBeCloseTo(-lengths[0])
    expect(arcs[0].getAttribute('stroke')).toBe('#4f46e5')
  })

  it('호에 이름·금액·비율 툴팁(title)이 있다', () => {
    const { container } = render(<DonutChart shares={shares} total={25_000} />)
    expect(container.querySelector('circle[data-category="a"] title')).toHaveTextContent('식비 20,000원 (80.0%)')
  })

  it('가운데에 지출 합계를 축약해서 표시한다', () => {
    render(<DonutChart shares={shares} total={25_000} />)
    expect(screen.getByText('2.5만원')).toBeInTheDocument()
  })

  it('카테고리가 하나면 전체 둘레를 채운다', () => {
    const { container } = render(
      <DonutChart shares={[{ categoryId: 'a', name: '식비', color: '#4f46e5', amount: 1000, permille: 1000 }]} total={1000} />,
    )
    const arc = container.querySelector('circle[data-category="a"]')!
    expect(Number(arc.getAttribute('stroke-dasharray')!.split(' ')[0])).toBeCloseTo(DONUT.circumference)
  })
})

const data: MonthlyTotal[] = [
  { month: asMonthString('2026-08'), income: 0, expense: 30_000 },
  { month: asMonthString('2026-09'), income: 80_000, expense: 40_000 },
  { month: asMonthString('2026-10'), income: 100_000, expense: 20_000 },
]

describe('TrendChart', () => {
  it('막대 높이가 금액에 비례한다', () => {
    const { container } = render(<TrendChart data={data} selectedMonth={asMonthString('2026-10')} />)
    const height = (month: string, series: string) =>
      Number(container.querySelector(`g[data-month="${month}"] rect[data-series="${series}"]`)!.getAttribute('height'))

    expect(height('2026-09', 'expense') / height('2026-10', 'expense')).toBeCloseTo(2)
    expect(height('2026-10', 'income') / height('2026-09', 'income')).toBeCloseTo(100_000 / 80_000)
    expect(height('2026-08', 'income')).toBe(0)
    // 가장 큰 값(최댓값 = 눈금 최댓값)이 가장 높다.
    expect(height('2026-10', 'income')).toBeGreaterThan(height('2026-09', 'income'))
  })

  it('0이 아닌 모든 막대의 바닥이 같은 기준선에 정렬된다', () => {
    const { container } = render(<TrendChart data={data} selectedMonth={asMonthString('2026-10')} />)
    const bottoms = [...container.querySelectorAll('rect[data-series]')]
      .filter((rect) => Number(rect.getAttribute('height')) > 0)
      .map((rect) => (Number(rect.getAttribute('y')) + Number(rect.getAttribute('height'))).toFixed(6))
    expect(bottoms.length).toBeGreaterThan(3)
    expect(new Set(bottoms).size).toBe(1)
  })

  it('값이 아주 작아도 0이 아니면 최소 높이로 보인다', () => {
    const tiny: MonthlyTotal[] = [{ month: asMonthString('2026-10'), income: 1, expense: 9_999_999_999 }]
    const { container } = render(<TrendChart data={tiny} selectedMonth={asMonthString('2026-10')} />)
    const income = container.querySelector('rect[data-series="income"]')!
    expect(Number(income.getAttribute('height'))).toBeGreaterThanOrEqual(1.5)
  })

  it('선택한 달만 강조 표시한다', () => {
    const { container } = render(<TrendChart data={data} selectedMonth={asMonthString('2026-09')} />)
    const selected = container.querySelectorAll('g[data-selected]')
    expect(selected).toHaveLength(1)
    expect(selected[0].getAttribute('data-month')).toBe('2026-09')
  })

  it('월 라벨을 표시하고 첫 달에는 연도도 표시한다', () => {
    const { container } = render(<TrendChart data={data} selectedMonth={asMonthString('2026-10')} />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveTextContent('8월')
    expect(svg).toHaveTextContent('10월')
    expect(svg.textContent).toContain('2026')
  })

  it('1월 라벨에는 연도가 붙는다', () => {
    const jan: MonthlyTotal[] = [
      { month: asMonthString('2026-12'), income: 0, expense: 100 },
      { month: asMonthString('2027-01'), income: 0, expense: 200 },
    ]
    const { container } = render(<TrendChart data={jan} selectedMonth={asMonthString('2027-01')} />)
    const years = [...container.querySelectorAll('tspan')].map((t) => t.textContent)
    expect(years).toEqual(['2026', '2027'])
  })

  it('이미지 설명에 기간이 들어 있다', () => {
    render(<TrendChart data={data} selectedMonth={asMonthString('2026-10')} />)
    expect(screen.getByRole('img', { name: /2026년 8월부터 2026년 10월까지/ })).toBeInTheDocument()
  })

  it('"표로 보기"에 월별 수입·지출·잔액을 제공한다', () => {
    render(<TrendChart data={data} selectedMonth={asMonthString('2026-10')} />)
    const table = screen.getByRole('table', { name: '최근 6개월 수입·지출' })
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(4) // 머리글 + 3개월
    expect(within(rows[2]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['80,000원', '40,000원', '40,000원'])
    expect(within(rows[1]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['0원', '30,000원', '-30,000원'])
    expect(within(rows[3]).getByRole('rowheader')).toHaveTextContent('2026.10')
  })

  it('범례에 수입·지출 글자가 있다', () => {
    render(<TrendChart data={data} selectedMonth={asMonthString('2026-10')} />)
    const legend = screen.getAllByRole('list')[0]
    expect(legend).toHaveTextContent('수입')
    expect(legend).toHaveTextContent('지출')
  })

  it('데이터가 모두 0이면 빈 상태를 표시한다', () => {
    const empty: MonthlyTotal[] = [{ month: asMonthString('2026-10'), income: 0, expense: 0 }]
    render(<TrendChart data={empty} selectedMonth={asMonthString('2026-10')} />)
    expect(screen.getByText('최근 6개월간 내역이 없습니다')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
