const TruckTypes = require("../models/truckType")


const createTruckType = async (req, res, next) => {
  const { name, description, truck_code } = req.body;
  try {
    const truck = new TruckTypes({
      name,
      description,
      truck_code
    });
    // Save the truck type
    await truck.save();
    console.log("truck", truck)
    res.status(200).json({ truck });
  } catch (error) {
    next(error);
  }
};


const getAllTruckTypes = async (req, res, next) => {
  try {
    const { page_size = 10, page_no = 1, search = "", order = "DESC" } = req.query;

    const pageSize = parseInt(page_size);
    const pageNo = parseInt(page_no);

    // Build search query
    const searchQuery = search
      ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { truck_code: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      }
      : {};

    // Total count (for pagination)
    const totalTruckTypesCount = await TruckTypes.countDocuments(searchQuery);

    // Fetch paginated + filtered truck types
    const truckTypes = await TruckTypes.find(searchQuery)
      .sort({ name: order === "DESC" ? -1 : 1 })
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize);

    return res.status(200).json({
      truckTypes,
      totalCompanyCount: totalTruckTypesCount, // 👈 used in frontend for pagination
    });
  } catch (error) {
    next(error);
  }
};


const editTruckType = async (req, res, next) => {
  const { truckId, name, truck_code, description } = req.body;

  try {
    // Check if the truck name already exists, excluding the current truck
    const existingName = await TruckTypes.findOne({ name, _id: { $ne: truckId } });
    if (existingName) {
      return res.status(400).json({ message: 'Truck name already in use' });
    }

    // Check if the truck code already exists, excluding the current truck
    const existingCode = await TruckTypes.findOne({ truck_code, _id: { $ne: truckId } });
    if (existingCode) {
      return res.status(400).json({ message: 'Truck code already in use' });
    }

    // Find the truck and update its details
    const truck = await TruckTypes.findById(truckId);
    if (!truck) {
      return res.status(404).json({ message: 'Truck type not found' });
    }

    // Update fields
    truck.name = name || truck.name;
    truck.truck_code = truck_code || truck.truck_code;
    truck.description = description || truck.description;

    await truck.save();

    res.status(200).json({ message: 'Truck type updated successfully', truck });
  } catch (error) {
    next(error);
  }
};


const getTruckById = async (req, res, next) => {
  const truckId = req.params.id;
  try {
    const truck = await TruckTypes.findById(truckId); // no populate needed
    if (!truck) {
      return res.status(404).json({ message: "Truck not found" });
    }
    res.status(200).json({ truck });
  } catch (error) {
    next(error);
  }
}


module.exports = { createTruckType, getAllTruckTypes, editTruckType, getTruckById };
