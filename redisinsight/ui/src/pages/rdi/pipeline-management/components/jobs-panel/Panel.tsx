import React, { useCallback, useEffect, useState } from 'react'
import cx from 'classnames'
import {
  EuiButton,
  EuiButtonIcon,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  keys, EuiSuperSelectOption,
} from '@elastic/eui'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { isArray } from 'lodash'

import { PipelineJobsTabs } from 'uiSrc/slices/interfaces/rdi'
import { sendEventTelemetry, TelemetryEvent } from 'uiSrc/telemetry'
import { rdiDryRunJobSelector, rdiDryRunJob, setInitialDryRunJob } from 'uiSrc/slices/rdi/dryRun'
import MonacoJson from 'uiSrc/components/monaco-editor/components/monaco-json'
import DryRunJobCommands from 'uiSrc/pages/rdi/pipeline-management/components/dry-run-job-commands'
import DryRunJobTransformations from 'uiSrc/pages/rdi/pipeline-management/components/dry-run-job-transformations'
import { formatLongName } from 'uiSrc/utils'

import styles from './styles.module.scss'

export interface Props {
  job?: object
  onClose: () => void
}

const getTargetOption = (value: string) => {
  const formattedValue = formatLongName(value)

  return {
    value,
    inputDisplay: formattedValue,
    dropdownDisplay: formattedValue,
    'data-test-subj': `target-option-${value}`,
  }
}

const DryRunJobPanel = (props: Props) => {
  const { job, onClose } = props
  const { loading: isDryRunning, results } = useSelector(rdiDryRunJobSelector)

  const [isFullScreen, setIsFullScreen] = useState<boolean>(false)
  const [selectedTab, changeSelectedTab] = useState<PipelineJobsTabs>(PipelineJobsTabs.Transformations)
  const [input, setInput] = useState<string>('')
  const [isFormValid, setIsFormValid] = useState<boolean>(false)
  const [targetOptions, setTargetOptions] = useState<EuiSuperSelectOption<string>[]>([])
  const [selectedTarget, setSelectedTarget] = useState<string>()

  const dispatch = useDispatch()

  const { rdiInstanceId } = useParams<{ rdiInstanceId: string }>()

  useEffect(() => {
    window.addEventListener('keydown', handleEscFullScreen)
    return () => {
      window.removeEventListener('keydown', handleEscFullScreen)
    }
  }, [isFullScreen])

  useEffect(() => {
    try {
      const jsonValue = JSON.parse(input)
      setIsFormValid(isArray(jsonValue))
    } catch (e) {
      setIsFormValid(false)
    }
  }, [input])

  // componentWillUnmount
  useEffect(() => () => {
    dispatch(setInitialDryRunJob())
  }, [])

  useEffect(() => {
    if (!results?.output || !isArray(results.output)) return

    const targets = results.output
      .filter(({ connection }) => connection)
      .map(({ connection }) => getTargetOption(connection))
    setTargetOptions(targets)
    setSelectedTarget(targets[0]?.value)
  }, [results])

  const handleEscFullScreen = (event: KeyboardEvent) => {
    if (event.key === keys.ESCAPE && isFullScreen) {
      handleFullScreen()
    }
  }

  const handleChangeTab = (name: PipelineJobsTabs) => {
    if (selectedTab === name) return

    changeSelectedTab(name)
  }

  const handleFullScreen = () => {
    setIsFullScreen((value) => !value)
  }

  const handleDryRun = () => {
    sendEventTelemetry({
      event: TelemetryEvent.RDI_TEST_JOB_RUN,
      eventData: {
        id: rdiInstanceId,
      },
    })
    dispatch(rdiDryRunJob(rdiInstanceId, JSON.parse(input), job))
  }

  const isSelectAvailable = selectedTab === PipelineJobsTabs.Output
    && !!results?.output
    && (results?.output?.length > 1)
    && !!targetOptions.length

  const Tabs = useCallback(() => (
    <EuiTabs className={styles.tabs}>
      <EuiTab
        isSelected={selectedTab === PipelineJobsTabs.Transformations}
        onClick={() => handleChangeTab(PipelineJobsTabs.Transformations)}
        className={styles.tab}
        data-testid="transformations-tab"
      >
        <span className={styles.tabName}>Transformations</span>
      </EuiTab>
      <EuiTab
        isSelected={selectedTab === PipelineJobsTabs.Output}
        onClick={() => handleChangeTab(PipelineJobsTabs.Output)}
        className={styles.tab}
        data-testid="output-tab"
      >
        <>
          <span className={styles.tabName}>Output</span>
        </>
      </EuiTab>
    </EuiTabs>
  ), [selectedTab, isFullScreen])

  return (
    <div
      className={cx(styles.panel, { [styles.fullScreen]: isFullScreen })}
      data-testid="dry-run-panel"
    >
      <div className={styles.panelInner}>
        <div className={styles.header}>
          <EuiText className={styles.title}>Test transformation logic</EuiText>
          <div>
            <EuiButtonIcon
              iconSize="m"
              iconType={isFullScreen ? 'fullScreenExit' : 'fullScreen'}
              color="primary"
              aria-label="toggle fullscrenn dry run panel"
              className={styles.fullScreenBtn}
              onClick={handleFullScreen}
              data-testid="fullScreen-dry-run-btn"
            />
            <EuiButtonIcon
              iconSize="m"
              iconType="cross"
              color="primary"
              aria-label="close dry run panel"
              className={styles.closeBtn}
              onClick={onClose}
              data-testid="close-dry-run-btn"
            />
          </div>
        </div>
        <div className={styles.body}>
          <EuiText className={styles.text}>Add input data to test the transformation logic.</EuiText>
          <div className={styles.codeLabel}>
            <EuiText>Input</EuiText>
          </div>
          <MonacoJson
            value={input}
            onChange={setInput}
            disabled={false}
            wrapperClassName={styles.inputCode}
            data-testid="input-value"
          />
          <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={handleDryRun}
                iconType="play"
                iconSide="right"
                color="success"
                size="s"
                disabled={isDryRunning || !isFormValid}
                isLoading={isDryRunning}
                className={cx(styles.actionBtn, styles.runBtn)}
                data-testid="dry-run-btn"
              >
                Dry run
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <div className={cx(styles.tabsWrapper, styles.codeLabel)}>
            <EuiText>Results</EuiText>
            {isSelectAvailable && (
              <EuiSuperSelect
                options={targetOptions}
                valueOfSelected={selectedTarget}
                onChange={(value) => setSelectedTarget(value)}
                popoverClassName={styles.selectWrapper}
                data-testid="target-select"
              />
            )}
            <Tabs />
          </div>
          {selectedTab === PipelineJobsTabs.Transformations && (<DryRunJobTransformations />)}
          {selectedTab === PipelineJobsTabs.Output && (<DryRunJobCommands target={selectedTarget} />)}
        </div>
      </div>
    </div>
  )
}

export default DryRunJobPanel
