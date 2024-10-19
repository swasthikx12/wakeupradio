const WebSocket = require('ws');

let users = [];
let sender = null;
let b = 0;
let a=0;  

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    // Assign the first user to be the sender
    if (!sender) {
        sender = ws;
        ws.send(JSON.stringify({ message: "sender" }));

    } else {
        // Add new users (excluding sender) if fewer than 3 exist
        if (users.length < 3 && !users.find(u => u.ws === ws)) {
            users.push({ ws, battery: null });
            b += 1;  // Increment the count when a user is added
            
        }
        ws.send(JSON.stringify({ message: "send" }));

    }

    ws.on('message', (m) => {
        const parsed = JSON.parse(m);
        const { battery, message } = parsed;

        // Assign battery value to the user who sent the message
        if (battery !== undefined) {  // Check if battery exists
            const user = users.find(u => u.ws === ws);
            if (user) {
                user.battery = battery;
                a += 1;  // Increment count when a battery value is received
                

            }
        }

        // If message type is 'low' or 'hi', process it
        if (message && sender) {
            if (message === 'low') {
                // Notify all users to send battery values
                a = 0;  // Reset count for the new battery values
                
        
                users.forEach((user) => {
                    if (user.ws.readyState === WebSocket.OPEN) {
                        user.ws.send('send');
                    }
                });
                // Reset all battery values to null
                users.forEach(user => user.battery = null);
            } else {
                // Send any received message back to the sender
                sender.send(JSON.stringify(message));
            }
        }
        

        // Check if all users have sent their battery values
        if (users.length === 3 && users.every(u => u.battery !== null)) {
            // Sort users by battery to find the max and second max
            const sortedUsers = users.slice().sort((a, b) => b.battery - a.battery);
            const maxUser = sortedUsers[0];
            const secondMaxUser = sortedUsers[1];

            // Send message only to the max user if the battery values have changed
            if (b === 3 || a===3 ) {
                maxUser.ws.send(JSON.stringify({
                    message: 'max',
                    maxBattery: maxUser.battery,
                    secondMaxBattery: secondMaxUser.battery,
                }));

                b = 0; 
                a=0; // Reset count after notifying
                

            }
        }
    });

    ws.on('close', () => {
        // Remove the disconnected user
        users = users.filter(u => u.ws !== ws);

        // Reset sender if they disconnect
        if (ws === sender) {
            sender = null;
        }
    });
});

console.log('WebSocket server is running on ws://localhost:8080');
