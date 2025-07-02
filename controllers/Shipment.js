const mongoose = require("mongoose");
const Shipments = require("../models/shipment");
const TruckTypes = require("../models/truckType");
const TransportCompany = require("../models/transportCompany");
const Users = require("../models/user");
const nodemailer = require("nodemailer");
const Counter = require("../models/shipmentCounter");
const Notifications = require("../utils/PushNotifications");
const Plants = require("../models/plant");
const Shipmentstatus = require("../models/Shipmentstatus");
const TruckDetails = require("../models/truckDetail");
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const JWT_SECRET_KEY = process.env.JWT_SECRET || "your_secret_key";
//Controller to Create Shipments
const ShipmentNumber = async (req, res, next) => {
  const token = req.header("authorization")?.replace("Bearer ", ""); // Extract token from Authorization header
  const decoded = jwt.verify(token, JWT_SECRET_KEY); // Verify token
  let userid = decoded?.userId;

  try {
    let userDeatils = await Users.findById(userid);
    let plantID = userDeatils?.plantId;

    // Increment the shipment number counter
    const counter = await Counter.findOneAndUpdate(
      { _id: "shipment_number" }, // Use a unique identifier for the counter
      { $inc: { sequence_value: 1 } }, // Atomically increment the sequence
      { new: true, upsert: true } // Create the counter if it doesn't exist
    );

    // Generate the new shipment number using the incremented sequence value
    const newShipmentNumber = `SHIP-${counter.sequence_value
      .toString()
      .padStart(6, "0")}`;

    // Create the new shipment document
    const shipment = new Shipments({
      shipment_status: "New",
      plantId: plantID,
      createdBy: userid,
      updatedBy: userid,
      active: false,
      shipment_number: newShipmentNumber,
    });

    // Save the shipment document
    await shipment.save();
    res.status(200).json({ shipment });
  } catch (error) {
    next(error);
  }
};

const createShipment = async (req, res, next) => {
  const {
    shipment_id,
    truckTypeId,
    destination_pin_code,
    destination_city,
    destination_state,
    userid,
    destination_country,
    actual_arrival_date,
    invoice_number,
  } = req.body;

  try {
    // Find the shipment by ID
    const shipment = await Shipments.findById(shipment_id);

    // If shipment does not exist, return a 200 response
    if (!shipment) {
      return res.status(200).json({ message: "Shipment not found" });
    }

    // Update the shipment with the new details
    shipment.shipment_status = "Planned";
    shipment.truckTypeId = truckTypeId ?? shipment.truckTypeId;
    shipment.destination_pin_code =
      destination_pin_code ?? shipment.destination_pin_code;
    shipment.destination_city = destination_city ?? shipment.destination_city;
    shipment.destination_state =
      destination_state ?? shipment.destination_state;
    shipment.destination_country =
      destination_country ?? shipment.destination_country;
    shipment.expected_arrival_date =
      actual_arrival_date ?? shipment.actual_arrival_date;
    shipment.actual_arrival_date =
      actual_arrival_date ?? shipment.actual_arrival_date;
    shipment.updatedBy = userid;
    shipment.active = true; // You can modify this as needed
    shipment.invoice_number = invoice_number ?? "";

    let Shipmentstatusdata = await new Shipmentstatus({
      shipmentID: shipment_id,
      shipment_status: "Planned",
      userID: userid,
    });
    await Shipmentstatusdata.save();

    // Save the updated shipment document
    await shipment.save();

    // Respond with the updated shipment
    res.status(200).json({ shipment });
  } catch (error) {
    next(error);
  }
};

