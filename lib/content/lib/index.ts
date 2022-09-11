// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import MetalsmithInPlace from '@metalsmith/in-place';
import fs from 'fs';
import Handlebars from 'handlebars';
import JSZip from 'jszip';
import Metalsmith from 'metalsmith';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import MetalsmithRenamer from 'metalsmith-renamer';
import os from 'os';
import path from 'path';

import type { SomManifest } from '../../types';

export function getTmpDirPath(somId: string, contentProducerId?: string | undefined): string | undefined {
  return contentProducerId ? path.join(os.tmpdir(), `${somId}-${contentProducerId}`) : undefined;
}

export function getTmpZipFilePath(somId: string, contentProducerId?: string | undefined): string | undefined {
  return contentProducerId ? path.join(os.tmpdir(), `${somId}-${contentProducerId}.zip`) : undefined;
}

export type MetalsmithZipFilePluginOptions = {
  readonly zipFilePath: string;
};

function MetalsmithZipFilePlugin(options: MetalsmithZipFilePluginOptions) {
  return async function (files: Record<string, { contents: any }>, _: Metalsmith): Promise<void> {
    if (!options.zipFilePath) return;

    const zip = new JSZip();

    Object.entries(files).forEach(([filepath, file]) => {
      zip.file(filepath, file.contents);
    }, {});

    return new Promise((resolve, _) =>
      zip
        .generateNodeStream({
          type: 'nodebuffer',
          streamFiles: true,
          compression: 'STORE',
          platform: 'DOS',
        })
        .pipe(fs.createWriteStream(options.zipFilePath))
        .on('finish', function () {
          resolve();
        })
    );
  };
}

export async function processContentDirectoryZip(
  somId: string,
  manifest: SomManifest,
  contentDirPath: string,
  tmpZipFilePath: string
): Promise<boolean> {
  const stat = fs.lstatSync(contentDirPath);
  if (!stat.isDirectory()) {
    console.log(`[site-o-matic] ERROR: Content not a valid directory: ${contentDirPath}`);
    return false;
  }

  try {
    Metalsmith(contentDirPath)
      .source('.')
      .metadata({ somId, manifest })
      .use(
        MetalsmithInPlace({
          suppressNoFilesError: true,
        })
      )
      .use(MetalsmithZipFilePlugin({ zipFilePath: tmpZipFilePath }))
      .process((error) => {
        if (error) throw error;
      });
    return true;
  } catch (ex: any) {
    console.log(ex);
    return false;
  }
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
        // If we want .hbs files in the output, we need to process them as ._hbs.hbs file
        // to stop the in-place plugin recursively processing the file as a .hbs.hbs
        // After in-place is done, we rename ._hbs to .hbs
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
