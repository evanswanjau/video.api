import { Request, Response } from 'express';
import fs from 'fs/promises';
import multer, { StorageEngine } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import thumbsupply from 'thumbsupply';
import mongoose from 'mongoose';
import Video from '../models/Video';
import Tag from '../models/Tag';
import WatchHistory from '../models/WatchHistory';
import moment from 'moment';
import SavedVideo from '../models/SavedVideo';
import { getDateRange } from './dashboard';
import Comment from '../models/Comment';
import VideoView from '../models/VideoView';
import VideoLike from '../models/VideoLike';
import { logActivity } from '../controllers/activity';

interface MulterRequest extends Request {
  file: Express.Multer.File;
  userId?: string;
  role?: string;
}

const storage: StorageEngine = multer.diskStorage({
  destination: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void,
  ) => {
    cb(null, 'uploads/videos/');
  },
  filename: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) => {
    const uniqueSuffix = uuidv4();
    const sanitizedTitle = req.body.title.replace(/[^a-zA-Z0-9]/g, '_');
    const fileExtension = path.extname(file.originalname);
    cb(null, `${sanitizedTitle}-${uniqueSuffix}${fileExtension}`);
  },
});

const upload = multer({ storage: storage });

export const uploadVideo = upload.single('video');

const generateThumbnail = async (
  filepath: string,
  videoId: string,
): Promise<string> => {
  const thumbnailDir = 'uploads/thumbnails';
  const tempThumbnailPath = await thumbsupply.generateThumbnail(filepath, {
    size: thumbsupply.ThumbSize.LARGE,
    cacheDir: thumbnailDir,
  });

  const thumbnailFilename = `${videoId}.png`;
  const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

  // Rename the generated thumbnail to the desired filename
  await fs.rename(tempThumbnailPath, thumbnailPath);

  return thumbnailPath;
};

export const handleUpload = async (req: MulterRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const { title, description, duration, tags } = req.body;
    const { filename, path: filepath, size, mimetype } = req.file;

    let tagIds: string[] = [];
    if (tags) {
      tagIds = await Promise.all(
        tags.split(',').map(async (tag: string) => {
          const trimmedTag = tag.trim();
          let tagDoc = await Tag.findOne({ name: trimmedTag });
          if (!tagDoc) {
            tagDoc = new Tag({ name: trimmedTag });
            await tagDoc.save();
          }
          return tagDoc._id;
        }),
      );
    }

    const video: any = new Video({
      title,
      description,
      filename,
      filepath,
      size,
      mimetype,
      duration,
      user: req.userId,
      tags: tagIds,
    });

    await video.save();

    // Log the upload activity
    await logActivity(req.userId, 'video', 'create', video._id, 'Video', {
      title: video.title,
    });

    // Generate thumbnail
    try {
      const thumbnailPath = await generateThumbnail(
        filepath,
        video._id.toString(),
      );
      video.thumbnail = thumbnailPath;
      await video.save();
      res.status(201).json(video);
    } catch (err: any) {
      res
        .status(500)
        .json({ error: 'Failed to generate thumbnail', details: err.message });
    }
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to upload video', details: error.message });
  }
};

export const updateVideo = async (req: Request, res: Response) => {
  if (!req.userId || req.role !== 'admin') {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.tags) {
      const tagIds = await Promise.all(
        updateData.tags.split(',').map(async (tag: string) => {
          const trimmedTag = tag.trim();
          let tagDoc = await Tag.findOne({ name: trimmedTag });
          if (!tagDoc) {
            tagDoc = new Tag({ name: trimmedTag });
            await tagDoc.save();
          }
          return tagDoc._id;
        }),
      );
      updateData.tags = tagIds;
    }

    const video = await Video.findByIdAndUpdate(id, updateData, { new: true });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Log the update activity
    await logActivity(req.userId, 'video', 'update', id, 'Video', {
      updates: updateData,
      role: req.role,
    });

    res.json(video);
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to update video', details: error.message });
  }
};

