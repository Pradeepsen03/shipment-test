const TruckDetails = require("../models/truckDetail");
const Shipments = require("../models/shipment")
const Shipmentstatus = require("../models/Shipmentstatus")
const jwt = require('jsonwebtoken');
const JWT_SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';
const Notifications = require("../utils/PushNotifications")
const nodemailer = require('nodemailer');
const Users = require('../models/user');
const Plants = require("../models/plant")
const TransportCompany = require('../models/transportCompany');

// Add truck Details
const AddTruckDetails = async (req, res, next) => {
    const token = req.header('authorization')?.replace('Bearer ', ''); // Extract token from Authorization header
    const decoded = jwt.verify(token, JWT_SECRET_KEY); // Verify token
    try {
        const { driver_name, mobile_number, truck_number, shipmentId, created_by, arrival_date } = req.body;

        // Check if all required fields are provided
        if (!driver_name || !mobile_number || !truck_number || !shipmentId || !created_by) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Check if the shipment exists to retrieve the shipment_number
        const shipment = await Shipments.findById(shipmentId);

        if (!shipment) {
            return res.status(400).json({ message: "Shipment not found with the provided shipmentId." });
        }
        let Shipmentstatusdata = await new Shipmentstatus({
            shipmentID: shipmentId,
            shipment_status: "Confirmed",
            userID: decoded?.userId
        });
        await Shipmentstatusdata.save();

        const TruckDetail = await TruckDetails.findById(shipmentId.TruckId);

        if (!TruckDetail) {
            // If no existing truck detail, create a new one
            const newTruckDetail = new TruckDetails({
                driver_name,
                mobile_number,
                truck_number,
                shipmentId,
                created_by,
                updated_by: created_by,
                arrival_date
            });


            // Save the new truck detail to the database
            const savedTruckDetail = await newTruckDetail.save();

            // Update the TruckId in the shipment document
            shipment.TruckId = savedTruckDetail._id;
            shipment.shipment_status = "Confirmed"
            await shipment.save();




            // Return the created truck details in the response
            return res.status(201).json({
                message: "Truck details created successfully",
                truckDetail: savedTruckDetail,
                shipment: shipment
            });
        } else {

            TruckDetail.driver_name = driver_name;
            TruckDetail.mobile_number = mobile_number;
            TruckDetail.truck_number = truck_number;
            await TruckDetail.save();
            // Return the created truck details in the response
            return res.status(201).json({
                message: "Truck details Updated successfully",
                truckDetail: TruckDetail,
                shipment: shipment
            });
        }


    } catch (error) {
        // Handle errors (e.g., validation or database errors)
        console.error(error);
        next(error);
    }
};



