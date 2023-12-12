const list = document.getElementById('list'); // список ответов от сервера
const startButton = document.getElementById('start'); // кнопка запуска long polling запросов
const finishButton = document.getElementById('finish'); // кнопка завершения long polling запросов
let isPolling = false; // текущее состояние запросов

let messageNumber = 0;
let count_request = 1;

const tcpConnect = async () => {
    try {
        const synNumber = Math.floor(Math.random() * 1000);
        const node = document.createElement('li');
        const response = await fetch('/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ synNumber }),
        });

        if (response.status === 200) {
            const responseData = await response.json();
            if (responseData.synResponse) {
                const synResponse = responseData.synResponse;
                if (synResponse === synNumber + 1 && responseData.connectionId) {
                    console.log('Успешное подключение. SYN и SYN+1 подтверждены.');
                    node.innerText = 'Успешное подключение...';
                    list.appendChild(node);
                    subscribe(responseData.connectionId);
                } else {
                    console.error('Ошибка: Полученный SYN+1 не совпадает с ожидаемым значением.');
                }
            } else {
                console.error('Ошибка при подключении:', responseData.message);

            }
        } else {
            console.error('Ошибка при выполнении запроса, статус', response.status);
            node.innerText = 'Не получилось подключиться к серверу';
            list.appendChild(node);
            finishConnectToServer();
        }
    } catch (error) {
        console.error('Ошибка при выполнении запроса:', error.message);
        finishConnectToServer();
    }
};


const subscribe = async (connectionId) => {
    try {
        const abortController = new AbortController();
        const abortSignal = abortController.signal;

        
        const node = document.createElement('li');
        const timeoutId = setTimeout(() => {
            node.innerText = 'Превышено время ожидания ответа от сервера (> 35с)';
            list.appendChild(node);
            abortController.abort();
        }, 35000);

        const response = await fetch('/get-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ connectionId, messageNumber: messageNumber+1}),
            signal: abortSignal,
        });

        clearTimeout(timeoutId);

        if (response.status === 200) {
            const responseData = await response.json();
            count_request = 1;
            if (responseData.curr_count === messageNumber+1) {
                messageNumber += 1;
                node.innerText = responseData.message;
                list.appendChild(node);
                count_request = 0;

                if (isPolling) {
                    subscribe(connectionId);
                }
            } else if (!isNaN(responseData.curr_count)) {
                node.innerText = responseData.message;
                list.appendChild(node);
                if (isPolling) {
                    subscribe(connectionId);
                }
            }

        }
    } catch (error) {
        const node = document.createElement('li');
        if (error.name === 'AbortError') {
            if (count_request < 3) {
                count_request += 1;
                node.innerText = "Сервер не отвечает, повторный запрос...";
                list.appendChild(node);
                if (isPolling) {
                    subscribe(connectionId);
                }
            } else {
                node.innerText = "Сервер не отвечает, соединение закрыто...";
                list.appendChild(node);
                finishConnectToServer();
            }
        } else {
            node.innerText = 'Ошибка при выполнении запроса';
            list.appendChild(node);
            finishConnectToServer();
        }
    }
};



const startConnectToServer = () => {
    finishButton.disabled = false;
    startButton.disabled = true;
    isPolling = true;
  
    tcpConnect();
  }


const finishConnectToServer = () => {
  startButton.disabled = false;
  finishButton.disabled = true;
  isPolling = false;
}
  