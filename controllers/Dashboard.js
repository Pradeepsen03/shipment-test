const mongoose = require('mongoose');
const Shipmentstatus = require('../models/Shipmentstatus');
const Shipments = require('../models/shipment');

const getGIGOTimeWithShipmentData = async (req, res, next) => {
  const { plant_id } = req.query;


  if (!plant_id) {
    return res.status(400).json({
      error: true,
      message: "Plant ID is required."
    });
  }



  try {

    const filters = { active: true, plantId: plant_id };
    const shipments = await Shipments.find(filters).lean();
    const shipmentIds = shipments.map(s => s._id);

    // Fetch all GateIn and GateOut statuses
    const statuses = await Shipmentstatus.find({
      shipmentID: { $in: shipmentIds },
      shipment_status: { $in: ['GateIn', 'GateOut'] },
    }).sort({ created_at: 1 }).lean();

    // Group statuses by shipmentID
    const statusMap = {};
    for (const status of statuses) {
      const id = status.shipmentID.toString();
      if (!statusMap[id]) {
        statusMap[id] = { gate_in: null, gate_out: null };
      }

      if (status.shipment_status === 'GateIn' && !statusMap[id].gate_in) {
        statusMap[id].gate_in = new Date(status.created_at);
      }

      if (status.shipment_status === 'GateOut') {
        // Always keep the latest GateOut
        statusMap[id].gate_out = new Date(status.created_at);
      }
    }

    let totalDuration = 0;
    let validCount = 0;
    const validShipments = [];

    for (const shipment of shipments) {
      const id = shipment._id.toString();
      const gateIn = statusMap[id]?.gate_in;
      const gateOut = statusMap[id]?.gate_out;

      if (gateIn && gateOut) {
        // Check if GateIn and GateOut are on the same calendar day
        const sameDay =
          gateIn.getFullYear() === gateOut.getFullYear() &&
          gateIn.getMonth() === gateOut.getMonth() &&
          gateIn.getDate() === gateOut.getDate();

        if (sameDay) {
          const duration = (gateOut - gateIn) / (1000 * 60 * 60); // Hours
          shipment.gate_in_time = gateIn;
          shipment.gate_out_time = gateOut;
          shipment.duration_hours = duration.toFixed(2);
          validShipments.push(shipment);

          totalDuration += duration;
          validCount++;
        }
      }
    }

    const averageDuration = validCount > 0 ? totalDuration / validCount : 0;

    res.status(200).json({
      averageDuration: averageDuration.toFixed(2),
    });
  } catch (error) {
    next(error);
  }
};



const gettruck = async (req, res, next) => {
  const { plant_id } = req.query;

  if (!plant_id) {
    return res.status(400).json({
      error: true,
      message: "Plant ID is required."
    });
  }


  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const truckinplan = await Shipments.find({
      active: true,
      plantId: plant_id,
      shipment_status: { $in: ['GateIn', "ReGateIn", 'Loading', "ReLoading", 'Loaded'] },
      updated_at: { $gte: startOfDay, $lt: endOfDay }
    });
    const totaltruckinplan = truckinplan.length;



    const truckunconfirmed = await Shipments.find({
      active: true,
      plantId: plant_id,
      shipment_status: { $in: ['Assigned'] },
      updated_at: { $gte: startOfDay, $lt: endOfDay }
    });
    const totaltrucknconfirmed = truckunconfirmed.length;




    const pendingforgetentry = await Shipments.find({
      active: true,
      plantId: plant_id,
      shipment_status: { $in: ['Confirmed', "ReConfirmed"] },
      updated_at: { $gte: startOfDay, $lt: endOfDay }
    });
    const totalpendingforgetentry = pendingforgetentry.length;



    const shipmentouttoday = await Shipments.find({
      active: true,
      plantId: plant_id,
      shipment_status: { $in: ['GateOut'] },
      updated_at: { $gte: startOfDay, $lt: endOfDay }
    });
    const totalshipmentouttoday = shipmentouttoday.length;




    const truckinloading = await Shipments.find({
      active: true,
      plantId: plant_id,
      shipment_status: { $in: ['Loading', "ReLoading"] },
      updated_at: { $gte: startOfDay, $lt: endOfDay }
    });


    const totaltruckinloading = truckinloading.length;




    const truckwaiting = await Shipments.find({
      active: true,
      plantId: plant_id,
      shipment_status: { $in: ['Assigned'] },
      updated_at: { $gte: startOfDay, $lt: endOfDay }
    }).lean();

    const now = new Date();
    const tenHoursInMs = 10 * 60 * 60 * 1000;

    const filteredtruckwaiting = truckwaiting.filter(shipment => {
      const updatedTime = new Date(shipment.updated_at);
      return now - updatedTime > tenHoursInMs;
    });

    const totaltruckwaiting = filteredtruckwaiting.length;

    res.json({
      truckinplan: totaltruckinplan,
      truckunconfirmed: totaltrucknconfirmed,
      pendingforgetentry: totalpendingforgetentry,
      shipmentouttoday: totalshipmentouttoday,
      truckinloading: totaltruckinloading,
      truckwaitingtenhours: totaltruckwaiting
    });
  } catch (error) {
    next(error);
  }
};

