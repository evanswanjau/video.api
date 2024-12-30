import { Request, Response } from 'express';
import Tag from '../models/Tag';

// Create a new tag
export const createTag = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const tag = new Tag({ name });
    await tag.save();
    res.status(201).json(tag);
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Tag already exists' });
    } else {
      res
        .status(500)
        .json({ error: 'Failed to create tag', details: error.message });
    }
  }
};

// Get all tags
export const getTags = async (req: Request, res: Response) => {
  try {
    const tags = await Tag.find();
    res.status(200).json(tags);
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to fetch tags', details: error.message });
  }
};

// Get a single tag by ID
export const getTagById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tag = await Tag.findById(id);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    res.status(200).json(tag);
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to fetch tag', details: error.message });
  }
};

// Update a tag by ID
export const updateTag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const tag = await Tag.findByIdAndUpdate(id, { name }, { new: true });
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    res.status(200).json(tag);
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Tag already exists' });
    } else {
      res
        .status(500)
        .json({ error: 'Failed to update tag', details: error.message });
    }
  }
};

// Delete a tag by ID
export const deleteTag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tag = await Tag.findByIdAndDelete(id);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    res.status(200).json({ message: 'Tag deleted successfully' });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to delete tag', details: error.message });
  }
};

// Add tags in bulk
export const addTagsInBulk = async (req: Request, res: Response) => {
  try {
    const { tags } = req.body;
    const tagNames = tags.split(',').map((tag: string) => tag.trim());

    const existingTags = await Tag.find({ name: { $in: tagNames } });
    const existingTagNames = existingTags.map((tag) => tag.name);

    const newTagNames = tagNames.filter(
      (tag: string) => !existingTagNames.includes(tag),
    );
    const newTags = newTagNames.map((name: any) => ({ name }));

    await Tag.insertMany(newTags);

    res.status(201).json({ message: 'Tags added successfully', newTags });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to add tags in bulk', details: error.message });
  }
};

// Search tags by name
export const searchTags = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Query parameter is required' });
    }

    const tags = await Tag.find({ name: { $regex: query, $options: 'i' } });
    res.status(200).json(tags);
  } catch (error: any) {
    res
      .status(500)
      .json({ error: 'Failed to search tags', details: error.message });
  }
};
