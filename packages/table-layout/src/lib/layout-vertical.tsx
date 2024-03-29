import classnames from 'classnames'
import * as React from 'react'
import { ITableLayoutYProps } from '../index.interface'
import { IRowTdProps } from './row-td'

/**
 * 垂直布局
 */
export const TableLayoutVertical: React.FunctionComponent<
  ITableLayoutYProps
> = (props) => {
  let rootStyle: React.CSSProperties = {}
  if (props.fullParent) {
    rootStyle = { height: '100%', width: '100%' }
  }
  const childrenList = React.Children.toArray(props.children)
  const children = childrenList.map(
    (item: React.ReactElement<IRowTdProps>, index: number) => {
      let paddingTop: number | undefined
      let paddingBottom: number | undefined
      if (props.space !== undefined) {
        paddingTop = props.space / 2
        paddingBottom = props.space / 2
        // 只有一个元素，没有任何边距
        if (childrenList.length === 1) {
          paddingTop = undefined
          paddingBottom = undefined
        }
        // 第一个只有边距
        if (index === 0) {
          paddingTop = undefined
        }
        // 最后一个只有上边距
        if (index === childrenList.length - 1) {
          paddingBottom = undefined
        }
      }
      return React.cloneElement(item, {
        ...item.props,
        style: {
          paddingTop,
          paddingBottom,
          ...item.props.style,
        },
        key: index,
      })
    },
  )
  return (
    <div
      className={classnames(props.className)}
      style={{
        ...props.style,
        ...rootStyle,
        display: 'table',
        tableLayout: 'fixed',
      }}
    >
      {children}
    </div>
  )
}
