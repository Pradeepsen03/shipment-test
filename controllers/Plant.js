const Plants = require("../models/plant")

// Controller to get all roles
const getAllPlants = async (req, res, next) => {
    try {
        const Plant = await Plants.find();
        res.status(200).json({ Plant }); // Respond with the list of plants
    } catch (error) {
        next(error); // Handle error if fetching plants fails
    }
};

const createOrUpdatePlant = async (req, res, next) => {
    try {
        const { name, city, state, pin_code, plantId } = req.body;

        // Validation
        if (!name || !city || !state || !pin_code) {
            return res.status(400).json({ message: 'All fields (name, city, state, pin_code) are required.' });
        }

        // If updating
        if (plantId) {

            const existingPlant = await Plants.findById(plantId);
            if (!existingPlant) {
                return res.status(404).json({ message: 'Plant not found.' });
            }
            
            // Check for duplicate name (excluding current plant)
            const duplicateName = await Plants.findOne({ name, _id: { $ne: plantId } });
            if (duplicateName) {
                return res.status(400).json({ message: 'Plant name already in use by another record.' });
            }

            // Update the plant
            existingPlant.name = name;
            existingPlant.city = city;
            existingPlant.state = state;
            existingPlant.pin_code = pin_code;

            await existingPlant.save();

            return res.status(200).json({ message: 'Plant updated successfully.', plant: existingPlant });
        }

        // If creating
        const nameExists = await Plants.findOne({ name });
        if (nameExists) {
            return res.status(400).json({ message: 'Plant name already exists.' });
        }

        const newPlant = new Plants({
            name,
            city,
            state,
            pin_code,
            country: 'IN'
        });

        await newPlant.save();

        return res.status(201).json({ message: 'Plant created successfully.', plant: newPlant });

    } catch (error) {
        // Handle MongoDB duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Duplicate key error: Plant name must be unique.' });
        }

        // Catch all other errors
        console.error('Error in createOrUpdatePlant:', error);
        next(error); // Let your global error handler process it
    }
};

const getPlantById = async (req, res, next) => {
    try {
        const { plantId } = req.params;
        const plant = await Plants.findById(plantId);
        if (!plant) {
            return res.status(404).json({ message: 'Plant not found.' });
        }
        res.status(200).json({ plant });

    } catch (error) {
        console.error('Error fetching plant by ID:', error);
        next(error);
    }
};

module.exports = { getAllPlants, createOrUpdatePlant, getPlantById };
