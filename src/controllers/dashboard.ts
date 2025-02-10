import { Request, Response } from 'express';
import mongoose from 'mongoose';
import moment from 'moment';
import Video from '../models/Video';
import SavedVideo from '../models/SavedVideo';
import WatchHistory from '../models/WatchHistory';
import Comment from '../models/Comment';
import VideoView from '../models/VideoView';
import VideoLike from '../models/VideoLike';

export const getDateRange = (period: 'week' | 'month' | 'year') => {
  const end = moment().endOf('day');
  const start = moment().startOf('day');

  switch (period) {
    case 'week':
      start.subtract(6, 'days').startOf('day');
      break;
    case 'month':
      start.subtract(29, 'days').startOf('day');
      break;
    case 'year':
      start.subtract(11, 'months').startOf('month');
      break;
  }

  return { start: start.toDate(), end: end.toDate() };
};

export const getDashboardStats = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const totalVideos = await Video.countDocuments({ user: req.userId });

    const viewsStats = await Video.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.userId) } },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          totalDislikes: { $sum: '$dislikes' },
        },
      },
    ]);

    const savedVideos = await SavedVideo.countDocuments({ user: req.userId });

    const watchHistory = await WatchHistory.countDocuments({
      user: req.userId,
    });

    const topVideos = await Video.find({ user: req.userId })
      .sort({ views: -1 })
      .limit(5)
      .select('title views likes dislikes');

    const recentActivity = await Video.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status createdAt');

    const statusDistribution = await Video.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      overview: {
        totalVideos,
        totalViews: viewsStats[0]?.totalViews || 0,
        totalLikes: viewsStats[0]?.totalLikes || 0,
        totalDislikes: viewsStats[0]?.totalDislikes || 0,
        savedVideos,
        watchedVideos: watchHistory,
      },
      topVideos,
      recentActivity,
      statusDistribution: statusDistribution.reduce(
        (acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch dashboard statistics',
      details: error.message,
    });
  }
};

