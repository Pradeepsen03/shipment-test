const Users = require('../models/user');
const Session = require('../models/session');
// const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Roles = require("../models/role")
const TransportCompany = require('../models/transportCompany');
const Plants = require("../models/plant")

// Controller to get all roles and login user 
const UserLogin = async (req, res, next) => {
    const { emailOrUsername, password, deviceInfo, push_notification_token } = req.body;
    try {
        // Find the user by email or username
        const user = await Users.findOne({
            $or: [
                { email: { $regex: `^${emailOrUsername}$`, $options: 'i' } },
                { username: { $regex: `^${emailOrUsername}$`, $options: 'i' } }
            ]
        });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        // Check if password is correct
        const isPasswordValid = password === user.password
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check and update push_notifications if token is provided
        if (push_notification_token) {
            const updatePushNotifications = user.push_notifications.some(
                (notif) => notif.token === push_notification_token
            );

            if (updatePushNotifications) {
                // If the token exists, update its status and timestamp
                await Users.updateOne(
                    { _id: user._id, 'push_notifications.token': push_notification_token },
                    {
                        $set: {
                            'push_notifications.$.islogin': true,
                            'push_notifications.$.created_at': Date.now(),
                        },
                    }
                );
            } else {
                // If no token found, create new push notification entry
                await Users.updateOne(
                    { _id: user._id },
                    {
                        $push: {
                            push_notifications: {
                                mobile_id: deviceInfo?.deviceId,
                                token: push_notification_token,
                                device: deviceInfo.deviceType || 'android',
                                created_at: Date.now(),
                                islogin: true,
                            },
                        },
                    }
                );
            }
        }

        // Generate JWT token (expires in 60 days)
        const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION });

        // Store the session with device info
        const newSession = new Session({
            userId: user._id,
            deviceInfo: {
                deviceId: deviceInfo.deviceId,
                deviceType: deviceInfo.deviceType,
                ip: req.ip, // You can use a package like 'request-ip' to get the user's IP
            },
        });
        await newSession.save();
        const roles = await Roles.findById(user?.roleid); // Fetch all roles    

        if (roles?.slug === "Munshi") {
            const company = await TransportCompany.find({ _id: user?.transport_company_id });
            res.status(200).json({ accessToken, user, roles, company });
        } else {
            // Send the response back
            const plant = await Plants.findById(user?.plantId)
            res.status(200).json({ accessToken, user, roles, plant });
        }

    } catch (error) {
        console.log("error is occured", error);
        next(error); // Handle error if fetching roles fails
    }
};



const UserLogout = async (req, res, next) => {
    const token = req.header('authorization')?.replace('Bearer ', ''); // Extract token from Authorization header
    const { push_notification_token } = req.body; // Assuming mobile_id is passed in the request body
    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;


        // Find the latest session and mark as logged out
        const session = await Session.findOne({ userId }).sort({ loginAt: -1 }).limit(1);
        if (session) {
            await Session.updateOne({ _id: session._id }, { logoutAt: new Date() });
        }

        const user = await Users.findById(userId)

        // Check if mobile_id already exists in push_notifications array
        const existingNotification = user.push_notifications.find(
            (notif) => notif.token === push_notification_token
        );

        if (existingNotification) {
            existingNotification.islogin = false
        }

        await user.save();
        res.json({ message: 'Logged out successfully' });
    } catch (err) {
        return res.status(403).json({ message: 'Invalid token' });
    }
};

module.exports = { UserLogin, UserLogout };

