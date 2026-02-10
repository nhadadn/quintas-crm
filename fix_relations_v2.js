
const axios = require('axios');

async function main() {
    try {
        console.log('Checking relations...');
        const checkRes = await axios.get('http://localhost:8055/test-endpoint/check-relations');
        console.log('Current relations:', JSON.stringify(checkRes.data, null, 2));

        console.log('Fixing relations...');
        const fixRes = await axios.post('http://localhost:8055/test-endpoint/fix-relations');
        console.log('Fix result:', fixRes.data);

        console.log('Checking fields...');
        const checkFieldsRes = await axios.get('http://localhost:8055/test-endpoint/check-fields');
        console.log('Current fields:', JSON.stringify(checkFieldsRes.data, null, 2));

        console.log('Fixing fields...');
        const fixFieldsRes = await axios.post('http://localhost:8055/test-endpoint/fix-fields');
        console.log('Fix fields result:', fixFieldsRes.data);

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
            console.error('Status:', error.response.status);
        }
    }
}

main();
