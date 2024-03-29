import { fromJS } from 'immutable'
import { handleActions } from 'redux-actions'
import {
  buildPageWidgets,
  initServerData,
} from '../../../../packages/build-page/src/index'
import { addReducer } from '../../../store'
import * as config from '../../config'

const PAGE_NAME = '处理错误数据'
const REDUCER_KEY = 'pageHandleErrorReducer'

const defaultData = {
  server: {
    _data: initServerData({ requesting: true }),
  },
}
const $$defaultData = fromJS(defaultData)

export const page = buildPageWidgets({
  reducerKey: REDUCER_KEY,
  defaultData: $$defaultData,
  pageName: PAGE_NAME,
  hash: REDUCER_KEY,
})

addReducer(REDUCER_KEY, handleActions(page.reducerMap, $$defaultData))

export const dataOneServer = page.createServerActions({
  axiosOpt: {
    url: '/data/hasError1.json',
    baseURL: config.baseURL,
  },
  done(respone, actions, dis) {
    if (respone.data.code === 0) {
      dis(actions.setError(respone.data, '自定义错误'))
      throw { msg: respone.data }
    }
  },
  force: true,
  isInitData: true,
  key: '_data',
  desc: '数据1',
})

export const setAllData = () => (dispatch: any) => {
  dispatch(dataOneServer.requestAndSave())
}
