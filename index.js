const express = require('express');
const path = require('path');
const app = express();
const { v4: uuidv4 } = require('uuid');
const PORT = process.env.PORT || 3000;
const RESPONSE_TIMEOUT_WITH_NO_DATA = 30000;
const TIMEOUT_CHECK_DATA = 3000;
app.use(express.json());

const activeConnections = {};


app.use(express.static(path.join(__dirname, 'frontend')));


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
})

app.post('/connect', (req, res) => {
    try {
        const { synNumber } = req.body;
        const connectionId = uuidv4();
    
        if (synNumber && !isNaN(synNumber)) {
        const synResponse = Number(synNumber) + 1;
    
        res.json({ synResponse, connectionId });
    
        activeConnections[connectionId] = { curr_count: 0, total_count: 0, messages: [] };
        } else {
        res.status(400).json({ message: 'Неверный формат SYN' });
        }
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});


app.post('/get-message', (req, res) => {

    const randomPercentage = Math.floor(Math.random() * 100) + 1;
    if (randomPercentage <= 5) {
        return;
    }

    const { connectionId, messageNumber } = req.body;
    let countInterval = 0;
    if (!connectionId || !messageNumber) {
        return res.status(400).json({ message: 'Неверные параметры запроса' });
    }

    if (!activeConnections[connectionId]) {
        return res.status(404).json({ message: 'Несуществующий id соединения' });
    }

    if (activeConnections[connectionId]['messages'].length === 0) {
        const checkDataInterval = setInterval(() => {
            countInterval += 1;
            console.log("Interval", countInterval ,"/ 10")
            if (activeConnections[connectionId]['messages'].length > 0) {
                clearInterval(checkDataInterval);
                const mess = activeConnections[connectionId]['messages'].pop();
                activeConnections[connectionId]['curr_count'] += 1;

                return res.json({
                    message: `${mess} : ${activeConnections[connectionId]['curr_count']}/${activeConnections[connectionId]['total_count']}`,
                    curr_count: activeConnections[connectionId]['curr_count'],
                    total_count: activeConnections[connectionId]['total_count']
                });
            }
        }, TIMEOUT_CHECK_DATA);

        setTimeout(() => {
            clearInterval(checkDataInterval);
            if (!res.headersSent) {
                if (activeConnections[connectionId]['messages'].length === 0) {
                    return res.json({
                        message: `Нет данных ${activeConnections[connectionId]['curr_count']}/${activeConnections[connectionId]['total_count']}`,
                        curr_count: activeConnections[connectionId]['curr_count'],
                        total_count: activeConnections[connectionId]['total_count']
                    });
                }
            }
        }, RESPONSE_TIMEOUT_WITH_NO_DATA);
    } else {
        const mess = activeConnections[connectionId]['messages'].pop();
        activeConnections[connectionId]['curr_count'] += 1;

        return res.json({
            message: `${mess} : ${activeConnections[connectionId]['curr_count']}/${activeConnections[connectionId]['total_count']}`,
            curr_count: activeConnections[connectionId]['curr_count'],
            total_count: activeConnections[connectionId]['total_count']
        });
    }
});



app.post('/add-messages', (req, res) => {
    const { connectionId, newMessages } = req.body;

    if (!connectionId || !newMessages || !Array.isArray(newMessages)) {
        return res.status(400).json({ message: 'Неверные параметры запроса' });
    }

    if (!activeConnections[connectionId]) {
        return res.status(404).json({ message: 'Несуществующий id соединения' });
    }

    for (const mess of newMessages) {
        activeConnections[connectionId]['messages'].push(mess);
        activeConnections[connectionId]['total_count'] += 1;
    }

    res.json({ message: 'Сообщения успешно добавлены' });
});



  
app.listen(PORT, () => {
    console.log(`Server started at http://localhost:${PORT}`);
});


