import {backup} from './main';

export const handler = async function () {
  await backup();
};
