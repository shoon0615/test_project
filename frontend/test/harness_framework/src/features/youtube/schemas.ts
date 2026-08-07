import type { RawComment, ValidationResult, VideoSummary } from '../../types/domain';

export interface YouTubeErrorPayload {
  reason?: string;
}

export interface CommentPage {
  comments: RawComment[];
  nextPageToken?: string;
}

export function parseVideoListResponse(value: unknown): ValidationResult<VideoSummary> {
  const object = asRecord(value);
  const items: unknown = object === undefined ? undefined : object.items;
  const itemValues: unknown[] = Array.isArray(items) ? items : [];
  const firstItem = itemValues[0];
  const item = asRecord(firstItem);
  const snippet = asRecord(item?.snippet);

  if (!item || !snippet || typeof item.id !== 'string' || typeof snippet.title !== 'string' || typeof snippet.channelTitle !== 'string') {
    return { ok: false, issues: ['videos.list response must contain one video item with snippet metadata'] };
  }

  const publishedAt = typeof snippet.publishedAt === 'string' ? snippet.publishedAt : undefined;
  if (publishedAt !== undefined && Number.isNaN(Date.parse(publishedAt))) {
    return { ok: false, issues: ['video publishedAt must be an ISO date string'] };
  }

  const statistics = asRecord(item.statistics);
  const commentCount = parseOptionalNonNegativeInteger(statistics?.commentCount);
  if (statistics?.commentCount !== undefined && commentCount === undefined) {
    return { ok: false, issues: ['video commentCount must be a non-negative integer string'] };
  }

  const thumbnailUrl = selectThumbnailUrl(snippet.thumbnails);

  return {
    ok: true,
    value: {
      id: item.id,
      title: snippet.title,
      channelTitle: snippet.channelTitle,
      ...(thumbnailUrl === undefined ? {} : { thumbnailUrl }),
      ...(publishedAt === undefined ? {} : { publishedAt }),
      ...(commentCount === undefined ? {} : { commentCount }),
    },
  };
}

export function parseCommentThreadsResponse(value: unknown): ValidationResult<CommentPage> {
  const object = asRecord(value);
  if (!object || !Array.isArray(object.items)) {
    return { ok: false, issues: ['commentThreads.list response items must be an array'] };
  }

  const comments: RawComment[] = [];
  const issues: string[] = [];

  for (const [index, itemValue] of object.items.entries()) {
    const item = asRecord(itemValue);
    const topLevelComment = asRecord(asRecord(item?.snippet)?.topLevelComment);
    const commentSnippet = asRecord(topLevelComment?.snippet);
    const id = topLevelComment?.id;
    const text = commentSnippet?.textDisplay;
    const likeCount = commentSnippet?.likeCount;
    const publishedAt = commentSnippet?.publishedAt;

    if (
      typeof id !== 'string' ||
      typeof text !== 'string' ||
      !isNonNegativeInteger(likeCount) ||
      typeof publishedAt !== 'string' ||
      Number.isNaN(Date.parse(publishedAt))
    ) {
      issues.push(`comment item ${String(index)} is invalid`);
      continue;
    }

    comments.push({ id, text, likeCount, publishedAt });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  if (object.nextPageToken !== undefined && typeof object.nextPageToken !== 'string') {
    return { ok: false, issues: ['nextPageToken must be a string'] };
  }

  return {
    ok: true,
    value: {
      comments,
      ...(typeof object.nextPageToken === 'string' && object.nextPageToken.length > 0 ? { nextPageToken: object.nextPageToken } : {}),
    },
  };
}

export function parseYouTubeErrorPayload(value: unknown): YouTubeErrorPayload {
  const object = asRecord(value);
  const error = asRecord(object?.error);
  const errors = Array.isArray(error?.errors) ? error.errors : [];
  const firstError = asRecord(errors[0]);
  const reason = firstError?.reason ?? error?.reason;

  return typeof reason === 'string' ? { reason } : {};
}

function selectThumbnailUrl(value: unknown): string | undefined {
  const thumbnails = asRecord(value);
  if (!thumbnails) {
    return undefined;
  }

  for (const key of ['maxres', 'standard', 'high', 'medium', 'default']) {
    const url = asRecord(thumbnails[key])?.url;
    if (typeof url === 'string') {
      return url;
    }
  }

  return undefined;
}

function parseOptionalNonNegativeInteger(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'number' && isNonNegativeInteger(value)) {
    return value;
  }

  if (typeof value !== 'string' || !/^\d+$/u.test(value)) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}
