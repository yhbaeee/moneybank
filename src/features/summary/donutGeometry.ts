/** 도넛 차트의 SVG 좌표계(viewBox 0 0 SIZE SIZE). 컴포넌트와 테스트가 공유한다. */
const SIZE = 120
const STROKE = 22
const RADIUS = (SIZE - STROKE) / 2

export const DONUT = {
  size: SIZE,
  center: SIZE / 2,
  stroke: STROKE,
  radius: RADIUS,
  circumference: 2 * Math.PI * RADIUS,
}
