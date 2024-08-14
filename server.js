const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: 'add.env' }); // Sử dụng tên file tùy chỉnh
const cors = require('cors');  // Import cors

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

const YOUR_CLIENT_ID = process.env.CLIENT_ID;
const YOUR_CLIENT_SECRET = process.env.CLIENT_SECRET;
const YOUR_REDIRECT_URI = process.env.REDIRECT_URI;

console.log('Client ID:', YOUR_CLIENT_ID);
console.log('Client Secret:', YOUR_CLIENT_SECRET);
console.log('Redirect URI:', YOUR_REDIRECT_URI);

const fieldMap = {
    'ID': 'ID',
    'NAME': 'NAME',
    'PHONE': 'PHONE',
    'EMAIL': 'EMAIL',
    'WEB': 'WEBSITE',
    'UF_CRM_1723577690': 'BANK_NAME',
    'UF_CRM_1723607846947': 'ADDRESS',
    'UF_CRM_1723608992': 'SOTK'
    
};

const mapFields = (apiResponse) => {
    return apiResponse.map(item => {
        const mappedItem = {};
        for (const key in item) {
            if (item.hasOwnProperty(key) && fieldMap[key]) {
                mappedItem[fieldMap[key]] = item[key];
            }
        }
        return mappedItem;
    });
};

app.get('/install', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send('Authorization code is missing.');
    }

    try {
        // Trao đổi authorization code để lấy access token
        const response = await axios.post('https://b24-837ka9.bitrix24.vn/oauth/token/', null, {
            params: {
                grant_type: 'authorization_code',
                client_id: YOUR_CLIENT_ID,
                client_secret: YOUR_CLIENT_SECRET,
                redirect_uri: YOUR_REDIRECT_URI,
                code: code,
                scope: 'crm,user,call,lists,contact_center'
            }
        });

        console.log('Response Data:', response.data);

        const { access_token, refresh_token } = response.data;

        // Lưu token vào file
        fs.writeFileSync(path.join(__dirname, 'tokens.json'), JSON.stringify({ access_token, refresh_token }));

        res.send('App installed successfully.');
    } catch (error) {
        if (error.response && error.response.data && error.response.data.error === 'expired_token') {
            console.error('Error: Authorization code has expired. Please request a new code.');
            res.status(400).send('Authorization code has expired. Please request a new code.');
        } else {
            console.error('Error exchanging code for token:', error.response ? error.response.data : error.message);
            res.status(500).send('Failed to install app.');
        }
    }
});

// Route làm mới token
app.get('/refresh', async (req, res) => {
    const { refresh_token } = getToken(); // Đọc refresh token từ file

    if (!refresh_token) {
        return res.status(400).send('Refresh token is missing.');
    }

    try {
        const response = await axios.post('https://b24-837ka9.bitrix24.vn/oauth/token/', null, {
            params: {
                grant_type: 'refresh_token',
                client_id: YOUR_CLIENT_ID,
                client_secret: YOUR_CLIENT_SECRET,
                refresh_token: refresh_token
            }
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;

        // Cập nhật token vào file
        fs.writeFileSync(path.join(__dirname, 'tokens.json'), JSON.stringify({ access_token, refresh_token: newRefreshToken }));

        res.send('Token refreshed successfully.');
    } catch (error) {
        console.error('Error refreshing token:', error.response ? error.response.data : error.message);
        res.status(500).send('Failed to refresh token.');
    }
});

// Đọc token từ file
const getToken = () => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading token file:', error.message);
        return null;
    }
};

