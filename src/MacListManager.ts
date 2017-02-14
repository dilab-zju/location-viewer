import { EventEmitter } from 'events'
import * as d3 from 'd3'
import { getColor } from './utils'
import { isValidMac } from './utils'
import config from './config'

export type MacConfig = {
  mac: string
  active: boolean
}

/**
 * MAC地址管理控件类. 负责管理当前mac配置的数据与视图
 * 事件:
 *   active-macs-change  ()  用户点击了checkbox, mac过滤条件发生了变化
 *   add-mac (newMac: string)  用户添加了新的mac地址
 *   delete-mac (deletedMac: string)  用户删除了一个mac
 * 方法:
 *   getMacConfigs()  用来获取当前的mac配置
 */
export default class MacListManager extends EventEmitter {
  private macConfigs: MacConfig[] = []
  private macListElement: HTMLElement
  private macList: d3.Selection<HTMLElement, {}, null, null>

  constructor(macListElement: HTMLElement, newMacItemElement: HTMLDivElement) {
    super()
    this.macConfigs = []
    this.macListElement = macListElement
    this.macList = d3.select(macListElement)

    const input = newMacItemElement.querySelector('input')
    const addButton = newMacItemElement.querySelector('button')
    addButton.onclick = () => {
      const newMac = input.value
      if (!config.staticMacMap[newMac] && !isValidMac(newMac)) {
        alert('请输入正确的mac地址')
      } else if (this.macConfigs.find(item => (item.mac === newMac))) {
        alert('mac地址重复')
      } else {
        this.add(newMac.toLocaleLowerCase())
        input.value = ''
      }
    }
  }

  private update() {
    const self = this
    const macItems = this.macList.selectAll('.mac-item').data(this.macConfigs, (d: MacConfig) => d.mac)
    const macItemsEnter = macItems.enter().append('div')
      .classed('mac-item', true)
      .attr('data-mac', d => d.mac)
    macItemsEnter.append('div')
      .classed('mac-color', true)
      .append('div')
      .classed('color', true)
      .style('background', d => getColor(config.staticMacMap[d.mac] || d.mac))
    macItemsEnter.append('pre')
      .classed('mac-text', true)
      .text(d => d.mac)
    macItemsEnter.append('button')
      .classed('mac-delete', true)
      .text('Del')
      .on('click', (d) => {
        const index = this.macConfigs.indexOf(d)
        this.macConfigs.splice(index, 1)
        if (d.active) {
          self.emit('delete-mac', d.mac)
        }
        this.update()
      })
    macItemsEnter.append('input')
      .classed('mac-check', true)
      .attr('type', 'checkbox')
      .attr('checked', d => d.active ? '' : null)
      .on('click', function (this: HTMLInputElement, datum) {
        datum.active = this.checked
        self.emit('active-macs-change')
      })
    macItems.exit().remove()
  }

  add(mac: string, active = true) {
    this.macConfigs.push({ mac, active })
    this.update()
    this.emit('add-mac', mac)
  }

  getMacConfigs() {
    return this.macConfigs
  }
}
