import { Request, Response } from 'express';
import Activity from '../models/Activity';

export const getUserActivity = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const { page = 1, limit = 20, type, startDate, endDate } = req.query;

    const query: any = { user: req.userId };

    // Add filters
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const activities = await Activity.find(query)
      .populate('target')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Activity.countDocuments(query);

    res.json({
      activities,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch activity',
      details: error.message,
    });
  }
};

// Helper function to log activity
export const logActivity = async (
  userId: string,
  type: string,
  action: string,
  targetId: string,
  targetType: string,
  metadata?: Record<string, any>,
) => {
  try {
    const activity = new Activity({
      user: userId,
      type,
      action,
      target: targetId,
      targetType,
      metadata,
    });
    await activity.save();
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

export const getVideoActivities = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const { videoId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const activities = await Activity.find({
      targetId: videoId,
      type: { $in: ['video', 'comment'] },
    })
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Activity.countDocuments({
      targetId: videoId,
      type: { $in: ['video', 'comment'] },
    });

    res.json({
      activities,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch video activities',
      details: error.message,
    });
  }
};
