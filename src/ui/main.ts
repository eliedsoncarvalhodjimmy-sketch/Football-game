import './styles/theme.css';
import { WorkerClient } from '../worker/client';
import { startApp } from './app';

const worker = new Worker(new URL('../worker/sim.worker.ts', import.meta.url), { type: 'module' });
startApp(document.getElementById('app')!, new WorkerClient(worker));
