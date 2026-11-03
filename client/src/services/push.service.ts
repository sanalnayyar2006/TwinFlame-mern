import { api } from '../lib/api'
import { request, hasKeys } from './request'

export const pushService = {
  getKey: () =>
    request<{ enabled: boolean; publicKey: string | null }>(() => api.get('/push/key'), hasKeys('enabled')),

  subscribe: (subscription: PushSubscriptionJSON) =>
    request<{ message: string }>(() => api.post('/push/subscribe', subscription), hasKeys('message')),

  unsubscribe: (endpoint: string) =>
    request<{ message: string }>(() => api.deleteWithBody('/push/subscribe', { endpoint }), hasKeys('message'))
}
