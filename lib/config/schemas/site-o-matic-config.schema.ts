import * as z from 'zod';

import { SOM_CONFIG_DEFAULT_SOM_PREFIX, SOM_CONFIG_DEFAULT_SOM_TAG_NAME } from '../../consts';

export const SiteOMaticConfig = z
  .object({
    SOM_ROLE_ARN: z.string().regex(/^arn:aws:iam:.*:\d+:role\/.+$/),
    DEFAULT_WEBMASTER_EMAIL: z
      .string()
      .regex(/^.+@.+\..+$/)
      .optional(),
    SOM_TAG_NAME: z.string().min(1).optional(),
    SOM_PREFIX: z.string().min(2).optional(),
  })
  .transform((x) => ({
    ...x,
    SOM_TAG_NAME: x.SOM_TAG_NAME ?? SOM_CONFIG_DEFAULT_SOM_TAG_NAME,
    SOM_PREFIX: x.SOM_PREFIX ?? SOM_CONFIG_DEFAULT_SOM_PREFIX,
  }));

export type SiteOMaticConfig = z.TypeOf<typeof SiteOMaticConfig>;
