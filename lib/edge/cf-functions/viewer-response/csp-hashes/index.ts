import path from 'path';

import { WEB_HOSTING_VIEWER_RESPONSE_CSP_HASHES_FUNCTION_PRODUCER_ID } from '../../../../consts';
import { asyncCreateEmptyObject } from '../../../../utils';
import { noopSubComponentIdSorter } from '../../../lib';

export const ID = WEB_HOSTING_VIEWER_RESPONSE_CSP_HASHES_FUNCTION_PRODUCER_ID;
export const TEMPLATE_FILE_PATH = path.join(__dirname, './cf-functions-csp-hashes.js.hbs');
export const sortSubComponentIds = noopSubComponentIdSorter;
export const createExtraContext = asyncCreateEmptyObject;
