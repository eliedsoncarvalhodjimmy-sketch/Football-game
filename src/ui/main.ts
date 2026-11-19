// Arranque da app (Prompt 5, Bloco A1).
import './estilo.css';
import { arrancar } from './app.ts';

arrancar();
if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('./sw.js');
