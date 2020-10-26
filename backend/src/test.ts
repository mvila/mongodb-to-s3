import {backup} from './main';

(async () => {
  await backup();
})().catch((error) => {
  console.error(error);
});
