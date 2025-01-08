import { Request, Response } from 'express';
import fs from 'fs/promises';
import multer, { StorageEngine } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import thumbsupply from 'thumbsupply';
import Video from '../models/Video';
import Tag from '../models/Tag';

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
    const { page = 1, limit = 20 } = req.query;
    const videos = await Video.find()
      .populate('user', 'username')
      .populate('tags', 'name')
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

export const getVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id).populate('tags');

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    video.views = (video.views || 0) + 1;
    await video.save();

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
    const { query, tags, page = 1, limit = 20 } = req.query;
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

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    video.likes = (video.likes || 0) + 1;
    await video.save();

    res.json({ message: 'Video liked successfully', likes: video.likes });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to like video', details: error.message });
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

    res.json({ message: 'Video disliked successfully', dislikes: video.dislikes });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to dislike video', details: error.message });
  }
};