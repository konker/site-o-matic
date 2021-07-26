import * as path from 'path';
import * as fs from 'fs';
import * as YAML from 'yaml';

async function main(argv: object) {
  console.log('site-o-matic', argv);

  const manifestDir = path.join(__dirname, '..', 'manifests');
  const manifestPath = path.join(manifestDir, 'site-o-matic.manifest.yaml');
  const manifestYaml = await fs.promises.readFile(manifestPath);
  const manifest = YAML.parse(manifestYaml.toString());
  console.log('site-o-matic', manifest);
}

main(process.argv).then(console.log).catch(console.error);
