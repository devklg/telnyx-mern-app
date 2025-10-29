const qualificationService = require('../services/qualification.service');

exports.qualifyLead = async (req, res, next) => {
  try {
    const result = await qualificationService.qualifyLead(req.params.leadId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.getQualificationByLead = async (req, res, next) => {
  try {
    const qualification = await qualificationService.getByLeadId(req.params.leadId);
    res.json({ success: true, data: qualification });
  } catch (error) {
    next(error);
  }
};

exports.updateQualification = async (req, res, next) => {
  try {
    const result = await qualificationService.update(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
