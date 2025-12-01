const Event = require('../models/Event');
const EventRequest = require('../models/EventRequest');

// Get approved events
const getEvents = async (req, res) => {
  try {
    const events = await Event.find({ isApproved: true })
      .populate('createdBy', 'name username')
      .sort({ date: 1 });

    res.status(200).json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching events'
    });
  }
};

// Create event request
const createEventRequest = async (req, res) => {
  try {
    const { title, description, date, time, location } = req.body;

    if (!title || !date || !time || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, date, time, and location'
      });
    }

    const request = await EventRequest.create({
      requester: req.user._id,
      title,
      description: description || '',
      date,
      time,
      location
    });

    const populatedRequest = await EventRequest.findById(request._id)
      .populate('requester', 'name username email');

    res.status(201).json({
      success: true,
      message: 'Event request submitted successfully',
      request: populatedRequest
    });
  } catch (error) {
    console.error('Error creating event request:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating event request'
    });
  }
};

module.exports = {
  getEvents,
  createEventRequest
};

