/* eslint-disable @typescript-eslint/no-var-requires */
import fs from 'fs';
import Handlebars from 'handlebars';
import Metalsmith from 'metalsmith';
import os from 'os';
import path from 'path';

import type { SomManifest } from '../../types';

const MetalsmithInPlace = require('@metalsmith/in-place');
const MetalsmithRenamer = require('metalsmith-renamer');

export function getTmpDirPath(somId: string, contentProducerId?: string | undefined): string | undefined {
  return contentProducerId ? path.join(os.tmpdir(), `${somId}-${contentProducerId}`) : undefined;
}

export async function processContentDirectory(
  somId: string,
  manifest: SomManifest,
  contentDirPath: string,
  tmpDirPath: string
): Promise<boolean> {
  const stat = fs.lstatSync(contentDirPath);
  if (!stat.isDirectory()) {
    console.log(`[site-o-matic] ERROR: Content not a valid directory: ${contentDirPath}`);
    return false;
  }

  try {
    // We need this to be able to produce raw markdown in the output
    Handlebars.registerHelper('raw', function (options: any) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return options.fn(this);
    });

    Metalsmith(contentDirPath)
      .source('.')
      .destination(tmpDirPath)
      .metadata({ somId, manifest })
      .use(
        MetalsmithInPlace({
          suppressNoFilesError: true,
          engineOptions: {},
        })
      )
      .use(
        /* If we want .hbs files in the output, we need to process them as ._hbs.hbs files
           to stop the in-place plugin recursively processing each file as a .hbs.hbs
           After in-place is done, we rename ._hbs to .hbs
        */
        MetalsmithRenamer({
          HandlebarsFiles: {
            pattern: '**/*._hbs',
            rename: function (name: string) {
              const ext = path.extname(name);
              const base = path.basename(name, ext);
              const newExt = ext.substring(2); // ext includes the '.'
              return `${base}.${newExt}`;
            },
          },
        })
      )
      .build((error) => {
        if (error) throw error;
      });
    return true;
  } catch (ex: any) {
    console.log(ex);
    return false;
  }
}