//Get Shipment Details
const getShipmentDetails = async (req, res, next) => {
  const { id } = req.params; // Assuming the shipment ID is passed in the URL
  console.log("id",id)
  const token = req.header("authorization")?.replace("Bearer ", ""); // Extract token from Authorization header
  const decoded = jwt.verify(token, JWT_SECRET_KEY); // Verify token

  let userid = decoded?.userId;
  let userDeatils = await Users.findById(userid);
  const TransportCompanyinfo = await TransportCompany.find({
    _id: userDeatils?.transport_company_id,
  });

  try {
    // Find the shipment by ID and populate related fields
    let shipment = await Shipments.findById(id)
      .populate("companyId", "") // Populating the Plant with name and location
      .populate("truckTypeId", "") // Populating the TruckType with type and capacity
      .populate("TruckId", "") // Populate the truck type data
      .exec();

    // If the shipment is not found, return a 200 response
    if (!shipment) {
      return res.status(200).json({ message: "Shipment not found" });
    }

    if ((TransportCompanyinfo ?? [])?.length > 0) {
      if (
        TransportCompanyinfo[0]._id.toString() ==
        shipment?.companyId._id?.toString()
      ) {
        // Return the populated shipment details
        res.status(200).json({ shipment, sucess: true });
      } else {
        // Return the populated shipment details
        console.log("shipment",shipment)
        res.status(200).json({
          shipment,
          sucess: false,
          massage:
            "This shipment is Reassigned to a different transport company.",
        });
      }
    } else {
      res.status(200).json({ shipment });
    }
  } catch (error) {
    next(error); // Pass the error to the error-handling middleware
  }
};

