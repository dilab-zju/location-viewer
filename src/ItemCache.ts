import { EventEmitter } from 'events'
import * as moment from 'moment'
import * as _ from 'lodash'
import { Moment } from 'moment'
import { MacConfig } from './MacListManager'
import { Item } from './index'
import config from './config'

// notice ADSP的时间快了140秒, 这里需要调整下
const offset = -140 * 1000

export default class ItemCache extends EventEmitter {
  private totalSpan = 0
  private span: [Moment, Moment] = null
  private floorId = 0
  private macConfigs: MacConfig[] = []

  private allItems: Item[] = []

  constructor() {
    super()
  }

  async schedule() {
    if (this.totalSpan === 0 || this.macConfigs.length === 0) {
      return
    }
    /* 在一次update执行到这里的时候, 如果用户切换了duration, 则会发生非预期的情况 */
    this.allItems = await this.fetchData()
    this.allItems.forEach(item => (item.time += offset))

    this.emit('floor-stats', this.getFloorStats())
    this.emit('time-stats', this.getActiveItems())
    this.emit('visible-items', this.getVisibleItems())
  }

  private fetchData(): Promise<Item[]> {
    return fetch('/static/allItems.json')
      .then(response => response.json())
  }

  onAddMac(mac: string) {
    this.macConfigs.push({ mac, active: true })
    this.schedule()
  }

  onDeleteMac(mac: string) {
    const index = this.macConfigs.findIndex(c => c.mac === mac)
    this.macConfigs.splice(index, 1)
    this.schedule()
  }

  setMacConfigs(macConfigs: MacConfig[]) {
    this.macConfigs = macConfigs.map(c => Object.assign({}, c))
    this.emit('floor-stats', this.getFloorStats())
    this.emit('time-stats', this.getActiveItems())
    this.emit('visible-items', this.getVisibleItems())
  }

  setTotalSpan(totalSpan: number) {
    this.totalSpan = totalSpan
    this.schedule()
  }

  setSpan(span: [Moment, Moment]) {
    this.span = span
    this.emit('floor-stats', this.getFloorStats())
    this.emit('visible-items', this.getVisibleItems())
  }

  setFloorId(floorId: number) {
    this.floorId = floorId
    this.emit('visible-items', this.getVisibleItems())
  }

  private getVisibleItems() {
    const activeMacs = this.getActiveRealMacs()
    return this.allItems
      .filter(item => activeMacs.has(item.mac))
      .filter(this.isBetween)
      .filter(item => item.floorId === this.floorId)
  }

  private getFloorStats() {
    const activeMacs = this.getActiveRealMacs()
    return _.countBy(this.allItems
      .filter(item => activeMacs.has(item.mac))
      .filter(this.isBetween),
      item => item.floorId
    )
  }

  private getActiveItems() {
    const activeMacs = this.getActiveRealMacs()
    return this.allItems.filter(item => activeMacs.has(item.mac))
  }

  private getActiveRealMacs() {
    return new Set(this.macConfigs.filter(c => c.active).map(c => config.staticMacMap[c.mac] || c.mac))
  }

  private isBetween = (item: Item) => {
    if (this.span == null) {
      return false
    } else {
      return moment(item.time).isBetween(this.span[0], this.span[1])
    }
  }
}
