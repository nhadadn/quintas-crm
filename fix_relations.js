const axios = require('axios');

async function fixRelations() {
    try {
        console.log('Calling fix-relations endpoint...');
        const response = await axios.post('http://localhost:8055/test-endpoint/fix-relations');
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error fixing relations:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

fixRelations();