app.get('/api/crm.contact.list', async (req, res) => {
    const tokens = getToken();
    if (!tokens || !tokens.access_token) {
        return res.status(400).send('Access token is missing.');
    }

    try {
        const response = await axios.get('https://b24-837ka9.bitrix24.vn/rest/crm.contact.list.json', {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`
            },
            params: {
                select: Object.keys(fieldMap)
            }
        });

        const mappedData = mapFields(response.data.result);

        res.json(mappedData);
    } catch (error) {
        if (error.response && error.response.data.error === 'expired_token') {
            console.log('Token expired, refreshing token...');
            try {
                await axios.get('http://localhost:3000/refresh');
                const tokens = getToken();
                const response = await axios.get('https://b24-837ka9.bitrix24.vn/rest/crm.contact.list.json', {
                    headers: {
                        'Authorization': `Bearer ${tokens.access_token}`
                    },
                    params: {
                        select: Object.keys(fieldMap)
                    }
                });

                const mappedData = mapFields(response.data.result);

                res.json(mappedData);
            } catch (refreshError) {
                console.error('Error refreshing token or calling API:', refreshError.response ? refreshError.response.data : refreshError.message);
                res.status(500).send('Failed to refresh token or call API.');
            }
        } else {
            console.error('Error calling API:', error.response ? error.response.data : error.message);
            res.status(500).send('Failed to call API.');
        }
    }
});

app.post('/api/crm.contact.add', async (req, res) => {
    console.log('Received contact data:', req.body); // Log dữ liệu nhận được
  
    const tokens = getToken();
    if (!tokens || !tokens.access_token) {
        return res.status(400).send('Access token is missing.');
    }

    // Điều chỉnh dữ liệu trước khi gửi đi
    const contactData = {
        fields: {
            NAME: req.body.NAME || '',
            PHONE: req.body.PHONE || [],
            EMAIL: req.body.EMAIL || [],
            UF_CRM_1723577690: req.body.BANK_NAME || '',
            UF_CRM_1723607846947: req.body.ADDRESS || '',
            WEB: req.body.WEBSITE || [],
            UF_CRM_1723608992: req.body.SOTK || '',
        }
    };

    try {
        const response = await axios.post('https://b24-837ka9.bitrix24.vn/rest/crm.contact.add.json', contactData, {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`
            }
        });

        console.log('Response from Bitrix24:', response.data); // Log phản hồi từ Bitrix24
        res.json(response.data);
    } catch (error) {
        console.error('Error adding contact:', error.response ? error.response.data : error.message);
        if (error.response && error.response.data.error === 'expired_token') {
            console.log('Token expired, refreshing token...');
            try {
                await axios.get('http://localhost:3000/refresh');
                const tokens = getToken();
                const response = await axios.post('https://b24-837ka9.bitrix24.vn/rest/crm.contact.add.json', contactData, {
                    headers: {
                        'Authorization': `Bearer ${tokens.access_token}`
                    }
                });

                res.json(response.data);
            } catch (refreshError) {
                console.error('Error refreshing token or adding contact:', refreshError.response ? refreshError.response.data : refreshError.message);
                res.status(500).send('Failed to refresh token or add contact.');
            }
        } else {
            res.status(500).send('Failed to add contact.');
        }
    }
});

app.put('/api/crm.contact.update/:id', async (req, res) => {
    const tokens = getToken();
    if (!tokens || !tokens.access_token) {
        return res.status(400).send('Access token is missing.');
    }

    try {
        const contactId = req.params.id;
        const contactData = {
            fields: req.body
        };
        const response = await axios.post(`https://b24-837ka9.bitrix24.vn/rest/crm.contact.update.json?id=${contactId}`, contactData, {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error updating contact:', error.response ? error.response.data : error.message);
        if (error.response && error.response.data.error === 'expired_token') {
            console.log('Token expired, refreshing token...');
            try {
                await axios.get('http://localhost:3000/refresh');
                const tokens = getToken();
                const response = await axios.post(`https://b24-837ka9.bitrix24.vn/rest/crm.contact.update.json?id=${contactId}`, req.body, {
                    headers: {
                        'Authorization': `Bearer ${tokens.access_token}`
                    }
                });

                res.json(response.data);
            } catch (refreshError) {
                console.error('Error refreshing token or updating contact:', refreshError.response ? refreshError.response.data : refreshError.message);
                res.status(500).send('Failed to refresh token or update contact.');
            }
        } else {
            res.status(500).send('Failed to update contact.');
        }
    }
});

app.delete('/api/crm.contact.delete/:id', async (req, res) => {
    const tokens = getToken();
    if (!tokens || !tokens.access_token) {
        return res.status(400).send('Access token is missing.');
    }

    try {
        const contactId = req.params.id;
        const response = await axios.post(`https://b24-837ka9.bitrix24.vn/rest/crm.contact.delete.json`, null, {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`
            },
            params: {
                id: contactId
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error deleting contact:', error.response ? error.response.data : error.message);
        if (error.response && error.response.data.error === 'expired_token') {
            console.log('Token expired, refreshing token...');
            try {
                await axios.get('http://localhost:3000/refresh');
                const tokens = getToken();
                const response = await axios.post(`https://b24-837ka9.bitrix24.vn/rest/crm.contact.delete.json`, null, {
                    headers: {
                        'Authorization': `Bearer ${tokens.access_token}`
                    },
                    params: {
                        id: contactId
                    }
                });

                res.json(response.data);
            } catch (refreshError) {
                console.error('Error refreshing token or deleting contact:', refreshError.response ? refreshError.response.data : refreshError.message);
                res.status(500).send('Failed to refresh token or delete contact.');
            }
        } else {
            res.status(500).send('Failed to delete contact.');
        }
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
