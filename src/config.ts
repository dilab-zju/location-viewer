import * as moment from 'moment'
import { Moment } from "moment"
import { MacConfig } from "./MacListManager"
import { isValidMacItemArray } from "./utils";

export type Config = Readonly<{
  host: string
  autoUpdateTimeout: number
  floorDataArray: Readonly<{ floorId: number, buildingFloor: string }>[]
  testMacs: MacConfig[]
  getNow?: () => Moment
  staticMacMap: { [key: string]: string }
}>

const config: Config = {
  host: '129.1.0.146:8892',
  autoUpdateTimeout: 100e3,
  floorDataArray: [
    { floorId: 31, buildingFloor: 'B-1' },
    { floorId: 32, buildingFloor: 'B-2' },
    { floorId: 33, buildingFloor: 'B-3' },
    { floorId: 34, buildingFloor: 'B-4' },
    { floorId: 35, buildingFloor: 'B-5' },
    { floorId: 36, buildingFloor: 'B-6' },
    { floorId: 61, buildingFloor: 'B-7' },
  ],
  testMacs: isValidMacItemArray(JSON.parse(localStorage.getItem('testMacs')) || null)
    ? JSON.parse(localStorage.getItem('testMacs')) : [],
  getNow: (function () {
    const start = Date.now() - moment('2017-05-25 18:00').valueOf()
    // const start = Date.now() - moment('2017-05-25 16:06').valueOf()
    return function () {
      return moment().subtract(start, 'ms')
    }
  })(),
  staticMacMap: {
    'sfc-samsung': 'a4:08:ea:0b:c9:3d',
    'lh-iphone': 'c8:1e:e7:c1:1e:72',
    'cx-meizu': '38:bc:1a:d2:58:ed',
    'lxy-meizu': '68:3e:34:2d:79:c0',
    'sfc-xps': 'ac:d1:b8:bf:3c:87',
    '实际情况': '00:00:00:00:00:00',
  },
}

export default config
