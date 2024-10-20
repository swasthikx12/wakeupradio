const WebSocket = require('ws');

let users = [];
let sender = null;
let b = 0;
let a = 0;  
let userIdCounter = 1; // Counter for user IDs

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    let userId; // Variable to hold the user ID for this connection

    // Assign the first user to be the sender
    if (!sender) {
        sender = ws;
        ws.send(JSON.stringify({ message: "sender" }));

    } else {
        // Add new users (excluding sender) if fewer than 3 exist
        if (users.length < 3 && !users.find(u => u.ws === ws)) {
            userId = userIdCounter++; // Assign a unique user ID
            users.push({ ws, battery: null, userId }); // Store user ID with the user
            b += 1;  // Increment the count when a user is added
            
            // Send the user ID to the newly connected user
            ws.send(JSON.stringify({ message: "send", userId }));

        }
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
                        user.ws.send(JSON.stringify({ message: "send" }));
                    }
                });
                // Reset all battery values to null
                console.log("reseting battery");
                users.forEach(user => user.battery = null);
               console.log(users[0].battery);
            } else {
                // Send any received message back to the sender
                const formattedMessage = { message: message };
                sender.send(JSON.stringify(formattedMessage));
            }
        }

        // Check if all users have sent their battery values
        if (users.length === 3 && users.every(u => u.battery !== null)) {
            // Sort users by battery to find the max and second max
            const sortedUsers = users.slice().sort((a, b) => b.battery - a.battery);
            const maxUser = sortedUsers[0];
            const secondMaxUser = sortedUsers[1];

            // Send message only to the max user if the battery values have changed
            if (b === 3 || a === 3) {
                maxUser.ws.send(JSON.stringify({
                    message: 'max',
                    maxBattery: maxUser.battery,
                    secondMaxBattery: secondMaxUser.battery,
                }));

                b = 0; 
                a = 0; // Reset count after notifying
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
