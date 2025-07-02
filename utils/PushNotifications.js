const { Expo } = require('expo-server-sdk');

const Notifications = async (pushToken, title, body , data) => {
    // Create an instance of Expo
    let expo = new Expo();

    // Validate push token
    if (!Expo.isExpoPushToken(pushToken)) {
        //console.log("Invalid push token:", pushToken);
        return { error: 'Invalid Expo push token' };
    }

    // Construct the message
    let message = {
        to: pushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
    };

    // Chunk the notifications if sending multiple at once
    let chunks = expo.chunkPushNotifications([message]);

    try {
        let tickets = [];
        for (let chunk of chunks) {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        }
        console.log("Tickets sent successfully:", tickets);

        // Check for errors in the tickets
        tickets.forEach(ticket => {
            if (ticket.status === 'error') {
                //console.log(`Error sending notification: ${ticket.message}`);
                if (ticket.details.error === 'DeviceNotRegistered') {
                    //console.log(`Push token is no longer registered: ${ticket.details.expoPushToken}`);
                    // Handle invalid token cleanup (e.g., remove from database)
                }
            }
        });

        return { success: true, tickets };
    } catch (error) {
        console.error("Error sending notifications:", error);
        return { success: false, error: 'Failed to send notification' };
    }
};

module.exports = Notifications;
