import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useParams } from 'react-router-dom'

import {
  fetchConnectedInstanceAction,
  fetchConnectedInstanceInfoAction,
  fetchInstancesAction,
  getDatabaseConfigInfoAction,
  instancesSelector,
} from 'uiSrc/slices/instances/instances'
import {
  fetchRecommendationsAction,
} from 'uiSrc/slices/recommendations/recommendations'
import {
  appContextSelector,
  resetDatabaseContext,
  setAppContextConnectedInstanceId,
  setDbConfig,
} from 'uiSrc/slices/app/context'
import { BrowserStorageItem, FeatureFlags } from 'uiSrc/constants'
import { localStorageService } from 'uiSrc/services'
import { InstancePageTemplate } from 'uiSrc/templates'
import { getPageName } from 'uiSrc/utils/routing'
import { resetConnectedInstance as resetRdiConnectedInstance } from 'uiSrc/slices/rdi/instances'
import { appConnectivityError } from 'uiSrc/slices/app/connectivity'
import { appFeatureFlagsFeaturesSelector } from 'uiSrc/slices/app/features'
import InstancePageRouter from './InstancePageRouter'
import InstanceConnectionLost from './instanceConnectionLost'

export interface Props {
  routes: any[]
}

const InstancePage = ({ routes = [] }: Props) => {
  const [isShouldChildrenRerender, setIsShouldChildrenRerender] = useState(false)

  const dispatch = useDispatch()
  const { pathname } = useLocation()

  const { instanceId: connectionInstanceId } = useParams<{ instanceId: string }>()
  const { data: modulesData } = useSelector(instancesSelector)
  const { contextInstanceId } = useSelector(appContextSelector)
  const connectivityError = useSelector(appConnectivityError)
  const { [FeatureFlags.envDependent]: envDependent } = useSelector(appFeatureFlagsFeaturesSelector)

  const lastPageRef = useRef<string>()

  useEffect(() => {
    dispatch(fetchConnectedInstanceAction(connectionInstanceId, () => {
      !modulesData.length && dispatch(fetchInstancesAction())
    }))
    dispatch(getDatabaseConfigInfoAction(connectionInstanceId))
    dispatch(fetchConnectedInstanceInfoAction(connectionInstanceId))
    dispatch(fetchRecommendationsAction(connectionInstanceId))

    if (contextInstanceId && contextInstanceId !== connectionInstanceId) {
      // rerender children only if the same page from scratch to clear all component states
      if (lastPageRef.current === getPageName(connectionInstanceId, pathname)) {
        setIsShouldChildrenRerender(true)
      }

      dispatch(resetDatabaseContext())
    }

    dispatch(setAppContextConnectedInstanceId(connectionInstanceId))
    dispatch(setDbConfig(localStorageService.get(BrowserStorageItem.dbConfig + connectionInstanceId)))

    // clear rdi connection
    dispatch(resetRdiConnectedInstance())
  }, [connectionInstanceId])

  useEffect(() => {
    lastPageRef.current = getPageName(connectionInstanceId, pathname)
  }, [pathname])

  useEffect(() => {
    if (isShouldChildrenRerender) {
      dispatch(resetDatabaseContext())
      setIsShouldChildrenRerender(false)
    }
  }, [isShouldChildrenRerender])

  if (isShouldChildrenRerender) {
    return null
  }

  return (
    <InstancePageTemplate>
      {
        !envDependent?.flag && connectivityError
          ? <InstanceConnectionLost />
          : <InstancePageRouter routes={routes} />
      }
    </InstancePageTemplate>
  )
}

export default InstancePage
