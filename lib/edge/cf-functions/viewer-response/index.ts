import path from 'path';

import { WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID } from '../../../consts';
import { asyncCreateEmptyObject, matchArraySortingFragmentProducerDefs } from '../../../utils';
import { ID as ID1 } from './csp-hashes';

export const ID = WEB_HOSTING_VIEWER_RESPONSE_FUNCTION_PRODUCER_ID;
export const TEMPLATE_FILE_PATH = path.join(__dirname, './cf-functions-viewer-response.js.hbs');
export const sortFragmentProducerDefs = matchArraySortingFragmentProducerDefs([ID1]);
export const createExtraContext = asyncCreateEmptyObject;