export const deleteVideo = async (req: Request, res: Response) => {
  if (!req.userId || req.role !== 'admin') {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const { id } = req.params;

    const video = await Video.findByIdAndDelete(id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    try {
      await fs.unlink(video.filepath);
      // Log the delete activity
      await logActivity(req.userId, 'video', 'delete', id, 'Video', {
        role: req.role,
      });
      res.status(200).json({ message: 'Video deleted successfully' });
    } catch (err: any) {
      res
        .status(500)
        .json({ error: 'Failed to delete video file', details: err.message });
    }
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to delete video', details: error.message });
  }
};

export const getAllVideos = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 24 } = req.query;
    const videos = await Video.find()
      .populate('user', 'username')
      .populate('tags', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    const total = await Video.countDocuments();
    res.json({
      videos,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to fetch videos', details: error.message });
  }
};

export const addVideoView = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const videoView = new VideoView({
      video: id,
      user: userId || null,
      deviceId: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    await videoView.save();

    video.views = (video.views || 0) + 1;
    await video.save();

    if (userId) {
      await WatchHistory.create({
        user: userId,
        video: id,
        watchedAt: new Date(),
      });
      await logActivity(userId, 'video', 'view', id, 'Video', {
        deviceId: req.headers['user-agent'],
      });
    }

    res.json({ views: video.views });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to add video view',
      details: error.message,
    });
  }
};

export const getVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id).populate('tags');

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json(video);
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to fetch video', details: error.message });
  }
};

