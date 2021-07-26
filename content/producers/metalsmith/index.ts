import * as path from 'path';
import * as fs from 'fs';
import * as JSZip from 'jszip';
import * as Handlebars from 'handlebars';
import { SomSiteProps } from '../../../lib';
import { CONTENT_PIPELINE_TYPE_CODECOMMIT_NPM, ContentProducerResult } from '../../index';

export const ID = 'metalsmith';

const BUILD_DIR = '.som';
const ZIP_FILE_NAME = 'default.zip';

const files = ['index.html', '404.html'];
const templates: any = {};

export function getId() {
  return ID;
}

export async function init(context: SomSiteProps): Promise<void> {
  // Initialize temporary build directory
  const tempDir = path.join(__dirname, BUILD_DIR, context.rootDomain);
  await fs.promises.mkdir(tempDir, {
    recursive: true,
  });

  // Load and compile content templates
  const templateDir = path.join(__dirname, 'templates');
  for (const file of files) {
    const templatePath = path.join(templateDir, `${file}.handlebars`);
    const templateSrc = fs.readFileSync(templatePath);
    templates[file] = Handlebars.compile(templateSrc.toString());
  }
}

export async function clean(context: SomSiteProps): Promise<void> {
  const tempDir = path.join(__dirname, BUILD_DIR, context.rootDomain);
  await fs.promises.rmdir(tempDir, { recursive: true });
}

export async function generateContent(context: SomSiteProps, deploymentPath: string): Promise<ContentProducerResult> {
  const tempDir = path.join(__dirname, BUILD_DIR, context.rootDomain);
  const zipFilePath = path.join(tempDir, `${deploymentPath}--${ZIP_FILE_NAME}`);

  const zip = new JSZip();
  for (const file of files) {
    zip.file(path.posix.join(deploymentPath, file), templates[file]({ somSiteParams: context }));
  }

  return new Promise((resolve, reject) => {
    zip
      .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
      .pipe(fs.createWriteStream(zipFilePath))
      .on('finish', () =>
        resolve({
          zipFilePath,
          pipelineType: CONTENT_PIPELINE_TYPE_CODECOMMIT_NPM,
        })
      )
      .on('error', reject);
  });
}
