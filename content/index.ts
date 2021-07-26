import * as DefaultContentProducer from './producers/default';
import * as MetalsmithContentProducer from './producers/metalsmith';
import { SomSiteProps } from '../lib';

export const CONTENT_PIPELINE_TYPE_CODECOMMIT_S3 = 'codecommit-s3';
export const CONTENT_PIPELINE_TYPE_CODECOMMIT_NPM = 'codecommit-npm';
export type ContentPipelineType = typeof CONTENT_PIPELINE_TYPE_CODECOMMIT_S3 | typeof CONTENT_PIPELINE_TYPE_CODECOMMIT_NPM;

export interface ContentProducerResult {
  zipFilePath: string;
  pipelineType: ContentPipelineType;
}

export interface ContentProducer {
  getId(): string;
  init(context: SomSiteProps): Promise<void>;
  generateContent(context: SomSiteProps, deploymentPath: string): Promise<ContentProducerResult>;
  clean(context: SomSiteProps): Promise<void>;
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
