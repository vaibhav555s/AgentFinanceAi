import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const apiKey = envConfig.VITE_GROQ_API_KEY;

async function listModels() {
    try {
        const response = await axios.get('https://api.groq.com/openai/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const visionModels = response.data.data
            .map(m => m.id)
            .filter(id => id.includes('vision') || id.includes('multimodal') || id.includes('llama-3.2') || id.includes('llama-4'));
        console.log('Available Models:', JSON.stringify(visionModels, null, 2));
    } catch (err) {
        console.error('API Error:', err.response?.data || err.message);
    }
}

listModels();