const UpdateDriverDetails = async (req, res, next) => {
    const { shipmentId, driver_name, mobile_number, truck_number, arrival_date } = req.body; // Shipment ID passed as a URL parameter
    const token = req.header('authorization')?.replace('Bearer ', ''); // Extract token from Authorization header
    const decoded = jwt.verify(token, JWT_SECRET_KEY); // Verify token

    const transporter = nodemailer?.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    });



    try {

        const shipment = await Shipments.findById(shipmentId);
        const driverDeatils = await TruckDetails.findById(shipment?.TruckId);

        if (driverDeatils?.truck_number === truck_number) {
            driverDeatils.mobile_number = mobile_number
            driverDeatils.driver_name = driver_name
            driverDeatils.arrival_date = arrival_date
            driverDeatils.updated_by = decoded?.userId
            driverDeatils.save();


            res.status(200).json({
                message: 'Truck Deatils has been changed.',
                isSuccess: true,
                shipment,
                truckDetails: driverDeatils
            });
        } else {

            // If no existing truck detail, create a new one
            const newTruckDetail = new TruckDetails({
                driver_name,
                mobile_number,
                truck_number,
                shipmentId,
                arrival_date,
                created_by: decoded?.userId,
                updated_by: decoded?.userId
            });


            // Save the new truck detail to the database
            const savedTruckDetail = await newTruckDetail.save();

            // Update the TruckId in the shipment document
            shipment.TruckId = savedTruckDetail._id;
            shipment.shipment_status = "ReConfirmed"
            await shipment.save();

            let Shipmentstatusdata = await new Shipmentstatus({
                shipmentID: shipmentId,
                shipment_status: "ReConfirmed",
                userID: decoded?.userId
            });
            await Shipmentstatusdata.save();

            const plant = await Plants.findById(shipment?.plantId);
            const user = await Users.findById(shipment.createdBy);
            const munshiusers = await Users.find({ transport_company_id: shipment?.companyId });
            const company = await TransportCompany.findById(shipment.companyId);

            for (const munshiuser of munshiusers) {
                // Push Notifications
                if ((munshiuser?.push_notifications ?? [])?.length > 0) {
                    (munshiuser?.push_notifications ?? []).forEach((item) => {
                        if (item?.islogin) {
                            Notifications(item.token,
                                "Truck Details Have Been updated",
                                `Truck details for ${shipment.shipment_number} have been updated. Please review the shipment details.`,
                                {
                                    screen: "assignTruck",
                                    shipmentId: shipment._id
                                }
                            );
                        }
                    });
                }

                // Email Notification
                const mailOptions = {
                    from: user?.email,
                    to: munshiuser?.email,
                    subject: 'Truck Details Swapped',
                    html: `<!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Truck details updated</title>
                        <style>
                            body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
                            .container { background: #fff; padding: 20px; border-radius: 8px; width: 600px; margin: 0 auto; }
                            h2 { color: #333; }
                            p, li { color: #555; font-size: 16px; }
                            .footer { font-size: 12px; color: #777; text-align: center; margin-top: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <p>Dear ${company?.company_name},</p>
                            <p>This is to inform you that the truck details for the following shipment have been updated.</p>
                            <p><strong>Shipment Details:</strong></p>
                            <ul>
                                <li><strong>Shipment Number:</strong> ${shipment?.shipment_number}</li>
                                <li><strong>Assigned Transport Company:</strong> ${company?.company_name}</li>
                                <li><strong>Status:</strong> ${shipment?.shipment_status}</li>
                                <li><strong>Plant Name:</strong> ${plant?.name}</li>
                                <li><strong>Plant Location:</strong> ${plant?.city}, ${plant?.state}</li>
                                <li><strong>Truck Number:</strong> ${truck_number}</li>
                                <li><strong>Driver Name:</strong> ${driver_name}</li>
                            </ul>
                            <p>Please review the updated truck details in the mobile application. If you have any questions, please do not hesitate to contact us.</p>
                            <div class="footer">
                                <p>Thank you for your cooperation.</p>
                            </div>
                        </div>
                    </body>
                    </html>`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('Error sending email:', error);
                    } else {
                        console.log('Email sent:', info.response);
                    }
                });
            }

            res.status(200).json({
                message: 'Truck Deatils has been changed.',
                isSuccess: true,
                shipment,
                truckDetails: newTruckDetail
            });
        }

    } catch (error) {
        next(error); // Pass the error to the next middleware
    }
};


const exchangetruck = async (req, res, next) => {
    const { shipmentId1, shipmentId2 } = req.body;
    try {

        // Find the shipments
        const shipment1 = await Shipments.findById(shipmentId1);
        const shipment2 = await Shipments.findById(shipmentId2);

        if (!shipment1 || !shipment2) {
            return res.status(404).json({ message: "One or both shipments not found" });
        }

        // Swap the TruckId values using a temporary variable
        const tempTruckId = shipment1.TruckId;
        shipment1.TruckId = shipment2.TruckId;
        shipment2.TruckId = tempTruckId;

        // Save updated shipments
        await shipment1.save();
        await shipment2.save();

        // Fetch the status records
        const shipment1confirm = await Shipmentstatus.findOne({ shipmentID: shipment1._id, shipment_status: "Confirmed" });
        const shipment1getin = await Shipmentstatus.findOne({ shipmentID: shipment1._id, shipment_status: "GateIn" });

        const shipment2confirm = await Shipmentstatus.findOne({ shipmentID: shipment2._id, shipment_status: "Confirmed" });
        const shipment2getin = await Shipmentstatus.findOne({ shipmentID: shipment2._id, shipment_status: "GateIn" });

        // Swap timestamps safely if records exist
        if (shipment1confirm && shipment2confirm) {
            [shipment1confirm.created_at, shipment2confirm.created_at] = [shipment2confirm.created_at, shipment1confirm.created_at];
            [shipment1confirm.updated_at, shipment2confirm.updated_at] = [shipment2confirm.updated_at, shipment1confirm.updated_at];

            await shipment1confirm.save();
            await shipment2confirm.save();
        }

        if (shipment1getin && shipment2getin) {
            [shipment1getin.created_at, shipment2getin.created_at] = [shipment2getin.created_at, shipment1getin.created_at];
            [shipment1getin.updated_at, shipment2getin.updated_at] = [shipment2getin.updated_at, shipment1getin.updated_at];

            await shipment1getin.save();
            await shipment2getin.save();
        }


        await sendNotificationsAndEmails(shipment1, shipment2);


        return res.status(200).json({ message: "Shipments swapped successfully!", success: true, shipment1, shipment2 });
    } catch (error) {
        next(error);
    }
};




