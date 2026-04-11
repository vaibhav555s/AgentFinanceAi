import fs from 'fs';
import { extractFinancialData } from './src/modules/ai/extraction.js';

const text = "My name is Rahul Sharma. I earn 50000 per month and I am looking for a 3 lakh loan for medical expenses.. Actually wait, I meant my income is only 30k. Not 50000.";

const result = extractFinancialData(text);
const cleanOutput = {
  name: result.name.value,
  income: result.income.value,
  loanAmount: result.loanAmount.value,
  purpose: result.purpose.value
};

fs.writeFileSync('test-output.json', JSON.stringify(cleanOutput, null, 2));
