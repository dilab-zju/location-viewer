import * as d3 from 'd3'

export async function fetchFloorData(floorId: number): Promise<Floor> {
  const response = await fetch(`./static/floor/${floorId}.json`)
  return response.json()
}

export function isValidMacItemArray(array: any[]) {
  return Array.isArray(array) && array.every(item => (
      typeof item === 'object' && typeof item.mac === 'string' && typeof item.active === 'boolean')
    )
}

export function isValidMac(mac: string) {
  return /([0-9a-f]{2}:){5}[0-9a-f]{2}/i.test(mac)
}

const colors = d3.schemeCategory10

let map: Map<string, number> = new Map()

export function getColor(key: string) {
  if (!map.has(key)) {
    map.set(key, map.size)
  }
  return colors[map.get(key) % colors.length]
}


export type Floor = {
  version: '0.5'
  floorId: number
  floorNumber: number
  config: {
    colors: { [key: string]: Color }
  }
  doorWidth: number
  wallWidth: number
  nodes: Node[]
  regions: Region[]
  walls: Wall[]
}

export type ColorName = string
export type Color = string
export type WidthOption = 'THICK' | 'NORMAL' | 'THIN'
export type Point = { x: number, y: number }
export type Line = { x1: number, y1: number, x2: number, y2: number }
export type Region = {
  id: number
  color: ColorName
  nodeId: number
  points: Point[]
}
export type Node = {
  id: number
  name: string
  nodeSize: string
  shopId: number
  type: string
  labelConfig: LabelConfig
  description: string
}
export type Wall = {
  id: number
  color: ColorName
  line: Line
  width: WidthOption
}
export type LabelConfig = { show: boolean, pos: Point, fontSize: number }

