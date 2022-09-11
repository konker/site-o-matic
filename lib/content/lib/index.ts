// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import MetalsmithInPlace from '@metalsmith/in-place';
import fs from 'fs';
import JSZip from 'jszip';
import Metalsmith from 'metalsmith';
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
    Metalsmith(contentDirPath)
      .source('.')
      .destination(tmpDirPath)
      .metadata({ somId, manifest })
      .use(
        MetalsmithInPlace({
          suppressNoFilesError: true,
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
