// The shell's one script (005 research R1, R14): it hydrates the shell the
// build rendered into `#os`, with the same component and the same props.
import '../styles/os.css';
import { hydrateRoot } from 'react-dom/client';
import { resume, siteData } from '@cv/content';
import { APPS } from '../apps/index.ts';
import { Os } from '../os/Os.tsx';

const root = document.getElementById('os');
if (root !== null) hydrateRoot(root, <Os resume={resume} siteData={siteData} apps={APPS} />);
