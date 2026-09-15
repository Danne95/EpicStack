import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

/** Precache exactly the emitted release, including its HTML and hashed assets. */
export function offlineBuild(): Plugin {
  return {
    name: 'epicstack-offline',
    apply: 'build',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const source = readFileSync(
          new URL('./frontend/web/service-worker.js', import.meta.url),
          'utf8',
        );
        const files = Object.keys(bundle).sort();
        const hash = createHash('sha256').update(source);
        for (const name of files) {
          const file = bundle[name]!;
          hash.update(name).update(file.type === 'chunk' ? file.code : file.source);
        }
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: `self.__VERSION = ${JSON.stringify(hash.digest('hex'))};\nself.__PRECACHE = ${JSON.stringify(files)};\n${source}`,
        });
      },
    },
  };
}