const sendNotificationsAndEmails = async (shipmentA, shipmentB) => {
    const transporter = nodemailer?.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    // Get shared data for both shipments
    const [plantA, userA, companyA, munshiUsersA, TruckDetailA] = await Promise.all([
        Plants.findById(shipmentA.plantId),
        Users.findById(shipmentA.createdBy),
        TransportCompany.findById(shipmentA.companyId),
        Users.find({ transport_company_id: shipmentA.companyId }),
        TruckDetails.findById(shipmentA?.TruckId)
    ]);

    const [plantB, companyB, munshiUsersB, TruckDetailB] = await Promise.all([
        Plants.findById(shipmentB?.plantId),
        TransportCompany.findById(shipmentB?.companyId),
        Users.find({ transport_company_id: shipmentB?.companyId }),
        TruckDetails.findById(shipmentB?.TruckId)
    ]);

    // Combine all unique munshi users
    const allMunshiUsersMap = new Map();
    [...munshiUsersA, ...munshiUsersB].forEach(user => {
        allMunshiUsersMap.set(user._id.toString(), user);
    });
    const allMunshiUsers = Array.from(allMunshiUsersMap.values());

    for (const munshi of allMunshiUsers) {
        // Push Notification
        if ((munshi?.push_notifications ?? []).length > 0) {
            (munshi.push_notifications ?? []).forEach(item => {
                if (item?.islogin) {
                    Notifications(item.token,
                        "Truck Deatils has been swap",
                        `Shipment ${shipmentA.shipment_number} has swapped trucks with Shipment ${shipmentB.shipment_number}.`,
                        {
                            screen: "assignTruck",
                            shipmentId: shipmentA._id,
                        }
                    );
                }
            });
        }

        // Email Notification
        const mailOptions = {
            from: userA?.email,
            to: munshi?.email,
            subject: 'Truck Swapped Between Shipments',
            html: `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Truck Swap Notification</title>
                <style>
                    body { font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; }
                    .container { background-color: #ffffff; padding: 20px; border-radius: 8px; max-width: 600px; margin: auto; }
                    h2 { color: #333; }
                    p, li { color: #555; }
                    .section { margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Truck Details Swapped</h2>
                    <p>The truck assigned to the following shipments has been swapped:</p>

                    <div class="section">
                        <h3>Shipment  ${shipmentA.shipment_number} </h3>
                        <ul>
                            <li><strong>Transport Company:</strong> ${companyA?.company_name}</li>
                            <li><strong>Status:</strong> ${shipmentA.shipment_status}</li>
                            <li><strong>Plant:</strong> ${plantA?.name} (${plantA?.city}, ${plantA?.state})</li>
                            <li><strong>Driver Name:</strong> ${TruckDetailA.driver_name}</li>
                            <li><strong>Driver Mobile Number:</strong> ${TruckDetailA.mobile_number}</li>
                            <li><strong>Truck Number:</strong> ${TruckDetailA.truck_number}</li>
                        </ul>
                    </div>

                    <div class="section">
                        <h3>Shipment  ${shipmentB.shipment_number}</h3>
                        <ul>
                            <li><strong>Transport Company:</strong> ${companyB?.company_name}</li>
                            <li><strong>Status:</strong> ${shipmentB.shipment_status}</li>
                            <li><strong>Plant:</strong> ${plantB?.name} (${plantB?.city}, ${plantB?.state})</li>
                            <li><strong>Driver Name:</strong> ${TruckDetailB.driver_name}</li>
                            <li><strong>Driver Mobile Number:</strong> ${TruckDetailB.mobile_number}</li>
                            <li><strong>Truck Number:</strong> ${TruckDetailB.truck_number}</li>
                        </ul>
                    </div>

                    <p>Please check the mobile app for the updated truck assignments. If you have any concerns, reach out to your supervisor.</p>
                </div>
            </body>
            </html>`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log(`Email sent to ${munshi?.email}:`, info.response);
            }
        });
    }
};



module.exports = { AddTruckDetails, UpdateDriverDetails, exchangetruck };
