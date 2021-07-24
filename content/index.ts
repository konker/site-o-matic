import * as DefaultContentProducer from './producers/default';
import { SomSiteParams } from '../lib';

export interface ContentProducer {
  getId(): string;
  init(context: SomSiteParams): Promise<void>;
  cleanBuildDir(context: SomSiteParams): Promise<void>;
  generateContent(context: SomSiteParams): Promise<string>;
}

export function getContentProducer(contentProducerId: string) {
  switch (contentProducerId) {
    case DefaultContentProducer.getId():
      return DefaultContentProducer;
    default:
      throw new Error(`No such content producer: ${contentProducerId}`);
  }
}
