import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/barlow-semi-condensed/600.css';
import { StoreProvider } from './store.jsx';
import { UiProvider } from './ui.jsx';
import { AmpProvider } from './useAmp.jsx';
import App from './App.jsx';
import './styles/tokens.css';
import './styles.css';
import './styles/type.css';
import './styles/round2.css';
import './styles/alignment.css';
import './styles/amp.css';

createRoot(document.getElementById('root')).render(
  <StoreProvider>
    <UiProvider>
      <AmpProvider>
        <App />
      </AmpProvider>
    </UiProvider>
  </StoreProvider>,
);
