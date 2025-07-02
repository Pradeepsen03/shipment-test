
const Users = require('../models/user');
const TransportCompany = require('../models/transportCompany');
const Plants = require("../models/plant")
const Roles = require("../models/role")

//Transport Company Registration API
const registerTransportCompany = async (req, res, next) => {
    const { company_name, city, state, country, sap_id, users } = req.body;

    try {
        // Check if the transport company already exists
        const existingTransportCompany = await TransportCompany.findOne({ company_name });
        if (existingTransportCompany) {
            return res.status(400).json({ message: 'Transport company name already taken' });
        }

        // Get role ID for "Munshi"
        let role = await Roles.findOne({ slug: "Munshi" });
        if (!role) {
            return res.status(400).json({ message: 'Role "Munshi" not found' });
        }
        let roleID = role._id;

        // Create the new transport company
        const newTransportCompany = new TransportCompany({
            company_name,
            city,
            state,
            country,
            sap_id
        });

        // Save the transport company
        await newTransportCompany.save();

        // Iterate over the users and validate them before saving
        for (const item of users) {
            const { username, email, password, first_name, last_name, mobile_no, gender, avatar, dob } = item;

            // Validate the user's email
            const existingEmail = await Users.findOne({ email });
            if (existingEmail) {
                return res.status(400).json({ message: `Email ${email} already in use` });
            }

            // Validate the user's username
            const existingUsername = await Users.findOne({ username });
            if (existingUsername) {
                return res.status(400).json({ message: `Username ${username} already taken` });
            }

            // Create a new user for this transport company
            let newUser = new Users({
                username,
                email,
                password,
                first_name,
                last_name,
                mobile_no,
                gender,
                avatar,
                dob,
                roleid: roleID,
                transport_company_id: newTransportCompany._id
            });

            // Save the user
            await newUser.save();
        }

        // If everything goes well, return success response
        res.status(201).json({
            message: 'Transport Company registered successfully',
            company: newTransportCompany,
            users: users.length // To return how many users were created
        });

    } catch (error) {
        if (error.code === 11000) {
            // Handle duplicate key error (e.g., unique constraint on fields)
            return res.status(400).json({ message: 'One of the fields already exists (e.g., company name, email, or username)' });
        }
        // Pass other errors to the error-handling middleware
        next(error);
    }
};

const editTransportCompany = async (req, res, next) => {
    const { company_id, company_name, city, state, country, sap_id, users } = req.body;

    try {
        // Find the transport company by ID
        const transportCompany = await TransportCompany.findById(company_id);
        if (!transportCompany) {
            return res.status(404).json({ message: 'Transport company not found' });
        }


        // Get role ID for "Munshi"
        let role = await Roles.findOne({ slug: "Munshi" });
        if (!role) {
            return res.status(400).json({ message: 'Role "Munshi" not found' });
        }
        let roleID = role._id;


        // Iterate over the users array to handle each user's case
        for (const userData of users) {
            const { _id, type, isdelete, username, first_name, last_name, email, password, mobile_no, gender, dob } = userData;
            let user_id = _id


            // If it's a new user
            if (type === 'new') {
                // Check if email already exists
                const existingEmail = await Users.findOne({ email });
                if (existingEmail) {
                    return res.status(400).json({ message: `Email ${email} already in use` });
                }

                // Check if username already exists
                const existingUsername = await Users.findOne({ username });
                if (existingUsername) {
                    return res.status(400).json({ message: `Username ${username} already taken` });
                }

                // Create a new user for this transport company
                let newUser = new Users({
                    username,
                    email,
                    password, // Make sure to hash the password before saving
                    first_name,
                    last_name,
                    mobile_no,
                    gender,
                    dob,
                    roleid: roleID,
                    transport_company_id: transportCompany._id
                });

                await newUser.save();
                continue;
            } else if (isdelete) {
                // If user needs to be deleted
                const user = await Users.findById(user_id);
                if (!user) {
                    continue
                } else {
                    // Use deleteOne instead of remove()
                    await Users.deleteOne({ _id: user_id });  // This will delete the user
                    console.log(`User with ID ${user_id} deleted`);
                    // Continue to next user in the array or return the response as needed
                    continue;  // Proceed to next iteration if necessary
                }

            } else {
                // If it's an existing user (update the user)
                let user = await Users.findById(user_id);
                if (!user) {
                    return res.status(404).json({ message: `User with ID ${user_id} not found` });
                } else {
                    // Check if the email is already taken by another user (except the current user)
                    let existingEmail = await Users.findOne({ email, _id: { $ne: user._id } });
                    if (existingEmail) {
                        return res.status(400).json({ message: `Email ${email} already in use` });
                    }

                    // Check if the username is already taken by another user (except the current user)
                    let existingUsername = await Users.findOne({ username, _id: { $ne: user._id } });
                    if (existingUsername) {
                        return res.status(400).json({ message: `username ${username} already in use` });
                    }

                    // Update the user's details
                    user.username = username || user.username;
                    user.email = email || user.email;
                    user.password = password || user.password; // Ensure password is hashed before saving
                    user.first_name = first_name || user.first_name;
                    user.last_name = last_name || user.last_name;
                    user.mobile_no = mobile_no || user.mobile_no;
                    user.gender = gender || user.gender;
                    user.dob = dob || user.dob;

                    // Save the updated user
                    await user.save();
                }


            }
        }

        // Update the transport company details
        transportCompany.company_name = company_name || transportCompany.company_name;
        transportCompany.city = city || transportCompany.city;
        transportCompany.state = state || transportCompany.state;
        transportCompany.country = country || transportCompany.country;
        transportCompany.sap_id = sap_id || transportCompany.sap_id;

        // Save the updated transport company
        await transportCompany.save();

        // Respond with success
        res.status(200).json({
            message: 'Transport Company and Users updated successfully',
            company: transportCompany
        });

    } catch (error) {
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({ message: 'One of the fields already exists (e.g., company name, email, or username)' });
        }
        // Pass other errors to the error-handling middleware
        next(error);
    }
};


