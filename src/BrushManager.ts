import { EventEmitter } from 'events'
import * as _ from 'lodash'
import * as d3 from 'd3'
import * as moment from 'moment'
import { MomentInput, Moment } from 'moment'
import { Item } from './index'

const fmtstr = 'HH:mm:ss'

/**
 * 时间控制控件管理类. 负责管理滑块相关的数据与视图
 * 事件:
 *   change (span: null | [Moment, Moment])  滑块对应的时间发生了变化
 * 方法:
 *   setAsDefaultSpan  将滑块大小和位置设置为默认值
 *   setTotalSpan  设置总时间区间长度
 */
export default class BrushManager extends EventEmitter {
  private activeItemsCache: Item[]
  private scale = d3.scaleLinear()
  private brushContainer: d3.Selection<SVGSVGElement, {}, null, null>
  private durationWidget: d3.Selection<HTMLDivElement, {}, null, null>
  private brush: d3.BrushBehavior<null> = d3.brushX().handleSize(8)
  private totalSpan = 0 // milliseconds
  private brushSelection: [number, number] = null
  private brushElement: d3.Selection<SVGGElement, {}, null, null>
  private brushOverlayWidth: number
  private brushOverlayHeight: number
  private intervalHandle: number = null
  private lastEmitStart: Moment = null
  private lastEmitEnd: Moment = null
  private getNow: () => Moment

  private timeUnitCountDown = 0

  constructor(brushContainerElement: SVGSVGElement,
              durationWidgetElement: HTMLDivElement,
              getNow: () => Moment = moment) {
    super()
    this.getNow = getNow
    this.brushContainer = d3.select(brushContainerElement)
    this.durationWidget = d3.select(durationWidgetElement)

    this.brushOverlayWidth = Number(this.brushContainer.property('clientWidth'))
    this.brushOverlayHeight = Number(this.brushContainer.property('clientHeight'))
    this.brush.extent([[0, 0], [this.brushOverlayWidth, this.brushOverlayHeight]])
    this.scale.domain([0, this.brushOverlayWidth])

    this.brushElement = this.brushContainer
      .append('g')
      .call(this.brush) as d3.Selection<SVGGElement, {}, null, null>

    this.brush.extent()

    this.brush.on('start end brush', this.brushed)
    this.intervalHandle = setInterval(this.tick, 1000) as any
  }

  setTotalSpan(totalSpan: number) {
    this.totalSpan = totalSpan
    this.scale.range([this.getNow().valueOf() - this.totalSpan, this.getNow().valueOf()])
    this.timeUnitCountDown = 0
    this.updateStartAndEndTime()
  }

  setAsDefaultSpan() {
    this.brush.move(this.brushElement as any, [this.brushOverlayWidth * 0.75, this.brushOverlayWidth])
  }

  getTotalSpan() {
    return this.totalSpan
  }

  updateTimeStats(activeItems?: Item[], useTransition = true) {
    this.activeItemsCache = activeItems || this.activeItemsCache
    const durationEnd = this.getNow().valueOf()
    const durationStart = durationEnd - this.totalSpan
    const timeUnit = this.totalSpan / this.brushOverlayWidth
    const sortedItems = _.sortBy(this.activeItemsCache, item => item.time)

    const densityArray: number[] = []
    let start = 0
    for (let unitIndex = 0; unitIndex < this.brushOverlayWidth; unitIndex++) {
      while (start < sortedItems.length
      && sortedItems[start].time < durationStart + unitIndex * timeUnit) {
        start++
      }
      let end = start
      while (end < sortedItems.length
      && sortedItems[end].time < durationStart + (unitIndex + 1) * timeUnit
        ) {
        end++
      }
      densityArray.push((end - start) / timeUnit)
      start = end
    }

    const y = d3.scaleLinear()
      .domain([0, this.brushOverlayHeight / 40000])
      .range([this.brushOverlayHeight, 0])
      .clamp(true)

    const timeStatsArea = d3.area<number>()
      .x0((d, i) => i)
      .y0(y(0))
      .y1(y)
    const timeStatsWrapper = this.brushContainer.select('.time-stats-wrapper')
    let timeStats = timeStatsWrapper.select('path')
    if (timeStats.empty()) {
      const emptyCountArray = new Array(this.brushOverlayWidth)
      emptyCountArray.fill(0)
      timeStats = timeStatsWrapper.append('path')
        .attr('fill', 'steelblue')
      if (useTransition) {
        timeStats.attr('d', timeStatsArea(emptyCountArray))
      }
    }
    if (useTransition) {
      timeStats.transition()
        .attr('d', timeStatsArea(densityArray))
    } else {
      timeStats.attr('d', timeStatsArea(densityArray))
    }
  }

