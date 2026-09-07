import type {
  ComponentInstance,
  ComponentProps,
  KeepAliveController,
  LifecycleController,
  Mounted,
  RuntimeState,
} from './types.js'

/*
KeepAlive 生命周期触发桥接。

当前编译协议以单锚点持有 mounted snapshot，因此 activated/deactivated 从全局或
owned anchor 表中定位子树，不再依赖已移除的双边界渲染状态。
*/

const visitMounted = <HostNode>(
  mounted: Mounted<HostNode> | undefined,
  visit: (instance: ComponentInstance<ComponentProps, HostNode>) => void,
): void => {
  if (!mounted) return
  if (mounted.kind === 'component') visit(mounted.instance)
  if (mounted.kind === 'component') {
    visitMounted(mounted.subtree, visit)
    return
  }
  if (mounted.kind === 'element' || mounted.kind === 'fragment') {
    for (const child of mounted.children) visitMounted(child, visit)
  }
}

/** Dispatch KeepAlive hooks for the mounted snapshot owned by an anchor. */
export const createKeepAliveController = <HostNode>(
  state: RuntimeState<HostNode>,
  lifecycle: LifecycleController,
): KeepAliveController<HostNode> => {
  const findMounted = (anchor: HostNode): Mounted<HostNode> | undefined =>
    state.anchorMounts.get(anchor)?.mounted ?? state.ownedMounts?.findAnchor(anchor)?.mounted

  const dispatch = (anchor: HostNode, name: 'activated' | 'deactivated'): void => {
    visitMounted(findMounted(anchor), instance => lifecycle.call(instance.host, name))
  }

  return {
    activate: anchor => dispatch(anchor, 'activated'),
    deactivate: anchor => dispatch(anchor, 'deactivated'),
  }
}
