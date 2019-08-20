import eslint from 'eslint';
import pretty from 'eslint-formatter-pretty';

import createCheck from './create-check';

const formatter: eslint.CLIEngine.Formatter = results => {
  let errorCount = 0;
  let warningCount = 0;

  results.forEach(result => {
    const { messages } = result;

    if (messages.length === 0) {
      return;
    }

    errorCount += result.errorCount;
    warningCount += result.warningCount;
  });

  createCheck(results, errorCount, warningCount);

  return pretty(results);
};

export = formatter;