  private tick = () => {
    const now = this.getNow().valueOf()
    if (this.brushSelection == null) {
      this.scale.range([now - this.totalSpan, now])
      // do nothing
    } else if (this.brushSelection[1] === this.brushOverlayWidth) {
      // 当前brush选择的end-time为now, 则更新startTime和endTime
      this.scale.range([now - this.totalSpan, now])
      this.updateStartAndEndTime()
    } else {
      const startTime = this.scale(this.brushSelection[0])
      const endTime = this.scale(this.brushSelection[1])
      this.scale.range([now - this.totalSpan, now])
      const nextBrushSelection = [this.scale.invert(startTime), this.scale.invert(endTime)]
      this.brush.move(this.brushElement as any, nextBrushSelection as any)
    }
    this.tryUpdateTimeStatsOnTick()
  }

  // time-stats的更新频率不用太快. 每过timeUnit时间更新一次即可
  private tryUpdateTimeStatsOnTick() {
    if (this.timeUnitCountDown <= 0) {
      this.updateTimeStats(null, false)
      this.timeUnitCountDown += this.totalSpan / this.brushOverlayWidth
    }
    this.timeUnitCountDown -= 1000
  }

  private brushed = () => {
    this.brushSelection = d3.event.selection
    this.updateStartAndEndTime()
  }

  private updateStartAndEndTime() {
    const selection = this.brushSelection
    if (selection == null || selection[0] === selection[1]) {
      this.setStartTimeText(null)
      this.setEndTimeText(null)
      this.setSpanText(null)
      this.tryEmitChange(null)
    } else {
      const start = moment(this.scale(selection[0]))
      const end = moment(this.scale(selection[1]))
      this.setStartTimeText(start)
      this.setEndTimeText(selection[1] === this.brushOverlayWidth ? 'now' : end)
      this.setSpanText(end.diff(start))
      this.tryEmitChange([start, end])
    }
  }

  private tryEmitChange(span: [Moment, Moment]) {
    if (span == null) {
      if (this.lastEmitStart != null) {
        this.emit('change', null)
        this.lastEmitStart = null
      }
    } else {
      if (!span[0].isSame(this.lastEmitStart) || !span[1].isSame(this.lastEmitEnd)) {
        this.emit('change', span)
        this.lastEmitStart = span[0]
        this.lastEmitEnd = span[1]
      }
    }
  }

  private setStartTimeText(input: MomentInput) {
    const startTime = this.durationWidget.select('.span-start .value')
    if (input == null) {
      startTime.text(null)
    } else {
      startTime.text(moment(input).format(fmtstr))
    }
  }

  private setEndTimeText(input: MomentInput | string) {
    const endTime = this.durationWidget.select('.span-end .value')
    if (input == null) {
      endTime.text(null)
    } else if (input === 'now') {
      endTime.text(this.getNow().format(fmtstr))
        .style('font-weight', 'bold')
        .style('color', 'steelblue')
    } else {
      endTime.text(moment(input).format(fmtstr))
        .style('font-weight', null)
        .style('color', null)
    }
  }

  private setSpanText(ms: number) {
    const span = this.durationWidget.select('.span-length .value')
    if (ms == null) {
      span.text(null)
    } else {
      const duration = moment.duration(ms, 'ms')
      span.text(`${duration.hours()}小时${duration.minutes()}分${duration.seconds()}秒`)
    }
  }
}
