import { Request, Response } from 'express';
import { ObjectId } from 'mongoose';
import Comment, { IComment } from '../models/Comment';
import Video from '../models/Video';
import { logActivity } from './activity';

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
    }) as IComment;

    await comment.save();

    const populatedComment = await Comment.findById(comment._id).populate(
      'user',
      'username',
    );

    await Video.findByIdAndUpdate(videoId, {
      $push: { comments: comment._id },
    });

    const commentId = (comment._id as ObjectId).toString();
    await logActivity(userId, 'comment', 'create', commentId, 'Comment', {
      videoId,
      parentCommentId: parentCommentId || null,
      content: content.substring(0, 50),
    });

    res.status(201).json(populatedComment);
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

    await logActivity(req.userId, 'comment', 'update', id, 'Comment', {
      videoId: comment.video,
      newContent: content.substring(0, 50),
    });

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

    await Video.findByIdAndUpdate(comment.video, {
      $pull: { comments: comment._id },
    });

    await logActivity(req.userId, 'comment', 'delete', id, 'Comment', {
      videoId: comment.video,
      role: req.role,
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

    // Get parent comments
    const comments = await Comment.find({ video: videoId, parentComment: null })
      .populate('user', 'username')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    // Get replies for these comments
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ parentComment: comment._id })
          .populate('user', 'username')
          .sort({ createdAt: 1 })
          .limit(5); // Limit to first 5 replies, adjust as needed

        const totalReplies = await Comment.countDocuments({
          parentComment: comment._id,
        });

        return {
          ...comment.toObject(),
          replies,
          totalReplies,
        };
      }),
    );

    const totalComments = await Comment.countDocuments({
      video: videoId,
      parentComment: null,
    });

    if (req.userId) {
      await logActivity(req.userId, 'comment', 'view', videoId, 'Video', {
        page: Number(page),
        limit: Number(limit),
        totalComments,
      });
    }

    res.json({
      comments: commentsWithReplies,
      total: totalComments,
      page: Number(page),
      pages: Math.ceil(totalComments / Number(limit)),
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch comments',
      details: error.message,
    });
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

    if (req.userId) {
      await logActivity(
        req.userId,
        'comment',
        'view_replies',
        commentId,
        'Comment',
        {
          page: Number(page),
          limit: Number(limit),
          totalReplies,
        },
      );
    }

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
