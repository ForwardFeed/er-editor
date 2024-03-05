import { ElectronAPI } from '@electron-toolkit/preload'
import { CustomAPI } from './preload.ts'

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
