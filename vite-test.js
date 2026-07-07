import { build } from 'vite';
build({
  build: {
    outDir: 'dist-test',
    rollupOptions: {
      input: 'test-worker.ts'
    }
  }
});
