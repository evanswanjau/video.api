import { Request, Response } from 'express';
import Report from '../models/Report';
import Video from '../models/Video';
import Comment from '../models/Comment';

export const reportContent = async (req: Request, res: Response) => {
  try {
    const { contentType, contentId, reason, description } = req.body;

    let content;
    if (contentType === 'Video') {
      content = await Video.findById(contentId);
    } else if (contentType === 'Comment') {
      content = await Comment.findById(contentId);
    }

    if (!content) {
      return res.status(404).json({
        error: `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} not found`,
      });
    }

    const report = new Report({
      contentType,
      content: contentId,
      reason,
      description,
    });

    await report.save();

    res.status(201).json({
      message: `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} reported successfully`,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to submit report',
      details: error.message,
    });
  }
};

export const getReports = async (req: Request, res: Response) => {
  if (req.role !== 'admin') {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const { page = 1, limit = 20, status, contentType } = req.query;
    const query: any = {};

    if (status) query.status = status;
    if (contentType) query.contentType = contentType;

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Report.countDocuments(query);

    res.json({
      reports,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch reports',
      details: error.message,
    });
  }
};
