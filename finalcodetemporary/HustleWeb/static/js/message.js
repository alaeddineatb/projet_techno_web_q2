document.addEventListener('DOMContentLoaded', function() {
    const gameId = new URLSearchParams(window.location.search).get('gameId');
    const userId = localStorage.getItem('userId');
    
    if (!gameId || !userId) {
        window.location.href = '/games';
        return;
    }

    // Charger les messages
    loadMessages();

    // Envoyer un message
    document.getElementById('send-message').addEventListener('click', sendMessage);

    async function loadMessages() {
        try {
            const response = await fetch(`/api/messages?gameId=${gameId}`);
            const messages = await response.json();
            
            const container = document.getElementById('messages');
            container.innerHTML = '';
            
            messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message';
                messageDiv.innerHTML = `
                    <p><strong>${msg.username}:</strong> ${msg.content}</p>
                    <small>${new Date(msg.created_at).toLocaleString()}</small>
                `;
                container.appendChild(messageDiv);
            });
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    async function sendMessage() {
        const content = document.getElementById('message-content').value.trim();
        if (!content) return;

        try {
            const response = await fetch('/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userid: userId,
                    gameid: gameId,
                    message: content
                })
            });

            if (response.ok) {
                document.getElementById('message-content').value = '';
                loadMessages();
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
});