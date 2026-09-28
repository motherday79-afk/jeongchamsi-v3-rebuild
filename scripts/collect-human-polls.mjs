import {writeFile} from 'node:fs/promises';
import {collectDocumentPolls} from '../lib/human-poll-document-collector.js';
const result=await collectDocumentPolls();
await writeFile('poll-output.json',JSON.stringify({schema:'JCS_OFFICIAL_POLL_SNAPSHOT_V1',...result}));
console.log(JSON.stringify(result.providers));
