const Roles = require("../models/role")

// Controller to get all roles
const getAllRoles = async (req, res, next) => {
    try {
        const roles = await Roles.find({ is_active: true }); // Fetch all roles        
        res.status(200).json({ roles }); // Respond with the list of roles
    } catch (error) {
        next(error); // Handle error if fetching roles fails
    }
};

module.exports = { getAllRoles };
