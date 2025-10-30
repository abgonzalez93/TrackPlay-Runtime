/**
 * **BuildContext**
 *
 * Context object passed into dependency factories, containing
 * validated environment variables and secrets.
 */
export type BuildContext<EnvValues, SecretValues> = {
  env: EnvValues
  secrets: SecretValues
}
