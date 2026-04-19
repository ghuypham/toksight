import { render } from 'preact';
import { ExplorerApp } from './explorer-app';

const root = document.getElementById('root');
if (root) render(<ExplorerApp />, root);