// Get all shipments
const getAllShipments = async (req, res, next) => {
  try {
    // Destructure query parameters from the request
    const {
      page_size = 10,
      page_no = 1,
      search = "",
      order = "asc",
      slug = "logistic_person",
      companyid = null,
      shipment_status = null,
    } = req.body;

    const token = req.header("authorization")?.replace("Bearer ", ""); // Extract token from Authorization header
    const decoded = jwt.verify(token, JWT_SECRET_KEY); // Verify token

    let userid = decoded?.userId;
    let userDeatils = await Users.findById(userid);
    let plantID = userDeatils?.plantId;

    // Create the pagination and ordering logic
    const skip = (page_no - 1) * page_size; // For skipping records based on page number
    const limit = parseInt(page_size); // Number of records to fetch
    const sortOrder = order === "desc" ? -1 : 1; // Sort order (ascending or descending)

    let truckIds = [];

    let trucktypeIds = [];

    if (search) {
      const matchingTrucks = await TruckDetails.find({
        $or: [
          { truck_number: { $regex: search, $options: "i" } },
          { driver_name: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      truckIds = matchingTrucks?.map((truck) => truck._id);

      const matchingTrucktype = await TruckTypes.find({
        $or: [
          { truck_code: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      trucktypeIds = matchingTrucktype?.map((truck) => truck._id);
    }

    // Build the search filter
    const searchFilter = search
      ? {
          $or: [
            { dock_number: { $regex: search, $options: "i" } },
            { shipment_status: { $regex: search, $options: "i" } },
            { shipment_number: { $regex: search, $options: "i" } },
            { destination_city: { $regex: search, $options: "i" } },
            ...(truckIds.length > 0 ? [{ TruckId: { $in: truckIds } }] : []),
            ...(trucktypeIds.length > 0
              ? [{ truckTypeId: { $in: trucktypeIds } }]
              : []),
          ],
        }
      : {}; // If search is provided, match it on first name or last name, otherwise no filter

    // Initialize the filters object
    let filters = { ...searchFilter, active: true };

    // Modify filters based on the slug
    if (slug === "security_gaurd") {
      // Add an additional filter for the 'Confirmed' status if the role is 'security_gaurd'
      if (shipment_status) {
        filters = {
          ...filters,
          shipment_status: shipment_status,
          plantId: plantID,
        };
      } else {
        filters = {
          ...filters,
          shipment_status: [
            "Confirmed",
            "ReConfirmed",
            "ReGateIn",
            "GateIn",
            "Loading",
            "ReLoading",
            "Loaded",
            "GateOut",
          ],
          plantId: plantID,
        };
      }
    } else if (slug === "Munshi") {
      if (shipment_status) {
        filters = {
          ...filters,
          shipment_status: shipment_status,
        };
      } else {
        filters = {
          ...filters,
          shipment_status: [
            "Assigned",
            "ReConfirmed",
            "ReGateIn",
            "Confirmed",
            "GateIn",
            "Loading",
            "ReLoading",
            "Loaded",
            "GateOut",
          ],
        };
      }

      filters.companyId = new mongoose.Types.ObjectId(companyid); // Convert the companyId to ObjectId type
    } else {
      if (shipment_status) {
        filters = {
          ...filters,
          shipment_status: shipment_status,
          plantId: plantID,
        };
      }
    }

    let shipments = [];
    let totalShipments = 0;
    if (slug === "Munshi") {
      if (!companyid) {
        return res.status(200).json({ message: "Comapny ID can not ne null" });
      }

      shipments = await Shipments.find(filters)
        .populate({
          path: "companyId", // Populate the 'companyId' field
          populate: {
            path: "munshiId", // Reference to the 'munshiId' field inside 'companyId'
            model: "Users", // Specify the model of the 'munshiId' field (should be 'Users' collection)
            select: "", // Optionally specify which fields to include from 'Users' (leave empty for all fields)
          },
          select: "", // Optionally specify which fields you want to include from 'companyId' (leave empty for all fields)
        })
        .populate("plantId", "")
        .populate("truckTypeId", "") // Populate the truck type data
        .populate("TruckId", "") // Populate the TruckId field
        .sort({ created_at: sortOrder }) // Sort by created_at or any other field as needed
        .skip(skip) // Pagination: skip records based on page
        .limit(limit) // Pagination: limit number of records per page
        .exec();

      // Count the total number of shipments for pagination info
      totalShipments = await Shipments.countDocuments(filters);
    } else {
      // Retrieve the shipments with filters, pagination, and sorting
      shipments = await Shipments.find(filters)
        .populate({
          path: "companyId", // Populate the 'companyId' field
          populate: {
            path: "munshiId", // Reference to the 'munshiId' field inside 'companyId'
            model: "Users", // Specify the model of the 'munshiId' field (should be 'Users' collection)
            select: "", // Optionally specify which fields to include from 'Users' (leave empty for all fields)
          },
          select: "", // Optionally specify which fields you want to include from 'companyId' (leave empty for all fields)
        })
        .populate("plantId", "")
        .populate("truckTypeId", "") // Populate the truck type data
        .populate("TruckId", "")
        .sort({ created_at: sortOrder }) // Sort by created_at or any other field as needed
        .skip(skip) // Pagination: skip records based on page
        .limit(limit) // Pagination: limit number of records per page
        .exec();

      // Count the total number of shipments for pagination info
      totalShipments = await Shipments.countDocuments(filters);
    }

    // Return the populated shipment details with pagination information
    res.status(200).json({
      shipments,
      totalShipments,
      page_size: parseInt(page_size) ?? 0,
      page_no: parseInt(page_no),
      total_pages: Math.ceil(totalShipments / page_size), // Calculate total pages
      has_next: page_no * page_size < totalShipments, // Check if there is a next page
      has_prev: page_no > 1, // Check if there is a previous page
    });
  } catch (error) {
    next(error); // Pass the error to the error-handling middleware
  }
};

// Assign a shipment to company
const assignShipmentToCompany = async (req, res, next) => {
  const { shipmentId, companyId, mobile_number, updated_at } = req.body; // shipmentId and companyId passed in the request body
  const token = req.header("authorization")?.replace("Bearer ", ""); // Extract token from Authorization header
  const decoded = jwt.verify(token, JWT_SECRET_KEY); // Verify token

  const transporter = nodemailer?.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    // Find the shipment by its ID
    const shipment = await Shipments.findById(shipmentId);

    // If shipment doesn't exist, return a 200 response
    if (!shipment) {
      return res.status(200).json({ message: "Shipment not found" });
    }

    // Find the company by its ID (assuming you have a Company model)
    const company = await TransportCompany.findById(companyId);

    // If company doesn't exist, return a 200 response
    if (!company) {
      return res.status(200).json({ message: "Company not found" });
    }

    // Assign the shipment to the company (assuming the Company model has a `shipments` field)
    shipment.companyId = companyId;
    shipment.mobile_number = mobile_number;
    shipment.shipment_status = "Assigned";
    shipment.updated_at = updated_at;

    const user = await Users.findById(shipment.createdBy);
    const plant = await Plants.findById(shipment?.plantId);
    const munshiusers = await Users.find({
      transport_company_id: company?._id,
    });

    for (const munshiuser of munshiusers) {
      if ((munshiuser?.push_notifications ?? [])?.length > 0) {
        await (munshiuser?.push_notifications ?? [])?.map((item) => {
          if (item?.islogin) {
            return Notifications(
              item?.token,
              "New Shipment Assigned to Your Company",
              `A new shipment has been assigned to ${company?.company_name}. Please provide truck details. Shipment No: ${shipment?.shipment_number}, Status: ${shipment?.shipment_status} Plant Location: ${plant?.name} , ${plant?.city}, ${plant?.state}.`,
              {
                screen: "assignTruck",
                shipmentId: shipmentId,
              }
            );
          }
        });
      }

      // Set up email message
      let mailOptions = {
        from: user?.email,
        to: munshiuser?.email,
        subject: "Shipment Assignment – Truck & Driver Details Required",
        html: `<!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Shipment Assignment</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                background-color: #f4f4f4;
                                margin: 0;
                                padding: 20px;
                            }
                    
                            .email-container {
                                background-color: #ffffff;
                                padding: 20px;
                                border-radius: 8px;
                                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                                width: 600px;
                                margin: 0 auto;
                            }
                            h2 {
                                color: #333;
                            }
                            .message-content {
                                background-color: #ededed;
                                padding: 15px;
                                margin-bottom: 20px;
                                border-radius: 8px;
                            }
                    
                            .message-content p {
                                color: #555;
                                font-size: 16px;
                            }
                    
                            .button {
                                background-color: #4CAF50;
                                color: white;
                                padding: 10px 20px;
                                text-decoration: none;
                                border-radius: 5px;
                                display: inline-block;
                            }
                    
                            .footer {
                                font-size: 12px;
                                color: #777;
                                text-align: center;
                                margin-top: 20px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="email-container">
                            
                            <div class="message-content">
                                <p>Dear ${company?.company_name},</p>
                                <p>We are pleased to inform you that a new shipment has been assigned to your company.
                                 To ensure seamless coordination and timely delivery, please provide the truck details, 
                                including the registration number and driver information, at your earliest convenience.</p>
                                
                                <p><strong>Shipment Details:</strong></p>
                                <ul>
                                    <li><strong>Shipment Number:</strong> ${shipment?.shipment_number}</li>
                                    <li><strong>Assigned Transport Company:</strong>${company?.company_name} </li>
                                    <li><strong>Status:</strong> ${shipment?.shipment_status}</li>
                                    <li><strong>Plant Name:</strong> ${plant?.name} </li>
                                    <li><strong>Plant Location:</strong> ${plant?.city}, ${plant?.state}</li>
                                </ul>
                                
                                <p>Please update all required details in the provided mobile application. please do not hesitate to contact us.</p>
                                
                            </div>
                    
                            <div class="footer">
                                <p>Thank you for your cooperation.</p>
                            </div>
                        </div>
                    </body>
                    </html>`,
      };

      // Send email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("Error sending email:", error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
    }

    // Save the updated shipment
    await shipment.save();

    const TransportCompanys = await TransportCompany.findById(
      shipment.companyId
    );

    let Shipmentstatusdata = await new Shipmentstatus({
      shipmentID: shipmentId,
      shipment_status: "Assigned",
      userID: decoded?.userId,
    });

    await Shipmentstatusdata.save();

    // Return the updated shipment with company details
    res.status(200).json({
      message: "Shipment assigned to company successfully",
      shipment,
      TransportCompanys,
      munshiuser: munshiusers[0],
    });
  } catch (error) {
    next(error); // Pass the error to the error-handling middleware
  }
};

const createTruckType = async (req, res, next) => {
  const { name, description } = req.body;
  try {
    const truck = new TruckTypes({
      name,
      description,
    });
    // Save the truck type
    await truck.save();
    res.status(200).json({ truck });
  } catch (error) {
    next(error);
  }
};

const getAllTruckTypes = async (req, res, next) => {
  try {
    // Retrieve all truck types from the database
    const truckTypes = await TruckTypes.find();

    // If no truck types are found, return a 200 response
    if (truckTypes.length === 0) {
      return res.status(200).json({ message: "No truck types found" });
    }

    // Return the list of truck types
    res.status(200).json({ truckTypes });
  } catch (error) {
    next(error); // Pass the error to the error-handling middleware
  }
};

const assignDockNumber = async (req, res, next) => {
  const { shipmentId, dock_number } = req.body; // Shipment ID and dock_number passed in the request body
  const token = req.header("authorization")?.replace("Bearer ", ""); // Extract token from Authorization header
  const decoded = jwt.verify(token, JWT_SECRET_KEY); // Verify token

  try {
    // Step 1: Fetch the existing shipment by shipmentId
    const shipment = await Shipments?.findById(shipmentId);

    if (!shipment) {
      return res.status(200).json({
        success: false,
        message: "Shipment not found",
      });
    }

    const findShipmentstatus = await Shipmentstatus.findOne({
      shipmentID: shipmentId,
      shipment_status: "Loading",
    });

    // Step 3: Assign the dock number and update shipment status
    shipment.dock_number = dock_number;
    shipment.shipment_status = findShipmentstatus ? "ReLoading" : "Loading";

    // Find the company by its ID (assuming you have a Company model)
    const company = await TransportCompany.findById(shipment?.companyId);
    const plant = await Plants.findById(shipment?.plantId);

    const munshiUsers = await Users.find({ transport_company_id: company._id });

    for (const munshiuser of munshiUsers) {
      if ((munshiuser?.push_notifications ?? [])?.length > 0) {
        await (munshiuser?.push_notifications ?? [])?.map((item) => {
          if (item?.islogin) {
            return Notifications(
              item?.token,
              "Assigned Dock Number",
              `Dock number ${shipment?.dock_number} has been assigned to this shipment. Please contact your truck driver for further details. Shipment No: ${shipment?.shipment_number} Status: ${shipment?.shipment_status} Plant Location: ${plant?.name} , ${plant?.city}, ${plant?.state}..`,
              {
                screen: "assignTruck",
                shipmentId: shipmentId,
              }
            );
          }
        });
      }
    }

    // Step 4: Save the updated shipment
    const updatedShipment = await shipment.save();

    let Shipmentstatusdata = await new Shipmentstatus({
      shipmentID: shipmentId,
      shipment_status: "Loading",
      userID: decoded?.userId,
    });

    await Shipmentstatusdata.save();

    // Step 5: Return the updated shipment with a success message
    res.status(200).json({
      success: true,
      message: "Dock number assigned successfully",
      shipment: updatedShipment,
    });
  } catch (error) {
    // Pass the error to the next middleware
    next(error);
  }
};

const changeShipmentStatus = async (req, res, next) => {
  const { shipmentId, status = "Loaded" } = req.body; // Shipment ID passed as a URL parameter
  const token = req.header("authorization")?.replace("Bearer ", ""); // Extract token from Authorization header
  const decoded = jwt.verify(token, JWT_SECRET_KEY); // Verify token
  try {
    if (status === "ReGateIn" || status === "GateIn") {
      // Find the shipment status for "GateIn" (this is a one-time check to retrieve previous status)
      const findShipmentstatus = await Shipmentstatus.findOne({
        shipmentID: shipmentId,
        shipment_status: "GateIn",
      });

      // Fetch the shipment object
      const shipment = await Shipments.findById(shipmentId);
      if (!shipment) {
        return res.status(404).json({
          message: "Shipment not found",
          isSuccess: false,
        });
      }

      shipment.shipment_status = findShipmentstatus ? "ReGateIn" : "GateIn";
      const updatedShipment = await shipment.save();

      // Create a new shipment status entry for 'GateIn' or 'ReGateIn'
      const shipmentStatus = new Shipmentstatus({
        shipmentID: shipmentId,
        shipment_status: findShipmentstatus ? "ReGateIn" : "GateIn", // If a previous "GateIn" exists, set to "ReGateIn"
        userID: decoded?.userId, // Assuming `decoded?.userId` is correctly parsed from the request context
      });

      // Save the new shipment status
      await shipmentStatus.save();

      // Return success response
      return res.status(200).json({
        message: "Shipment status updated successfully",
        isSuccess: true,
        shipment: updatedShipment,
      });
    } else {
      //  Fetch the existing shipment by shipmentId
      const shipment = await Shipments.findById(shipmentId);
      if (!shipment) {
        return res.status(200).json({
          message: "Shipment not found",
          isSuccess: false,
        });
      }
      shipment.shipment_status = status ?? "Loaded";
      const updatedShipment = await shipment.save();

      let Shipmentstatusdata = await new Shipmentstatus({
        shipmentID: shipmentId,
        shipment_status: status,
        userID: decoded?.userId,
      });
      await Shipmentstatusdata.save();

      //  Return the updated shipment
      return res.status(200).json({
        message: "Shipment status updated successfully",
        isSuccess: true,
        shipment: updatedShipment,
      });
    }
  } catch (error) {
    next(error); // Pass the error to the next middleware
  }
};

const getInTruck = async (req, res, next) => {
  const { shipmentId } = req.params; // Shipment ID passed as a URL parameter
  const token = req.header("authorization")?.replace("Bearer ", ""); // Extract token from Authorization header
  const decoded = jwt.verify(token, JWT_SECRET_KEY); // Verify token

  try {
    //  Fetch the existing shipment by shipmentId
    const shipment = await Shipments.findById(shipmentId);

    if (!shipment) {
      return res.status(200).json({
        message: "Shipment not found",
        isSuccess: false,
      });
    }
    const isAlreadyGateIn = shipment.shipment_status === "GateIn";

    if (isAlreadyGateIn) {
      return res.status(200).json({
        message: "Shipment is already in GateIn status",
        isSuccess: true,
        shipment,
      });
    }

    shipment.shipment_status = "GateIn";
    const updatedShipment = await shipment.save();

    let Shipmentstatusdata = await new Shipmentstatus({
      shipmentID: shipmentId,
      shipment_status: "GateIn",
      userID: decoded?.userId,
    });
    await Shipmentstatusdata.save();

    //  Return the updated shipment
    res.status(200).json({
      message: "Shipment status updated to GateIn successfully",
      isSuccess: true,
      shipment: updatedShipment,
    });
  } catch (error) {
    next(error); // Pass the error to the next middleware
  }
};

const assignShipmentToCompanyFCM = async (req, res, next) => {
  const { shipmentId, companyId, mobile_number, updated_at } = req.body; // shipmentId and companyId passed in the request body
  const token = req.header("authorization")?.replace("Bearer ", ""); // Extract token from Authorization header
  const decoded = jwt.verify(token, JWT_SECRET_KEY); // Verify token

  const transporter = nodemailer?.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    // Find the shipment by its ID
    const shipment = await Shipments.findById(shipmentId);

    // If shipment doesn't exist, return a 200 response
    if (!shipment) {
      return res.status(200).json({ message: "Shipment not found" });
    }

    // Find the company by its ID (assuming you have a Company model)
    const company = await TransportCompany.findById(companyId);

    // If company doesn't exist, return a 200 response
    if (!company) {
      return res.status(200).json({ message: "Company not found" });
    }

    // Assign the shipment to the company (assuming the Company model has a `shipments` field)
    shipment.companyId = companyId;
    shipment.mobile_number = mobile_number;
    shipment.shipment_status = "Assigned";
    shipment.updated_at = updated_at;

    const user = await Users.findById(shipment.createdBy);
    const plant = await Plants.findById(shipment?.plantId);
    const munshiusers = await Users.find({
      transport_company_id: company?._id,
    });

    for (const munshiuser of munshiusers) {
      if ((munshiuser?.push_notifications ?? [])?.length > 0) {
        await (munshiuser?.push_notifications ?? [])?.map(async (item) => {
          if (item?.islogin && item?.token) {
            const message = {
              notification: {
                title: "New Shipment Assigned to Your Company",
                body: `A new shipment has been assigned to ${company?.company_name}. Please provide truck details. Shipment No: ${shipment?.shipment_number}, Status: ${shipment?.shipment_status} Plant Location: ${plant?.name} , ${plant?.city}, ${plant?.state}.`,
              },
              data: {
                screen: "AssignTruck",
                shipmentId: shipmentId.toString(), // all values must be strings
              },
              token: item.token,
            };

            try {
              await admin.messaging().send(message);
            } catch (error) {
              if (
                error.code === "messaging/registration-token-not-registered"
              ) {
                console.warn(`Invalid/expired token: ${item.token}`);
              } else {
                console.error(
                  `Error sending FCM to ${item.token}:`,
                  error.message
                );
              }
            }
          }
        });
      }

      // Set up email message
      let mailOptions = {
        from: user?.email,
        to: munshiuser?.email,
        subject: "Shipment Assignment – Truck & Driver Details Required",
        html: `<!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Shipment Assignment</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                background-color: #f4f4f4;
                                margin: 0;
                                padding: 20px;
                            }
                    
                            .email-container {
                                background-color: #ffffff;
                                padding: 20px;
                                border-radius: 8px;
                                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                                width: 600px;
                                margin: 0 auto;
                            }
                            h2 {
                                color: #333;
                            }
                            .message-content {
                                background-color: #ededed;
                                padding: 15px;
                                margin-bottom: 20px;
                                border-radius: 8px;
                            }
                    
                            .message-content p {
                                color: #555;
                                font-size: 16px;
                            }
                    
                            .button {
                                background-color: #4CAF50;
                                color: white;
                                padding: 10px 20px;
                                text-decoration: none;
                                border-radius: 5px;
                                display: inline-block;
                            }
                    
                            .footer {
                                font-size: 12px;
                                color: #777;
                                text-align: center;
                                margin-top: 20px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="email-container">
                            
                            <div class="message-content">
                                <p>Dear ${company?.company_name},</p>
                                <p>We are pleased to inform you that a new shipment has been assigned to your company.
                                 To ensure seamless coordination and timely delivery, please provide the truck details, 
                                including the registration number and driver information, at your earliest convenience.</p>
                                
                                <p><strong>Shipment Details:</strong></p>
                                <ul>
                                    <li><strong>Shipment Number:</strong> ${shipment?.shipment_number}</li>
                                    <li><strong>Assigned Transport Company:</strong>${company?.company_name} </li>
                                    <li><strong>Status:</strong> ${shipment?.shipment_status}</li>
                                    <li><strong>Plant Name:</strong> ${plant?.name} </li>
                                    <li><strong>Plant Location:</strong> ${plant?.city}, ${plant?.state}</li>
                                </ul>
                                
                                <p>Please update all required details in the provided mobile application. please do not hesitate to contact us.</p>
                                
                            </div>
                    
                            <div class="footer">
                                <p>Thank you for your cooperation.</p>
                            </div>
                        </div>
                    </body>
                    </html>`,
      };

      // Send email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("Error sending email:", error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
    }

    // Save the updated shipment
    await shipment.save();

    const TransportCompanys = await TransportCompany.findById(
      shipment.companyId
    );

    let Shipmentstatusdata = await new Shipmentstatus({
      shipmentID: shipmentId,
      shipment_status: "Assigned",
      userID: decoded?.userId,
    });

    await Shipmentstatusdata.save();

    // Return the updated shipment with company details
    res.status(200).json({
      message: "Shipment assigned to company successfully",
      shipment,
      TransportCompanys,
      munshiuser: munshiusers[0],
    });
  } catch (error) {
    next(error); // Pass the error to the error-handling middleware
  }
};

const assignDockNumberFCM = async (req, res, next) => {
  const { shipmentId, dock_number } = req.body;
  const token = req.header("authorization")?.replace("Bearer ", "");
  const decoded = jwt.verify(token, JWT_SECRET_KEY);

  try {
    // Step 1: Fetch the existing shipment by shipmentId
    const shipment = await Shipments?.findById(shipmentId);

    if (!shipment) {
      return res.status(200).json({
        success: false,
        message: "Shipment not found",
      });
    }

    const findShipmentstatus = await Shipmentstatus.findOne({
      shipmentID: shipmentId,
      shipment_status: "Loading",
    });

    // Step 2: Assign the dock number and update shipment status
    shipment.dock_number = dock_number;
    shipment.shipment_status = findShipmentstatus ? "ReLoading" : "Loading";

    // Step 3: Find related company, plant, and munshi users
    const company = await TransportCompany.findById(shipment?.companyId);
    const plant = await Plants.findById(shipment?.plantId);
    const munshiUsers = await Users.find({ transport_company_id: company._id });

    // Step 4: Send FCM notification to each active user
    for (const munshiuser of munshiUsers) {
      const pushTokens = munshiuser?.push_notifications ?? [];

      for (const item of pushTokens) {
        if (item?.islogin && item?.token) {
          const message = {
            notification: {
              title: "Assigned Dock Number",
              body: `Dock number ${shipment.dock_number} has been assigned to this shipment. Please contact your truck driver. Shipment No: ${shipment.shipment_number}. Status: ${shipment.shipment_status}. Location: ${plant.name}, ${plant.city}, ${plant.state}.`,
            },
            data: {
                screen: "AssignTruck",
                shipmentId: shipmentId.toString(), // all values must be strings
              },
            token: item.token,
          };

          try {
            await admin.messaging().send(message);
          } catch (error) {
            if (error.code === "messaging/registration-token-not-registered") {
              console.warn(`Invalid/expired token: ${item.token}`);
            } else {
              console.error(
                `Error sending FCM to ${item.token}:`,
                error.message
              );
            }
          }
        }
      }
    }

    // Step 5: Save updated shipment and new shipment status
    const updatedShipment = await shipment.save();

    const Shipmentstatusdata = new Shipmentstatus({
      shipmentID: shipmentId,
      shipment_status: "Loading",
      userID: decoded?.userId,
    });

    await Shipmentstatusdata.save();

    // Step 6: Final success response
    res.status(200).json({
      success: true,
      message: "Dock number assigned successfully",
      shipment: updatedShipment,
    });
  } catch (error) {
    next(error); // Handle error centrally
  }
};

module.exports = {
  createShipment,
  getShipmentDetails,
  getAllShipments,
  assignShipmentToCompany,
  assignDockNumber,
  getInTruck,
  ShipmentNumber,
  changeShipmentStatus,
  getAllTruckTypes,
  createTruckType,
  assignDockNumberFCM,
  assignShipmentToCompanyFCM,
};
