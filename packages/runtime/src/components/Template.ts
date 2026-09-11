import type { FC, PropsWithChildren } from '../rue'

export type TemplateProps = PropsWithChildren<Record<string, unknown>>

/** Transparent compiled slot carrier; it never interprets arbitrary children. */
export const Template: FC<TemplateProps> = () => {
  throw new Error('[rue] Template requires compilation')
}
