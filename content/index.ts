import * as DefaultContentProducer from './producers/default';
import * as MetalsmithContentProducer from './producers/metalsmith';
import { SiteProps } from '../lib';

export const CONTENT_PIPELINE_TYPE_CODECOMMIT_S3 = 'codecommit-s3';
export const CONTENT_PIPELINE_TYPE_CODECOMMIT_NPM = 'codecommit-npm';
export type ContentPipelineType = typeof CONTENT_PIPELINE_TYPE_CODECOMMIT_S3 | typeof CONTENT_PIPELINE_TYPE_CODECOMMIT_NPM;

export interface ContentProducerResult {
  zipFilePath: string;
  pipelineType: ContentPipelineType;
}

export interface ContentProducer {
  getId(): string;
  init(context: SiteProps): Promise<void>;
  generateContent(context: SiteProps, deploymentPath: string): Promise<ContentProducerResult>;
  clean(context: SiteProps): Promise<void>;
}

export function getContentProducer(contentProducerId: string): ContentProducer {
  switch (contentProducerId) {
    case DefaultContentProducer.getId():
      return DefaultContentProducer;
    case MetalsmithContentProducer.getId():
      return MetalsmithContentProducer;
    default:
      throw new Error(`No such content producer: ${contentProducerId}`);
  }
}
