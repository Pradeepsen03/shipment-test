
const Users = require('../models/user');
const mongoose = require("mongoose");

// Controller to register a new user
const registerUser = async (req, res, next) => {
    const { username, first_name, last_name, email, password, mobile_no, gender, dob, roleid, avatar, plant_id } = req.body;


    try {
        // Check if the email already exists
        const existingEmail = await Users.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Check if the username already exists
        const existingUsername = await Users.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ message: 'Username already taken' });
        }

        // Create a new user
        const newUser = new Users({
            username,
            email,
            password,
            first_name,
            last_name,
            mobile_no,
            gender,
            avatar,
            dob,
            roleid,
            plantId: plant_id,
        });

        await newUser.save();

        res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (error) {
        next(error); // Passing the error to the error handling middleware
    }
};



// Controller to edit user details
const editUserDetails = async (req, res, next) => {
    const { userId, username, first_name, last_name, email, mobile_no, gender, dob, avatar, roleid } = req.body;

    try {
        // Check if the email already exists, excluding the current user's email
        const existingEmail = await Users.findOne({ email, _id: { $ne: userId } });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Check if the username already exists, excluding the current user's username
        const existingUsername = await Users.findOne({ username, _id: { $ne: userId } });
        if (existingUsername) {
            return res.status(400).json({ message: 'Username already taken' });
        }

        // Find the user and update their details
        const user = await Users.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update the user details
        user.username = username || user.username;
        user.email = email || user.email;
        user.first_name = first_name || user.first_name;
        user.last_name = last_name || user.last_name;
        user.mobile_no = mobile_no || user.mobile_no;
        user.gender = gender || user.gender;
        user.avatar = avatar || user.avatar;
        user.dob = dob || user.dob;
        user.roleid = roleid || user.roleid;

        // Save the updated user
        await user.save();

        res.status(200).json({ message: 'User details updated successfully', user });
    } catch (error) {
        next(error); // Passing the error to the error handling middleware
    }
};



// Controller to get user details by ID
const getUserById = async (req, res, next) => {
    const userId = req.params.id;
    try {
        const user = await Users.findById(userId).populate("roleid", "name slug is_active");
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ user });
    } catch (error) {
        next(error);
    }
};



const getAllUsers = async (req, res, next) => {
    const { page_size, page_no, search, order, plant_id } = req.query;

    const pageSize = parseInt(page_size) || 10; // Default to 10 if page_size is not provided
    const pageNo = parseInt(page_no) || 1; // Default to 1 if page_no is not provided
    const sortOrder = order === 'desc' ? -1 : 1; // Sort order (asc or desc)



    // Initialize the search query object
    const searchFilter = search
        ? {
            $or: [
                { 'username': { $regex: search, $options: 'i' } },
                { 'email': { $regex: search, $options: 'i' } },
                { 'first_name': { $regex: search, $options: 'i' } },
                { 'last_name': { $regex: search, $options: 'i' } },
                { 'mobile_no': { $regex: search, $options: 'i' } },
                { 'roleDetails.name': { $regex: search, $options: 'i' } },
            ]
        }
        : {};
    try {
        // Calculate pagination parameters
        const skip = (pageNo - 1) * pageSize;
        const limit = pageSize;

        const plantIdFilter = plant_id ? { plantId: new mongoose.Types.ObjectId(plant_id) } : {};

        // MongoDB Aggregation Pipeline
        const users = await Users.aggregate([
            // Stage 1: Match search query if provided
            {
                $match: {
                    ...searchFilter,
                    ...plantIdFilter
                }
            },
            // Stage 2: Lookup role details
            {
                $lookup: {
                    from: 'roles', // Name of the roles collection
                    localField: 'roleid', // The field in Users that references the roles collection
                    foreignField: '_id', // The field in roles collection to match
                    as: 'roleDetails' // The new field to hold the joined data
                }
            },
            // Stage 3: Unwind the roleDetails array (since $lookup creates an array)
            {
                $unwind: '$roleDetails'
            },
            // Stage 4: Filter users based on the role slugs (logistic_person or security_gaurd)
            {
                $match: {
                    'roleDetails.slug': { $in: ['logistic_person', 'security_gaurd'] }
                }

            },
            // Stage 5: Sort users by createdAt or another field
            {
                $sort: { createdAt: sortOrder }
            },
            // Stage 6: Paginate results
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ]);

        // Count the total number of users matching the search criteria
        const totalCount = await Users.aggregate([
            {
                $match: {
                    ...searchFilter,
                    ...plantIdFilter
                }
            },
            {
                $lookup: {
                    from: 'roles', // Lookup roles
                    localField: 'roleid',
                    foreignField: '_id',
                    as: 'roleDetails'
                }
            },
            { $unwind: '$roleDetails' },
            { $match: { 'roleDetails.slug': { $in: ['logistic_person', 'security_gaurd'] } } }, // Apply role filter
            { $count: 'totalCount' }
        ]);

        // Extract total count from aggregation result
        const totalUsers = totalCount.length > 0 ? totalCount[0].totalCount : 0;

        // Respond with the results
        res.status(200).json({
            usersListing: users,
            totalUserCount: totalUsers
        });
    } catch (error) {
        console.error(error); // Log any errors
        next(error); // Pass the error to the next middleware
    }
};

// Controller to delete user by ID
const deleteUserById = async (req, res, next) => {
    const userId = req.params.id;

    try {
        const user = await Users.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        next(error); // Passing the error to the error handling middleware
    }
};


module.exports = { registerUser, getUserById, getAllUsers, deleteUserById, editUserDetails };
