import { readStandaloneConfig } from './app/config/read-standalone-config';
import { mount } from './app/mount';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root was not found');
}

mount(rootElement, readStandaloneConfig());
