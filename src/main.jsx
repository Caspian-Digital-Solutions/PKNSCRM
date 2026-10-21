import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import { StoreProvider } from './store.jsx';
import { UiProvider } from './ui.jsx';
import App from './App.jsx';
import './styles/tokens.css';
import './styles.css';
import './styles/type.css';

createRoot(document.getElementById('root')).render(
  <StoreProvider>
    <UiProvider>
      <App />
    </UiProvider>
  </StoreProvider>,
);
