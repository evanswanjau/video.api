import { Request, Response } from 'express';
import Comment from '../models/Comment';
import Video from '../models/Video';

export const addComment = async (req: Request, res: Response) => {
  if (!req.userId || req.role !== 'admin') {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }
  try {
    const { content, videoId, parentCommentId } = req.body;
    const userId = req.userId;

    const comment = new Comment({
      content,
      user: userId,
      video: videoId,
      parentComment: parentCommentId || null,
    });

    await comment.save();

    // Add comment to the video
    await Video.findByIdAndUpdate(videoId, {
      $push: { comments: comment._id },
    });

    res.status(201).json(comment);
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to add comment', details: error.message });
  }
};

export const updateComment = async (req: Request, res: Response) => {
  if (!req.userId || req.role !== 'admin') {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }
  try {
    const { id } = req.params;
    const { content } = req.body;

    const comment = await Comment.findByIdAndUpdate(
      id,
      { content },
      { new: true },
    );

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json(comment);
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to update comment', details: error.message });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  if (!req.userId || req.role !== 'admin') {
    return res.status(401).json({
      message: 'You are not authorized to perform this action.',
    });
  }
  try {
    const { id } = req.params;

    const comment = await Comment.findByIdAndDelete(id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Remove comment from the video
    await Video.findByIdAndUpdate(comment.video, {
      $pull: { comments: comment._id },
    });

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to delete comment', details: error.message });
  }
};

export const getCommentsByVideo = async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const comments = await Comment.find({ video: videoId, parentComment: null })
      .populate('user', 'username')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const totalComments = await Comment.countDocuments({
      video: videoId,
      parentComment: null,
    });

    res.json({
      comments,
      total: totalComments,
      page: Number(page),
      pages: Math.ceil(totalComments / Number(limit)),
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to fetch comments', details: error.message });
  }
};

export const getRepliesByComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const replies = await Comment.find({ parentComment: commentId })
      .populate('user', 'username')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const totalReplies = await Comment.countDocuments({
      parentComment: commentId,
    });

    res.json({
      replies,
      total: totalReplies,
      page: Number(page),
      pages: Math.ceil(totalReplies / Number(limit)),
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to fetch replies', details: error.message });
  }
};
