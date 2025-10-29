const Call = require('../database/mongodb/schemas/call.schema');

exports.getAll = async (req, res, next) => {
  try {
    const calls = await Call.find().populate('leadId').sort({ createdAt: -1 });
    res.json({ success: true, data: calls });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const call = await Call.findById(req.params.id).populate('leadId');
    if (!call) return res.status(404).json({ success: false, message: 'Call not found' });
    res.json({ success: true, data: call });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const call = await Call.create(req.body);
    res.status(201).json({ success: true, data: call });
  } catch (error) {
    next(error);
  }
};

exports.getRecording = async (req, res, next) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call || !call.recordingUrl) {
      return res.status(404).json({ success: false, message: 'Recording not found' });
    }
    res.json({ success: true, url: call.recordingUrl });
  } catch (error) {
    next(error);
  }
};
