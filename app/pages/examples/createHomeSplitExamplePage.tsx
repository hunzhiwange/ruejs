import { type FC } from '@rue-js/rue'
import ExamplePlayground from './ExamplePlayground'

type HomeSplitExamplePageOptions = {
  title: string
  source: string
  codeCardClassName?: string
  withoutSidebar?: boolean
}

type HomeSplitExamplePageProps = {
  options: HomeSplitExamplePageOptions
  children?: any
}

const HomeSplitExamplePage: FC<HomeSplitExamplePageProps> = ({ options, children }) => (
  <ExamplePlayground
    title={options.title}
    source={options.source}
    codeCardClassName={options.codeCardClassName}
    withoutSidebar={options.withoutSidebar}
  >
    {children}
  </ExamplePlayground>
)

export default HomeSplitExamplePage