const getAvrageloadingtime = async (req, res, next) => {
  const { plant_id } = req.query;

  if (!plant_id) {
    return res.status(400).json({
      error: true,
      message: "Plant ID is required."
    });
  }



  try {
    const filters = { active: true, plantId: plant_id };
    const shipments = await Shipments.find(filters).lean();
    const shipmentIds = shipments.map(s => s._id);


    const now = new Date(); // current date and time
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);


    // Fetch all Loading and GateOut statuses
    const statuses = await Shipmentstatus.find({
      shipmentID: { $in: shipmentIds },
      shipment_status: { $in: ['Loading', 'Loaded'] },
      created_at: { $gte: startOfToday, $lte: endOfToday } // ✅ Only today's records
    }).sort({ created_at: 1 }).lean();

    // Group statuses by shipmentID
    const statusMap = {};
    for (const status of statuses) {
      const id = status.shipmentID.toString();
      if (!statusMap[id]) {
        statusMap[id] = { gate_in: null, Loaded: null };
      }

      if (status.shipment_status === 'Loading' && !statusMap[id].gate_in) {
        statusMap[id].gate_in = new Date(status.created_at);
      }

      if (status.shipment_status === 'Loaded') {
        // Always keep the latest GateOut
        statusMap[id].Loaded = new Date(status.created_at);
      }
    }

    let totalDuration = 0;
    let validCount = 0;
    const validShipments = [];

    for (const shipment of shipments) {
      const id = shipment._id.toString();
      const Loading = statusMap[id]?.gate_in;
      const gateOut = statusMap[id]?.Loaded;

      if (Loading && gateOut) {
        // Check if Loading and GateOut are on the same calendar day
        const sameDay =
          Loading.getFullYear() === gateOut.getFullYear() &&
          Loading.getMonth() === gateOut.getMonth() &&
          Loading.getDate() === gateOut.getDate();

        if (sameDay) {
          const duration = (gateOut - Loading) / (1000 * 60 * 60); // Hours
          shipment.gate_in_time = Loading;
          shipment.Loaded_time = gateOut;
          shipment.duration_hours = duration.toFixed(2);
          validShipments.push(shipment);

          totalDuration += duration;
          validCount++;
        }
      }
    }

    const averageDuration = validCount > 0 ? totalDuration / validCount : 0;

    res.status(200).json({
      average_time_truck_loading: averageDuration.toFixed(2),
    });
  } catch (error) {
    next(error);
  }
};




const getLogisticMetrics = async (req, res, next) => {
  const { plant_id } = req.query;


  if (!plant_id) {
    return res.status(400).json({
      error: true,
      message: "Plant ID is required."
    });
  }



  try {
    // Calculate 30 days ago from now
    const currectdate = new Date();
    const thirtyDaysAgo = new Date(currectdate.getFullYear(), currectdate.getMonth(), 1, 0, 0, 0, 0);

    const number_of_shipment_out = await Shipments.find({
      active: true,
      plantId: plant_id,
      shipment_status: { $in: ['GateOut'] },
      updated_at: { $gte: thirtyDaysAgo }
    });

    const totalnumber_of_shipment_out = number_of_shipment_out.length;



    const avrage_shipment_per_days = await Shipments.find({
      active: true,
      plantId: plant_id,
      shipment_status: { $in: ["Planned", 'Assigned', 'Confirmed', "ReConfirmed", "GateIn", "ReGateIn", "Loading", "ReLoading", "Loaded", "GateOut"] },
      created_at: { $gte: thirtyDaysAgo }
    });


    const diffInMs = currectdate - thirtyDaysAgo;

    // Convert milliseconds to days
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    const totalavrage_shipment_per_days = avrage_shipment_per_days.length / diffInDays;

    res.json({
      number_of_shipment_out: totalnumber_of_shipment_out,
      avrage_shipment_per_days: Math.ceil(totalavrage_shipment_per_days)
    });
  } catch (error) {
    next(error);
  }
};




