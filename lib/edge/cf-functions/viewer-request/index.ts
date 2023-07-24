import path from 'path';

import { WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID } from '../../../consts';
import { matchArraySorting } from '../../../utils';
import { ID as ID2 } from './dir-default';
import { ID as ID1 } from './redirect';

export const ID = WEB_HOSTING_VIEWER_REQUEST_FUNCTION_PRODUCER_ID;
export const TEMPLATE_FILE_PATH = path.join(__dirname, './cf-functions-viewer-request.js.hbs');
export const sortSubComponentIds = matchArraySorting([ID1, ID2]);
