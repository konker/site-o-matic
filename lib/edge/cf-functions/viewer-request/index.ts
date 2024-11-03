import path from 'path';

import { WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID } from '../../../consts';
import { asyncCreateEmptyObject, matchArraySortingFragmentProducerDefs } from '../../../utils';
import { ID as ID1 } from './basic-auth';
import { ID as ID3 } from './dir-default';
import { ID as ID2 } from './redirect';

export const ID = WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID;
export const TEMPLATE_FILE_PATH = path.join(__dirname, './cf-functions-viewer-request.js.hbs');
export const sortFragmentProducerDefs = matchArraySortingFragmentProducerDefs([ID1, ID2, ID3]);
export const createExtraContext = asyncCreateEmptyObject;