export const getVideosByUserID = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const videos = await Video.find({ user: id })
      .populate('user', 'username')
      .populate('tags', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    const total = await Video.countDocuments({ user: id });
    res.json({
      videos,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to fetch user videos', details: error.message });
  }
};

export const getMyVideos = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }
  try {
    const { page = 1, limit = 12 } = req.query;
    const videos = await Video.find({ user: req.userId })
      .populate('user', 'username')
      .populate('tags', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Video.countDocuments({ user: req.userId });
    res.json({
      videos,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to fetch user videos', details: error.message });
  }
};

export const getVideosByTag = async (req: Request, res: Response) => {
  try {
    const { tag } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const tagDoc = await Tag.findOne({ name: tag.trim() });
    if (!tagDoc) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const videos = await Video.find({ tags: tagDoc._id })
      .populate('user', 'username')
      .populate('tags', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    const total = await Video.countDocuments({ tags: tagDoc._id });

    res.json({
      videos,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to fetch videos by tag', details: error.message });
  }
};

export const searchVideos = async (req: Request, res: Response) => {
  try {
    const { query, tags, page = 1, limit = 24 } = req.query;
    const searchQuery: any = {};

    if (query) {
      searchQuery.title = { $regex: query, $options: 'i' };
    }

    if (tags) {
      searchQuery.tags = {
        $in: (tags as string).split(',').map((tag) => tag.trim()),
      };
    }

    const videos = await Video.find(searchQuery)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    const total = await Video.countDocuments(searchQuery);
    res.json({
      videos,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to search videos', details: error.message });
  }
};

export const likeVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const deviceId = req.headers['user-agent'] || 'unknown';
    const ipAddress = req.ip;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check for existing reaction based on device ID and IP
    const existingReaction = await VideoLike.findOne({
      video: id,
      ...(userId ? { user: userId } : {}),
      deviceId,
      ipAddress,
    });

    if (existingReaction) {
      if (existingReaction.type === 'like') {
        // Remove like if already liked
        await VideoLike.deleteOne({ _id: existingReaction._id });
        video.likes = Math.max((video.likes || 0) - 1, 0);
        await video.save();

        if (userId) {
          await logActivity(userId, 'video', 'unlike', id, 'Video');
        }

        return res.json({
          message: 'Like removed successfully',
          likes: video.likes,
          dislikes: video.dislikes,
          action: 'removed',
        });
      }

      // Change dislike to like
      existingReaction.type = 'like';
      await existingReaction.save();

      // Update video counts
      video.likes = (video.likes || 0) + 1;
      video.dislikes = Math.max((video.dislikes || 0) - 1, 0);
      await video.save();

      if (userId) {
        await logActivity(userId, 'video', 'like', id, 'Video', {
          deviceId,
          ipAddress,
          action: 'changed',
        });
      }

      return res.json({
        message: 'Changed to like successfully',
        likes: video.likes,
        dislikes: video.dislikes,
        action: 'changed',
      });
    }

    // Create new like
    await VideoLike.create({
      video: id,
      user: userId || undefined,
      deviceId,
      ipAddress,
      type: 'like',
    });

    video.likes = (video.likes || 0) + 1;
    await video.save();

    if (userId) {
      await logActivity(userId, 'video', 'like', id, 'Video', {
        deviceId,
        ipAddress,
        action: 'added',
      });
    }

    res.json({
      message: 'Video liked successfully',
      likes: video.likes,
      dislikes: video.dislikes,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      // Duplicate key error
      res.status(400).json({
        error: 'You have already reacted to this video',
      });
    } else {
      res.status(500).json({
        error: 'Failed to like video',
        details: error.message,
      });
    }
  }
};

export const unlikeVideo = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Remove like if exists
    const result = await VideoLike.findOneAndDelete({
      video: id,
      user: req.userId,
      type: 'like',
    });

    if (!result) {
      return res.status(400).json({ message: 'Video was not liked' });
    }

    video.likes = Math.max((video.likes || 0) - 1, 0);
    await video.save();

    if (req.userId) {
      await logActivity(req.userId, 'video', 'unlike', id, 'Video');
    }

    res.json({
      message: 'Video unliked successfully',
      likes: video.likes,
      dislikes: video.dislikes,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to unlike video',
      details: error.message,
    });
  }
};

export const dislikeVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    video.dislikes = (video.dislikes || 0) + 1;
    await video.save();

    res.json({
      message: 'Video disliked successfully',
      dislikes: video.dislikes,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to dislike video', details: error.message });
  }
};

export const undislikeVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    video.dislikes = Math.max((video.dislikes || 0) - 1, 0);
    await video.save();

    res.json({
      message: 'Video undisliked successfully',
      dislikes: video.dislikes,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to undislike video', details: error.message });
  }
};

export const addToWatchHistory = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const { videoId } = req.body;

    const existingEntry = await WatchHistory.findOne({
      user: req.userId,
      video: videoId,
    });

    if (existingEntry) {
      existingEntry.watchedAt = new Date();
      await existingEntry.save();

      await logActivity(req.userId, 'video', 'watch', videoId, 'Video', {
        action: 'updated_watch_time',
      });

      res.status(200).json({ message: 'Watch history updated.' });
    } else {
      const historyEntry = new WatchHistory({
        user: req.userId,
        video: videoId,
      });
      await historyEntry.save();

      await logActivity(req.userId, 'video', 'watch', videoId, 'Video', {
        action: 'first_watch',
      });

      res.status(201).json({ message: 'Video added to watch history.' });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to add to watch history',
      details: error.message,
    });
  }
};

export const getWatchHistory = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const { page = 1, limit = 12 } = req.query;

    const history = await WatchHistory.find({ user: req.userId })
      .sort({ watchedAt: -1 })
      .populate('video')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await WatchHistory.countDocuments({ user: req.userId });

    const groupedHistory: Record<string, typeof history> = history.reduce(
      (acc, entry) => {
        let dateKey = moment(entry.watchedAt).format('dddd');
        if (moment(entry.watchedAt).isSame(moment(), 'day')) {
          dateKey = 'Today';
        } else if (
          moment(entry.watchedAt).isSame(moment().subtract(1, 'days'), 'day')
        ) {
          dateKey = 'Yesterday';
        }
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(entry);
        return acc;
      },
      {} as Record<string, typeof history>,
    );

    res.json({
      history: groupedHistory,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to fetch watch history', details: error.message });
  }
};

export const cleanupWatchHistory = async () => {
  try {
    const oneMonthAgo = moment().subtract(1, 'months').toDate();
    await WatchHistory.deleteMany({ watchedAt: { $lt: oneMonthAgo } });
    console.log('Old watch history entries deleted successfully.');
  } catch (error: any) {
    console.error('Failed to clean up watch history:', error.message);
  }
};

export const saveVideo = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const { videoId } = req.body;

    const existingEntry = await SavedVideo.findOne({
      user: req.userId,
      video: videoId,
    });

    if (existingEntry) {
      return res
        .status(400)
        .json({ message: 'Video is already saved to watch later.' });
    }

    const savedVideoEntry = new SavedVideo({
      user: req.userId,
      video: videoId,
    });
    await savedVideoEntry.save();

    await logActivity(req.userId, 'video', 'save', videoId, 'Video');

    res.status(201).json({ message: 'Video saved to watch later.' });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to save video to watch later',
      details: error.message,
    });
  }
};