const getAvrageTimeWithLogisticMetrics = async (req, res, next) => {
  const {
    status_1 = "GateIn",
    status_2 = "GateOut",
    title = "",
    plant_id = ""
  } = req.body;



  if (!plant_id) {
    return res.status(400).json({
      error: true,
      message: "Plant ID is required."
    });
  }



  try {
    const filters = { active: true, plantId: plant_id };
    const shipments = await Shipments.find(filters).lean();
    const shipmentIds = shipments.map(s => s._id);

    // Fetch all Assigned and Confirmed statuses
    const statuses = await Shipmentstatus.find({
      shipmentID: { $in: shipmentIds },
      shipment_status: { $in: [status_1, status_2] },
    }).sort({ created_at: 1 }).lean();

    // Group statuses by shipmentID
    const statusMap = {};
    for (const status of statuses) {
      const id = status.shipmentID.toString();
      if (!statusMap[id]) {
        statusMap[id] = { status_1_time: null, status_2_time: null };
      }

      if (status.shipment_status === status_1 && !statusMap[id].status_1_time) {
        statusMap[id].status_1_time = new Date(status.created_at);
      }

      if (status.shipment_status === status_2) {
        statusMap[id].status_2_time = new Date(status.created_at);
      }
    }

    // Filter and calculate duration for last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    let totalDuration = 0;
    let validCount = 0;
    const validShipments = [];

    for (const shipment of shipments) {
      const id = shipment._id.toString();
      const gateIn = statusMap[id]?.status_1_time;
      const gateOut = statusMap[id]?.status_2_time;

      if (gateIn && gateOut) {
        // Filter to include only records from the last 30 days
        if (gateIn >= thirtyDaysAgo && gateIn <= now && gateOut >= thirtyDaysAgo && gateOut <= now) {
          const sameDay =
            gateIn.getFullYear() === gateOut.getFullYear() &&
            gateIn.getMonth() === gateOut.getMonth() &&
            gateIn.getDate() === gateOut.getDate();

          if (sameDay) {
            const duration = (gateOut - gateIn) / (1000 * 60 * 60); // In hours
            shipment.status_1_time_time = gateIn;
            shipment.status_2_time_time = gateOut;
            shipment.duration_hours = duration.toFixed(2);
            validShipments.push(shipment);

            totalDuration += duration;
            validCount++;
          }
        }
      }
    }

    const averageDuration = validCount > 0 ? totalDuration / validCount : 0;

    res.status(200).json({
      averagetime: averageDuration.toFixed(2),
      title
    });
  } catch (error) {
    next(error);
  }
};



const getSupplierComplianceMetrics = async (req, res, next) => {
  const { plant_id } = req.query;
  if (!plant_id) {
    return res.status(400).json({
      error: true,
      message: "Plant ID is required."
    });
  }

  try {

    const currectdate = new Date();
    const thirtyDaysAgo = new Date(currectdate.getFullYear(), currectdate.getMonth(), 1, 0, 0, 0, 0);



    const filters = {
      active: true,
      plantId: plant_id,
      updated_at: { $gte: thirtyDaysAgo },
      shipment_status: ["GateIn", "ReGateIn", "Loading", "ReLoading", "Loaded", "GateOut"],
    };

    const shipments = await Shipments.find(filters).lean();
    const shipmentIds = shipments.map(s => s._id);

    // Get statuses
    const statuses = await Shipmentstatus.find({
      shipmentID: { $in: shipmentIds },
      shipment_status: { $in: ['Assigned', 'Confirmed', 'GateIn'] },
    }).sort({ created_at: 1 }).lean();

    // Map status times by shipment ID
    const statusMap = {};
    for (const status of statuses) {
      const id = status.shipmentID.toString();
      if (!statusMap[id]) {
        statusMap[id] = { assigned: null, confirmed: null, gatein: null };
      }

      if (status.shipment_status === 'Assigned' && !statusMap[id].assigned) {
        statusMap[id].assigned = new Date(status.created_at);
      }

      if (status.shipment_status === 'Confirmed') {
        statusMap[id].confirmed = new Date(status.created_at);
      }

      if (status.shipment_status === 'GateIn') {
        statusMap[id].gatein = new Date(status.created_at);
      }
    }

    const companyMetrics = {};
    const now = new Date();

    // Evaluate compliance for each shipment
    for (const shipment of shipments) {
      const companyId = shipment.companyId;
      const id = shipment._id.toString();

      if (!companyMetrics[companyId]) {
        companyMetrics[companyId] = {
          supplier: 0,
          nonSupplier: 0,
          total: 0,
        };
      }

      const assigned = statusMap[id]?.assigned;
      const confirmed = statusMap[id]?.confirmed;
      const gatein = statusMap[id]?.gatein;

      if (assigned && confirmed && gatein && gatein <= now) {
        const assignedToConfirmed = (confirmed - assigned) / (1000 * 60 * 60); // in hours
        const confirmedToGateIn = (gatein - confirmed) / (1000 * 60 * 60); // in hours

        if (assignedToConfirmed <= 4 && confirmedToGateIn <= 4) {
          companyMetrics[companyId].supplier += 1;
        } else {
          companyMetrics[companyId].nonSupplier += 1;
        }

        companyMetrics[companyId].total += 1;
      }
    }

    let totalmetricscompany = 0;
    let nontotalmetricscompany = 0;

    // Evaluate compliance per company
    for (const [companyId, metrics] of Object.entries(companyMetrics)) {
      if (metrics.total > 0) {
        const compliancePercent = (metrics.supplier / metrics.total) * 100;
        if (compliancePercent >= 80) {
          totalmetricscompany += 1;
        } else {
          nontotalmetricscompany += 1;
        }
      }
    }

    res.status(200).json({
      supplier: totalmetricscompany,
      non_supplier: nontotalmetricscompany
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getGIGOTimeWithShipmentData, gettruck,
  getAvrageloadingtime, getLogisticMetrics,
  getAvrageTimeWithLogisticMetrics, getSupplierComplianceMetrics
};
