/*
Modal 组件概述
- 行为：open 控制显隐；提供标题、主体与动作区域，默认附带“关闭”按钮。
*/
import type { FC } from '@rue-js/rue'

interface ModalProps {
  open: boolean
  title?: string
  children?: any
  actions?: any
  className?: string
  onClose?: () => void
}

/** 模态框组件：受控显隐与动作区 */
const Modal: FC<ModalProps> = ({ open, title, children, actions, className, onClose }) => {
  if (!open) return null
  return (
    <div className="modal modal-open">
      <div className={`modal-box ${className ?? ''}`}>
        {title ? <div className="font-semibold mb-2">{title}</div> : null}
        {children}
        <div className="modal-action">
          {actions}
          {onClose ? (
            <button className="btn" onClick={onClose}>
              关闭
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default Modal
