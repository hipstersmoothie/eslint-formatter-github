import eslint from 'eslint';
import pretty from 'eslint-formatter-pretty';

import createCheck from './create-check';

const formatter: eslint.CLIEngine.Formatter = results => {
  createCheck(results);
  return pretty(results);
};

export = formatter;
