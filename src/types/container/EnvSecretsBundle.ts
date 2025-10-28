/**
 * **EnvSecretsBundle**
 *
 * Represents the resolved environment variables and secrets
 * injected into the dependency factories.
 */
export interface EnvSecretsBundle<
  TEnvSchema extends Record<string, unknown>,
  TSecretSchema extends Record<string, unknown>,
> {
  env: TEnvSchema
  secrets: TSecretSchema
}
