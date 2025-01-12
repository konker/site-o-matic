import * as z from 'zod';

import { SOM_CONFIG_DEFAULT_SOM_PREFIX, SOM_CONFIG_DEFAULT_SOM_TAG_NAME } from '../../consts';

export const SiteOMaticConfig = z
  .object({
    AWS_REGION_CONTROL_PLANE: z.string().regex(/..-[a-z]+-\d+[a-z]?/),
    AWS_REGION_DEPLOYMENT_DEFAULT: z.string().regex(/..-[a-z]+-\d+[a-z]?/),
    WEBMASTER_EMAIL_DEFAULT: z
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
