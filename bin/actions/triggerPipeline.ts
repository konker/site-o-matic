import type Vorpal from 'vorpal';

import { createCodeCommitNoopCommit } from '../../lib/aws/codecommit';
import type { SomConfig, SomState } from '../../lib/consts';
import { getParam } from '../../lib/utils';

export function actionTriggerPipeline(vorpal: Vorpal, _: SomConfig, state: SomState) {
  return async (_: Vorpal.Args): Promise<void> => {
    const needsCodePipeline = !!state.manifest.pipeline;
    if (!state.manifest || !state.pathToManifestFile || !state.somId) {
      vorpal.log(`ERROR: no manifest loaded`);
      return;
    }

    if (!needsCodePipeline) {
      vorpal.log('No pipeline configured. Aborting');
      return;
    }
    const hasCodePipelineArn = !!getParam(state, 'code-pipeline-arn');
    if (!hasCodePipelineArn) {
      vorpal.log('No pipeline deployed yet. Aborting.');
      return;
    }

    state.spinner.start();
    const result = await createCodeCommitNoopCommit(state.somId);
    state.spinner.stop();
    if (result) {
      vorpal.log(`Pipeline triggered with commit ID: ${result}`);
    } else {
      vorpal.log('Could not trigger pipeline');
    }
  };
}
