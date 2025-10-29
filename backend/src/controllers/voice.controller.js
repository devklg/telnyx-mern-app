const telnyx = require('telnyx')(process.env.TELNYX_API_KEY);

exports.initiateCall = async (req, res, next) => {
  try {
    const { to, from } = req.body;
    const call = await telnyx.calls.create({
      to,
      from,
      connection_id: process.env.TELNYX_CONNECTION_ID
    });
    res.json({ success: true, data: call });
  } catch (error) {
    next(error);
  }
};

exports.transferCall = async (req, res, next) => {
  try {
    const { callId, to } = req.body;
    await telnyx.calls.transfer(callId, { to });
    res.json({ success: true, message: 'Call transferred' });
  } catch (error) {
    next(error);
  }
};

exports.getCallStatus = async (req, res, next) => {
  try {
    const call = await telnyx.calls.retrieve(req.params.callId);
    res.json({ success: true, data: call });
  } catch (error) {
    next(error);
  }
};
