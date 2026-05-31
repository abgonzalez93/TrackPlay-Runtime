import { basename } from 'path'
import { TrackPlayError, type ConfigSchema } from '@trackplay/core'
import { createServerBuilder, type ServerBuilder, type RuntimeBuilder } from './builder.runtime.ts'

interface BootstrapOptions<
  EnvConfig extends ConfigSchema,
  SecretConfig extends ConfigSchema,
  Infra extends object,
  App extends object,
  Interface extends object,
> {
  configure: (builder: ServerBuilder) => RuntimeBuilder<EnvConfig, SecretConfig, Infra, App, Interface>
}

const handleFatalError = (error: unknown): never => {
  if (error instanceof TrackPlayError) {
    console.error('Fatal TrackPlay Error')
    console.error(`Code: ${error.code}`)
    console.error(`Title: ${error.title}`)
    console.error(`Message: ${error.message}`)

    if (error.errors) {
      console.error('Errors:')

      if (Array.isArray(error.errors)) {
        error.errors.forEach((err) => console.error(err))
      } else {
        console.error(error.errors)
      }
    }
  } else if (error instanceof Error) {
    const name = error.name.replace(/^\[|\]$/g, '')
    console.error('Fatal System Error')
    console.error(`Type: ${name}`)
    console.error(`Message: ${error.message}`)
    if (error.stack) console.error(`Stack: ${error.stack}`)
  } else {
    console.error('Fatal Unknown Error')
    console.error('Details:', error)
  }

  process.exit(1)
}

export const bootstrap = async <
  EnvConfig extends ConfigSchema,
  SecretConfig extends ConfigSchema,
  Infra extends object,
  App extends object,
  Interface extends object,
>(
  options: BootstrapOptions<EnvConfig, SecretConfig, Infra, App, Interface>,
  builderFactory: (name: string) => ServerBuilder = createServerBuilder,
): Promise<void> => {
  try {
    const serviceName = basename(process.cwd())
    const builder = builderFactory(serviceName)
    const configuredBuilder = options.configure(builder)
    const runtime = await configuredBuilder.build()
    runtime.start()
  } catch (error) {
    handleFatalError(error)
  }
}