export const getViewsStats = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const { period = 'week' } = req.query;
    const { start, end } = getDateRange(period as 'week' | 'month' | 'year');

    const periodConfig = {
      week: {
        labels: Array.from({ length: 7 }, (_, i) =>
          moment()
            .subtract(6 - i, 'days')
            .format('ddd'),
        ),
        days: 7,
        groupBy: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$viewedAt',
          },
        },
      },
      month: {
        labels: Array.from({ length: 30 }, (_, i) =>
          moment()
            .subtract(29 - i, 'days')
            .format('MMM DD'),
        ),
        days: 30,
        groupBy: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$viewedAt',
          },
        },
      },
      year: {
        labels: Array.from({ length: 12 }, (_, i) =>
          moment()
            .subtract(11 - i, 'months')
            .format('MMM'),
        ),
        days: 12,
        groupBy: {
          $dateToString: {
            format: '%Y-%m',
            date: '$viewedAt',
          },
        },
      },
    };

    const config = periodConfig[period as keyof typeof periodConfig];

    const viewsData = await VideoView.aggregate([
      {
        $lookup: {
          from: 'videos',
          localField: 'video',
          foreignField: '_id',
          as: 'videoInfo',
        },
      },
      { $unwind: '$videoInfo' },
      {
        $match: {
          'videoInfo.user': new mongoose.Types.ObjectId(req.userId),
          viewedAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: config.groupBy,
          views: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dateMap = new Map();
    for (let i = 0; i < config.days; i++) {
      const date =
        period === 'year'
          ? moment(start).add(i, 'months').format('YYYY-MM')
          : moment(start).add(i, 'days').format('YYYY-MM-DD');
      dateMap.set(date, 0);
    }

    viewsData.forEach((entry) => {
      if (dateMap.has(entry._id)) {
        dateMap.set(entry._id, entry.views);
      }
    });

    const formattedData = Array.from(dateMap.values());

    const totalViews = await VideoView.aggregate([
      {
        $lookup: {
          from: 'videos',
          localField: 'video',
          foreignField: '_id',
          as: 'videoInfo',
        },
      },
      { $unwind: '$videoInfo' },
      {
        $match: {
          'videoInfo.user': new mongoose.Types.ObjectId(req.userId),
        },
      },
      {
        $count: 'total',
      },
    ]);

    res.json({
      labels: config.labels,
      data: formattedData,
      totalViews: totalViews[0]?.total || 0,
      period,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch views statistics',
      details: error.message,
    });
  }
};

export const getEngagementStats = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const { period = 'week' } = req.query;
    const { start, end } = getDateRange(period as 'week' | 'month' | 'year');

    const periodConfig = {
      week: {
        labels: Array.from({ length: 7 }, (_, i) =>
          moment()
            .subtract(6 - i, 'days')
            .format('ddd'),
        ),
        days: 7,
        groupBy: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt',
          },
        },
      },
      month: {
        labels: Array.from({ length: 30 }, (_, i) =>
          moment()
            .subtract(29 - i, 'days')
            .format('MMM DD'),
        ),
        days: 30,
        groupBy: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt',
          },
        },
      },
      year: {
        labels: Array.from({ length: 12 }, (_, i) =>
          moment()
            .subtract(11 - i, 'months')
            .format('MMM'),
        ),
        days: 12,
        groupBy: {
          $dateToString: {
            format: '%Y-%m',
            date: '$createdAt',
          },
        },
      },
    };

    const config = periodConfig[period as keyof typeof periodConfig];

    const [comments, saves, watches, likes] = await Promise.all([
      Comment.aggregate([
        {
          $lookup: {
            from: 'videos',
            localField: 'video',
            foreignField: '_id',
            as: 'videoInfo',
          },
        },
        { $unwind: '$videoInfo' },
        {
          $match: {
            'videoInfo.user': new mongoose.Types.ObjectId(req.userId),
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: config.groupBy,
            total: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      SavedVideo.aggregate([
        {
          $lookup: {
            from: 'videos',
            localField: 'video',
            foreignField: '_id',
            as: 'videoInfo',
          },
        },
        { $unwind: '$videoInfo' },
        {
          $match: {
            'videoInfo.user': new mongoose.Types.ObjectId(req.userId),
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: config.groupBy,
            total: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      WatchHistory.aggregate([
        {
          $lookup: {
            from: 'videos',
            localField: 'video',
            foreignField: '_id',
            as: 'videoInfo',
          },
        },
        { $unwind: '$videoInfo' },
        {
          $match: {
            'videoInfo.user': new mongoose.Types.ObjectId(req.userId),
            watchedAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: config.groupBy,
            total: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      VideoLike.aggregate([
        {
          $lookup: {
            from: 'videos',
            localField: 'video',
            foreignField: '_id',
            as: 'videoInfo',
          },
        },
        { $unwind: '$videoInfo' },
        {
          $match: {
            'videoInfo.user': new mongoose.Types.ObjectId(req.userId),
            type: 'like',
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: config.groupBy,
            total: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const dateMap = {
      comments: new Map(),
      saves: new Map(),
      watches: new Map(),
      likes: new Map(),
    };

    for (let i = 0; i < config.days; i++) {
      const date =
        period === 'year'
          ? moment(start).add(i, 'months').format('YYYY-MM')
          : moment(start).add(i, 'days').format('YYYY-MM-DD');

      dateMap.comments.set(date, 0);
      dateMap.saves.set(date, 0);
      dateMap.watches.set(date, 0);
      dateMap.likes.set(date, 0);
    }

    comments.forEach((entry) => dateMap.comments.set(entry._id, entry.total));
    saves.forEach((entry) => dateMap.saves.set(entry._id, entry.total));
    watches.forEach((entry) => dateMap.watches.set(entry._id, entry.total));
    likes.forEach((entry) => dateMap.likes.set(entry._id, entry.total));

    res.json({
      labels: config.labels,
      data: {
        comments: Array.from(dateMap.comments.values()),
        saves: Array.from(dateMap.saves.values()),
        watches: Array.from(dateMap.watches.values()),
        likes: Array.from(dateMap.likes.values()),
      },
      totals: {
        comments: comments.reduce((sum, entry) => sum + entry.total, 0),
        saves: saves.reduce((sum, entry) => sum + entry.total, 0),
        watches: watches.reduce((sum, entry) => sum + entry.total, 0),
        likes: likes.reduce((sum, entry) => sum + entry.total, 0),
      },
      period,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch engagement statistics',
      details: error.message,
    });
  }
};
