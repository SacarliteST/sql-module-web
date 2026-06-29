import '@mantine/core/styles.css';
import { createRoot, type Root } from 'react-dom/client';
import { App } from './App';
import type { AppConfig } from './config/app-config';
import { AppProviders } from './providers/AppProviders';

export function mount(element: HTMLElement, config: AppConfig): Root {
  const root = createRoot(element);

  root.render(
    <AppProviders config={config}>
      <App />
    </AppProviders>,
  );

  return root;
}

export type { AppConfig } from './config/app-config';
