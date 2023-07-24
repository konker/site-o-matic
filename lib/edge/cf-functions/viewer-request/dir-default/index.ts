import path from 'path';

import { WEB_HOSTING_VIEWER_REQUEST_DIR_DEFAULT_FUNCTION_PRODUCER_ID } from '../../../../consts';
import { noopSubComponentIdSorter } from '../../../lib';

export const ID = WEB_HOSTING_VIEWER_REQUEST_DIR_DEFAULT_FUNCTION_PRODUCER_ID;
export const TEMPLATE_FILE_PATH = path.join(__dirname, './cf-functions-dir-default.js.hbs');
export const sortSubComponentIds = noopSubComponentIdSorter;
