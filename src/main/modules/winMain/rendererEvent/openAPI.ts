import { mainHandle } from '@common/mainIpc'
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import {
  startServer,
  stopServer,
  getStatus,
  getTokenStatus,
  regenerateToken,
} from '@main/modules/openApi'


export default () => {
  mainHandle<LX.OpenAPI.Actions, any>(WIN_MAIN_RENDERER_EVENT_NAME.open_api_action, async({ params: data }) => {
    const port = parseInt(data.action == 'enable' ? data.data.port : '')
    if (data.action == 'enable' && (!Number.isInteger(port) || port < 1024 || port > 65535)) {
      throw new Error('Invalid port')
    }
    switch (data.action) {
      case 'enable':
        return data.data.enable ? await startServer(port, data.data.bindLan) : await stopServer()
      case 'status': return getStatus()
      case 'token': return getTokenStatus()
      case 'regenerate_token': return { token: regenerateToken() }
    }
  })
}
