import React, { useContext, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { DatabaseOverview } from 'uiSrc/components'
import {
  connectedInstanceOverviewSelector,
  connectedInstanceSelector,
  getDatabaseConfigInfoAction
} from 'uiSrc/slices/instances/instances'
import { ThemeContext } from 'uiSrc/contexts/themeContext'

import { getOverviewMetrics } from './components/OverviewMetrics'

const TIMEOUT_TO_GET_INFO = process.env.RI_TIMEOUT_TO_GET_INFO ? +process.env.RI_TIMEOUT_TO_GET_INFO : 5000 // 5 sec for production

const DatabaseOverviewWrapper = () => {
  let interval: NodeJS.Timeout
  const { theme } = useContext(ThemeContext)
  const { id: connectedInstanceId = '', db } = useSelector(connectedInstanceSelector)
  const overview = useSelector(connectedInstanceOverviewSelector)

  const dispatch = useDispatch()

  useEffect(() => {
    let timeout = TIMEOUT_TO_GET_INFO
    if (!Number.isNaN(timeout) || timeout < 1) {
      timeout = 5000
    }
    interval = setInterval(() => {
      if (document.hidden) return

      dispatch(getDatabaseConfigInfoAction(
        connectedInstanceId,
        () => {},
        () => clearInterval(interval)
      ))
    }, timeout)
    return () => clearInterval(interval)
  }, [connectedInstanceId])

  return (
    <DatabaseOverview
      metrics={getOverviewMetrics({ theme, items: overview, db })}
    />
  )
}

export default DatabaseOverviewWrapper
