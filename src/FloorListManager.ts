import { EventEmitter } from 'events'
import * as d3 from 'd3'
import * as _ from 'lodash'

export type FloorConfigData = {
  floorId: number
  buildingFloor: string
  // 当前的过滤条件下, 在该楼层下的定位点的数目
  count: number
}

/**
 * 楼层切换控件管理类. 负责管理楼层切换控件的数据与视图
 * 事件:
 *   floor-id-change (newFloorId: number)  用户切换了楼层
 * 方法:
 *   add(floorConfig)  添加一个楼层配置
 *   updateFloorStats(floorStats)  更新楼层统计信息
 */
export default class FloorListManager extends EventEmitter {
  private floorListElement: HTMLElement
  private floorList: d3.Selection<HTMLElement, {}, null, null>
  private currentFloorId: number
  private data: FloorConfigData[] = []
  private statsBgColor = d3.scaleLinear<d3.HSLColor>()
    .clamp(true)
    // green/0.1 -> red/0.4
    .range([d3.hsl('rgba(0,255,0,0.1)'), d3.hsl('rgba(255,0,0,0.4)')])
    .interpolate(d3.interpolateHsl)
  private statsBarWidth = d3.scaleLinear().range([0, 200]).clamp(true)

  constructor(floorListElement: HTMLElement) {
    super()
    this.floorListElement = floorListElement
    this.floorList = d3.select(floorListElement)
    this.currentFloorId = 0
  }

  private update() {
    const self = this

    const floorItemJoin = this.floorList.selectAll('.floor-item')
      .data(this.data, (d: FloorConfigData) => String(d.floorId))
    const floorItemEnter = floorItemJoin.enter()
      .append('div')
      .classed('floor-item', true)

    floorItemEnter.append('div').classed('bar', true)
    const floorText = floorItemEnter.append('pre').classed('floor-text', true)
    floorText.append('span').classed('floor-name', true)
    floorText.append('span').classed('count', true)
    floorItemEnter.append('input').attr('type', 'radio').classed('floor-radio', true)

    const floorItem = floorItemEnter.merge(floorItemJoin)

    floorItem.select('.floor-name').text(d => d.buildingFloor)
    floorItem.select('.count').text(d => d.count);
    floorItem.select('.bar')
      .style('width', d => this.statsBarWidth(d.count) + 'px')
      .style('background', d => this.statsBgColor(d.count))

    floorItem.on('click', function (this: HTMLElement, datum) {
      const checkbox = this.querySelector('input')
      if (!checkbox.checked) {
        self.clearRadios()
        checkbox.checked = true
        self.currentFloorId = datum.floorId
        self.emit('floor-id-change', self.currentFloorId)
      }
    })

    floorItemJoin.exit().remove()
  }

  add({ floorId, buildingFloor }: { floorId: number, buildingFloor: string }) {
    this.data.push({ floorId, buildingFloor, count: 0 })
    this.update()
  }

  private clearRadios() {
    this.floorList.selectAll('input[type="radio"]').property('checked', false)
  }

  updateFloorStats(floorStats: _.Dictionary<number>) {
    this.statsBgColor.domain([1, _.max(Object.values(floorStats))])
    this.statsBarWidth.domain([0, _.max(Object.values(floorStats))])
    this.data.forEach(d => {
      d.count = _.get(floorStats, [d.floorId], 0)
    })

    this.update()
  }
}