export const removeSavedVideo = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const { videoId } = req.body;

    const result = await SavedVideo.findOneAndDelete({
      user: req.userId,
      video: videoId,
    });

    if (!result) {
      return res.status(404).json({ message: 'Saved video not found.' });
    }

    await logActivity(req.userId, 'video', 'delete', videoId, 'Video', {
      action: 'unsave',
    });

    res.status(200).json({ message: 'Saved video removed successfully.' });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to remove saved video',
      details: error.message,
    });
  }
};

export const getSavedVideos = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const { page = 1, limit = 12 } = req.query;

    const savedVideos = await SavedVideo.find({ user: req.userId })
      .populate('video')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const totalSavedVideos = await SavedVideo.countDocuments({
      user: req.userId,
    });

    res.json({
      videos: savedVideos.map((item) => item.video),
      total: totalSavedVideos,
      page: Number(page),
      pages: Math.ceil(totalSavedVideos / Number(limit)),
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch saved videos',
      details: error.message,
    });
  }
};

export const checkVideoSaved = async (req: Request, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }

  try {
    const { id } = req.params;

    const savedVideo = await SavedVideo.findOne({
      user: req.userId,
      video: id,
    });

    res.json({
      isSaved: !!savedVideo,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to check saved video status',
      details: error.message,
    });
  }
};

export const getVideoViewsStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { period = 'week' } = req.query;
    const { start, end } = getDateRange(period as 'week' | 'month' | 'year');

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

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
        $match: {
          video: new mongoose.Types.ObjectId(id),
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

    // Create a map of dates to views
    const dateMap = new Map();
    for (let i = 0; i < config.days; i++) {
      const date =
        period === 'year'
          ? moment(start).add(i, 'months').format('YYYY-MM')
          : moment(start).add(i, 'days').format('YYYY-MM-DD');
      dateMap.set(date, 0);
    }

    // Update map with actual views
    viewsData.forEach((entry) => {
      if (dateMap.has(entry._id)) {
        dateMap.set(entry._id, entry.views);
      }
    });

    const formattedData = Array.from(dateMap.values());

    res.json({
      labels: config.labels,
      data: formattedData,
      totalViews: video.views || 0,
      period,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch video views statistics',
      details: error.message,
    });
  }
};

export const getVideoEngagementStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { period = 'week' } = req.query;
    const { start, end } = getDateRange(period as 'week' | 'month' | 'year');

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

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
          $match: {
            video: new mongoose.Types.ObjectId(id),
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
          $match: {
            video: new mongoose.Types.ObjectId(id),
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
          $match: {
            video: new mongoose.Types.ObjectId(id),
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
      getLikeStats(id, start, end, config.groupBy),
    ]);

    // Create maps for each metric
    const dateMap = {
      comments: new Map(),
      saves: new Map(),
      watches: new Map(),
      likes: new Map(),
    };

    // Initialize maps with zero values
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

    // Update maps with actual values
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
        likes: video.likes || 0,
        dislikes: video.dislikes || 0,
        comments: comments.reduce((sum, entry) => sum + entry.total, 0),
        saves: saves.reduce((sum, entry) => sum + entry.total, 0),
        watches: watches.reduce((sum, entry) => sum + entry.total, 0),
      },
      period,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch video engagement statistics',
      details: error.message,
    });
  }
};

export const checkVideoReaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const deviceId = req.headers['user-agent'] || 'unknown';
    const ipAddress = req.ip;

    const reaction = await VideoLike.findOne({
      video: id,
      ...(userId ? { user: userId } : { deviceId, ipAddress }),
    });

    res.json({
      hasReacted: !!reaction,
      reactionType: reaction?.type || null,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to check video reaction',
      details: error.message,
    });
  }
};

const getLikeStats = async (
  videoId: string,
  start: Date,
  end: Date,
  groupBy: any,
) => {
  return VideoLike.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
        createdAt: { $gte: start, $lte: end },
        type: 'like',
      },
    },
    {
      $group: {
        _id: groupBy,
        total: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};
