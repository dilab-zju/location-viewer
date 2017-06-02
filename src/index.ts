import './index.styl'
import './preloaded'
import * as _ from 'lodash'
import { Moment } from 'moment'
import { fetchFloorData } from './utils'
import MacListManager from './MacListManager'
import FloorListManager from './FloorListManager'
import DrawingManager from './DrawingManager'
import BrushManager from './BrushManager'
import ItemCache from './ItemCache'
import config from './config'

window.addEventListener('beforeunload', () => {
  const macConfigs = macListManager.getMacConfigs()
  if (macConfigs.length > 0) {
    localStorage.setItem('testMacs', JSON.stringify(macListManager.getMacConfigs()))
  } else {
    localStorage.removeItem('testMacs')
  }
})

export type Item = {
  id: number
  mac: string
  x: number
  y: number
  floorId: number
  time: number // timestamp
  path?: string
  duration?: number // minutes. 0 means unknown
}

function onTotalSpanChange() {
  // convert minutes to milliseconds
  const ms = Number(durationSelectElement.value) * 60 * 1000
  brushManager.setTotalSpan(ms)
  itemCache.setTotalSpan(ms)
}

const drawingManager = new DrawingManager(document.querySelector('svg.floor-map') as SVGElement)
const floorListManager = new FloorListManager(document.querySelector('.floor-list') as HTMLDivElement)
const macListManager = new MacListManager(document.querySelector('.mac-list') as HTMLDivElement,
  document.querySelector('.new-mac-item') as HTMLDivElement)
const brushManager = new BrushManager(
  document.querySelector('.brush-container') as SVGSVGElement,
  document.querySelector('.duration-widget') as HTMLDivElement,
  config.getNow
)
const itemCache = new ItemCache()

macListManager.on('active-macs-change', () => itemCache.setMacConfigs(macListManager.getMacConfigs()))
macListManager.on('delete-mac', (mac: string) => itemCache.onDeleteMac(mac))

itemCache.on('floor-stats', (floorStats: _.Dictionary<number>) => {
  floorListManager.updateFloorStats(floorStats)
})
itemCache.on('visible-items', (items: Item[]) => {
  drawingManager.updateItems(items)
})
itemCache.on('time-stats', (activeItems: Item[]) => {
  brushManager.updateTimeStats(activeItems)
})

const durationSelectElement = document.querySelector('.duration-select') as HTMLInputElement
durationSelectElement.addEventListener('change', onTotalSpanChange)

brushManager.on('change', function onSpanChange(span: [Moment, Moment]) {
  itemCache.setSpan(span)
})

floorListManager.on('floor-id-change', async function onFloorIdChange(floorId: number) {
  const floor = await fetchFloorData(floorId)
  drawingManager.updateFloor(floor)
  itemCache.setFloorId(floorId)
})

document.querySelector('.reset-transform').addEventListener('click', () => drawingManager.resetTransform())

config.floorDataArray.forEach(floorData => floorListManager.add(floorData))
if (config.testMacs.length > 0) {
  config.testMacs.forEach(macItem => macListManager.add(macItem.mac, macItem.active))
} else {
  Object.keys(config.staticMacMap).forEach(mac => {
    macListManager.add(mac, true)
  })
}

onTotalSpanChange()
brushManager.setAsDefaultSpan()
itemCache.setMacConfigs(macListManager.getMacConfigs())
macListManager.on('add-mac', (mac: string) => itemCache.onAddMac(mac))

itemCache.schedule();

// notice 下面的代码用来方便的添加mac地址
(function (globalObject: any) {
  console.log('使用addMacsInStaticMap()来添加预设的mac地址')
  globalObject.addMacsInStaticMap = function () {
    const existingMacs = macListManager.getMacConfigs().map(c => c.mac)
    Object.keys(config.staticMacMap).forEach((mac) => {
      if (!existingMacs.includes(mac)) {
        macListManager.add(mac)
      }
    })
  }
}(window))
