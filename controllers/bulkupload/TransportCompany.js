const TransportCompany = require('../../models/transportCompany');
const Users = require('../../models/user');
const bulkupload = require('../../models/bulkupload');
const bulkuploadLog = require('../../models/bulkuploadLog');
const Roles = require("../../models/role")

const BulkuploadTransportCompany = async (req, res) => {
  const records = req.body.records;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ message: "No records provided for upload." });
  }

  const session = await bulkupload.startSession();
  session.startTransaction();


  let role = await Roles.find({ slug: "Munshi" })
  let roleID = role[0]?._id

  try {
    // Create bulkupload entry
    const bulkEntry = await bulkupload.create({
      type: "company_munshi_upload",
      status: "pending",
    });

    let successCount = 0;
    let failCount = 0;

    for (const entry of records) {
      try {
        const {
          company_name,
          sap_id,
          state,
          city,
          username,
          first_name,
          last_name,
          gender,
          email,
          mobile_number,
          password
        } = entry;

        // Check for existing username/email
        const existingUser = await Users.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
          await bulkuploadLog.create({
            bulkuploadid: bulkEntry._id,
            massage: `Username or email already exists for ${username} / ${email}`,
            records: entry
          });
          failCount++;
          continue;
        }

        // Check for existing company name
        const existingCompany = await TransportCompany.findOne({ company_name });
        if (existingCompany) {
          await bulkuploadLog.create({
            bulkuploadid: bulkEntry._id,
            massage: `Company name already exists: ${company_name}`,
            records: entry
          });
          failCount++;
          continue;
        }




        // Create Transport Company
        let transport_company = await TransportCompany.create({
          company_name,
          state,
          city,
          bulkuploadid: bulkEntry._id,
          sap_id: sap_id
        });





        let user = await Users.create({
          username,
          email,
          password,
          first_name,
          last_name: last_name ?? '',
          mobile_no: mobile_number,
          gender,
          dob: "2025-03-27T12:05:24.920+00:00",
          roleid: roleID,
          transport_company_id: transport_company?._id
        });


        // Update the Transport Company with the created user's `munshiId`
        transport_company.munshiId = user._id;
        await transport_company.save(); // Save the transport company after setting `munshiId`

        successCount++;

      } catch (err) {
        await bulkuploadLog.create({
          bulkuploadid: bulkEntry._id,
          massage: `Error saving record: ${err.message}`
        });
        failCount++;
      }
    }

    // Set final status
    let finalStatus = 'pending';
    if (successCount === 0) finalStatus = 'failed';
    else if (failCount === 0) finalStatus = 'success';

    await bulkupload.findByIdAndUpdate(bulkEntry._id, {
      status: finalStatus,
      total_error: failCount,
      total_success: successCount,
      total_records: (records ?? []).length
    });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: 'Bulk upload completed.',
      success: successCount,
      failed: failCount,
      status: finalStatus,
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Bulk Upload Error:", error);
    return res.status(500).json({ message: 'Server error during bulk upload.' });
  }
};



const getCompanyMunshiBulkuploads = async (req, res, next) => {
  const { page_size, page_no } = req.body;

  const pageSize = parseInt(page_size) || 10;
  const pageNo = parseInt(page_no) || 1;
  const skip = (pageNo - 1) * pageSize;

  try {
    // Fetch paginated records
    const uploads = await bulkupload
      .find({ type: 'company_munshi_upload' })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(pageSize);

    // Get total count for pagination
    const totalCount = await bulkupload.countDocuments({ type: 'company_munshi_upload' });

    res.status(200).json({
      totalCount,
      currentPage: pageNo,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      records: uploads
    });

  } catch (error) {
    next(error);
  }
};



const getSuccessRecordsByBulkId = async (req, res, next) => {
  const { page_size, page_no, bulkuploadid } = req.body;

  if (!bulkuploadid) {
    return res.status(200).json({ message: "Missing bulkuploadid", success: false });
  }

  const pageSize = parseInt(page_size) || 10;
  const pageNo = parseInt(page_no) || 1;
  const skip = (pageNo - 1) * pageSize;

  try {
    // Fetch paginated success records based on bulkuploadid
    const successRecords = await TransportCompany.find({ bulkuploadid })
      .populate('munshiId', 'username email first_name last_name mobile_no gender')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(pageSize);

    // Get total count of matching records for pagination
    const totalCount = await TransportCompany.countDocuments({ bulkuploadid });

    res.status(200).json({
      success: true,
      totalCount,
      currentPage: pageNo,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      records: successRecords
    });
  } catch (error) {
    next(error);
  }
};



const getErrorRecordsByBulkId = async (req, res, next) => {
  const { page_size, page_no, bulkuploadid } = req.body;

  if (!bulkuploadid) {
    return res.status(200).json({ message: "Missing bulkuploadid", success: false });
  }

  const pageSize = parseInt(page_size) || 10;
  const pageNo = parseInt(page_no) || 1;
  const skip = (pageNo - 1) * pageSize;

  try {
    // Fetch paginated error logs based on bulkuploadid
    const errorLogs = await bulkuploadLog.find({ bulkuploadid })
      .skip(skip)
      .limit(pageSize)
      .sort({ created_at: -1 });  // Sort by creation date (descending)

    // Get total count of error logs for pagination
    const totalCount = await bulkuploadLog.countDocuments({ bulkuploadid });

    res.status(200).json({
      success: true,
      totalCount,
      currentPage: pageNo,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      errors: errorLogs
    });

  } catch (error) {
    next(error);
  }
};

module.exports = { BulkuploadTransportCompany, getCompanyMunshiBulkuploads, getSuccessRecordsByBulkId, getErrorRecordsByBulkId };
