import { type FC, Teleport, Transition, onMounted, onUnmounted, ref, useState } from 'rue-js'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

// Modal component with customizable header/body/footer and CSS transitions
const Modal: FC<{
  visible: boolean
  onClose?: () => void
  header?: any
  body?: any
  footer?: any
  to?: string | HTMLElement
}> = props => {
  // 键盘 ESC 关闭支持
  onMounted(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && props.visible) {
        if (props.onClose) props.onClose()
      }
    }
    const add = (globalThis as any).addEventListener
    if (typeof add === 'function') add('keydown', onKey)
    onUnmounted(() => {
      const remove = (globalThis as any).removeEventListener
      if (typeof remove === 'function') remove('keydown', onKey)
    })
  })

  const content = (
    <>
      <style>{`
/* Modal styles (Transition-driven) */
.modal-mask {
  position: fixed;
  z-index: 9998;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  transition: opacity 300ms ease;
  opacity: 1;
}

.modal-container {
  width: 300px;
  margin: auto;
  padding: 20px 30px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
  backface-visibility: hidden;
}

.modal-header h3 {
  margin-top: 0;
  color: #42b983;
}

.modal-body {
  margin: 20px 0;
}

.modal-default-button {
  float: right;
}

/* Transition classes for modal */
.modal-enter-active, .modal-leave-active { transition: opacity 300ms ease; }
.modal-enter-from { opacity: 0; }
.modal-leave-to { opacity: 0; }

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 600ms ease, opacity 600ms ease;
  will-change: transform, opacity;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(2.5);
  opacity: 0.70;
}
`}</style>

      {props.visible ? (
        <Transition name="modal" type="transition" duration={{ enter: 1220, leave: 2200 }} appear>
          <div
            className="modal-mask"
            onClick={() => {
              if (props.onClose) props.onClose()
            }}
          >
            <div
              className="modal-container"
              onClick={(e: any) => {
                e.stopPropagation()
              }}
            >
              <div className="modal-header">{props.header ?? <h3>default header</h3>}</div>
              <div className="modal-body">{props.body ?? <p>default body</p>}</div>
              <div className="modal-footer">
                {props.footer ?? (
                  <>
                    default footer
                    <button
                      className="modal-default-button"
                      onClick={() => {
                        if (props.onClose) props.onClose()
                      }}
                    >
                      OK
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>{' '}
        </Transition>
      ) : null}
    </>
  )

  return <Teleport to={props.to ?? ('body' as any)}>{content}</Teleport>
}

const ModalExample: FC = () => {
  const [visibleModal, setVisibleModal] = useState(false)
  const activeTab = ref<'preview' | 'code'>('preview')

  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">带过渡动效的模态框（移植自 Vue）</h1>

      <div role="tablist" className="tabs tabs-box">
        <button
          role="tab"
          className={`tab ${activeTab.value === 'preview' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'preview'
          }}
        >
          效果
        </button>
        <button
          role="tab"
          className={`tab ${activeTab.value === 'code' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'code'
          }}
        >
          代码
        </button>
      </div>

      <div className="mt-4 grid md:grid-cols-1 gap-6 items-start">
        {activeTab.value === 'code' && (
          <div className="card bg-base-100 shadow overflow-auto h-[360px] md:h-[560px]">
            <Code
              className="h-full"
              lang="tsx"
              code={`import { type FC, useState, onMounted, onUnmounted, Transition, Teleport, ref } from 'rue-js';
            
// Modal component with customizable header/body/footer and CSS transitions
const Modal: FC<{
  visible: boolean;
  onClose?: () => void;
  header?: any;
  body?: any;
  footer?: any;
  to?: string | HTMLElement;
}> = (props) => {
  // 键盘 ESC 关闭支持
  onMounted(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && props.visible) {
        props.onClose && props.onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    onUnmounted(() => {
      document.removeEventListener('keydown', onKey);
    });
  });

  const content = (
    <>
    <style>{\`
/* Modal styles (Transition-driven) */
.modal-mask {
  position: fixed;
  z-index: 9998;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  transition: opacity 300ms ease;
  opacity: 1;
}

.modal-container {
  width: 300px;
  margin: auto;
  padding: 20px 30px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
  backface-visibility: hidden;
}

.modal-header h3 {
  margin-top: 0;
  color: #42b983;
}

.modal-body {
  margin: 20px 0;
}

.modal-default-button {
  float: right;
}

/* Transition classes for modal */
.modal-enter-active, .modal-leave-active { transition: opacity 300ms ease; }
.modal-enter-from { opacity: 0; }
.modal-leave-to { opacity: 0; }

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 600ms ease, opacity 600ms ease;
  will-change: transform, opacity;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(2.5);
  opacity: 0.70;
}
\`}</style>

      {props.visible ? (
            <Transition name="modal" type="transition" duration={{ enter: 1220, leave: 2200 }} appear>
        <div className="modal-mask" onClick={() => props.onClose && props.onClose()}>
          <div className="modal-container" onClick={(e: any) => { e.stopPropagation(); }}>
            <div className="modal-header">
              {props.header ?? <h3>default header</h1>}
            </div>
            <div className="modal-body">
              {props.body ?? <p>default body</p>}
            </div>
            <div className="modal-footer">
              {props.footer ?? (
                <>
                  default footer
                  <button className="modal-default-button" onClick={() => props.onClose && props.onClose()}>OK</button>
                </>
              )}
            </div>
          </div>
        </div>    </Transition>
      ) : null} 

      </>
  );

  return props.to ? (<Teleport to={props.to}>{content}</Teleport>) : (<Teleport to={document.body as any}>{content}</Teleport>);
};   

const ModalExample: FC = () => {
  const [visibleModal, setVisibleModal] = useState(false);
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body grid gap-4">
        <button
          id="visible-modal"
          className="btn btn-primary w-fit"
          onClick={() => setVisibleModal(true)}
        >
          Visible Modal
        </button>
        {/* Teleport 到 body */}
        <Modal
          visible={visibleModal.value}
          onClose={() => setVisibleModal(false)}
          header={<h3>Custom Header</h1>}
          body={<p>Custom body content here...</p>}
          to="body"
        />
      </div>
    </div>
  );
};

export default ModalExample;`}
            />
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body grid gap-4">
              <button
                id="visible-modal"
                className="btn btn-primary w-fit"
                onClick={() => setVisibleModal(true)}
              >
                Visible Modal
              </button>
              {/* Teleport 到 body */}
              --------{visibleModal.value}-------
              <Modal
                visible={visibleModal.value}
                onClose={() => setVisibleModal(false)}
                header={<h3>Custom Header</h3>}
                body={<p>Custom body content here...</p>}
                to="body"
              />
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default ModalExample
