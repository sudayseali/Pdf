import { build } from 'vite';
build({
  build: {
    rollupOptions: {
      input: 'test-worker.ts',
    }
  }
});