const getTransportCompanyById = async (req, res, next) => {
    const plantId = req.params.id;

    try {
        // Correct the population to munshiId since that's the actual reference field in your schema
        const company = await TransportCompany.findById(plantId);  // Populating the 'munshiId' field
        const user = await Users.find({ transport_company_id: company?._id });
        if (!company) {
            return res.status(404).json({ message: 'Plant not found' });
        }

        res.status(200).json({ "transport_company": company, "user": user });
    } catch (error) {
        console.error('Error fetching plant:', error);
        next(error);  // Pass the error to the next middleware (error handler)
    }
};



const getAllTransportCompany = async (req, res, next) => {
    const { page_size, page_no, search, order } = req.query;

    const pageSize = parseInt(page_size) || 10;
    const pageNo = parseInt(page_no) || 1;
    const skip = (pageNo - 1) * pageSize;
    const sortOrder = order === 'desc' ? -1 : 1;

    // Create regex search filters
    const searchRegex = search ? new RegExp(search, 'i') : null;

    const matchStage = searchRegex ? {
        $or: [
            { "company_name": { $regex: searchRegex } },
            { 'munshi.username': { $regex: searchRegex } },
            { 'munshi.email': { $regex: searchRegex } },
            { 'munshi.first_name': { $regex: searchRegex } },
            { 'munshi.last_name': { $regex: searchRegex } },
            { 'munshi.mobile_no': { $regex: searchRegex } },
        ]
    } : {};

    try {
        const aggregatePipeline = [
            { $match: matchStage },
            { $sort: { _id: sortOrder } },
            { $skip: skip },
            { $limit: pageSize },
        ];

        const CompanyListing = await TransportCompany.aggregate(aggregatePipeline);

        // Count total matching documents
        const countPipeline = [
            { $match: matchStage },
            { $count: 'total' }
        ]

        const countResult = await TransportCompany.aggregate(countPipeline);
        const totalCompanyCount = countResult[0]?.total || 0;

        res.status(200).json({
            totalCompanyCount,
            CompanyListing
        });
    } catch (error) {
        next(error);
    }
};



const getMobileAllCompany = async (req, res, next) => {
    try {
        const {
            page_size = 10,
            page_no = 1,
            search = '',
            order = 'asc'
        } = req.body;

        const pageSize = parseInt(page_size, 10);
        const pageNo = parseInt(page_no, 10);
        const skip = (pageNo - 1) * pageSize;
        const sortOrder = order.toLowerCase() === 'desc' ? -1 : 1;

        const filter = search
            ? { company_name: { $regex: search, $options: 'i' } }
            : {};

        const CompanyListing = await TransportCompany
            .find(filter)
            .sort({ _id: sortOrder }) // sort by creation order; change to field like "company_name" if needed
            .skip(skip)
            .limit(pageSize);

        const totalCompanyCount = await TransportCompany.countDocuments(filter);

        return res.status(200).json({
            total: totalCompanyCount,
            data: CompanyListing,
            page: pageNo,
            pageSize
        });

    } catch (error) {
        console.error("Error fetching transport companies:", error);
        return next(error);
    }
};

module.exports = {
    registerTransportCompany, getTransportCompanyById, getAllTransportCompany, editTransportCompany, getMobileAllCompany
};
