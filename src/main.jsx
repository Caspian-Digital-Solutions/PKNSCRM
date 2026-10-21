import { createRoot } from 'react-dom/client';
import { StoreProvider } from './store.jsx';
import { UiProvider } from './ui.jsx';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StoreProvider>
    <UiProvider>
      <App />
    </UiProvider>
  </StoreProvider>,
);
