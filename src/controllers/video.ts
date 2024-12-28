import { Request, Response } from 'express';
import fs from 'fs';
import multer, { StorageEngine } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import Video from '../models/video';

// Define a custom request interface to include the file property
interface MulterRequest extends Request {
  file: Express.Multer.File;
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

export const handleUpload = async (req: MulterRequest, res: Response) => {
  try {
    const { title, description, duration, user, tags } = req.body;
    const { filename, path: filepath, size, mimetype } = req.file;

    const video = new Video({
      title,
      description,
      filename,
      filepath,
      size,
      mimetype,
      duration,
      user,
      tags: tags ? tags.split(',') : [],
    });

    await video.save();
    res.status(201).json(video);
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to upload video', details: error.message });
  }
};

export const updateVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

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
  try {
    const { id } = req.params;

    const video = await Video.findByIdAndDelete(id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    fs.unlink(video.filepath, (err) => {
      if (err) {
        return res
          .status(500)
          .json({ error: 'Failed to delete video file', details: err.message });
      }
      res.status(200).json({ message: 'Video deleted successfully' });
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to delete video', details: error.message });
  }
};

export const getAllVideos = async (req: Request, res: Response) => {
  try {
    const videos = await Video.find();
    res.json(videos);
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to fetch videos', details: error.message });
  }
};

export const getVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);

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
