import { BaseServerEnvSchema, getCombinedServerEnv, getSecrets } from '@trackplay/core'
import type { BaseServerEnv, ConfigSchema, SchemaOutput } from '@trackplay/core'

export type EnvValues<T extends ConfigSchema> = Readonly<BaseServerEnv & SchemaOutput<T>>
export type SecretValues<T extends ConfigSchema> = Readonly<SchemaOutput<T>>

interface RuntimeConfig<EnvValues, SecretValues> {
  env: EnvValues
  secrets: SecretValues
  isDevelopment: boolean
}

export const prepareRuntime = <EnvConfig extends ConfigSchema, SecretConfig extends ConfigSchema>(
  envSchema: EnvConfig,
  secretSchema: SecretConfig,
  serviceName?: string,
): RuntimeConfig<EnvValues<EnvConfig>, SecretValues<SecretConfig>> => {
  const env = getCombinedServerEnv(BaseServerEnvSchema, envSchema)
  const isDevelopment = env.ENVIRONMENT === 'development'
  const secrets = getSecrets(secretSchema, { isDevelopment, serviceName })

  return {
    env,
    secrets,
    isDevelopment,
  }
}
