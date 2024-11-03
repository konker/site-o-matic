import path from 'path';

import { WEB_HOSTING_VIEWER_REQUEST_BASIC_AUTH_FUNCTION_PRODUCER_ID } from '../../../../consts';
import type {
  AuthClause,
  SiteOMaticManifest,
  WebHostingClauseWithResources,
} from '../../../../manifest/schemas/site-o-matic-manifest.schema';
import type { SecretsSetCollection } from '../../../../secrets/types';
import { noopSubComponentIdSorter } from '../../../lib';

export const ID = WEB_HOSTING_VIEWER_REQUEST_BASIC_AUTH_FUNCTION_PRODUCER_ID;
export const TEMPLATE_FILE_PATH = path.join(__dirname, './cf-functions-basic-auth.js.hbs');
export const sortSubComponentIds = noopSubComponentIdSorter;
export async function createExtraContext(
  _somId: string,
  secrets: SecretsSetCollection,
  _manifest: SiteOMaticManifest,
  _webHostingSpec: WebHostingClauseWithResources,
  spec: AuthClause
) {
  const username = secrets.lookup[spec.usernameSecretName];
  const password = secrets.lookup[spec.passwordSecretName];
  if (!username || !password) {
    throw new Error(`Could not resolve basic auth credentials`);
  }

  return {
    BASE64_AUTH_STRING: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
  };
}
